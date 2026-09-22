import { DurableObject } from "cloudflare:workers";
import { allowedAdminOrderTransitions, canTransitionAdminOrder, normalizeAdminOrderStatus } from "./admin-orders";
import { allowedAdminProductionTransitions, canTransitionAdminProduction, normalizeAdminProductionStatus } from "./admin-production";
import { allowedAdminWithdrawalTransitions, canTransitionAdminWithdrawal, normalizeAdminWithdrawalStatus } from "./admin-payouts";
import { DESIGN_PRODUCT_TYPES } from "./analyzer";

interface ItemStoreEnv { DESIGN_ASSETS?: R2Bucket; }

type Role = "guest" | "customer" | "designer" | "admin" | "operator";
type Access = { userId?: string; role?: Role };

export interface Item extends Record<string, SqlStorageValue> {
  id: number;
  title: string;
  status: "todo" | "in-progress" | "done";
  createdAt: string;
}

export interface StudioHealth {
  schemaVersion: string;
  tables: string[];
  previewCatalog: boolean;
  liveIntegrations: { printify: "blocked"; payments: "not_configured" };
}

export interface CartLine extends Record<string, SqlStorageValue> {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  color: string | null;
  size: string | null;
  quantity: number;
  unitPriceJod: number;
  lineTotalJod: number;
  designId: string | null;
  masterAssetId: string | null;
}

export interface CartSnapshot {
  cartId: string;
  lines: CartLine[];
  itemCount: number;
  subtotalJod: number;
}

export interface StudioProduct extends Record<string, SqlStorageValue> {
  modelId: string;
  categoryId: string;
  nameAr: string;
  nameEn: string;
  variantId: string;
  sku: string;
  color: string | null;
  size: string | null;
  retailPriceJod: number;
  source: string;
}

export interface StudioCategory extends Record<string, SqlStorageValue> {
  id: string;
  nameAr: string;
  nameEn: string;
  enabled: number;
  homeFeatured: number;
  homeOrder: number;
}

export interface StudioDesign extends Record<string, SqlStorageValue> {
  id: string;
  titleAr: string;
  titleEn: string;
  designerId: string | null;
  assetId: string;
  imageUrl: string;
  status: string;
  visibility: string;
}

export interface NavigationItem extends Record<string, SqlStorageValue> {
  id: string; titleEn: string; titleAr: string; route: string; position: number; enabled: number;
  visibility: "both" | "desktop" | "mobile";
}

export interface PrintifyCatalogLocalStateRow extends Record<string, SqlStorageValue> {
  blueprint_id: string;
  imported_model_id: string | null;
  provider_id: string | null;
  source_available: number;
  sync_status: string;
  title_en: string | null;
  title_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  customer_price_jod: number | null;
  display_image: string | null;
  published: number | null;
  print_your_dream: number | null;
  selected_provider_id: string | null;
}

function bytesToBase64(bytes: Uint8Array): string { return btoa(String.fromCharCode(...bytes)); }
function base64ToBytes(value: string): Uint8Array { return Uint8Array.from(atob(value), (char) => char.charCodeAt(0)); }

function execSqlScript(storage: SqlStorage, script: string): void {
  let start = 0;
  let quote: string | null = null;
  let lineComment = false;
  let blockComment = false;
  for (let i = 0; i < script.length; i++) {
    const ch = script[i], next = script[i + 1];
    if (lineComment) { if (ch === "\n") lineComment = false; continue; }
    if (blockComment) { if (ch === "*" && next === "/") { blockComment = false; i++; } continue; }
    if (!quote && ch === "-" && next === "-") { lineComment = true; i++; continue; }
    if (!quote && ch === "/" && next === "*") { blockComment = true; i++; continue; }
    if (quote) { if (ch === quote) { if (next === quote) i++; else quote = null; } continue; }
    if (ch === "'" || ch === '"' || ch === "`") { quote = ch; continue; }
    if (ch === ";") { const statement = script.slice(start, i).trim(); if (statement) storage.exec(statement); start = i + 1; }
  }
  const tail = script.slice(start).trim();
  if (tail) storage.exec(tail);
}

async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: 100000, hash: "SHA-256" }, key, 256);
  return bytesToBase64(new Uint8Array(bits));
}

async function verifyPassword(password: string, saltText: string, expectedHash: string): Promise<boolean> {
  return (await hashPassword(password, base64ToBytes(saltText))) === expectedHash;
}

export function normalizePrintifyVariant(blueprintId: string, providerId: string, raw: any) {
  const variantId = String(raw?.id ?? raw?.variant_id ?? "");
  if (!/^\d{1,30}$/.test(variantId)) return null;
  const options = raw?.options && typeof raw.options === "object" ? raw.options : {};
  return { blueprintId: String(blueprintId), printProviderId: String(providerId), variantId, sourceTitle: String(raw?.title ?? raw?.name ?? "").slice(0,300), size: raw?.size ?? options.size ?? null, color: raw?.color ?? options.color ?? null, options, sourceAvailable: raw?.is_enabled !== false && raw?.available !== false, sourceCostInternal: raw?.cost == null ? (raw?.cost_jod == null ? null : Number(raw.cost_jod)) : Number(raw.cost), metadata: raw, images: Array.isArray(raw?.images) ? raw.images : [], placeholders: raw?.placeholders ?? raw?.print_areas ?? {} };
}

function sanitizeAuditMetadataValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizeAuditMetadataValue(item, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 100)) {
      if (/(password|credential|authorization|cookie|secret|token|api.?key|private.?key)/i.test(key)) {
        out[key] = "[redacted]";
      } else {
        out[key] = sanitizeAuditMetadataValue(item, depth + 1);
      }
    }
    return out;
  }
  if (typeof value === "string") return value.length > 1000 ? value.slice(0, 1000) + "…" : value;
  return value;
}

export class ItemStore extends DurableObject<ItemStoreEnv> {
  private readonly designAssets?: R2Bucket;
  constructor(ctx: DurableObjectState, env: ItemStoreEnv) {
    super(ctx, env);
    this.designAssets = env.DESIGN_ASSETS;
    execSqlScript(this.ctx.storage.sql, `
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in-progress','done')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS schema_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      INSERT OR IGNORE INTO schema_meta (key, value) VALUES ('schema_version', 'phase-1.1');

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en','ar')),
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      );
      CREATE TABLE IF NOT EXISTS permissions (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL UNIQUE
      );
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, role_id)
      );
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_id TEXT,
        actor_role TEXT,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action_resource ON audit_logs(action, resource_type);

      CREATE TABLE IF NOT EXISTS customer_profiles (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        phone TEXT,
        default_address_json TEXT
      );
      CREATE TABLE IF NOT EXISTS designer_profiles (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        authorization_status TEXT NOT NULL DEFAULT 'pending',
        rejection_reason TEXT,
        review_due_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS designer_applications (
        id TEXT PRIMARY KEY,
        designer_id TEXT NOT NULL REFERENCES designer_profiles(user_id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'draft',
        submitted_at TEXT,
        review_due_at TEXT,
        rejection_reason TEXT,
        replacement_due_at TEXT,
        escalation_state TEXT
      );
      CREATE TABLE IF NOT EXISTS qualification_designs (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL REFERENCES designer_applications(id) ON DELETE CASCADE,
        design_id TEXT NOT NULL,
        slot INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 3),
        UNIQUE(application_id, slot)
      );
      CREATE TABLE IF NOT EXISTS manual_review_history (
        id TEXT PRIMARY KEY,
        review_type TEXT NOT NULL CHECK (review_type IN ('qualification','design')),
        subject_id TEXT NOT NULL,
        decision TEXT NOT NULL CHECK (decision IN ('approve','reject')),
        reason TEXT,
        review_round INTEGER NOT NULL DEFAULT 1,
        admin_actor_id TEXT REFERENCES admin_users(id),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_manual_review_subject ON manual_review_history(review_type, subject_id, created_at);

      CREATE TABLE IF NOT EXISTS filter_groups (
        id TEXT PRIMARY KEY, name_en TEXT NOT NULL, name_ar TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS catalog_filters (
        id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES filter_groups(id), name_en TEXT NOT NULL,
        name_ar TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_filter_groups_order ON filter_groups(sort_order,name_en);
      CREATE INDEX IF NOT EXISTS idx_catalog_filters_group ON catalog_filters(group_id,sort_order,name_en);

      CREATE TABLE IF NOT EXISTS catalog_options (id TEXT PRIMARY KEY,name_en TEXT NOT NULL,name_ar TEXT NOT NULL,type TEXT NOT NULL DEFAULT 'select',validation TEXT NOT NULL DEFAULT '',sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS catalog_option_values (id TEXT PRIMARY KEY,option_id TEXT NOT NULL REFERENCES catalog_options(id) ON DELETE CASCADE,name_en TEXT NOT NULL,name_ar TEXT NOT NULL,image TEXT,sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS manufacturers (id TEXT PRIMARY KEY,name_en TEXT NOT NULL,name_ar TEXT NOT NULL,image TEXT,keyword TEXT,sort_order INTEGER NOT NULL DEFAULT 0,status INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS catalog_identifiers (id TEXT PRIMARY KEY,name_en TEXT NOT NULL,name_ar TEXT NOT NULL,code TEXT NOT NULL UNIQUE,validation TEXT NOT NULL DEFAULT '',status INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS catalog_downloads (id TEXT PRIMARY KEY,name_en TEXT NOT NULL,name_ar TEXT NOT NULL,filename TEXT NOT NULL,mask TEXT NOT NULL DEFAULT '',storage_key TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS catalog_reviews (id TEXT PRIMARY KEY,product_id TEXT,author TEXT NOT NULL,rating INTEGER NOT NULL,text TEXT NOT NULL,status INTEGER NOT NULL DEFAULT 1,date_added TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS catalog_information (id TEXT PRIMARY KEY,title_en TEXT NOT NULL,title_ar TEXT NOT NULL,description_en TEXT NOT NULL,description_ar TEXT NOT NULL,meta_title TEXT NOT NULL DEFAULT '',meta_keywords TEXT NOT NULL DEFAULT '',meta_description TEXT NOT NULL DEFAULT '',keyword TEXT NOT NULL DEFAULT '',status INTEGER NOT NULL DEFAULT 1,sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS attribute_groups (
        id TEXT PRIMARY KEY, name_en TEXT NOT NULL, name_ar TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS catalog_attributes (
        id TEXT PRIMARY KEY, attribute_group_id TEXT NOT NULL REFERENCES attribute_groups(id), name_en TEXT NOT NULL, name_ar TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_attribute_groups_order ON attribute_groups(sort_order,name_en);
      CREATE INDEX IF NOT EXISTS idx_catalog_attributes_group ON catalog_attributes(attribute_group_id,sort_order,name_en);

      CREATE TABLE IF NOT EXISTS subscription_plans (
        id TEXT PRIMARY KEY,
        name_en TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        trial_duration INTEGER NOT NULL DEFAULT 0,
        trial_cycle TEXT NOT NULL DEFAULT 'month',
        trial_frequency INTEGER NOT NULL DEFAULT 1,
        trial_status INTEGER NOT NULL DEFAULT 0,
        duration INTEGER NOT NULL DEFAULT 0,
        cycle TEXT NOT NULL DEFAULT 'month',
        frequency INTEGER NOT NULL DEFAULT 1,
        status INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_subscription_plans_order ON subscription_plans(sort_order,name_en);

[1624 more lines in file. Use offset=301 to continue.]      CREATE TABLE IF NOT EXISTS site_categories (
        id TEXT PRIMARY KEY,
        name_ar TEXT NOT NULL,
        name_en TEXT NOT NULL,
        show_category_name INTEGER NOT NULL DEFAULT 1,
        enabled INTEGER NOT NULL DEFAULT 1,
        home_featured INTEGER NOT NULL DEFAULT 0,
        home_order INTEGER NOT NULL DEFAULT 0,
        mockup_mode TEXT NOT NULL DEFAULT 'mapped' CHECK (mockup_mode IN ('mapped','custom'))
      );
      CREATE TABLE IF NOT EXISTS category_admin_data (
        category_id TEXT PRIMARY KEY REFERENCES site_categories(id) ON DELETE CASCADE,
        description_en TEXT NOT NULL DEFAULT '', description_ar TEXT NOT NULL DEFAULT '',
        meta_title_en TEXT NOT NULL DEFAULT '', meta_title_ar TEXT NOT NULL DEFAULT '',
        meta_description_en TEXT NOT NULL DEFAULT '', meta_description_ar TEXT NOT NULL DEFAULT '',
        meta_keyword_en TEXT NOT NULL DEFAULT '', meta_keyword_ar TEXT NOT NULL DEFAULT '',
        parent_id TEXT REFERENCES site_categories(id) ON DELETE SET NULL,
        image_ref TEXT NOT NULL DEFAULT '', seo_keyword_en TEXT NOT NULL DEFAULT '', seo_keyword_ar TEXT NOT NULL DEFAULT '',
        layout TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS category_filter_links (
        category_id TEXT NOT NULL REFERENCES site_categories(id) ON DELETE CASCADE,
        filter_id TEXT NOT NULL REFERENCES catalog_filters(id) ON DELETE CASCADE,
        PRIMARY KEY(category_id, filter_id)
      );
      CREATE INDEX IF NOT EXISTS idx_category_admin_parent ON category_admin_data(parent_id);
      CREATE TABLE IF NOT EXISTS product_models (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL REFERENCES site_categories(id),
        name_ar TEXT NOT NULL,
        name_en TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'custom' CHECK (source IN ('custom','printify','other')),
        enabled INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS product_admin_data (
        model_id TEXT PRIMARY KEY REFERENCES product_models(id) ON DELETE CASCADE,
        description_en TEXT NOT NULL DEFAULT '',
        description_ar TEXT NOT NULL DEFAULT '',
        display_image TEXT,
        print_your_dream INTEGER NOT NULL DEFAULT 1,
        published INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS variants (
        id TEXT PRIMARY KEY,
        model_id TEXT NOT NULL REFERENCES product_models(id),
        sku TEXT NOT NULL UNIQUE,
        color TEXT,
        size TEXT,
        options_json TEXT NOT NULL DEFAULT '{}',
        retail_price_jod INTEGER NOT NULL DEFAULT 0,
        enabled INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS printable_areas (
        id TEXT PRIMARY KEY,
        model_id TEXT NOT NULL REFERENCES product_models(id),
        position TEXT NOT NULL,
        width_cm REAL NOT NULL,
        height_cm REAL NOT NULL,
        required_width_px INTEGER,
        required_height_px INTEGER
      );
      CREATE TABLE IF NOT EXISTS product_type_eligibility (
        model_id TEXT NOT NULL REFERENCES product_models(id) ON DELETE CASCADE,
        product_type TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY(model_id, product_type)
      );
      CREATE TABLE IF NOT EXISTS product_media (
        id TEXT PRIMARY KEY,
        model_id TEXT NOT NULL REFERENCES product_models(id) ON DELETE CASCADE,
        storage_key TEXT NOT NULL,
        media_kind TEXT NOT NULL CHECK (media_kind IN ('original','preview','mockup')),
        alt_ar TEXT,
        alt_en TEXT
      );
      CREATE TABLE IF NOT EXISTS supplier_mappings (
        id TEXT PRIMARY KEY,
        model_id TEXT NOT NULL REFERENCES product_models(id) ON DELETE CASCADE,
        blueprint_id TEXT,
        provider_id TEXT,
        variant_id TEXT,
        placeholder_json TEXT,
        decoration_method TEXT,
        source_status TEXT NOT NULL DEFAULT 'unconfigured'
      );

      CREATE TABLE IF NOT EXISTS designs (
        id TEXT PRIMARY KEY,
        designer_id TEXT REFERENCES designer_profiles(user_id),
        title_ar TEXT NOT NULL DEFAULT '',
        title_en TEXT NOT NULL DEFAULT '',
        description_ar TEXT NOT NULL DEFAULT '',
        description_en TEXT NOT NULL DEFAULT '',
        product_type TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        published_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        design_id TEXT NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
        storage_key TEXT NOT NULL UNIQUE,
        original_filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        byte_size INTEGER NOT NULL,
        asset_kind TEXT NOT NULL DEFAULT 'original',
        protected INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS analyzer_results (
        id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        format TEXT, signature TEXT, pixel_width INTEGER, pixel_height INTEGER,
        embedded_dpi REAL, effective_dpi REAL, physical_width_in REAL, physical_height_in REAL,
        has_alpha INTEGER, readable INTEGER NOT NULL DEFAULT 0, analyzable INTEGER NOT NULL DEFAULT 0,
        previewable INTEGER NOT NULL DEFAULT 0, metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS rule_versions (
        id TEXT PRIMARY KEY,
        rule_set TEXT NOT NULL,
        version TEXT NOT NULL,
        definition_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(rule_set, version)
      );
      CREATE TABLE IF NOT EXISTS validation_results (
        id TEXT PRIMARY KEY,
        design_id TEXT NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
        asset_id TEXT REFERENCES assets(id),
        rule_version_id TEXT NOT NULL REFERENCES rule_versions(id),
        status TEXT NOT NULL CHECK (status IN ('passed','warning','failed')),
        errors_json TEXT NOT NULL DEFAULT '[]',
        warnings_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS cover_asset_relations (
        design_id TEXT PRIMARY KEY REFERENCES designs(id) ON DELETE CASCADE,
        asset_id TEXT NOT NULL REFERENCES assets(id)
      );
      CREATE TABLE IF NOT EXISTS master_asset_relations (
        design_id TEXT PRIMARY KEY REFERENCES designs(id) ON DELETE CASCADE,
        asset_id TEXT NOT NULL REFERENCES assets(id),
        explicitly_selected INTEGER NOT NULL DEFAULT 0,
        selected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS carts (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        session_key TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS cart_items (
        id TEXT PRIMARY KEY,
        cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
        variant_id TEXT NOT NULL REFERENCES variants(id),
        design_id TEXT REFERENCES designs(id),
        master_asset_id TEXT REFERENCES assets(id),
        print_spec_json TEXT NOT NULL DEFAULT '{}',
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit_price_jod INTEGER NOT NULL,
        line_key TEXT NOT NULL,
        UNIQUE(cart_id, line_key)
      );
      CREATE TABLE IF NOT EXISTS stocks (
        variant_id TEXT PRIMARY KEY REFERENCES variants(id),
        quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
        tracked INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS reservations (
        id TEXT PRIMARY KEY,
        variant_id TEXT NOT NULL REFERENCES variants(id),
        cart_id TEXT REFERENCES carts(id),
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        status TEXT NOT NULL DEFAULT 'pending',
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS stock_movements (
        id TEXT PRIMARY KEY,
        variant_id TEXT NOT NULL REFERENCES variants(id),
        quantity_delta INTEGER NOT NULL,
        reason TEXT NOT NULL,
        reference_id TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'new',
        payment_status TEXT NOT NULL DEFAULT 'pending',
        fulfillment_mode TEXT NOT NULL DEFAULT 'delivery',
        total_jod INTEGER NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'JOD',
        exchange_rate_json TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        variant_id TEXT NOT NULL REFERENCES variants(id),
        design_id TEXT REFERENCES designs(id),
        master_asset_id TEXT REFERENCES assets(id),
        print_spec_json TEXT NOT NULL DEFAULT '{}',
        price_snapshot_json TEXT NOT NULL DEFAULT '{}',
        quantity INTEGER NOT NULL CHECK (quantity > 0)
      );
      CREATE TABLE IF NOT EXISTS order_checkout_details (
        order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
        source_cart_id TEXT NOT NULL,
        request_key TEXT NOT NULL UNIQUE,
        subtotal_jod INTEGER NOT NULL CHECK(subtotal_jod >= 0),
        delivery_fee_jod INTEGER NOT NULL CHECK(delivery_fee_jod >= 0),
        discount_jod INTEGER NOT NULL DEFAULT 0 CHECK(discount_jod >= 0),
        promotion_id TEXT REFERENCES promotions(id),
        promotion_code TEXT,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        city TEXT,
        address TEXT,
        notes TEXT,
        reservation_expires_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_checkout_source_cart ON order_checkout_details(source_cart_id);
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        method TEXT NOT NULL CHECK (method IN ('bank_transfer','cod','card_future')),
        status TEXT NOT NULL DEFAULT 'pending',
        proof_storage_key TEXT,
        confirmed_by TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS printing_jobs (
        id TEXT PRIMARY KEY,
        order_item_id TEXT NOT NULL REFERENCES order_items(id),
        status TEXT NOT NULL DEFAULT 'queued',
        master_asset_id TEXT REFERENCES assets(id),
        print_spec_snapshot_json TEXT NOT NULL,
        preflight_snapshot_json TEXT NOT NULL,
        protected_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS order_admin_history (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL CHECK (event_type IN ('status_change','note')),
        from_status TEXT,
        to_status TEXT,
        payment_status TEXT,
        internal_comment TEXT,
        admin_actor_id TEXT REFERENCES admin_users(id),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_order_admin_history_order ON order_admin_history(order_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, payment_status, fulfillment_mode);
      CREATE TABLE IF NOT EXISTS supplier_orders (
        id TEXT PRIMARY KEY,
        order_item_id TEXT NOT NULL REFERENCES order_items(id),
        provider TEXT NOT NULL,
        external_order_id TEXT,
        idempotency_key TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'not_submitted',
        response_metadata_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE IF NOT EXISTS designer_earnings (
        id TEXT PRIMARY KEY,
        designer_id TEXT NOT NULL REFERENCES designer_profiles(user_id),
        order_item_id TEXT NOT NULL REFERENCES order_items(id),
        amount_jod INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS ledger_entries (
        id TEXT PRIMARY KEY,
        designer_id TEXT NOT NULL REFERENCES designer_profiles(user_id),
        entry_type TEXT NOT NULL,
        amount_jod INTEGER NOT NULL,
        reference_id TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS withdrawals (
        id TEXT PRIMARY KEY,
        designer_id TEXT NOT NULL REFERENCES designer_profiles(user_id),
        amount_jod INTEGER NOT NULL CHECK (amount_jod > 0),
        status TEXT NOT NULL DEFAULT 'requested',
        payout_details_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS withdrawal_admin_history (
        id TEXT PRIMARY KEY,
        withdrawal_id TEXT NOT NULL REFERENCES withdrawals(id) ON DELETE CASCADE,
        from_status TEXT NOT NULL,
        to_status TEXT NOT NULL,

[1323 more lines in file. Use offset=602 to continue.]        admin_actor_id TEXT REFERENCES admin_users(id),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_withdrawal_admin_history ON withdrawal_admin_history(withdrawal_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_withdrawals_status_created ON withdrawals(status, created_at);
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        title_ar TEXT NOT NULL,
        title_en TEXT NOT NULL,
        body_ar TEXT NOT NULL,
        body_en TEXT NOT NULL,
        read_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS promotions (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        discount_type TEXT NOT NULL CHECK(discount_type IN ('percentage','fixed')),
        discount_value REAL NOT NULL CHECK(discount_value > 0),
        min_spend_jod INTEGER NOT NULL DEFAULT 0 CHECK(min_spend_jod >= 0),
        max_uses INTEGER CHECK(max_uses IS NULL OR max_uses > 0),
        starts_at TEXT,
        expires_at TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS promotion_redemptions (
        id TEXT PRIMARY KEY,
        promotion_id TEXT NOT NULL REFERENCES promotions(id),
        order_id TEXT NOT NULL REFERENCES orders(id),
        customer_id TEXT REFERENCES users(id),
        discount_jod INTEGER NOT NULL CHECK(discount_jod >= 0),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(promotion_id, order_id)
      );
      CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code);
      CREATE INDEX IF NOT EXISTS idx_promotions_enabled_dates ON promotions(enabled, starts_at, expires_at);
      CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_promotion ON promotion_redemptions(promotion_id, created_at);
      CREATE TABLE IF NOT EXISTS business_settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT OR IGNORE INTO business_settings (key, value_json) VALUES ('reservation_minutes', '30');
      CREATE TABLE IF NOT EXISTS navigation_items (
        id TEXT PRIMARY KEY, title_en TEXT NOT NULL, title_ar TEXT NOT NULL, route TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0, enabled INTEGER NOT NULL DEFAULT 1,
        visibility TEXT NOT NULL DEFAULT 'both' CHECK (visibility IN ('both','desktop','mobile')),
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admin_users (
        id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_salt TEXT NOT NULL, password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('main_admin','printing_technician')), enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_login_at TEXT
      );
      CREATE TABLE IF NOT EXISTS admin_permission_assignments (role TEXT NOT NULL CHECK(role IN ('main_admin','printing_technician')), resource TEXT NOT NULL, action TEXT NOT NULL, PRIMARY KEY(role, resource, action));
      CREATE TABLE IF NOT EXISTS admin_user_groups (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, is_system INTEGER NOT NULL DEFAULT 0, protected INTEGER NOT NULL DEFAULT 0, enabled INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS admin_group_permissions (group_id TEXT NOT NULL REFERENCES admin_user_groups(id) ON DELETE CASCADE, resource TEXT NOT NULL, permission TEXT NOT NULL CHECK(permission IN ('access','modify')), PRIMARY KEY(group_id,resource,permission));
      INSERT OR IGNORE INTO admin_user_groups (id,name,is_system,protected) VALUES ('group-main-admin','Main Administrator',1,1),('group-printing-operator','Printing Operator',1,1);
      INSERT OR IGNORE INTO admin_group_permissions (group_id,resource,permission) VALUES ('group-main-admin','admin.dashboard','access'),('group-main-admin','admin.dashboard','modify'),('group-main-admin','admin.orders','access'),('group-main-admin','admin.orders','modify'),('group-main-admin','admin.production','access'),('group-main-admin','admin.production','modify'),('group-main-admin','admin.products.printify','access'),('group-main-admin','admin.products.printify','modify'),('group-main-admin','admin.users','access'),('group-main-admin','admin.users','modify'),('group-main-admin','admin.user_groups','access'),('group-main-admin','admin.user_groups','modify'),('group-main-admin','admin.settings','access'),('group-main-admin','admin.settings','modify'),('group-main-admin','admin.extensions','access'),('group-main-admin','admin.extensions','modify'),('group-main-admin','admin.installer','access'),('group-main-admin','admin.installer','modify'),('group-main-admin','admin.marketplace','access'),('group-main-admin','admin.modifications','access'),('group-main-admin','admin.events','access'),('group-main-admin','admin.cron_jobs','access'),('group-main-admin','admin.layouts','access'),('group-main-admin','admin.theme_editor','access'),('group-main-admin','admin.language_editor','access'),('group-main-admin','admin.banners','access'),('group-main-admin','admin.seo_url','access'),('group-main-admin','admin.recurring_orders','access'),('group-main-admin','admin.returns','access'),('group-main-admin','admin.gift_vouchers','access'),('group-main-admin','admin.customer_groups','access'),('group-main-admin','admin.customer_approvals','access'),('group-main-admin','admin.gdpr','access'),('group-main-admin','admin.custom_fields','access'),('group-main-admin','admin.marketing','access'),('group-main-admin','admin.affiliates','access'),('group-main-admin','admin.coupons','access'),('group-main-admin','admin.mail','access'),('group-main-admin','admin.topics','access'),('group-main-admin','admin.articles','access'),('group-main-admin','admin.comments','access'),('group-main-admin','admin.anti_spam','access'),('group-main-admin','admin.store_locations','access'),('group-main-admin','admin.languages','access'),('group-main-admin','admin.currencies','access'),('group-main-admin','admin.stock_statuses','access'),('group-main-admin','admin.order_statuses','access'),('group-main-admin','admin.subscription_statuses','access'),('group-main-admin','admin.return_statuses','access'),('group-main-admin','admin.return_actions','access'),('group-main-admin','admin.return_reasons','access'),('group-main-admin','admin.countries','access'),('group-main-admin','admin.zones','access'),('group-main-admin','admin.geo_zones','access'),('group-main-admin','admin.tax_classes','access'),('group-main-admin','admin.tax_rates','access'),('group-main-admin','admin.length_classes','access'),('group-main-admin','admin.weight_classes','access'),('group-main-admin','admin.address_formats','access'),('group-main-admin','admin.upgrade','access'),('group-main-admin','admin.backup_restore','access'),('group-main-admin','admin.uploads','access'),('group-main-admin','admin.error_logs','access'),('group-main-admin','admin.visual_qa','access');
      INSERT OR IGNORE INTO admin_group_permissions (group_id,resource,permission) VALUES ('group-printing-operator','admin.dashboard','access'),('group-printing-operator','admin.orders','access'),('group-printing-operator','admin.orders','modify'),('group-printing-operator','admin.production','access'),('group-printing-operator','admin.production','modify');
      INSERT OR IGNORE INTO admin_permission_assignments (role,resource,action) VALUES ('printing_technician','admin.dashboard','access'),('printing_technician','admin.orders','access'),('printing_technician','admin.orders','change_status'),('printing_technician','admin.production','access'),('printing_technician','admin.production','change_status'),('printing_technician','admin.production','download');
      CREATE INDEX IF NOT EXISTS idx_admin_permission_role ON admin_permission_assignments(role, resource, action);

      CREATE TABLE IF NOT EXISTS server_secrets (
        key_name TEXT PRIMARY KEY, secret_value TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS printify_catalog_items (
        id TEXT PRIMARY KEY, blueprint_id TEXT NOT NULL UNIQUE, source_title TEXT NOT NULL DEFAULT '',
        source_description TEXT NOT NULL DEFAULT '', product_type TEXT NOT NULL DEFAULT '', provider_id TEXT,
        source_json TEXT NOT NULL DEFAULT '{}', variants_json TEXT NOT NULL DEFAULT '[]', images_json TEXT NOT NULL DEFAULT '[]',
        sync_status TEXT NOT NULL DEFAULT 'synced', source_available INTEGER NOT NULL DEFAULT 1,
        imported_model_id TEXT, last_synced_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS printify_product_data (
        model_id TEXT PRIMARY KEY REFERENCES product_models(id) ON DELETE CASCADE,
        title_en TEXT NOT NULL DEFAULT '', title_ar TEXT NOT NULL DEFAULT '', description_en TEXT NOT NULL DEFAULT '', description_ar TEXT NOT NULL DEFAULT '',
        display_image TEXT, customer_price_jod INTEGER, print_your_dream INTEGER NOT NULL DEFAULT 1, published INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS printify_variant_settings (
        variant_id TEXT PRIMARY KEY REFERENCES variants(id) ON DELETE CASCADE,
        source_cost_jod INTEGER, enabled INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS printify_source_variants (
        blueprint_id TEXT NOT NULL, print_provider_id TEXT NOT NULL, variant_id TEXT NOT NULL, source_title TEXT NOT NULL DEFAULT '',
        size TEXT, color TEXT, options_json TEXT NOT NULL DEFAULT '{}', source_available INTEGER NOT NULL DEFAULT 1, source_cost_internal REAL,
        source_metadata_json TEXT NOT NULL DEFAULT '{}', image_refs_json TEXT NOT NULL DEFAULT '[]', placeholders_json TEXT NOT NULL DEFAULT '{}',
        source_updated_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (blueprint_id, print_provider_id, variant_id)
      );
      INSERT OR IGNORE INTO navigation_items (id,title_en,title_ar,route,position,enabled,visibility) VALUES
        ('home','Home','الرئيسية','/',1,1,'both'), ('how','How it works','كيف يعمل','/how',2,1,'both'),
        ('dream','Print your dream','اطبع حلمك','/dream',3,1,'both'), ('gallery','Design gallery','معرض التصاميم','/gallery',4,1,'both'),
        ('products','Products','المنتجات','/products',5,1,'both'), ('sitemap','Sitemap','خريطة الموقع','/sitemap',6,1,'mobile');

      -- DTF Studio-owned bootstrap catalog. Supplier categories are intentionally not inserted here.
      INSERT OR IGNORE INTO site_categories (id, name_ar, name_en, show_category_name, enabled, home_featured, home_order, mockup_mode) VALUES
        ('cat-tshirts', 'تيشيرتات', 'T-Shirts', 1, 1, 1, 1, 'custom'),
        ('cat-mugs', 'أكواب', 'Mugs', 1, 1, 1, 2, 'custom'),
        ('cat-caps', 'قبعات', 'Caps', 1, 1, 1, 3, 'custom');
      INSERT OR IGNORE INTO product_models (id, category_id, name_ar, name_en, source, enabled) VALUES
        ('model-tshirt', 'cat-tshirts', 'تيشيرت مخصص', 'Custom T-Shirt', 'custom', 1),
        ('model-mug', 'cat-mugs', 'كوب مخصص', 'Designer Mug', 'custom', 1),
        ('model-cap', 'cat-caps', 'قبعة مخصصة', 'Custom Cap', 'custom', 1);
      INSERT OR IGNORE INTO variants (id, model_id, sku, color, size, options_json, retail_price_jod, enabled) VALUES
        ('variant-tshirt-white-m', 'model-tshirt', 'DTF-TS-WHT-M', 'White', 'M', '{"print":"front"}', 1900, 1),
        ('variant-tshirt-black-m', 'model-tshirt', 'DTF-TS-BLK-M', 'Black', 'M', '{"print":"front"}', 2100, 1),
        ('variant-mug-white', 'model-mug', 'DTF-MUG-WHT', 'White', NULL, '{"print":"wrap"}', 850, 1),
        ('variant-cap-black', 'model-cap', 'DTF-CAP-BLK', 'Black', NULL, '{"print":"front"}', 1000, 1);
      INSERT OR IGNORE INTO printable_areas (id, model_id, position, width_cm, height_cm, required_width_px, required_height_px) VALUES
        ('area-tshirt-front', 'model-tshirt', 'front', 25, 30, 2953, 3543),
        ('area-mug-wrap', 'model-mug', 'wrap', 20, 9, 2362, 1063),
        ('area-cap-front', 'model-cap', 'front', 12, 6, 1417, 709);

      -- Canonical DTF Studio demo designs. Cover assets are intentionally separate from print masters.
      INSERT OR IGNORE INTO designs (id, designer_id, title_ar, title_en, description_ar, description_en, product_type, status, published_at) VALUES
        ('demo-night-wolf', NULL, 'ذئب الليل', 'Night Wolf', '', '', NULL, 'published', '2026-01-01T00:00:01.000Z'),
        ('demo-skull-and-roses', NULL, 'الجمجمة والورود', 'Skull & Roses', '', '', NULL, 'published', '2026-01-01T00:00:02.000Z'),
        ('demo-space-explorer', NULL, 'مستكشف الفضاء', 'Space Explorer', '', '', NULL, 'published', '2026-01-01T00:00:03.000Z'),
        ('demo-street-bear', NULL, 'دب الشارع', 'Street Bear', '', '', NULL, 'published', '2026-01-01T00:00:04.000Z'),
        ('demo-the-warrior', NULL, 'المحارب', 'The Warrior', '', '', NULL, 'published', '2026-01-01T00:00:05.000Z'),
        ('demo-king-of-the-jungle', NULL, 'ملك الغابة', 'King of the Jungle', '', '', NULL, 'published', '2026-01-01T00:00:06.000Z');
      INSERT OR IGNORE INTO assets (id, design_id, storage_key, original_filename, mime_type, byte_size, asset_kind, protected) VALUES
        ('asset-demo-night-wolf', 'demo-night-wolf', 'assets/designs/night-wolf_4500x5400_300dpi.png', 'night-wolf_4500x5400_300dpi.png', 'image/png', 18594291, 'cover', 1),
        ('asset-demo-skull-and-roses', 'demo-skull-and-roses', 'assets/designs/skull-and-roses_4500x5400_300dpi.png', 'skull-and-roses_4500x5400_300dpi.png', 'image/png', 16900895, 'cover', 1),
        ('asset-demo-space-explorer', 'demo-space-explorer', 'assets/designs/space-explorer_4500x5400_300dpi.png', 'space-explorer_4500x5400_300dpi.png', 'image/png', 18558583, 'cover', 1),
        ('asset-demo-street-bear', 'demo-street-bear', 'assets/designs/street-bear_4500x5400_300dpi.png', 'street-bear_4500x5400_300dpi.png', 'image/png', 11103154, 'cover', 1),
        ('asset-demo-the-warrior', 'demo-the-warrior', 'assets/designs/the-warrior_4500x5400_300dpi.png', 'the-warrior_4500x5400_300dpi.png', 'image/png', 19204449, 'cover', 1),
        ('asset-demo-king-of-the-jungle', 'demo-king-of-the-jungle', 'assets/designs/king-of-the-jungle_4500x5400_300dpi.png', 'king-of-the-jungle_4500x5400_300dpi.png', 'image/png', 16481699, 'cover', 1);
      INSERT OR IGNORE INTO cover_asset_relations (design_id, asset_id) VALUES
        ('demo-night-wolf', 'asset-demo-night-wolf'),
        ('demo-skull-and-roses', 'asset-demo-skull-and-roses'),
        ('demo-space-explorer', 'asset-demo-space-explorer'),
        ('demo-street-bear', 'asset-demo-street-bear'),
        ('demo-the-warrior', 'asset-demo-the-warrior'),
        ('demo-king-of-the-jungle', 'asset-demo-king-of-the-jungle');
    `);
    this.bootstrapCatalog();
  }

  private bootstrapCatalog(): void {
    try {
      this.ctx.storage.sql.exec("ALTER TABLE admin_users ADD COLUMN group_id TEXT");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/already exists|duplicate column name/i.test(message)) throw error;
    }
    execSqlScript(this.ctx.storage.sql, `
      INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('schema_version', 'phase-1.3');
      UPDATE admin_users SET group_id=CASE WHEN role='main_admin' THEN 'group-main-admin' ELSE 'group-printing-operator' END WHERE group_id IS NULL;
      CREATE TABLE IF NOT EXISTS auth_credentials (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        password_salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT OR IGNORE INTO roles (id, name) VALUES
        ('role-customer', 'customer'), ('role-designer', 'designer'), ('role-admin', 'admin'), ('role-operator', 'operator');
      INSERT OR IGNORE INTO site_categories (id, name_ar, name_en, show_category_name, enabled, home_featured, home_order, mockup_mode) VALUES
        ('cat-tshirts', 'تيشيرتات', 'T-Shirts', 1, 1, 1, 1, 'custom'),
        ('cat-mugs', 'أكواب', 'Mugs', 1, 1, 1, 2, 'custom'),
        ('cat-caps', 'قبعات', 'Caps', 1, 1, 1, 3, 'custom');
      INSERT OR IGNORE INTO product_models (id, category_id, name_ar, name_en, source, enabled) VALUES
        ('model-tshirt', 'cat-tshirts', 'تيشيرت مخصص', 'Custom T-Shirt', 'custom', 1),
        ('model-mug', 'cat-mugs', 'كوب مخصص', 'Designer Mug', 'custom', 1),
        ('model-cap', 'cat-caps', 'قبعة مخصصة', 'Custom Cap', 'custom', 1);
      INSERT OR IGNORE INTO variants (id, model_id, sku, color, size, options_json, retail_price_jod, enabled) VALUES
        ('variant-tshirt-white-m', 'model-tshirt', 'DTF-TS-WHT-M', 'White', 'M', '{"print":"front"}', 1900, 1),
        ('variant-tshirt-black-m', 'model-tshirt', 'DTF-TS-BLK-M', 'Black', 'M', '{"print":"front"}', 2100, 1),
        ('variant-mug-white', 'model-mug', 'DTF-MUG-WHT', 'White', NULL, '{"print":"wrap"}', 850, 1),
        ('variant-cap-black', 'model-cap', 'DTF-CAP-BLK', 'Black', NULL, '{"print":"front"}', 1000, 1);
      INSERT OR IGNORE INTO printable_areas (id, model_id, position, width_cm, height_cm, required_width_px, required_height_px) VALUES
        ('area-tshirt-front', 'model-tshirt', 'front', 25, 30, 2953, 3543),
        ('area-mug-wrap', 'model-mug', 'wrap', 20, 9, 2362, 1063),
        ('area-cap-front', 'model-cap', 'front', 12, 6, 1417, 709);
    `);
    try { this.ctx.storage.sql.exec("ALTER TABLE printify_product_data ADD COLUMN selected_provider_id TEXT"); } catch {}
    for (const stmt of ["ALTER TABLE catalog_downloads ADD COLUMN mime_type TEXT", "ALTER TABLE catalog_downloads ADD COLUMN byte_size INTEGER", "ALTER TABLE catalog_downloads ADD COLUMN status INTEGER NOT NULL DEFAULT 1"]) { try { this.ctx.storage.sql.exec(stmt); } catch {} }
  }

  list(): Item[] {
    return this.ctx.storage.sql.exec<Item>("SELECT id, title, status, created_at AS createdAt FROM items ORDER BY id DESC").toArray();
  }

  create(title: string): Item {
    return this.ctx.storage.sql.exec<Item>("INSERT INTO items (title) VALUES (?) RETURNING id, title, status, created_at AS createdAt", title.slice(0, 120)).one();
  }

  updateStatus(id: number, status: Item["status"]): void {
    this.ctx.storage.sql.exec("UPDATE items SET status = ? WHERE id = ?", status, id);
  }

  remove(id: number): void { this.ctx.storage.sql.exec("DELETE FROM items WHERE id = ?", id); }

  health(): StudioHealth {
    this.bootstrapCatalog();
    const tables = this.ctx.storage.sql.exec<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").toArray().map((row) => row.name);
    const version = this.ctx.storage.sql.exec<{ value: string }>("SELECT value FROM schema_meta WHERE key = 'schema_version'").one().value;
    return { schemaVersion: version, tables, previewCatalog: true, liveIntegrations: { printify: "blocked", payments: "not_configured" } };
  }

  categories(access: Access = {}): StudioCategory[] {
    this.bootstrapCatalog();
    if (access.role !== "admin") {
      return this.ctx.storage.sql.exec<StudioCategory>("SELECT id, name_ar AS nameAr, name_en AS nameEn, enabled, home_featured AS homeFeatured, home_order AS homeOrder FROM site_categories WHERE enabled = 1 ORDER BY home_order, name_en").toArray();
    }
    return this.ctx.storage.sql.exec<StudioCategory>("SELECT id, name_ar AS nameAr, name_en AS nameEn, enabled, home_featured AS homeFeatured, home_order AS homeOrder FROM site_categories ORDER BY home_order, name_en").toArray();
  }

  getCart(sessionKey: string): CartSnapshot {
    this.bootstrapCatalog();
    const safeSession = sessionKey.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "anonymous";
    const cartId = `guest-${safeSession}`;
    this.ctx.storage.sql.exec("INSERT OR IGNORE INTO carts (id, session_key) VALUES (?, ?)", cartId, safeSession);
    const lines = this.ctx.storage.sql.exec<CartLine>(`
      SELECT ci.id, ci.variant_id AS variantId, v.sku, m.name_en AS productName, v.color, v.size,
             ci.quantity, CAST(ci.unit_price_jod AS REAL) / 100.0 AS unitPriceJod,
             (CAST(ci.unit_price_jod AS REAL) / 100.0) * ci.quantity AS lineTotalJod,
             ci.design_id AS designId, ci.master_asset_id AS masterAssetId
      FROM cart_items ci JOIN variants v ON v.id = ci.variant_id JOIN product_models m ON m.id = v.model_id
      WHERE ci.cart_id = ? ORDER BY ci.id
    `, cartId).toArray();
    return { cartId, lines, itemCount: lines.reduce((sum, line) => sum + line.quantity, 0), subtotalJod: lines.reduce((sum, line) => sum + line.lineTotalJod, 0) };
  }

  addCartItem(input: { sessionKey: string; variantId: string; designId?: string; masterAssetId?: string; printSpecJson?: string; quantity?: number }): CartSnapshot {
    this.bootstrapCatalog();
    const safeSession = input.sessionKey.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "anonymous";
    const cartId = `guest-${safeSession}`;
    const quantity = Math.max(1, Math.min(99, Math.floor(input.quantity ?? 1)));
    const variant = this.ctx.storage.sql.exec<{ id: string; price: number }>("SELECT id, retail_price_jod AS price FROM variants WHERE id = ? AND enabled = 1", input.variantId).one();
    const lineKey = [variant.id, input.designId ?? "", input.masterAssetId ?? "", input.printSpecJson ?? "{}"].join(":");
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec("INSERT OR IGNORE INTO carts (id, session_key) VALUES (?, ?)", cartId, safeSession);
      this.ctx.storage.sql.exec("UPDATE carts SET status='open' WHERE id=?",cartId);
      this.ctx.storage.sql.exec(`
        INSERT INTO cart_items (id, cart_id, variant_id, design_id, master_asset_id, print_spec_json, quantity, unit_price_jod, line_key)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(cart_id, line_key) DO UPDATE SET quantity = MIN(cart_items.quantity + excluded.quantity, 99)
      `, crypto.randomUUID(), cartId, variant.id, input.designId ?? null, input.masterAssetId ?? null, input.printSpecJson ?? "{}", quantity, variant.price, lineKey);
    });
    return this.getCart(safeSession);
  }

  removeCartItem(sessionKey: string, lineId: string): CartSnapshot {
    const safeSession = sessionKey.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "anonymous";
    this.ctx.storage.sql.exec("DELETE FROM cart_items WHERE id = ? AND cart_id = ?", lineId, `guest-${safeSession}`);
    return this.getCart(safeSession);
  }

  private normalizeCartKey(value:string):string { return String(value||"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,80)||"anonymous"; }

  private checkoutPromotion(codeValue:string,subtotalCents:number):any{
    const code=String(codeValue||"").trim().toUpperCase().replace(/[^A-Z0-9_-]/g,"").slice(0,40);
    if(!code)return null;
    const row=this.ctx.storage.sql.exec<any>("SELECT id,code,discount_type AS discountType,discount_value AS discountValue,min_spend_jod AS minSpendJod,max_uses AS maxUses,starts_at AS startsAt,expires_at AS expiresAt,enabled FROM promotions WHERE code=?",code).toArray()[0];
    if(!row)throw new Error("Coupon code was not found.");
    if(Number(row.enabled)!==1)throw new Error("This coupon is disabled.");
    const now=Date.now();if(row.startsAt&&Date.parse(String(row.startsAt))>now)throw new Error("This coupon is not active yet.");if(row.expiresAt&&Date.parse(String(row.expiresAt))<now)throw new Error("This coupon has expired.");
    const used=Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS count FROM promotion_redemptions WHERE promotion_id=?",row.id).toArray()[0]?.count??0);
    if(row.maxUses!==null&&used>=Number(row.maxUses))throw new Error("This coupon has reached its usage limit.");
    if(subtotalCents<Number(row.minSpendJod||0))throw new Error("Cart subtotal does not meet this coupon's minimum spend.");
    let discount=String(row.discountType)==="percentage"?Math.round(subtotalCents*Math.min(100,Math.max(0,Number(row.discountValue)))/100):Math.round(Math.max(0,Number(row.discountValue))*100);
    discount=Math.max(0,Math.min(subtotalCents,discount));
    if(discount<=0)throw new Error("This coupon does not produce a valid discount.");
    return {...row,usedCount:used,discountJod:discount};
  }

  checkoutPreview(cartSessionKey:string,couponCode="",fulfillmentMode:"delivery"|"store_pickup"="delivery"):unknown{
    this.bootstrapCatalog();const key=this.normalizeCartKey(cartSessionKey),cartId=`guest-${key}`;
    const lines=this.ctx.storage.sql.exec<any>(`SELECT ci.id,ci.variant_id AS variantId,ci.design_id AS designId,ci.master_asset_id AS masterAssetId,ci.print_spec_json AS printSpecJson,ci.quantity,ci.unit_price_jod AS unitPriceJod,v.sku,v.enabled AS variantEnabled,pm.enabled AS productEnabled,pm.name_en AS productName
      FROM cart_items ci JOIN variants v ON v.id=ci.variant_id JOIN product_models pm ON pm.id=v.model_id WHERE ci.cart_id=? ORDER BY ci.id`,cartId).toArray();
    if(!lines.length)throw new Error("Cart is empty.");
    const subtotalJod=lines.reduce((sum:number,x:any)=>sum+Number(x.unitPriceJod||0)*Number(x.quantity||0),0);
    const settings=(this.businessSettingsSnapshot() as any).settings;
    const deliveryFeeJod=fulfillmentMode==="store_pickup"?0:(subtotalJod>=Math.round(Number(settings.freeDeliveryThreshold||0)*100)?0:Math.round(Number(settings.standardDeliveryFee||0)*100));
    const promotion=this.checkoutPromotion(couponCode,subtotalJod);
    const discountJod=Number(promotion?.discountJod||0);const totalJod=Math.max(0,subtotalJod+deliveryFeeJod-discountJod);
    const issues:string[]=[];
    this.ctx.storage.sql.exec("UPDATE reservations SET status='expired' WHERE status='pending' AND datetime(expires_at)<=datetime('now')");
    for(const line of lines){
      if(Number(line.variantEnabled)!==1||Number(line.productEnabled)!==1)issues.push(`${line.sku}: product or variant is unavailable.`);
      const stock=this.ctx.storage.sql.exec<any>("SELECT quantity,tracked FROM stocks WHERE variant_id=?",line.variantId).toArray()[0];
      if(stock&&Number(stock.tracked)===1){const reserved=Number(this.ctx.storage.sql.exec<any>("SELECT COALESCE(SUM(quantity),0) AS qty FROM reservations WHERE variant_id=? AND status='pending' AND datetime(expires_at)>datetime('now') AND cart_id<>?",line.variantId,cartId).toArray()[0]?.qty??0);const available=Math.max(0,Number(stock.quantity||0)-reserved);if(available<Number(line.quantity))issues.push(`${line.sku}: only ${available} unit(s) available.`);}
      if(line.designId){
        if(!line.masterAssetId){issues.push(`${line.sku}: Ready-to-Print Master is required.`);continue;}
        const master=this.ctx.storage.sql.exec<any>("SELECT mar.asset_id AS masterAssetId,mar.explicitly_selected AS explicitlySelected FROM master_asset_relations mar WHERE mar.design_id=?",line.designId).toArray()[0];
        if(!master||Number(master.explicitlySelected)!==1||String(master.masterAssetId)!==String(line.masterAssetId)){issues.push(`${line.sku}: selected master does not match the approved Ready-to-Print Master.`);continue;}

[1022 more lines in file. Use offset=903 to continue.]        if(!validation||String(validation.status).toLowerCase()!=="passed")issues.push(`${line.sku}: approved master has no passing preflight result.`);
      }
    }
    return {cartId,lines:lines.map((x:any)=>({id:x.id,variantId:x.variantId,sku:x.sku,productName:x.productName,quantity:Number(x.quantity),unitPriceJod:Number(x.unitPriceJod),lineTotalJod:Number(x.unitPriceJod)*Number(x.quantity),designId:x.designId,masterAssetId:x.masterAssetId})),subtotalJod,deliveryFeeJod,discountJod,totalJod,currency:"JOD",promotion:promotion?{id:promotion.id,code:promotion.code,discountJod}:null,issues,canCheckout:issues.length===0,settings:{reservationMinutes:Number(settings.bankTransferReservationMinutes||30),storePickupEnabled:Boolean(settings.storePickupEnabled),storePickupAddress:String(settings.storePickupAddress||"")}};
  }

  createCheckoutOrder(input:{sessionId:string;cartSessionKey:string;requestKey:string;couponCode?:string;fulfillmentMode?:"delivery"|"store_pickup";paymentMethod?:"bank_transfer"|"cod";customerName:string;customerPhone:string;city?:string;address?:string;notes?:string}):unknown{
    this.bootstrapCatalog();const identity=this.sessionIdentity(input.sessionId);if(!identity||identity.role!=="customer")throw new Error("Customer sign-in is required before checkout.");
    const cartKey=this.normalizeCartKey(input.cartSessionKey);const cartId=`guest-${cartKey}`;const requestKey=String(input.requestKey||"").trim().replace(/[^a-zA-Z0-9_-]/g,"").slice(0,120);if(requestKey.length<8)throw new Error("Checkout request key is invalid.");
    const existing=this.ctx.storage.sql.exec<any>("SELECT order_id AS orderId FROM order_checkout_details WHERE request_key=?",requestKey).toArray()[0];if(existing)return this.adminOrderDetail(String(existing.orderId));
    const fulfillment=input.fulfillmentMode==="store_pickup"?"store_pickup":"delivery";const payment=input.paymentMethod==="cod"?"cod":"bank_transfer";
    const preview=this.checkoutPreview(cartKey,input.couponCode||"",fulfillment) as any;if(!preview.canCheckout)throw new Error(String(preview.issues?.[0]||"Cart is not ready for checkout."));
    const customerName=String(input.customerName||"").trim().slice(0,160);const customerPhone=String(input.customerPhone||"").trim().slice(0,60);if(customerName.length<2||customerPhone.length<5)throw new Error("Customer name and phone are required.");
    const city=String(input.city||"").trim().slice(0,120),address=String(input.address||"").trim().slice(0,1000),notes=String(input.notes||"").trim().slice(0,2000);if(fulfillment==="delivery"&&!address)throw new Error("Delivery address is required.");
    const settings=(this.businessSettingsSnapshot() as any).settings;const reservationMinutes=Math.max(5,Math.min(120,Number(settings.bankTransferReservationMinutes||30)));const expiresAt=new Date(Date.now()+reservationMinutes*60000).toISOString();const orderId=crypto.randomUUID();const initialStatus=payment==="bank_transfer"?"payment_pending":"new";
    this.ctx.storage.transactionSync(()=>{
      const promotion=preview.promotion?this.checkoutPromotion(String(preview.promotion.code),Number(preview.subtotalJod)):null;
      this.ctx.storage.sql.exec("UPDATE reservations SET status='expired' WHERE status='pending' AND datetime(expires_at)<=datetime('now')");
      for(const line of preview.lines){
        const stock=this.ctx.storage.sql.exec<any>("SELECT quantity,tracked FROM stocks WHERE variant_id=?",line.variantId).toArray()[0];if(stock&&Number(stock.tracked)===1){const reserved=Number(this.ctx.storage.sql.exec<any>("SELECT COALESCE(SUM(quantity),0) AS qty FROM reservations WHERE variant_id=? AND status='pending' AND datetime(expires_at)>datetime('now') AND cart_id<>?",line.variantId,cartId).toArray()[0]?.qty??0);if(Number(stock.quantity)-reserved<Number(line.quantity))throw new Error(`${line.sku}: stock changed before checkout; please review the cart.`);}
      }
      this.ctx.storage.sql.exec("INSERT INTO orders (id,user_id,status,payment_status,fulfillment_mode,total_jod,currency) VALUES (?,?,?,?,?,?,?)",orderId,identity.userId,initialStatus,"pending",fulfillment,Number(preview.totalJod),"JOD");
      this.ctx.storage.sql.exec("INSERT INTO order_checkout_details (order_id,source_cart_id,request_key,subtotal_jod,delivery_fee_jod,discount_jod,promotion_id,promotion_code,customer_name,customer_phone,city,address,notes,reservation_expires_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",orderId,cartId,requestKey,Number(preview.subtotalJod),Number(preview.deliveryFeeJod),Number(preview.discountJod),promotion?.id??null,promotion?.code??null,customerName,customerPhone,city||null,fulfillment==="store_pickup"?String(settings.storePickupAddress||""):address,notes||null,expiresAt);
      for(const line of preview.lines){const itemId=crypto.randomUUID();const raw=this.ctx.storage.sql.exec<any>("SELECT design_id AS designId,master_asset_id AS masterAssetId,print_spec_json AS printSpecJson,unit_price_jod AS unitPriceJod FROM cart_items WHERE id=? AND cart_id=?",line.id,cartId).toArray()[0];if(!raw)throw new Error("Cart changed before checkout.");let preflight:any=null;if(raw.designId&&raw.masterAssetId){preflight=this.ctx.storage.sql.exec<any>("SELECT status,errors_json AS errorsJson,warnings_json AS warningsJson,created_at AS createdAt FROM validation_results WHERE design_id=? AND asset_id=? ORDER BY created_at DESC LIMIT 1",raw.designId,raw.masterAssetId).toArray()[0];if(!preflight||String(preflight.status).toLowerCase()!=="passed")throw new Error("Ready-to-Print Master preflight is no longer passing.");this.ctx.storage.sql.exec("UPDATE assets SET protected=1 WHERE id=?",raw.masterAssetId);}
        this.ctx.storage.sql.exec("INSERT INTO order_items (id,order_id,variant_id,design_id,master_asset_id,print_spec_json,price_snapshot_json,quantity) VALUES (?,?,?,?,?,?,?,?)",itemId,orderId,line.variantId,raw.designId??null,raw.masterAssetId??null,String(raw.printSpecJson||"{}"),JSON.stringify({unitPriceJod:Number(raw.unitPriceJod),currency:"JOD",preflight:preflight??null}),Number(line.quantity));
        const stock=this.ctx.storage.sql.exec<any>("SELECT tracked FROM stocks WHERE variant_id=?",line.variantId).toArray()[0];if(stock&&Number(stock.tracked)===1)this.ctx.storage.sql.exec("INSERT INTO reservations (id,variant_id,cart_id,quantity,status,expires_at) VALUES (?,?,?,?, 'pending',?)",crypto.randomUUID(),line.variantId,cartId,Number(line.quantity),expiresAt);
      }
      this.ctx.storage.sql.exec("INSERT INTO payments (id,order_id,method,status) VALUES (?,?,?,'pending')",crypto.randomUUID(),orderId,payment);
      if(promotion)this.ctx.storage.sql.exec("INSERT INTO promotion_redemptions (id,promotion_id,order_id,customer_id,discount_jod) VALUES (?,?,?,?,?)",crypto.randomUUID(),promotion.id,orderId,identity.userId,Number(preview.discountJod));
      this.ctx.storage.sql.exec("UPDATE carts SET user_id=?,status='checked_out' WHERE id=?",identity.userId,cartId);
      this.ctx.storage.sql.exec("DELETE FROM cart_items WHERE cart_id=?",cartId);
      this.ctx.storage.sql.exec("INSERT INTO audit_logs (actor_id,actor_role,action,resource_type,resource_id,metadata_json) VALUES (?,'customer','customer.checkout.create','order',?,?)",identity.userId,orderId,JSON.stringify({result:"success",metadata:{fulfillmentMode:fulfillment,paymentMethod:payment,promotionApplied:Boolean(promotion),discountJod:Number(preview.discountJod),reservationExpiresAt:expiresAt}}));
    });
    return this.adminOrderDetail(orderId);
  }

  async submitDesignerQualification(sessionId:string,input:any):Promise<unknown>{
    this.bootstrapCatalog(); const identity=this.sessionIdentity(sessionId); if(!identity||identity.role!=="designer") throw new Error("Authenticated Designer account is required.");
    if(!this.designAssets) throw new Error("Secure qualification storage is not configured."); const slots=Array.isArray(input?.slots)?input.slots:[];
    if(slots.length!==3||slots.some((s:any)=>!Array.isArray(s.files)||s.files.length===0)) throw new Error("Exactly 3 non-empty qualification design slots are required.");
    if(slots.some((s:any)=>s.files.some((f:any)=>!f.analysis?.signatureValid||!f.preflight?.passed))) throw new Error("All qualification files must pass preflight.");
    const prior=this.ctx.storage.sql.exec<any>("SELECT id FROM designer_applications WHERE designer_id=? AND lower(status)=? ORDER BY submitted_at DESC LIMIT 1",identity.userId,"replacement_required").toArray()[0]; const applicationId=String(prior?.id||crypto.randomUUID()); const staged:string[]=[];
    try { for(let i=0;i<3;i++) for(const f of slots[i].files){const inputKey=String(f.storageKey||""); const filename=inputKey.split("/").pop()||"upload"; const key="qualification/"+identity.userId+"/"+applicationId+"/"+filename; await this.designAssets.put(key,f.bytes,{httpMetadata:{contentType:String(f.mime||"application/octet-stream")},customMetadata:{qualification:"true",slot:String(i+1)}}); staged.push(key);}
      const due=new Date(Date.now()+5*24*60*60*1000).toISOString(); this.ctx.storage.transactionSync(()=>{
        this.ctx.storage.sql.exec("INSERT OR IGNORE INTO designer_applications (id,designer_id,status) VALUES (?,?,?)",applicationId,identity.userId,"submitted"); this.ctx.storage.sql.exec("DELETE FROM qualification_designs WHERE application_id=?",applicationId);
        for(let i=0;i<3;i++){const designId=crypto.randomUUID(); this.ctx.storage.sql.exec("INSERT INTO designs (id,designer_id,title_en,title_ar,description_en,description_ar,status) VALUES (?,?,?,?,?,?,?)",designId,identity.userId,"Qualification Design "+(i+1),"تصميم التأهيل "+(i+1),"Qualification submission","تقديم التأهيل","pending_review"); this.ctx.storage.sql.exec("INSERT INTO qualification_designs (id,application_id,design_id,slot) VALUES (?,?,?,?)",crypto.randomUUID(),applicationId,designId,i+1);
          for(const f of slots[i].files){const a=f.analysis||{},p=f.preflight||{},assetId=crypto.randomUUID(); this.ctx.storage.sql.exec("INSERT INTO assets (id,design_id,storage_key,original_filename,mime_type,byte_size,asset_kind) VALUES (?,?,?,?,?,?,?)",assetId,designId,f.storageKey,String(f.filename).slice(0,240),String(f.mime||"application/octet-stream"),Number(f.byteSize)); this.ctx.storage.sql.exec("INSERT INTO analyzer_results (id,asset_id,format,signature,pixel_width,pixel_height,effective_dpi,readable,analyzable,previewable,metadata_json) VALUES (?,?,?,?,?,?,?,?,?,?,?)",crypto.randomUUID(),assetId,String(a.format||""),a.signatureValid?"verified":"invalid",Number(a.pixelWidth||0),Number(a.pixelHeight||0),p.effectiveDpi?.minimum==null?null:Number(p.effectiveDpi.minimum),p.readable?1:0,p.analyzable?1:0,p.previewable?1:0,JSON.stringify({qualification:true,slot:i+1})); const version=String(a.ruleVersion||"dtf-preflight-v1.0"); this.ctx.storage.sql.exec("INSERT OR IGNORE INTO rule_versions (id,rule_set,version,definition_json) VALUES (?,?,?,?)","qualification-"+version,"qualification-preflight",version,"{}"); const rv=this.ctx.storage.sql.exec<any>("SELECT id FROM rule_versions WHERE rule_set=? AND version=?","qualification-preflight",version).toArray()[0]; this.ctx.storage.sql.exec("INSERT INTO validation_results (id,design_id,asset_id,rule_version_id,status,errors_json,warnings_json) VALUES (?,?,?,?,?,?,?)",crypto.randomUUID(),designId,assetId,rv.id,"passed",JSON.stringify(p.errors||[]),JSON.stringify(p.warnings||[]));}}
        this.ctx.storage.sql.exec("UPDATE designer_applications SET status='submitted',submitted_at=CURRENT_TIMESTAMP,review_due_at=?,rejection_reason=NULL,replacement_due_at=NULL WHERE id=?",due,applicationId); this.ctx.storage.sql.exec("UPDATE designer_profiles SET review_due_at=?,rejection_reason=NULL WHERE user_id=?",due,identity.userId); this.ctx.storage.sql.exec("INSERT INTO audit_logs (actor_id,actor_role,action,resource_type,resource_id,metadata_json) VALUES (?,'designer','designer.qualification.submit','designer_application',?,?)",identity.userId,applicationId,JSON.stringify({result:"success",metadata:{slotCount:3}})); }); return {applicationId,status:"submitted",reviewDueAt:due};
    } catch(error){for(const key of staged){try{await this.designAssets.delete(key);}catch{}} throw error;}
  }

  private authorizedDesigner(sessionId:string):any{
    const identity=this.sessionIdentity(sessionId);if(!identity||identity.role!=="designer")throw new Error("Designer sign-in is required.");
    const profile=this.ctx.storage.sql.exec<any>("SELECT authorization_status AS authorizationStatus FROM designer_profiles WHERE user_id=?",identity.userId).toArray()[0];
    if(!profile||String(profile.authorizationStatus).toLowerCase()!=="authorized")throw new Error("Designer Dashboard is available after qualification approval.");
    return {...identity,authorizationStatus:profile.authorizationStatus};
  }

  designerWorkspace(sessionId:string):unknown{
    this.bootstrapCatalog();const designer=this.authorizedDesigner(sessionId);const parse=(v:any,f:any)=>{try{return JSON.parse(String(v??""));}catch{return f;}};
    const designs=this.ctx.storage.sql.exec<any>("SELECT d.id AS designId,d.title_en AS titleEn,d.title_ar AS titleAr,d.description_en AS descriptionEn,d.description_ar AS descriptionAr,d.product_type AS productType,d.status,d.created_at AS createdAt,d.published_at AS publishedAt,c.asset_id AS coverAssetId,m.asset_id AS masterAssetId,m.explicitly_selected AS masterExplicit FROM designs d LEFT JOIN cover_asset_relations c ON c.design_id=d.id LEFT JOIN master_asset_relations m ON m.design_id=d.id WHERE d.designer_id=? ORDER BY d.created_at DESC,d.id DESC",designer.userId).toArray();
    return {designer,designs:designs.map((d:any)=>{const assets=this.ctx.storage.sql.exec<any>("SELECT a.id AS assetId,a.original_filename AS filename,a.mime_type AS mimeType,a.byte_size AS byteSize,a.asset_kind AS assetKind,a.protected,a.created_at AS createdAt,ar.format,ar.pixel_width AS pixelWidth,ar.pixel_height AS pixelHeight,ar.embedded_dpi AS embeddedDpi,ar.effective_dpi AS effectiveDpi,ar.has_alpha AS hasAlpha,ar.readable,ar.analyzable,ar.previewable,ar.metadata_json AS metadataJson,(SELECT vr.status FROM validation_results vr WHERE vr.asset_id=a.id ORDER BY vr.created_at DESC LIMIT 1) AS preflightStatus,(SELECT vr.errors_json FROM validation_results vr WHERE vr.asset_id=a.id ORDER BY vr.created_at DESC LIMIT 1) AS errorsJson,(SELECT vr.warnings_json FROM validation_results vr WHERE vr.asset_id=a.id ORDER BY vr.created_at DESC LIMIT 1) AS warningsJson FROM assets a LEFT JOIN analyzer_results ar ON ar.id=(SELECT x.id FROM analyzer_results x WHERE x.asset_id=a.id ORDER BY x.created_at DESC LIMIT 1) WHERE a.design_id=? ORDER BY a.created_at DESC,a.id DESC",d.designId).toArray().map((a:any)=>({...a,isCover:String(d.coverAssetId||"")===String(a.assetId),isMaster:String(d.masterAssetId||"")===String(a.assetId),metadata:parse(a.metadataJson,{}),errors:parse(a.errorsJson,[]),warnings:parse(a.warningsJson,[])}));return {...d,assets};})};
  }

  createDesignerDesign(sessionId:string,input:any):unknown{
    this.bootstrapCatalog();const designer=this.authorizedDesigner(sessionId);const required=[["titleAr","Arabic Title"],["titleEn","English Title"],["descriptionAr","Arabic Description"],["descriptionEn","English Description"]] as const;
    const clean:any={};for(const [key,label] of required){clean[key]=String(input?.[key]??"").trim().slice(0,key.startsWith("description")?5000:240);if(!clean[key])throw new Error("Missing required field: "+label+".");}
    const productType=String(input?.productType??"").trim();if(!DESIGN_PRODUCT_TYPES.includes(productType as any))throw new Error("Select one of the 7 supported Product Type combinations.");
    const designId=String(input?.designId??"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,100);if(!designId)throw new Error("Design ID is required.");
    const assets=Array.isArray(input?.assets)?input.assets.slice(0,20):[];if(!assets.length)throw new Error("Upload at least one design asset.");if(assets.filter((a:any)=>Boolean(a.isMaster)).length!==1)throw new Error("Select exactly one Ready-to-Print Master.");
    if(assets.filter((a:any)=>Boolean(a.isCover)).length>1)throw new Error("Select only one Main Display Image.");
    const master=assets.find((a:any)=>Boolean(a.isMaster));if(!master?.preflight?.passed)throw new Error("The selected Ready-to-Print Master must pass preflight.");
    let cover=assets.find((a:any)=>Boolean(a.isCover));
    if(cover&&(!Boolean(cover?.analysis?.previewable)||!String(cover?.mime||cover?.analysis?.mime||"").startsWith("image/")))throw new Error("Main Display Image must be a previewable image asset.");
    if(!cover)cover=[...assets].reverse().find((a:any)=>Boolean(a?.analysis?.previewable)&&String(a?.mime||a?.analysis?.mime||"").startsWith("image/"));
    if(!cover)throw new Error("At least one uploaded image must be previewable for the Main Display Image.");
    const expectedPrefix=`designer/${designer.userId}/${designId}/`;for(const a of assets){if(!String(a.storageKey||"").startsWith(expectedPrefix))throw new Error("Asset storage path is outside the designer/design namespace.");if(!a.analysis?.signatureValid)throw new Error("Uploaded asset signature validation failed.");}
    const minDpi=Math.max(72,Math.min(1200,Math.round(Number(input?.minDpi)||300)));const ruleVersion="1.0-dpi-"+minDpi;const ruleId="rule-dtf-preflight-"+ruleVersion;
    this.ctx.storage.transactionSync(()=>{
      if(this.ctx.storage.sql.exec<any>("SELECT id FROM designs WHERE id=?",designId).toArray()[0])throw new Error("Design ID already exists.");
      this.ctx.storage.sql.exec("INSERT OR IGNORE INTO rule_versions (id,rule_set,version,definition_json) VALUES (?,'dtf-preflight',?,?)",ruleId,ruleVersion,JSON.stringify({minEffectiveDpi:minDpi,productTypes:[...DESIGN_PRODUCT_TYPES]}));
      this.ctx.storage.sql.exec("INSERT INTO designs (id,designer_id,title_ar,title_en,description_ar,description_en,product_type,status) VALUES (?,?,?,?,?,?,?,'pending_review')",designId,designer.userId,clean.titleAr,clean.titleEn,clean.descriptionAr,clean.descriptionEn,productType);
      for(const raw of assets){const assetId=String(raw.assetId||"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,100);if(!assetId)throw new Error("Asset ID is required.");const filename=String(raw.filename||"asset").replace(/[\\/\0]/g,"_").slice(0,240);const mime=String(raw.mime||raw.analysis?.mime||"application/octet-stream").slice(0,120);const bytes=Math.max(1,Math.floor(Number(raw.byteSize)||0));const kind=raw.isMaster?"master":raw.isCover?"cover":"original";const a=raw.analysis||{},p=raw.preflight||{};
        this.ctx.storage.sql.exec("INSERT INTO assets (id,design_id,storage_key,original_filename,mime_type,byte_size,asset_kind) VALUES (?,?,?,?,?,?,?)",assetId,designId,String(raw.storageKey),filename,mime,bytes,kind);
        this.ctx.storage.sql.exec("INSERT INTO analyzer_results (id,asset_id,format,signature,pixel_width,pixel_height,embedded_dpi,effective_dpi,physical_width_in,physical_height_in,has_alpha,readable,analyzable,previewable,metadata_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",crypto.randomUUID(),assetId,String(a.format||""),a.signatureValid?"verified":"invalid",Number(a.pixelWidth||0),Number(a.pixelHeight||0),a.embeddedDpi==null?null:Number(a.embeddedDpi),p.effectiveDpi?.minimum==null?null:Number(p.effectiveDpi.minimum),p.physicalSizeIn?.width==null?null:Number(p.physicalSizeIn.width),p.physicalSizeIn?.height==null?null:Number(p.physicalSizeIn.height),a.hasAlpha==null?null:(a.hasAlpha?1:0),p.readable?1:0,p.analyzable?1:0,p.previewable?1:0,JSON.stringify({scalingRisk:p.scalingRisk??null,placeholderCheck:p.placeholderCheck??null,productType}));
        this.ctx.storage.sql.exec("INSERT INTO validation_results (id,design_id,asset_id,rule_version_id,status,errors_json,warnings_json) VALUES (?,?,?,?,?,?,?)",crypto.randomUUID(),designId,assetId,ruleId,p.passed?"passed":"failed",JSON.stringify(Array.isArray(p.errors)?p.errors:[]),JSON.stringify(Array.isArray(p.warnings)?p.warnings:[]));
      }
      this.ctx.storage.sql.exec("INSERT INTO cover_asset_relations (design_id,asset_id) VALUES (?,?)",designId,String(cover.assetId));
      this.ctx.storage.sql.exec("INSERT INTO master_asset_relations (design_id,asset_id,explicitly_selected) VALUES (?,?,1)",designId,String(master.assetId));
      this.ctx.storage.sql.exec("INSERT INTO audit_logs (actor_id,actor_role,action,resource_type,resource_id,metadata_json) VALUES (?,'designer','designer.design.create','design',?,?)",designer.userId,designId,JSON.stringify({result:"success",metadata:{productType,assetCount:assets.length,coverAssetId:cover.assetId,masterAssetId:master.assetId}}));
    });
    return (this.designerWorkspace(sessionId) as any).designs.find((d:any)=>d.designId===designId)??null;
  }

  setDesignerAssetRoles(sessionId:string,designId:string,assetId:string,input:{cover?:boolean;master?:boolean}):unknown{
    this.bootstrapCatalog();const designer=this.authorizedDesigner(sessionId);const d=String(designId||"").trim(),a=String(assetId||"").trim();const row=this.ctx.storage.sql.exec<any>("SELECT a.id,d.status FROM assets a JOIN designs d ON d.id=a.design_id WHERE a.id=? AND d.id=? AND d.designer_id=?",a,d,designer.userId).toArray()[0];if(!row)throw new Error("Design asset not found.");
    this.ctx.storage.transactionSync(()=>{if(input.cover===true)this.ctx.storage.sql.exec("INSERT INTO cover_asset_relations (design_id,asset_id) VALUES (?,?) ON CONFLICT(design_id) DO UPDATE SET asset_id=excluded.asset_id",d,a);else if(input.cover===false)this.ctx.storage.sql.exec("DELETE FROM cover_asset_relations WHERE design_id=? AND asset_id=?",d,a);
      if(input.master===true){const pass=this.ctx.storage.sql.exec<any>("SELECT 1 AS ok FROM validation_results WHERE design_id=? AND asset_id=? AND status='passed' ORDER BY created_at DESC LIMIT 1",d,a).toArray()[0]?.ok;if(!pass)throw new Error("Ready-to-Print Master must have a passing preflight result.");this.ctx.storage.sql.exec("INSERT INTO master_asset_relations (design_id,asset_id,explicitly_selected) VALUES (?,?,1) ON CONFLICT(design_id) DO UPDATE SET asset_id=excluded.asset_id,explicitly_selected=1,selected_at=CURRENT_TIMESTAMP",d,a);}else if(input.master===false)this.ctx.storage.sql.exec("DELETE FROM master_asset_relations WHERE design_id=? AND asset_id=?",d,a);
      this.ctx.storage.sql.exec("INSERT INTO audit_logs (actor_id,actor_role,action,resource_type,resource_id,metadata_json) VALUES (?,'designer','designer.asset.roles','asset',?,?)",designer.userId,a,JSON.stringify({result:"success",metadata:{designId:d,cover:input.cover,master:input.master}}));});
    return (this.designerWorkspace(sessionId) as any).designs.find((x:any)=>x.designId===d)??null;
  }

  designerAssetAccess(sessionId:string,assetId:string):unknown{
    this.bootstrapCatalog();const designer=this.authorizedDesigner(sessionId);return this.ctx.storage.sql.exec<any>("SELECT a.id AS assetId,a.storage_key AS storageKey,a.original_filename AS filename,a.mime_type AS mimeType,a.byte_size AS byteSize,a.protected,d.id AS designId FROM assets a JOIN designs d ON d.id=a.design_id WHERE a.id=? AND d.designer_id=?",String(assetId||""),designer.userId).toArray()[0]??null;
  }

  deleteDesignerAsset(sessionId:string,assetId:string):unknown{
    this.bootstrapCatalog();const designer=this.authorizedDesigner(sessionId);const id=String(assetId||"").trim();const row=this.ctx.storage.sql.exec<any>("SELECT a.id,a.storage_key AS storageKey,a.protected,a.design_id AS designId,d.status FROM assets a JOIN designs d ON d.id=a.design_id WHERE a.id=? AND d.designer_id=?",id,designer.userId).toArray()[0];if(!row)throw new Error("Design asset not found.");const linked=Boolean(this.ctx.storage.sql.exec<any>("SELECT 1 AS ok FROM order_items WHERE master_asset_id=? LIMIT 1",id).toArray()[0]?.ok)||Boolean(this.ctx.storage.sql.exec<any>("SELECT 1 AS ok FROM printing_jobs WHERE master_asset_id=? LIMIT 1",id).toArray()[0]?.ok);const cartRef=Boolean(this.ctx.storage.sql.exec<any>("SELECT 1 AS ok FROM cart_items WHERE master_asset_id=? LIMIT 1",id).toArray()[0]?.ok);if(Number(row.protected)===1||linked)throw new Error("This asset is protected by order/production history and cannot be deleted.");if(cartRef)throw new Error("Remove this design asset from active carts before deleting it.");
    let designDeleted=false;this.ctx.storage.transactionSync(()=>{this.ctx.storage.sql.exec("DELETE FROM cover_asset_relations WHERE asset_id=?",id);this.ctx.storage.sql.exec("DELETE FROM master_asset_relations WHERE asset_id=?",id);this.ctx.storage.sql.exec("DELETE FROM validation_results WHERE asset_id=?",id);this.ctx.storage.sql.exec("DELETE FROM assets WHERE id=?",id);const count=Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS count FROM assets WHERE design_id=?",row.designId).toArray()[0]?.count??0);if(count===0&&String(row.status).toLowerCase()!=="published"){this.ctx.storage.sql.exec("DELETE FROM designs WHERE id=?",row.designId);designDeleted=true;}this.ctx.storage.sql.exec("INSERT INTO audit_logs (actor_id,actor_role,action,resource_type,resource_id,metadata_json) VALUES (?,'designer','designer.asset.delete','asset',?,?)",designer.userId,id,JSON.stringify({result:"success",metadata:{designId:row.designId,designDeleted}}));});return {assetId:id,storageKey:row.storageKey,designId:row.designId,designDeleted};
  }

  deleteDesignerDesign(sessionId:string,designId:string):unknown{
    this.bootstrapCatalog();const designer=this.authorizedDesigner(sessionId);const id=String(designId||"").trim();const row=this.ctx.storage.sql.exec<any>("SELECT id,status FROM designs WHERE id=? AND designer_id=?",id,designer.userId).toArray()[0];if(!row)throw new Error("Design not found.");const orderRef=Boolean(this.ctx.storage.sql.exec<any>("SELECT 1 AS ok FROM order_items WHERE design_id=? LIMIT 1",id).toArray()[0]?.ok);const protectedAsset=Boolean(this.ctx.storage.sql.exec<any>("SELECT 1 AS ok FROM assets WHERE design_id=? AND protected=1 LIMIT 1",id).toArray()[0]?.ok);const cartRef=Boolean(this.ctx.storage.sql.exec<any>("SELECT 1 AS ok FROM cart_items WHERE design_id=? LIMIT 1",id).toArray()[0]?.ok);if(orderRef||protectedAsset)throw new Error("This design is protected by order/production history and cannot be deleted.");if(cartRef)throw new Error("Remove this design from active carts before deleting it.");const keys=this.ctx.storage.sql.exec<any>("SELECT storage_key AS storageKey FROM assets WHERE design_id=?",id).toArray().map((x:any)=>String(x.storageKey));this.ctx.storage.transactionSync(()=>{this.ctx.storage.sql.exec("DELETE FROM designs WHERE id=?",id);this.ctx.storage.sql.exec("INSERT INTO audit_logs (actor_id,actor_role,action,resource_type,resource_id,metadata_json) VALUES (?,'designer','designer.design.delete','design',?,?)",designer.userId,id,JSON.stringify({result:"success",metadata:{assetCount:keys.length}}));});return {designId:id,storageKeys:keys};
  }

  designs(): StudioDesign[] {
    this.bootstrapCatalog();
    return this.ctx.storage.sql.exec<StudioDesign>(`
      SELECT d.id, d.title_ar AS titleAr, d.title_en AS titleEn, d.designer_id AS designerId,
             a.id AS assetId, a.storage_key AS imageUrl, d.status,
             CASE WHEN d.status = 'published' THEN 'visible' ELSE 'hidden' END AS visibility
      FROM designs d
      JOIN cover_asset_relations c ON c.design_id = d.id
      JOIN assets a ON a.id = c.asset_id
      WHERE d.status = 'published'
      ORDER BY d.published_at, d.created_at, d.id
    `).toArray().map((row) => ({ ...row, imageUrl: `/${row.imageUrl}` }));
  }

  navigationItems(): NavigationItem[] {
    this.bootstrapCatalog();
    return this.ctx.storage.sql.exec<NavigationItem>("SELECT id, title_en AS titleEn, title_ar AS titleAr, route, position, enabled, visibility FROM navigation_items ORDER BY position, id").toArray();
  }

  saveNavigationItems(items: Array<{ id?: string; titleEn: string; titleAr: string; route: string; position: number; enabled: boolean | number; visibility: "both" | "desktop" | "mobile" }>): NavigationItem[] {
    this.bootstrapCatalog();
    const clean = items.slice(0, 100).map((item, index) => ({ id: String(item.id || crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || crypto.randomUUID(), titleEn: String(item.titleEn || "").trim().slice(0, 120), titleAr: String(item.titleAr || "").trim().slice(0, 120), route: String(item.route || "/").trim().startsWith("/") ? String(item.route || "/").trim().slice(0, 240) : "/", position: Number.isFinite(Number(item.position)) ? Number(item.position) : index + 1, enabled: item.enabled ? 1 : 0, visibility: ["both","desktop","mobile"].includes(item.visibility) ? item.visibility : "both" as const })).filter(item => item.titleEn && item.titleAr);
    this.ctx.storage.transactionSync(() => { this.ctx.storage.sql.exec("DELETE FROM navigation_items"); for (const item of clean) this.ctx.storage.sql.exec("INSERT INTO navigation_items (id,title_en,title_ar,route,position,enabled,visibility,updated_at) VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP)", item.id, item.titleEn, item.titleAr, item.route, item.position, item.enabled, item.visibility); });
    return this.navigationItems();
  }

  products(): StudioProduct[] {
    this.bootstrapCatalog();
    return this.ctx.storage.sql.exec<StudioProduct>(`
      SELECT m.id AS modelId, m.category_id AS categoryId,
             CASE WHEN m.source = 'printify' THEN COALESCE(NULLIF(p.title_ar, ''), '') ELSE m.name_ar END AS nameAr,
             CASE WHEN m.source = 'printify' THEN COALESCE(NULLIF(p.title_en, ''), '') ELSE m.name_en END AS nameEn,
             v.id AS variantId, v.sku, v.color, v.size, CAST(v.retail_price_jod AS REAL) / 100.0 AS retailPriceJod,
             CASE WHEN m.source = 'printify' THEN 'custom' ELSE m.source END AS source
      FROM product_models m JOIN variants v ON v.model_id = m.id
      LEFT JOIN printify_product_data p ON p.model_id = m.id
      WHERE m.enabled = 1 AND v.enabled = 1
        AND (m.source <> 'printify' OR (p.published = 1 AND p.title_en <> '' AND p.title_ar <> '' AND p.description_en <> '' AND p.description_ar <> '' AND p.display_image IS NOT NULL AND p.customer_price_jod > 0))
      ORDER BY nameEn, v.sku
    `).toArray();
  }

  printifyCatalogLocalState(): PrintifyCatalogLocalStateRow[] {
    this.bootstrapCatalog();
    return this.ctx.storage.sql.exec<PrintifyCatalogLocalStateRow>(`SELECT c.blueprint_id, c.imported_model_id, c.provider_id, c.source_available, c.sync_status, p.title_en, p.title_ar, p.description_en, p.description_ar, p.customer_price_jod, p.display_image, p.published, p.print_your_dream, p.selected_provider_id FROM printify_catalog_items c LEFT JOIN printify_product_data p ON p.model_id = c.imported_model_id`).toArray();
  }

  printifyCatalog(filters: { search?: string; imported?: string; published?: string } = {}): unknown[] {
    this.bootstrapCatalog();
    const rows = this.ctx.storage.sql.exec<any>(`SELECT c.*, p.title_en, p.title_ar, p.description_en, p.description_ar, p.customer_price_jod, p.display_image, p.published, p.print_your_dream FROM printify_catalog_items c LEFT JOIN printify_product_data p ON p.model_id = c.imported_model_id ORDER BY c.source_title COLLATE NOCASE`).toArray();
    const search = String(filters.search ?? '').trim().toLowerCase();
    return rows.filter((row) => (!search || `${row.source_title} ${row.product_type}`.toLowerCase().includes(search)) && (filters.imported !== 'yes' || row.imported_model_id) && (filters.imported !== 'no' || !row.imported_model_id) && (filters.published !== 'yes' || Number(row.published) === 1) && (filters.published !== 'no' || Number(row.published ?? 0) !== 1)).map((row) => ({ ...row, variants: JSON.parse(row.variants_json || '[]'), images: JSON.parse(row.images_json || '[]'), source: 'printify' }));
  }

  printifyItem(blueprintId: string): unknown {
    this.bootstrapCatalog();
    const row = this.ctx.storage.sql.exec<any>(`SELECT c.*, p.title_en, p.title_ar, p.description_en, p.description_ar, p.customer_price_jod, p.display_image, p.published, p.print_your_dream FROM printify_catalog_items c LEFT JOIN printify_product_data p ON p.model_id = c.imported_model_id WHERE c.blueprint_id = ?`, blueprintId).toArray()[0];
    return row ? { ...row, variants: JSON.parse(row.variants_json || '[]'), images: JSON.parse(row.images_json || '[]'), source: 'printify' } : null;
  }

  upsertPrintifyCatalogItem(item: { blueprintId: string; title: string; description?: string; productType?: string; providerId?: string; source?: unknown; variants?: unknown[]; images?: unknown[]; sourceAvailable?: boolean; syncStatus?: string }): { count: number; syncedAt: string } {
    this.bootstrapCatalog(); const syncedAt = new Date().toISOString();
    if (!/^[0-9]{1,20}$/.test(String(item.blueprintId))) throw new Error('Invalid blueprintId.');
    const id = `printify-${item.blueprintId}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
    this.ctx.storage.transactionSync(() => { this.ctx.storage.sql.exec(`INSERT INTO printify_catalog_items (id, blueprint_id, source_title, source_description, product_type, provider_id, source_json, variants_json, images_json, sync_status, source_available, last_synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(blueprint_id) DO UPDATE SET source_title=excluded.source_title, source_description=excluded.source_description, product_type=excluded.product_type, provider_id=COALESCE(excluded.provider_id,printify_catalog_items.provider_id), source_json=excluded.source_json, variants_json=CASE WHEN json_array_length(excluded.variants_json)>0 THEN excluded.variants_json ELSE printify_catalog_items.variants_json END, images_json=excluded.images_json, sync_status=excluded.sync_status, source_available=excluded.source_available, last_synced_at=excluded.last_synced_at`, id, String(item.blueprintId).slice(0, 120), String(item.title).slice(0, 300), String(item.description ?? '').slice(0, 5000), String(item.productType ?? '').slice(0, 120), item.providerId ? String(item.providerId).slice(0, 120) : null, JSON.stringify(item.source ?? {}), JSON.stringify(item.variants ?? []), JSON.stringify(item.images ?? []), item.syncStatus ?? 'synced', item.sourceAvailable === false ? 0 : 1, syncedAt); });
    return { count: 1, syncedAt };
  }

  savePrintifyCatalog(items: Array<{ blueprintId: string; title: string; description?: string; productType?: string; providerId?: string; source?: unknown; variants?: unknown[]; images?: unknown[]; sourceAvailable?: boolean; syncStatus?: string }>): { count: number; syncedAt: string } {
    this.bootstrapCatalog(); const syncedAt = new Date().toISOString();
    const cleanItems = items.slice(0, 500).filter((item) => /^[0-9]{1,20}$/.test(String(item.blueprintId)));
    const seen = new Set(cleanItems.map((item) => String(item.blueprintId)));
    this.ctx.storage.transactionSync(() => { for (const item of cleanItems) { const id = `printify-${item.blueprintId}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100); this.ctx.storage.sql.exec(`INSERT INTO printify_catalog_items (id, blueprint_id, source_title, source_description, product_type, provider_id, source_json, variants_json, images_json, sync_status, source_available, last_synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(blueprint_id) DO UPDATE SET source_title=excluded.source_title, source_description=excluded.source_description, product_type=excluded.product_type, provider_id=COALESCE(excluded.provider_id,printify_catalog_items.provider_id), source_json=excluded.source_json, variants_json=CASE WHEN json_array_length(excluded.variants_json)>0 THEN excluded.variants_json ELSE printify_catalog_items.variants_json END, images_json=excluded.images_json, sync_status=excluded.sync_status, source_available=excluded.source_available, last_synced_at=excluded.last_synced_at`, id, String(item.blueprintId).slice(0, 120), String(item.title).slice(0, 300), String(item.description ?? '').slice(0, 5000), String(item.productType ?? '').slice(0, 120), item.providerId ? String(item.providerId).slice(0, 120) : null, JSON.stringify(item.source ?? {}), JSON.stringify(item.variants ?? []), JSON.stringify(item.images ?? []), item.syncStatus ?? 'synced', item.sourceAvailable === false ? 0 : 1, syncedAt); } for (const row of this.ctx.storage.sql.exec<{blueprint_id:string}>("SELECT blueprint_id FROM printify_catalog_items").toArray()) if (!seen.has(row.blueprint_id)) this.ctx.storage.sql.exec("UPDATE printify_catalog_items SET source_available=0,sync_status='source_unavailable',last_synced_at=? WHERE blueprint_id=?",syncedAt,row.blueprint_id); this.ctx.storage.sql.exec("INSERT OR REPLACE INTO business_settings (key,value_json,updated_at) VALUES ('printify_last_sync',?,CURRENT_TIMESTAMP)", JSON.stringify({ syncedAt, count: cleanItems.length, received: items.length })); });
    return { count: items.length, syncedAt };
  }

  importPrintify(blueprintId: string, providerId?: string): unknown {
    const item = this.printifyItem(blueprintId) as any; if (!item) throw new Error('Catalog item not found.'); const modelId = item.imported_model_id || `printify-model-${blueprintId}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
    this.ctx.storage.transactionSync(() => { const pid=String(providerId||item.provider_id||""); this.ctx.storage.sql.exec("INSERT OR IGNORE INTO site_categories (id,name_ar,name_en,enabled,home_featured,home_order,mockup_mode) VALUES ('cat-printify','منتجات مخصصة','Custom products',1,0,999,'custom')"); this.ctx.storage.sql.exec("INSERT OR IGNORE INTO product_models (id,category_id,name_ar,name_en,source,enabled) VALUES (?,?,?,?, 'printify',0)", modelId, 'cat-printify', item.source_title, item.source_title); this.ctx.storage.sql.exec("INSERT OR IGNORE INTO printify_product_data (model_id) VALUES (?)", modelId); this.ctx.storage.sql.exec("UPDATE printify_catalog_items SET imported_model_id=? WHERE blueprint_id=?", modelId, blueprintId); for (const v of item.variants as any[]) { const nv=normalizePrintifyVariant(blueprintId,pid,v); if(!nv) continue; this.ctx.storage.sql.exec("INSERT OR REPLACE INTO printify_source_variants (blueprint_id,print_provider_id,variant_id,source_title,size,color,options_json,source_available,source_cost_internal,source_metadata_json,image_refs_json,placeholders_json,source_updated_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)",nv.blueprintId,nv.printProviderId,nv.variantId,nv.sourceTitle,nv.size,nv.color,JSON.stringify(nv.options),nv.sourceAvailable?1:0,nv.sourceCostInternal,JSON.stringify(nv.metadata),JSON.stringify(nv.images),JSON.stringify(nv.placeholders),new Date().toISOString()); const vid = `pv-${blueprintId}-${nv.variantId}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120); this.ctx.storage.sql.exec("INSERT OR IGNORE INTO variants (id,model_id,sku,color,size,options_json,retail_price_jod,enabled) VALUES (?,?,?,?,?,?,0,0)", vid, modelId, `PRINTIFY-${vid}`.slice(0, 120), nv.color, nv.size, JSON.stringify(nv)); this.ctx.storage.sql.exec("INSERT OR IGNORE INTO printify_variant_settings (variant_id,source_cost_jod,enabled) VALUES (?,?,0)", vid, nv.sourceCostInternal); } }); return this.printifyItem(blueprintId);
  }

  updatePrintifyProduct(modelId: string, input: { titleEn?: string; titleAr?: string; descriptionEn?: string; descriptionAr?: string; displayImage?: string | null; categoryId?: string; customerPriceJod?: number | null; printYourDream?: boolean; enabled?: boolean; selectedProviderId?: string | null; enabledVariants?: string[] }): unknown {
    this.bootstrapCatalog(); const current = this.ctx.storage.sql.exec<any>('SELECT * FROM printify_product_data WHERE model_id=?', modelId).toArray()[0]; if (!current) throw new Error('Imported product not found.');
    const price = input.customerPriceJod === undefined ? (Number(current.customer_price_jod || 0) / 100) : Number(input.customerPriceJod);
    if (!Number.isFinite(price) || price < 0 || price > 1000000) throw new Error('Customer price must be a finite non-negative value under 1,000,000.');
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec('UPDATE printify_product_data SET title_en=?,title_ar=?,description_en=?,description_ar=?,display_image=?,customer_price_jod=?,print_your_dream=?,selected_provider_id=?,updated_at=CURRENT_TIMESTAMP WHERE model_id=?', String(input.titleEn ?? current.title_en).trim().slice(0,300), String(input.titleAr ?? current.title_ar).trim().slice(0,300), String(input.descriptionEn ?? current.description_en).trim().slice(0,5000), String(input.descriptionAr ?? current.description_ar).trim().slice(0,5000), input.displayImage === undefined ? current.display_image : String(input.displayImage || '').slice(0,1000) || null, Math.round(price*100), input.printYourDream === false ? 0 : 1, input.selectedProviderId === undefined ? current.selected_provider_id : (input.selectedProviderId ? String(input.selectedProviderId).slice(0,80) : null), modelId);
      if (input.categoryId) this.ctx.storage.sql.exec('UPDATE product_models SET category_id=? WHERE id=?', input.categoryId.slice(0,100), modelId);
      if (input.enabled !== undefined) this.ctx.storage.sql.exec('UPDATE product_models SET enabled=? WHERE id=?', input.enabled ? 1 : 0, modelId);
      if (input.enabledVariants) { this.ctx.storage.sql.exec('UPDATE variants SET enabled=0 WHERE model_id=?', modelId); for (const id of input.enabledVariants.slice(0,100)) this.ctx.storage.sql.exec('UPDATE variants SET enabled=1 WHERE id=? AND model_id=?', String(id).slice(0,120), modelId); }
    }); return this.printifyItem(this.ctx.storage.sql.exec<{ blueprint_id:string }>('SELECT blueprint_id FROM printify_catalog_items WHERE imported_model_id=?',modelId).one().blueprint_id);
  }

  publishPrintify(modelId: string, published: boolean): unknown {
    this.bootstrapCatalog(); const row = this.ctx.storage.sql.exec<any>('SELECT p.*,c.blueprint_id,c.source_available FROM printify_product_data p JOIN printify_catalog_items c ON c.imported_model_id=p.model_id WHERE p.model_id=?',modelId).toArray()[0]; if (!row) throw new Error('Imported product not found.');
    if (!published) { this.ctx.storage.sql.exec('UPDATE printify_product_data SET published=0,updated_at=CURRENT_TIMESTAMP WHERE model_id=?',modelId); this.ctx.storage.sql.exec('UPDATE product_models SET enabled=0 WHERE id=?',modelId); return this.printifyItem(row.blueprint_id); }
    const errors:string[]=[]; if(!String(row.title_en||'').trim()) errors.push('English title is required.'); if(!String(row.title_ar||'').trim()) errors.push('Arabic title is required.'); if(!String(row.description_en||'').trim()) errors.push('English description is required.'); if(!String(row.description_ar||'').trim()) errors.push('Arabic description is required.'); if(!(Number(row.customer_price_jod)>0&&Number.isFinite(Number(row.customer_price_jod)))) errors.push('A valid customer price is required.'); if(!row.display_image) errors.push('Main Display Image is required.'); if(!row.selected_provider_id) errors.push('A Print Provider must be selected.'); if(Number(row.source_available)!==1) errors.push('Source product is unavailable.'); const variants=this.ctx.storage.sql.exec<any>('SELECT v.id,v.enabled,v.options_json FROM variants v WHERE v.model_id=?',modelId).toArray(); const validVariants=variants.filter(v=>Number(v.enabled)===1 && JSON.parse(v.options_json||'{}').source_available!==false); if(!validVariants.length) errors.push('At least one valid enabled variant must be selected.'); if(errors.length) return {ok:false,errors}; this.ctx.storage.sql.exec('UPDATE printify_product_data SET published=1,updated_at=CURRENT_TIMESTAMP WHERE model_id=?',modelId); this.ctx.storage.sql.exec('UPDATE product_models SET enabled=1 WHERE id=?',modelId); return this.printifyItem(row.blueprint_id);
  }

  async registerUser(input: { displayName: string; email: string; password: string; role: "customer" | "designer" }): Promise<{userId:string;role:"customer"|"designer";sessionId:string}> {
    this.bootstrapCatalog();
    const displayName = String(input.displayName || "").trim().slice(0, 160);
    const email = String(input.email || "").trim().toLowerCase().slice(0, 320);
    const password = String(input.password || "");
    const role: "customer" | "designer" = input.role === "designer" ? "designer" : "customer";
    if (displayName.length < 2) throw new Error("Display name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");
    if (this.ctx.storage.sql.exec<any>("SELECT id FROM users WHERE email=?", email).toArray()[0]) throw new Error("An account with this email already exists.");

    const userId = crypto.randomUUID();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await hashPassword(password, salt);
    const sessionId = crypto.randomUUID();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const roleId = role === "designer" ? "role-designer" : "role-customer";

    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec("INSERT INTO users (id,email,display_name,status) VALUES (?,?,?,'active')", userId, email, displayName);
      this.ctx.storage.sql.exec("INSERT INTO auth_credentials (user_id,password_salt,password_hash,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP)", userId, bytesToBase64(salt), hash);
      this.ctx.storage.sql.exec("INSERT INTO user_roles (user_id,role_id) VALUES (?,?)", userId, roleId);
      if (role === "designer") {
        this.ctx.storage.sql.exec("INSERT INTO designer_profiles (user_id,authorization_status,created_at) VALUES (?,'pending',CURRENT_TIMESTAMP)", userId);
      } else {
        this.ctx.storage.sql.exec("INSERT INTO customer_profiles (user_id) VALUES (?)", userId);
      }
      this.ctx.storage.sql.exec("INSERT INTO sessions (id,user_id,expires_at,created_at) VALUES (?,?,?,CURRENT_TIMESTAMP)", sessionId, userId, expiresAt);
    });

    return { userId, role, sessionId };
  }

  async loginUser(identifier: string, password: string): Promise<{userId:string;role:"customer"|"designer";sessionId:string}|null> {
    this.bootstrapCatalog();
    const clean = String(identifier || "").trim().toLowerCase();
    const suppliedPassword = String(password || "");
    if (!clean || !suppliedPassword) return null;

    const row = this.ctx.storage.sql.exec<any>(`
      SELECT u.id, u.email, u.status, a.password_salt, a.password_hash, r.name AS role
      FROM users u
      JOIN auth_credentials a ON a.user_id = u.id
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id
      LEFT JOIN customer_profiles cp ON cp.user_id = u.id
      WHERE u.status = 'active'
        AND (LOWER(u.email) = ? OR LOWER(COALESCE(cp.phone,'')) = ?)
        AND r.name IN ('customer','designer')
      ORDER BY CASE r.name WHEN 'designer' THEN 0 ELSE 1 END
      LIMIT 1
    `, clean, clean).toArray()[0];
    if (!row) return null;

    let valid = false;
    try { valid = await verifyPassword(suppliedPassword, String(row.password_salt || ""), String(row.password_hash || "")); } catch { return null; }
    if (!valid) return null;

    const role: "customer" | "designer" = row.role === "designer" ? "designer" : "customer";
    const sessionId = crypto.randomUUID();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec("DELETE FROM sessions WHERE expires_at <= ?", Date.now());
      this.ctx.storage.sql.exec("INSERT INTO sessions (id,user_id,expires_at,created_at) VALUES (?,?,?,CURRENT_TIMESTAMP)", sessionId, row.id, expiresAt);
    });
    return { userId: String(row.id), role, sessionId };
  }

  sessionIdentity(sessionId: string): {userId:string;role:"customer"|"designer";displayName:string;email:string}|null {
    this.bootstrapCatalog();
    const id=String(sessionId||"").trim(); if(!id) return null;
    const now=Date.now();
    this.ctx.storage.sql.exec("DELETE FROM sessions WHERE expires_at<=?",now);
    const row=this.ctx.storage.sql.exec<any>(`SELECT s.user_id AS userId,u.display_name AS displayName,u.email,r.name AS role
      FROM sessions s JOIN users u ON u.id=s.user_id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
      WHERE s.id=? AND s.expires_at>? AND u.status='active' AND r.name IN ('customer','designer')
      ORDER BY CASE r.name WHEN 'customer' THEN 0 ELSE 1 END LIMIT 1`,id,now).toArray()[0];
    return row?{userId:String(row.userId),role:row.role==="designer"?"designer":"customer",displayName:String(row.displayName||""),email:String(row.email||"")}:null;
  }

  customerOrderSummary(sessionId:string,orderId:string):unknown{
    this.bootstrapCatalog();const identity=this.sessionIdentity(sessionId);if(!identity)throw new Error("Customer sign-in is required.");const id=String(orderId||"").trim();
    const order=this.ctx.storage.sql.exec<any>("SELECT o.id,o.status,o.payment_status AS paymentStatus,o.fulfillment_mode AS fulfillmentMode,o.total_jod AS totalJod,o.currency,o.created_at AS createdAt,ocd.subtotal_jod AS subtotalJod,ocd.delivery_fee_jod AS deliveryFeeJod,ocd.discount_jod AS discountJod,ocd.promotion_code AS promotionCode,ocd.customer_name AS customerName,ocd.customer_phone AS customerPhone,ocd.city,ocd.address,ocd.reservation_expires_at AS reservationExpiresAt FROM orders o LEFT JOIN order_checkout_details ocd ON ocd.order_id=o.id WHERE o.id=? AND o.user_id=?",id,identity.userId).toArray()[0];
    if(!order)return null;
    const items=this.ctx.storage.sql.exec<any>("SELECT oi.id,oi.quantity,oi.variant_id AS variantId,v.sku,v.color,v.size,pm.name_en AS productNameEn,pm.name_ar AS productNameAr,oi.design_id AS designId,d.title_en AS designTitleEn,d.title_ar AS designTitleAr,oi.master_asset_id AS masterAssetId,oi.price_snapshot_json AS priceSnapshotJson FROM order_items oi JOIN variants v ON v.id=oi.variant_id JOIN product_models pm ON pm.id=v.model_id LEFT JOIN designs d ON d.id=oi.design_id WHERE oi.order_id=? ORDER BY oi.id",id).toArray().map((x:any)=>{let p:any={};try{p=JSON.parse(String(x.priceSnapshotJson||"{}"));}catch{}return {id:x.id,quantity:Number(x.quantity),variantId:x.variantId,sku:x.sku,color:x.color,size:x.size,productNameEn:x.productNameEn,productNameAr:x.productNameAr,designId:x.designId,designTitleEn:x.designTitleEn,designTitleAr:x.designTitleAr,masterAssetId:x.masterAssetId,unitPriceJod:Number(p.unitPriceJod||0)};});
    const payment=this.ctx.storage.sql.exec<any>("SELECT method,status,created_at AS createdAt FROM payments WHERE order_id=? ORDER BY created_at DESC LIMIT 1",id).toArray()[0]??null;

[721 more lines in file. Use offset=1204 to continue.]  }

  private async adminPasswordHash(password: string, salt: Uint8Array): Promise<string> {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: 100000, hash: "SHA-256" }, key, 256);
    return btoa(String.fromCharCode(...new Uint8Array(bits)));
  }
  private adminB64(bytes: Uint8Array): string { return btoa(String.fromCharCode(...bytes)); }
  async adminIdentity(id: string): Promise<{id:string;username:string;role:"main_admin"|"printing_technician";groupId:string}|null> { this.bootstrapCatalog(); const row=this.ctx.storage.sql.exec<any>("SELECT id,username,role,COALESCE(group_id,CASE WHEN role='main_admin' THEN 'group-main-admin' ELSE 'group-printing-operator' END) AS group_id FROM admin_users WHERE id=? AND enabled=1",id).toArray()[0]; return row ? {id:row.id,username:row.username,role:row.role,groupId:row.group_id} : null; }
  async getOrCreateAdminSessionKey(): Promise<string> { this.bootstrapCatalog(); const existing=this.ctx.storage.sql.exec<any>("SELECT secret_value FROM server_secrets WHERE key_name=?","ADMIN_WEB_KEY").toArray()[0]; if(existing?.secret_value) return existing.secret_value; const bytes=crypto.getRandomValues(new Uint8Array(32)); const value=btoa(String.fromCharCode(...bytes)).replaceAll("+","-").replaceAll("/","_").replaceAll("=",""); this.ctx.storage.sql.exec("INSERT OR IGNORE INTO server_secrets (key_name,secret_value) VALUES (?,?)","ADMIN_WEB_KEY",value); return this.ctx.storage.sql.exec<any>("SELECT secret_value FROM server_secrets WHERE key_name=?","ADMIN_WEB_KEY").toArray()[0].secret_value; }
  async adminCount(): Promise<number> { this.bootstrapCatalog(); return this.ctx.storage.sql.exec<{count:number}>("SELECT COUNT(*) AS count FROM admin_users").one().count; }
  async bootstrapAdmin(username: string, password: string, role: "main_admin"|"printing_technician" = "main_admin"): Promise<{id:string;username:string;role:string}> {
    this.bootstrapCatalog(); const clean=String(username||"").trim().toLowerCase(); if(!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(clean)) throw new Error("Username must be 3-64 characters and use letters, numbers, dot, underscore, or hyphen."); if(String(password||"").length<12) throw new Error("Password must be at least 12 characters."); if(await this.adminCount()>0) throw new Error("Admin bootstrap is already completed."); const salt=crypto.getRandomValues(new Uint8Array(16)); const id=crypto.randomUUID(); const hash=await this.adminPasswordHash(password,salt); const groupId=role==="main_admin"?"group-main-admin":"group-printing-operator"; this.ctx.storage.sql.exec("INSERT INTO admin_users (id,username,password_salt,password_hash,role,group_id) VALUES (?,?,?,?,?,?)",id,clean,this.adminB64(salt),hash,role,groupId); return {id,username:clean,role};
  }
  async updateAdminAccount(id: string, currentPassword: string, newUsername: string, newPassword: string): Promise<{id:string;username:string;role:"main_admin"|"printing_technician"}> {
    this.bootstrapCatalog();
    const row = this.ctx.storage.sql.exec<any>("SELECT id,username,password_salt,password_hash,role,enabled FROM admin_users WHERE id=? AND enabled=1", id).toArray()[0];
    if (!row) throw new Error("Admin account not found.");
    const currentHash = await this.adminPasswordHash(String(currentPassword || ""), base64ToBytes(String(row.password_salt || "")));
    if (currentHash !== String(row.password_hash || "")) throw new Error("Current password is incorrect.");
    const clean = String(newUsername || "").trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(clean)) throw new Error("Username must be 3-64 characters and use letters, numbers, dot, underscore, or hyphen.");
    if (String(newPassword || "").length < 12) throw new Error("Password must be at least 12 characters.");
    const duplicate = this.ctx.storage.sql.exec<any>("SELECT id FROM admin_users WHERE username=? AND id<>?", clean, id).toArray()[0];
    if (duplicate) throw new Error("Username is already in use.");
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await this.adminPasswordHash(newPassword, salt);
    this.ctx.storage.sql.exec("UPDATE admin_users SET username=?,password_salt=?,password_hash=?,updated_at=CURRENT_TIMESTAMP WHERE id=?", clean, this.adminB64(salt), hash, id);
    return { id: String(row.id), username: clean, role: row.role };
  }

  private assertMainAdmin(actorId: string): void { const actor=this.ctx.storage.sql.exec<any>("SELECT id,group_id,enabled FROM admin_users WHERE id=?",actorId).toArray()[0]; if(!actor || Number(actor.enabled)!==1 || actor.group_id!=="group-main-admin") throw new Error("Main Administrator permission required."); }
  async createAdminUserAsync(actorId: string, username: string, password: string, groupOrRole: string): Promise<unknown> {
    this.bootstrapCatalog(); this.assertMainAdmin(actorId);
    const clean=String(username||"").trim().toLowerCase();
    if(!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(clean)) throw new Error("Username must be 3-64 characters and use letters, numbers, dot, underscore, or hyphen.");
    if(String(password||"").length<12) throw new Error("Password must be at least 12 characters.");
    const requested=String(groupOrRole||"group-printing-operator");
    const groupId=requested==="main_admin"?"group-main-admin":requested==="printing_technician"?"group-printing-operator":requested;
    const group=this.ctx.storage.sql.exec<any>("SELECT id,enabled FROM admin_user_groups WHERE id=?",groupId).toArray()[0];
    if(!group || Number(group.enabled)!==1) throw new Error("Invalid or disabled Admin User Group.");
    if(this.ctx.storage.sql.exec<any>("SELECT id FROM admin_users WHERE username=?",clean).toArray()[0]) throw new Error("Username is already in use.");
    const salt=crypto.getRandomValues(new Uint8Array(16)); const hash=await this.adminPasswordHash(password,salt); const id=crypto.randomUUID();
    const role=groupId==="group-main-admin"?"main_admin":"printing_technician";
    this.ctx.storage.sql.exec("INSERT INTO admin_users (id,username,password_salt,password_hash,role,group_id) VALUES (?,?,?,?,?,?)",id,clean,this.adminB64(salt),hash,role,groupId);
    this.adminAudit(actorId,"admin.user.create","admin_user",id,"success",{username:clean,groupId});
    return {id,username:clean,role,groupId,enabled:1};
  }
  setAdminUserEnabled(actorId: string, targetId: string, enabled: boolean): unknown {
    this.bootstrapCatalog(); this.assertMainAdmin(actorId);
    const row=this.ctx.storage.sql.exec<any>("SELECT id,group_id,enabled FROM admin_users WHERE id=?",targetId).toArray()[0];
    if(!row) throw new Error("Admin user not found.");
    if(!enabled && row.group_id==="group-main-admin" && Number(row.enabled)===1 && Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS count FROM admin_users WHERE group_id='group-main-admin' AND enabled=1").one().count)<=1) throw new Error("The last Main Administrator cannot be disabled.");
    this.ctx.storage.sql.exec("UPDATE admin_users SET enabled=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",enabled?1:0,targetId);
    this.adminAudit(actorId,"admin.user.set_enabled","admin_user",targetId,"success",{enabled});
    return {id:targetId,enabled:enabled?1:0};
  }
  setAdminUserRole(actorId: string, targetId: string, role: "main_admin"|"printing_technician"): unknown {
    const groupId=role==="main_admin"?"group-main-admin":"group-printing-operator";
    const group=this.setAdminUserGroup(actorId,targetId,groupId);
    return {id:targetId,role,group};
  }
  adminAuditLogs(filters: { search?:string; action?:string; resourceType?:string; actorId?:string; dateFrom?:string; dateTo?:string; page?:number; pageSize?:number } = {}): unknown {
    this.bootstrapCatalog();
    const conditions:string[]=[]; const args:any[]=[];
    const search=String(filters.search??"").trim().toLowerCase();
    if(search){conditions.push("(lower(a.action) LIKE ? OR lower(a.resource_type) LIKE ? OR lower(COALESCE(a.resource_id,'')) LIKE ? OR lower(COALESCE(a.actor_id,'')) LIKE ? OR lower(COALESCE(au.username,'')) LIKE ?)");const q="%"+search+"%";args.push(q,q,q,q,q);}
    const action=String(filters.action??"").trim().toLowerCase();if(action){conditions.push("lower(a.action)=?");args.push(action);}
    const resourceType=String(filters.resourceType??"").trim().toLowerCase();if(resourceType){conditions.push("lower(a.resource_type)=?");args.push(resourceType);}
    const actorId=String(filters.actorId??"").trim();if(actorId){conditions.push("a.actor_id=?");args.push(actorId);}
    const dateFrom=String(filters.dateFrom??"").trim();if(/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)){conditions.push("date(a.created_at)>=date(?)");args.push(dateFrom);}
    const dateTo=String(filters.dateTo??"").trim();if(/^\d{4}-\d{2}-\d{2}$/.test(dateTo)){conditions.push("date(a.created_at)<=date(?)");args.push(dateTo);}
    const where=conditions.length?" WHERE "+conditions.join(" AND "):"";
    const pageSize=Math.max(1,Math.min(100,Math.floor(Number(filters.pageSize)||25)));
    const total=Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS count FROM audit_logs a LEFT JOIN admin_users au ON au.id=a.actor_id"+where,...args).toArray()[0]?.count??0);
    const pages=Math.max(1,Math.ceil(total/pageSize));const page=Math.max(1,Math.min(pages,Math.floor(Number(filters.page)||1)));const offset=(page-1)*pageSize;
    const rows=this.ctx.storage.sql.exec<any>("SELECT a.id,a.actor_id AS actorId,a.actor_role AS actorRole,au.username AS actorUsername,a.action,a.resource_type AS resourceType,a.resource_id AS resourceId,a.metadata_json AS metadataJson,a.created_at AS createdAt FROM audit_logs a LEFT JOIN admin_users au ON au.id=a.actor_id"+where+" ORDER BY a.id DESC LIMIT ? OFFSET ?",...args,pageSize,offset).toArray();
    const items=rows.map((row:any)=>{let parsed:any={};try{parsed=JSON.parse(String(row.metadataJson??"{}"));}catch{parsed={invalidMetadata:true};}const safe=sanitizeAuditMetadataValue(parsed);return {id:row.id,actorId:row.actorId,actorRole:row.actorRole,actorUsername:row.actorUsername,action:row.action,resourceType:row.resourceType,resourceId:row.resourceId,metadata:safe,result:safe&&typeof safe==="object"&&!Array.isArray(safe)?String((safe as any).result??""):"",createdAt:row.createdAt};});
    const actionOptions=this.ctx.storage.sql.exec<any>("SELECT DISTINCT action FROM audit_logs ORDER BY action LIMIT 500").toArray().map((x:any)=>String(x.action));
    const resourceTypes=this.ctx.storage.sql.exec<any>("SELECT DISTINCT resource_type AS resourceType FROM audit_logs ORDER BY resource_type LIMIT 500").toArray().map((x:any)=>String(x.resourceType));
    return {items,total,page,pageSize,pages,actionOptions,resourceTypes};
  }

  adminAuditList(limit=100): unknown[] {
    const result=this.adminAuditLogs({page:1,pageSize:Math.max(1,Math.min(100,Math.floor(limit)))}) as any;
    return Array.isArray(result.items)?result.items:[];
  }

  adminPermission(userId: string, resource: string, permission: "access"|"modify"): boolean { this.bootstrapCatalog(); const row=this.ctx.storage.sql.exec<any>("SELECT au.enabled,g.enabled AS group_enabled,g.id AS group_id FROM admin_users au JOIN admin_user_groups g ON g.id=au.group_id WHERE au.id=?",userId).toArray()[0]; if(!row || Number(row.enabled)!==1 || Number(row.group_enabled)!==1) return false; if(row.group_id==="group-main-admin") return true; return Boolean(this.ctx.storage.sql.exec<any>("SELECT 1 AS ok FROM admin_group_permissions WHERE group_id=? AND resource=? AND permission=?",row.group_id,resource,permission).toArray()[0]?.ok); }
  adminGroupForUser(userId: string): unknown { this.bootstrapCatalog(); return this.ctx.storage.sql.exec<any>("SELECT g.id,g.name,g.is_system AS isSystem,g.protected,g.enabled FROM admin_users u JOIN admin_user_groups g ON g.id=u.group_id WHERE u.id=?",userId).toArray()[0] ?? null; }
  adminGroupsDetailed(): unknown[] { this.bootstrapCatalog(); return this.ctx.storage.sql.exec<any>("SELECT g.id,g.name,g.is_system AS isSystem,g.protected,g.enabled,COUNT(u.id) AS userCount FROM admin_user_groups g LEFT JOIN admin_users u ON u.group_id=g.id GROUP BY g.id ORDER BY g.is_system DESC,g.name").toArray(); }
  adminGroupPermissions(groupId: string): unknown[] { this.bootstrapCatalog(); return this.ctx.storage.sql.exec<any>("SELECT resource,permission FROM admin_group_permissions WHERE group_id=? ORDER BY resource,permission",groupId).toArray(); }
  setAdminGroupPermissions(actorId: string, groupId: string, permissions: Array<{resource:string;access?:boolean;modify?:boolean}>): unknown[] { this.assertMainAdmin(actorId); const group=this.ctx.storage.sql.exec<any>("SELECT protected FROM admin_user_groups WHERE id=?",groupId).toArray()[0]; if(!group) throw new Error("Group not found."); if(Number(group.protected)===1 && groupId==="group-main-admin") throw new Error("Main Administrator permissions are immutable."); this.ctx.storage.transactionSync(()=>{ this.ctx.storage.sql.exec("DELETE FROM admin_group_permissions WHERE group_id=?",groupId); for(const p of permissions.slice(0,200)){const resource=String(p.resource||"").slice(0,120); if(!resource) continue; if(p.access) this.ctx.storage.sql.exec("INSERT OR IGNORE INTO admin_group_permissions (group_id,resource,permission) VALUES (?,?,?)",groupId,resource,"access"); if(p.modify) this.ctx.storage.sql.exec("INSERT OR IGNORE INTO admin_group_permissions (group_id,resource,permission) VALUES (?,?,?)",groupId,resource,"modify");} }); this.adminAudit(actorId,"admin.group.permissions.update","admin_group",groupId,"success",{count:permissions.length}); return this.adminGroupPermissions(groupId); }
  createAdminGroup(actorId: string,name: string): unknown { this.assertMainAdmin(actorId); const clean=String(name||"").trim().slice(0,100); if(!clean) throw new Error("Group name is required."); if(this.ctx.storage.sql.exec<any>("SELECT id FROM admin_user_groups WHERE name=?",clean).toArray()[0]) throw new Error("Group already exists."); const id='group-'+crypto.randomUUID(); this.ctx.storage.sql.exec("INSERT INTO admin_user_groups (id,name) VALUES (?,?)",id,clean); this.adminAudit(actorId,"admin.group.create","admin_group",id,"success",{name:clean}); return {id,name:clean}; }
  updateAdminGroup(actorId: string,groupId: string,name: string,enabled?: boolean): unknown { this.assertMainAdmin(actorId); const row=this.ctx.storage.sql.exec<any>("SELECT * FROM admin_user_groups WHERE id=?",groupId).toArray()[0]; if(!row) throw new Error("Group not found."); if(Number(row.protected)===1 && name && name!==row.name) throw new Error("Protected groups cannot be renamed."); if(Number(row.protected)===1 && enabled===false) throw new Error("Protected groups cannot be disabled."); this.ctx.storage.sql.exec("UPDATE admin_user_groups SET name=COALESCE(?,name),enabled=COALESCE(?,enabled),updated_at=CURRENT_TIMESTAMP WHERE id=?",name?String(name).trim().slice(0,100):null,enabled===undefined?null:(enabled?1:0),groupId); this.adminAudit(actorId,"admin.group.update","admin_group",groupId,"success",{name,enabled}); return this.ctx.storage.sql.exec<any>("SELECT * FROM admin_user_groups WHERE id=?",groupId).toArray()[0]; }
  deleteAdminGroup(actorId: string,groupId: string): void { this.assertMainAdmin(actorId); const row=this.ctx.storage.sql.exec<any>("SELECT protected FROM admin_user_groups WHERE id=?",groupId).toArray()[0]; if(!row) throw new Error("Group not found."); if(Number(row.protected)===1) throw new Error("Protected groups cannot be deleted."); const count=this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS count FROM admin_users WHERE group_id=?",groupId).one().count; if(Number(count)>0) throw new Error("Reassign users before deleting this group."); this.ctx.storage.sql.exec("DELETE FROM admin_user_groups WHERE id=?",groupId); this.adminAudit(actorId,"admin.group.delete","admin_group",groupId,"success"); }
  setAdminUserGroup(actorId: string,targetId: string,groupId: string): unknown {
    this.assertMainAdmin(actorId);
    const target=this.ctx.storage.sql.exec<any>("SELECT id,group_id,enabled FROM admin_users WHERE id=?",targetId).toArray()[0];
    const group=this.ctx.storage.sql.exec<any>("SELECT id FROM admin_user_groups WHERE id=? AND enabled=1",groupId).toArray()[0];
    if(!target||!group) throw new Error("Admin or group not found.");
    if(target.group_id==="group-main-admin" && groupId!=="group-main-admin" && Number(target.enabled)===1 && Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS count FROM admin_users WHERE group_id='group-main-admin' AND enabled=1").one().count)<=1) throw new Error("The last Main Administrator cannot leave the protected group.");
    const role=groupId==="group-main-admin"?"main_admin":"printing_technician";
    this.ctx.storage.sql.exec("UPDATE admin_users SET group_id=?,role=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",groupId,role,targetId);
    this.adminAudit(actorId,"admin.user.assign_group","admin_user",targetId,"success",{groupId});
    return this.adminGroupForUser(targetId);
  }

  adminCan(role: "main_admin"|"printing_technician", resource: string, action: string): boolean { this.bootstrapCatalog(); if (role === "main_admin") return true; return Boolean(this.ctx.storage.sql.exec<{ok:number}>("SELECT 1 AS ok FROM admin_permission_assignments WHERE role=? AND resource=? AND action=?", role, resource, action).toArray()[0]?.ok); }
  adminUsers() { this.bootstrapCatalog(); return this.ctx.storage.sql.exec("SELECT id,username,role,enabled,created_at AS createdAt,updated_at AS updatedAt,last_login_at AS lastLoginAt FROM admin_users ORDER BY username").toArray(); }
  adminUsersDetailed() { this.bootstrapCatalog(); return this.ctx.storage.sql.exec("SELECT u.id,u.username,u.role,u.enabled,u.group_id,g.name AS group_name,g.enabled AS group_enabled,u.created_at AS createdAt,u.updated_at AS updatedAt,u.last_login_at AS lastLoginAt FROM admin_users u LEFT JOIN admin_user_groups g ON g.id=u.group_id ORDER BY u.username").toArray(); }
  adminGroups() { this.bootstrapCatalog(); return this.ctx.storage.sql.exec("SELECT role AS id, CASE role WHEN 'main_admin' THEN 'Main Administrator' ELSE 'Printing Operator' END AS name, role='main_admin' AS fullAccess, COUNT(*) AS userCount FROM admin_users GROUP BY role").toArray(); }
  adminPermissionMatrix(role: "main_admin"|"printing_technician") { this.bootstrapCatalog(); if (role === "main_admin") return this.ctx.storage.sql.exec("SELECT DISTINCT resource, action, 1 AS allowed FROM admin_permission_assignments ORDER BY resource, action").toArray(); return this.ctx.storage.sql.exec("SELECT resource, action, 1 AS allowed FROM admin_permission_assignments WHERE role=? ORDER BY resource, action", role).toArray(); }
  adminAudit(actorId: string, action: string, resourceType: string, resourceId: string|null, result: string, metadata: unknown = {}) { this.bootstrapCatalog(); this.ctx.storage.sql.exec("INSERT INTO audit_logs (actor_id,actor_role,action,resource_type,resource_id,metadata_json) VALUES (?,?,?,?,?,?)", actorId, "admin", action, resourceType, resourceId, JSON.stringify({result, metadata})); }

  adminOrdersList(filters: { search?:string; status?:string; paymentStatus?:string; fulfillmentMode?:string; dateFrom?:string; dateTo?:string; sort?:string; direction?:string; page?:number; pageSize?:number } = {}): unknown {
    this.bootstrapCatalog();
    const conditions:string[]=[]; const args:any[]=[];
    const search=String(filters.search??"").trim().toLowerCase();
    if(search){conditions.push("(lower(o.id) LIKE ? OR lower(COALESCE(u.display_name,'')) LIKE ? OR lower(COALESCE(u.email,'')) LIKE ? OR lower(COALESCE(cp.phone,'')) LIKE ?)"); const q="%"+search+"%"; args.push(q,q,q,q);}
    const status=String(filters.status??"").trim().toLowerCase(); if(status){conditions.push("lower(o.status)=?");args.push(status);}
    const paymentStatus=String(filters.paymentStatus??"").trim().toLowerCase(); if(paymentStatus){conditions.push("lower(o.payment_status)=?");args.push(paymentStatus);}
    const fulfillmentMode=String(filters.fulfillmentMode??"").trim().toLowerCase(); if(fulfillmentMode){conditions.push("lower(o.fulfillment_mode)=?");args.push(fulfillmentMode);}
    const dateFrom=String(filters.dateFrom??"").trim(); if(/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)){conditions.push("date(o.created_at)>=date(?)");args.push(dateFrom);}
    const dateTo=String(filters.dateTo??"").trim(); if(/^\d{4}-\d{2}-\d{2}$/.test(dateTo)){conditions.push("date(o.created_at)<=date(?)");args.push(dateTo);}
    const where=conditions.length?" WHERE "+conditions.join(" AND "):"";
    const sortMap:Record<string,string>={date:"o.created_at",id:"o.id",customer:"COALESCE(u.display_name,u.email,o.user_id,'')",status:"o.status",payment:"o.payment_status",total:"o.total_jod"};
    const sortColumn=sortMap[String(filters.sort??"date")]??sortMap.date;
    const direction=String(filters.direction??"desc").toLowerCase()==="asc"?"ASC":"DESC";
    const pageSize=Math.max(1,Math.min(100,Math.floor(Number(filters.pageSize)||20)));
    const total=Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS count FROM orders o LEFT JOIN users u ON u.id=o.user_id LEFT JOIN customer_profiles cp ON cp.user_id=o.user_id"+where,...args).toArray()[0]?.count??0);
    const pages=Math.max(1,Math.ceil(total/pageSize)); const page=Math.max(1,Math.min(pages,Math.floor(Number(filters.page)||1))); const offset=(page-1)*pageSize;
    const items=this.ctx.storage.sql.exec<any>(`SELECT o.id,o.status,o.payment_status AS paymentStatus,o.fulfillment_mode AS fulfillmentMode,o.total_jod AS totalJod,o.currency,o.created_at AS createdAt,u.display_name AS customerName,u.email AS customerEmail,cp.phone AS customerPhone,(SELECT COUNT(*) FROM order_items oi WHERE oi.order_id=o.id) AS itemCount FROM orders o LEFT JOIN users u ON u.id=o.user_id LEFT JOIN customer_profiles cp ON cp.user_id=o.user_id${where} ORDER BY ${sortColumn} ${direction} LIMIT ? OFFSET ?`,...args,pageSize,offset).toArray();
    return {items,total,page,pageSize,pages,sort:String(filters.sort??"date"),direction:direction.toLowerCase()};
  }

  adminOrderDetail(orderId: string): unknown {
    this.bootstrapCatalog(); const id=String(orderId||"").trim();
    const order=this.ctx.storage.sql.exec<any>("SELECT o.id,o.user_id AS userId,o.status,o.payment_status AS paymentStatus,o.fulfillment_mode AS fulfillmentMode,o.total_jod AS totalJod,o.currency,o.exchange_rate_json AS exchangeRateJson,o.created_at AS createdAt,u.display_name AS customerName,u.email AS customerEmail,cp.phone AS customerPhone,cp.default_address_json AS defaultAddressJson FROM orders o LEFT JOIN users u ON u.id=o.user_id LEFT JOIN customer_profiles cp ON cp.user_id=o.user_id WHERE o.id=?",id).toArray()[0];
    if(!order) return null;
    const parse=(value:any,fallback:any)=>{try{return JSON.parse(String(value??""));}catch{return fallback;}};
    const items=this.ctx.storage.sql.exec<any>("SELECT oi.id,oi.quantity,oi.variant_id AS variantId,v.sku,v.color,v.size,v.options_json AS variantOptionsJson,v.retail_price_jod AS currentRetailPriceJod,pm.id AS modelId,pm.name_en AS productNameEn,pm.name_ar AS productNameAr,oi.design_id AS designId,d.title_en AS designTitleEn,d.title_ar AS designTitleAr,oi.master_asset_id AS masterAssetId,a.original_filename AS masterFilename,a.mime_type AS masterMimeType,a.storage_key AS masterStorageKey,a.protected AS masterProtected,oi.print_spec_json AS printSpecJson,oi.price_snapshot_json AS priceSnapshotJson,(SELECT pj.id FROM printing_jobs pj WHERE pj.order_item_id=oi.id ORDER BY pj.created_at DESC LIMIT 1) AS printingJobId,(SELECT pj.status FROM printing_jobs pj WHERE pj.order_item_id=oi.id ORDER BY pj.created_at DESC LIMIT 1) AS printingJobStatus,(SELECT pj.master_asset_id FROM printing_jobs pj WHERE pj.order_item_id=oi.id ORDER BY pj.created_at DESC LIMIT 1) AS printingJobMasterAssetId FROM order_items oi JOIN variants v ON v.id=oi.variant_id JOIN product_models pm ON pm.id=v.model_id LEFT JOIN designs d ON d.id=oi.design_id LEFT JOIN assets a ON a.id=oi.master_asset_id WHERE oi.order_id=? ORDER BY oi.id",id).toArray().map((row:any)=>({...row,variantOptions:parse(row.variantOptionsJson,{}),printSpec:parse(row.printSpecJson,{}),priceSnapshot:parse(row.priceSnapshotJson,{})}));
    const payments=this.ctx.storage.sql.exec<any>("SELECT id,method,status,proof_storage_key AS proofStorageKey,confirmed_by AS confirmedBy,created_at AS createdAt FROM payments WHERE order_id=? ORDER BY created_at",id).toArray();
    const history=this.ctx.storage.sql.exec<any>("SELECT h.id,h.event_type AS eventType,h.from_status AS fromStatus,h.to_status AS toStatus,h.payment_status AS paymentStatus,h.internal_comment AS internalComment,h.admin_actor_id AS adminActorId,a.username AS adminUsername,h.created_at AS createdAt FROM order_admin_history h LEFT JOIN admin_users a ON a.id=h.admin_actor_id WHERE h.order_id=? ORDER BY h.created_at DESC,h.id DESC",id).toArray();
    const checkout=this.ctx.storage.sql.exec<any>("SELECT source_cart_id AS sourceCartId,subtotal_jod AS subtotalJod,delivery_fee_jod AS deliveryFeeJod,discount_jod AS discountJod,promotion_code AS promotionCode,customer_name AS customerNameSnapshot,customer_phone AS customerPhoneSnapshot,city,address,notes,reservation_expires_at AS reservationExpiresAt,created_at AS createdAt FROM order_checkout_details WHERE order_id=?",id).toArray()[0]??null;
    return {...order,exchangeRate:parse(order.exchangeRateJson,null),defaultAddress:parse(order.defaultAddressJson,null),checkout,items,payments,history,allowedTransitions:[...allowedAdminOrderTransitions(order.status)]};
  }

  adminOrderUpdateStatus(actorId: string, orderId: string, nextStatus: string, comment = ""): unknown {
    this.bootstrapCatalog(); const id=String(orderId||"").trim(); const row=this.ctx.storage.sql.exec<any>("SELECT id,status,payment_status AS paymentStatus FROM orders WHERE id=?",id).toArray()[0]; if(!row) throw new Error("Order not found.");
    const next=normalizeAdminOrderStatus(nextStatus); if(!next) throw new Error("Invalid order status."); if(!canTransitionAdminOrder(row.status,next)) throw new Error(`Invalid status transition: ${row.status} → ${next}.`);
    const note=String(comment||"").trim().slice(0,2000); const paymentStatus=next==="payment_confirmed"?"confirmed":String(row.paymentStatus||"pending"); const historyId=crypto.randomUUID();
    this.ctx.storage.transactionSync(()=>{
      if(next==="payment_confirmed"){
        const checkout=this.ctx.storage.sql.exec<any>("SELECT source_cart_id AS sourceCartId FROM order_checkout_details WHERE order_id=?",id).toArray()[0];
        const items=this.ctx.storage.sql.exec<any>("SELECT oi.id AS orderItemId,oi.variant_id AS variantId,oi.quantity,oi.design_id AS designId,oi.master_asset_id AS masterAssetId,oi.print_spec_json AS printSpecJson,oi.price_snapshot_json AS priceSnapshotJson FROM order_items oi WHERE oi.order_id=? ORDER BY oi.id",id).toArray();
        this.ctx.storage.sql.exec("UPDATE reservations SET status='expired' WHERE status='pending' AND datetime(expires_at)<=datetime('now')");
        const totals=new Map<string,number>(); for(const item of items) totals.set(String(item.variantId),(totals.get(String(item.variantId))||0)+Number(item.quantity||0));
        for(const [variantId,qty] of totals){
          const stock=this.ctx.storage.sql.exec<any>("SELECT quantity,tracked FROM stocks WHERE variant_id=?",variantId).toArray()[0];
          if(stock&&Number(stock.tracked)===1){
            const otherReserved=Number(this.ctx.storage.sql.exec<any>("SELECT COALESCE(SUM(quantity),0) AS qty FROM reservations WHERE variant_id=? AND status='pending' AND datetime(expires_at)>datetime('now') AND (? IS NULL OR cart_id<>?)",variantId,checkout?.sourceCartId??null,checkout?.sourceCartId??null).toArray()[0]?.qty??0);
            if(Number(stock.quantity)-otherReserved<qty) throw new Error("Payment confirmation blocked because reserved stock is no longer available.");
          }
        }
        for(const [variantId,qty] of totals){
          const stock=this.ctx.storage.sql.exec<any>("SELECT tracked FROM stocks WHERE variant_id=?",variantId).toArray()[0];
          if(stock&&Number(stock.tracked)===1){
            const already=Boolean(this.ctx.storage.sql.exec<any>("SELECT 1 AS ok FROM stock_movements WHERE variant_id=? AND reason='order_payment_confirmed' AND reference_id=? LIMIT 1",variantId,id).toArray()[0]?.ok);
            if(!already){this.ctx.storage.sql.exec("UPDATE stocks SET quantity=quantity-? WHERE variant_id=?",qty,variantId);this.ctx.storage.sql.exec("INSERT INTO stock_movements (id,variant_id,quantity_delta,reason,reference_id) VALUES (?,?,?,?,?)",crypto.randomUUID(),variantId,-qty,"order_payment_confirmed",id);}
          }
        }
        if(checkout?.sourceCartId)this.ctx.storage.sql.exec("UPDATE reservations SET status='consumed' WHERE cart_id=? AND status='pending'",checkout.sourceCartId);
        for(const item of items){
          if(!item.designId) continue;
          if(!item.masterAssetId) throw new Error("Payment confirmation blocked because an order design has no approved Ready-to-Print Master.");
          const existingJob=this.ctx.storage.sql.exec<any>("SELECT id FROM printing_jobs WHERE order_item_id=? LIMIT 1",item.orderItemId).toArray()[0]; if(existingJob) continue;
          let snapshot:any={}; try{snapshot=JSON.parse(String(item.priceSnapshotJson||"{}"));}catch{}
          const preflight=snapshot?.preflight; if(!preflight||String(preflight.status||"").toLowerCase()!=="passed") throw new Error("Payment confirmation blocked because the historical preflight snapshot is not passing.");
          this.ctx.storage.sql.exec("INSERT INTO printing_jobs (id,order_item_id,status,master_asset_id,print_spec_snapshot_json,preflight_snapshot_json,protected_at) VALUES (?,?,'queued',?,?,?,CURRENT_TIMESTAMP)",crypto.randomUUID(),item.orderItemId,item.masterAssetId,String(item.printSpecJson||"{}"),JSON.stringify(preflight));
          this.ctx.storage.sql.exec("UPDATE assets SET protected=1 WHERE id=?",item.masterAssetId);
        }
      }
      if(next==="cancelled"){
        const checkout=this.ctx.storage.sql.exec<any>("SELECT source_cart_id AS sourceCartId FROM order_checkout_details WHERE order_id=?",id).toArray()[0];
        if(checkout?.sourceCartId)this.ctx.storage.sql.exec("UPDATE reservations SET status='released' WHERE cart_id=? AND status='pending'",checkout.sourceCartId);
        const items=this.ctx.storage.sql.exec<any>("SELECT variant_id AS variantId,SUM(quantity) AS quantity FROM order_items WHERE order_id=? GROUP BY variant_id",id).toArray();
        for(const item of items){
          const deducted=Boolean(this.ctx.storage.sql.exec<any>("SELECT 1 AS ok FROM stock_movements WHERE variant_id=? AND reason='order_payment_confirmed' AND reference_id=? LIMIT 1",item.variantId,id).toArray()[0]?.ok);
          const restored=Boolean(this.ctx.storage.sql.exec<any>("SELECT 1 AS ok FROM stock_movements WHERE variant_id=? AND reason='order_cancel_restore' AND reference_id=? LIMIT 1",item.variantId,id).toArray()[0]?.ok);
          if(deducted&&!restored){this.ctx.storage.sql.exec("UPDATE stocks SET quantity=quantity+? WHERE variant_id=?",Number(item.quantity),item.variantId);this.ctx.storage.sql.exec("INSERT INTO stock_movements (id,variant_id,quantity_delta,reason,reference_id) VALUES (?,?,?,?,?)",crypto.randomUUID(),item.variantId,Number(item.quantity),"order_cancel_restore",id);}
        }
        this.ctx.storage.sql.exec("UPDATE printing_jobs SET status='cancelled' WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id=?) AND status IN ('queued','printing','qc')",id);
      }
      this.ctx.storage.sql.exec("UPDATE orders SET status=?,payment_status=? WHERE id=?",next,paymentStatus,id);
      if(next==="payment_confirmed")this.ctx.storage.sql.exec("UPDATE payments SET status='confirmed',confirmed_by=? WHERE order_id=? AND status<>'confirmed'",actorId,id);
      this.ctx.storage.sql.exec("INSERT INTO order_admin_history (id,order_id,event_type,from_status,to_status,payment_status,internal_comment,admin_actor_id) VALUES (?,?,'status_change',?,?,?,?,?)",historyId,id,String(row.status),next,paymentStatus,note||null,actorId);
      this.ctx.storage.sql.exec("INSERT INTO audit_logs (actor_id,actor_role,action,resource_type,resource_id,metadata_json) VALUES (?,'admin','admin.order.status_change','order',?,?)",actorId,id,JSON.stringify({result:"success",metadata:{fromStatus:row.status,toStatus:next,paymentStatus,comment:note}}));
    });
    return this.adminOrderDetail(id);
  }

  adminOrderAddNote(actorId: string, orderId: string, comment: string): unknown {
    this.bootstrapCatalog(); const id=String(orderId||"").trim(); const row=this.ctx.storage.sql.exec<any>("SELECT id,status,payment_status AS paymentStatus FROM orders WHERE id=?",id).toArray()[0]; if(!row) throw new Error("Order not found."); const note=String(comment||"").trim().slice(0,2000); if(!note) throw new Error("Internal note is required."); const historyId=crypto.randomUUID();
    this.ctx.storage.transactionSync(()=>{ this.ctx.storage.sql.exec("INSERT INTO order_admin_history (id,order_id,event_type,from_status,to_status,payment_status,internal_comment,admin_actor_id) VALUES (?,?,'note',?,?,?, ?,?)",historyId,id,String(row.status),String(row.status),String(row.paymentStatus||"pending"),note,actorId); this.ctx.storage.sql.exec("INSERT INTO audit_logs (actor_id,actor_role,action,resource_type,resource_id,metadata_json) VALUES (?,'admin','admin.order.note','order',?,?)",actorId,id,JSON.stringify({result:"success",metadata:{comment:note}})); });
    return this.adminOrderDetail(id);
  }

  adminProductionQueue(filters: { search?:string; status?:string; page?:number; pageSize?:number } = {}): unknown {
    this.bootstrapCatalog(); const conditions:string[]=[]; const args:any[]=[];
    const search=String(filters.search??"").trim().toLowerCase();
    if(search){conditions.push("(lower(pj.id) LIKE ? OR lower(o.id) LIKE ? OR lower(COALESCE(u.display_name,'')) LIKE ? OR lower(COALESCE(u.email,'')) LIKE ? OR lower(COALESCE(v.sku,'')) LIKE ? OR lower(COALESCE(pm.name_en,'')) LIKE ?)"); const q="%"+search+"%"; args.push(q,q,q,q,q,q);}
    const status=String(filters.status??"").trim().toLowerCase(); if(status){conditions.push("lower(pj.status)=?");args.push(status);}
    const where=conditions.length?" WHERE "+conditions.join(" AND "):"";
    const pageSize=Math.max(1,Math.min(100,Math.floor(Number(filters.pageSize)||20)));
    const total=Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS count FROM printing_jobs pj JOIN order_items oi ON oi.id=pj.order_item_id JOIN orders o ON o.id=oi.order_id LEFT JOIN users u ON u.id=o.user_id JOIN variants v ON v.id=oi.variant_id JOIN product_models pm ON pm.id=v.model_id"+where,...args).toArray()[0]?.count??0);
    const pages=Math.max(1,Math.ceil(total/pageSize)); const page=Math.max(1,Math.min(pages,Math.floor(Number(filters.page)||1))); const offset=(page-1)*pageSize;
    const rows=this.ctx.storage.sql.exec<any>(`SELECT pj.id AS jobId,pj.status,pj.created_at AS createdAt,pj.protected_at AS protectedAt,pj.order_item_id AS orderItemId,o.id AS orderId,o.status AS orderStatus,o.fulfillment_mode AS fulfillmentMode,u.display_name AS customerName,u.email AS customerEmail,cp.phone AS customerPhone,oi.quantity,oi.variant_id AS variantId,v.sku,v.color,v.size,pm.id AS modelId,pm.name_en AS productNameEn,pm.name_ar AS productNameAr,oi.design_id AS designId,oi.master_asset_id AS approvedMasterAssetId,pj.master_asset_id AS jobMasterAssetId,a.original_filename AS masterFilename,a.mime_type AS masterMimeType,a.storage_key AS masterStorageKey,pj.print_spec_snapshot_json AS printSpecSnapshotJson,pj.preflight_snapshot_json AS preflightSnapshotJson FROM printing_jobs pj JOIN order_items oi ON oi.id=pj.order_item_id JOIN orders o ON o.id=oi.order_id LEFT JOIN users u ON u.id=o.user_id LEFT JOIN customer_profiles cp ON cp.user_id=o.user_id JOIN variants v ON v.id=oi.variant_id JOIN product_models pm ON pm.id=v.model_id LEFT JOIN assets a ON a.id=oi.master_asset_id${where} ORDER BY pj.created_at ASC,pj.id ASC LIMIT ? OFFSET ?`,...args,pageSize,offset).toArray();
    const parse=(v:any)=>{try{return JSON.parse(String(v??"{}"));}catch{return {};}};
    return {items:rows.map((r:any)=>({...r,masterReady:Boolean(r.approvedMasterAssetId&&r.jobMasterAssetId&&r.approvedMasterAssetId===r.jobMasterAssetId),printSpecSnapshot:parse(r.printSpecSnapshotJson),preflightSnapshot:parse(r.preflightSnapshotJson),allowedTransitions:[...allowedAdminProductionTransitions(r.status)]})),total,page,pageSize,pages};
  }

  adminProductionJob(jobId: string): unknown {
    this.bootstrapCatalog(); const id=String(jobId||"").trim();
    const row=this.ctx.storage.sql.exec<any>("SELECT pj.id AS jobId,pj.status,pj.created_at AS createdAt,pj.protected_at AS protectedAt,pj.order_item_id AS orderItemId,o.id AS orderId,o.status AS orderStatus,o.payment_status AS paymentStatus,o.fulfillment_mode AS fulfillmentMode,u.display_name AS customerName,u.email AS customerEmail,cp.phone AS customerPhone,oi.quantity,oi.variant_id AS variantId,v.sku,v.color,v.size,pm.id AS modelId,pm.name_en AS productNameEn,pm.name_ar AS productNameAr,oi.design_id AS designId,oi.master_asset_id AS approvedMasterAssetId,pj.master_asset_id AS jobMasterAssetId,a.original_filename AS masterFilename,a.mime_type AS masterMimeType,a.storage_key AS masterStorageKey,pj.print_spec_snapshot_json AS printSpecSnapshotJson,pj.preflight_snapshot_json AS preflightSnapshotJson FROM printing_jobs pj JOIN order_items oi ON oi.id=pj.order_item_id JOIN orders o ON o.id=oi.order_id LEFT JOIN users u ON u.id=o.user_id LEFT JOIN customer_profiles cp ON cp.user_id=o.user_id JOIN variants v ON v.id=oi.variant_id JOIN product_models pm ON pm.id=v.model_id LEFT JOIN assets a ON a.id=oi.master_asset_id WHERE pj.id=?",id).toArray()[0];
    if(!row) return null; const parse=(v:any)=>{try{return JSON.parse(String(v??"{}"));}catch{return {};}};
    return {...row,masterReady:Boolean(row.approvedMasterAssetId&&row.jobMasterAssetId&&row.approvedMasterAssetId===row.jobMasterAssetId),printSpecSnapshot:parse(row.printSpecSnapshotJson),preflightSnapshot:parse(row.preflightSnapshotJson),allowedTransitions:[...allowedAdminProductionTransitions(row.status)]};
  }

  adminProductionUpdateStatus(actorId: string, jobId: string, nextStatus: string): unknown {
    this.bootstrapCatalog(); const id=String(jobId||"").trim();
    const row=this.ctx.storage.sql.exec<any>("SELECT pj.id,pj.status,pj.master_asset_id AS jobMasterAssetId,pj.preflight_snapshot_json AS preflightSnapshotJson,oi.master_asset_id AS approvedMasterAssetId,oi.order_id AS orderId FROM printing_jobs pj JOIN order_items oi ON oi.id=pj.order_item_id WHERE pj.id=?",id).toArray()[0];
    if(!row) throw new Error("Printing job not found."); const next=normalizeAdminProductionStatus(nextStatus); if(!next) throw new Error("Invalid production status."); if(!canTransitionAdminProduction(row.status,next)) throw new Error(`Invalid production transition: ${row.status} → ${next}.`);
    if(next!=="cancelled"){
      if(!row.approvedMasterAssetId||!row.jobMasterAssetId||String(row.approvedMasterAssetId)!==String(row.jobMasterAssetId)) throw new Error("Production is blocked until the printing job references the exact approved Ready-to-Print Master from the order item.");
      let preflight:any={}; try{preflight=JSON.parse(String(row.preflightSnapshotJson||"{}"));}catch{}
      if(!preflight||typeof preflight!=="object"||Object.keys(preflight).length===0) throw new Error("Production is blocked because the historical preflight snapshot is missing.");
      const result=String(preflight.status??preflight.result??"").toLowerCase(); if(["failed","rejected","invalid"].includes(result)) throw new Error("Production is blocked because the approved master preflight snapshot is not passing.");
    }
    this.ctx.storage.transactionSync(()=>{this.ctx.storage.sql.exec("UPDATE printing_jobs SET status=?,protected_at=COALESCE(protected_at,CURRENT_TIMESTAMP) WHERE id=?",next,id);this.ctx.storage.sql.exec("INSERT INTO audit_logs (actor_id,actor_role,action,resource_type,resource_id,metadata_json) VALUES (?,'admin','admin.production.status_change','printing_job',?,?)",actorId,id,JSON.stringify({result:"success",metadata:{fromStatus:row.status,toStatus:next,orderId:row.orderId,masterAssetId:row.approvedMasterAssetId}}));});
    return this.adminProductionJob(id);
  }

  adminProductionMasterAsset(jobId: string): unknown {
    this.bootstrapCatalog(); const id=String(jobId||"").trim();
    const row=this.ctx.storage.sql.exec<any>("SELECT pj.id AS jobId,pj.master_asset_id AS jobMasterAssetId,oi.master_asset_id AS approvedMasterAssetId,a.storage_key AS storageKey,a.original_filename AS filename,a.mime_type AS mimeType,a.byte_size AS byteSize,pj.preflight_snapshot_json AS preflightSnapshotJson FROM printing_jobs pj JOIN order_items oi ON oi.id=pj.order_item_id LEFT JOIN assets a ON a.id=oi.master_asset_id WHERE pj.id=?",id).toArray()[0];
    if(!row) throw new Error("Printing job not found."); if(!row.approvedMasterAssetId||!row.jobMasterAssetId||String(row.approvedMasterAssetId)!==String(row.jobMasterAssetId)) throw new Error("The printing job is not linked to the exact approved Ready-to-Print Master."); if(!row.storageKey) throw new Error("Approved master file is unavailable."); return row;
  }

  adminProductsCatalog(filters: { search?:string; model?:string; priceFrom?:string; priceTo?:string; quantityFrom?:string; quantityTo?:string; category?:string; source?:string; enabled?:string; published?:string; sort?:string; order?:string; page?:number; pageSize?:number } = {}): unknown {
    this.bootstrapCatalog(); const conditions:string[]=[]; const args:any[]=[];
    const search=String(filters.search??"").trim().toLowerCase(); if(search){conditions.push("(lower(pm.id) LIKE ? OR lower(pm.name_en) LIKE ? OR lower(pm.name_ar) LIKE ?)");const q="%"+search+"%";args.push(q,q,q);} const model=String(filters.model??"").trim().toLowerCase(); if(model){conditions.push("(lower(pm.id) LIKE ? OR lower(pm.name_en) LIKE ? OR lower(pm.name_ar) LIKE ? OR EXISTS (SELECT 1 FROM variants vf WHERE vf.model_id=pm.id AND lower(vf.sku) LIKE ?))");const q="%"+model+"%";args.push(q,q,q,q);} for(const [key,op] of [["priceFrom",">="],["priceTo","<="] as const]){const v=String((filters as any)[key]??"").trim();if(v!==""&&Number.isFinite(Number(v))){conditions.push(`EXISTS (SELECT 1 FROM variants vx WHERE vx.model_id=pm.id AND CAST(vx.retail_price_jod AS REAL)/100 ${op} ?)`);args.push(Number(v));}} for(const [key,op] of [["quantityFrom",">="],["quantityTo","<="] as const]){const v=String((filters as any)[key]??"").trim();if(v!==""&&Number.isFinite(Number(v))){conditions.push(`COALESCE((SELECT SUM(COALESCE(sx.quantity,0)) FROM variants vx LEFT JOIN stocks sx ON sx.variant_id=vx.id WHERE vx.model_id=pm.id),0) ${op} ?`);args.push(Number(v));}}
    const category=String(filters.category??"").trim(); if(category){conditions.push("pm.category_id=?");args.push(category);}
    const source=String(filters.source??"").trim(); if(source){conditions.push("pm.source=?");args.push(source);}
    const enabled=String(filters.enabled??"").trim(); if(enabled==="yes"||enabled==="no"){conditions.push("pm.enabled=?");args.push(enabled==="yes"?1:0);}
    const published=String(filters.published??"").trim(); if(published==="yes"||published==="no"){conditions.push("(CASE WHEN pm.source='printify' THEN COALESCE(ppd.published,0) ELSE COALESCE(pad.published,pm.enabled) END)=?");args.push(published==="yes"?1:0);}
    const where=conditions.length?" WHERE "+conditions.join(" AND "):""; const sortMap:Record<string,string>={name:"pm.name_en COLLATE NOCASE",model:"pm.id COLLATE NOCASE",price:"minRetailPriceJod",quantity:"quantity"}; const sortKey=sortMap[String(filters.sort||"name")]||sortMap.name; const direction=String(filters.order||"asc").toLowerCase()==="desc"?"DESC":"ASC";
    const pageSize=Math.max(1,Math.min(100,Math.floor(Number(filters.pageSize)||20)));
    const total=Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS count FROM product_models pm LEFT JOIN product_admin_data pad ON pad.model_id=pm.id LEFT JOIN printify_product_data ppd ON ppd.model_id=pm.id"+where,...args).toArray()[0]?.count??0);
    const pages=Math.max(1,Math.ceil(total/pageSize)); const page=Math.max(1,Math.min(pages,Math.floor(Number(filters.page)||1))); const offset=(page-1)*pageSize;
    const items=this.ctx.storage.sql.exec<any>(`SELECT pm.id AS modelId,pm.category_id AS categoryId,sc.name_en AS categoryNameEn,sc.name_ar AS categoryNameAr,pm.name_en AS nameEn,pm.name_ar AS nameAr,pm.source,pm.enabled,CASE WHEN pm.source='printify' THEN COALESCE(ppd.description_en,'') ELSE COALESCE(pad.description_en,'') END AS descriptionEn,CASE WHEN pm.source='printify' THEN COALESCE(ppd.description_ar,'') ELSE COALESCE(pad.description_ar,'') END AS descriptionAr,CASE WHEN pm.source='printify' THEN ppd.display_image ELSE pad.display_image END AS displayImage,CASE WHEN pm.source='printify' THEN COALESCE(ppd.print_your_dream,1) ELSE COALESCE(pad.print_your_dream,1) END AS printYourDream,CASE WHEN pm.source='printify' THEN COALESCE(ppd.published,0) ELSE COALESCE(pad.published,pm.enabled) END AS published,(SELECT MIN(CAST(v.retail_price_jod AS REAL))/100.0 FROM variants v WHERE v.model_id=pm.id AND v.retail_price_jod>0) AS minRetailPriceJod,(SELECT SUM(COALESCE(s.quantity,0)) FROM variants v LEFT JOIN stocks s ON s.variant_id=v.id WHERE v.model_id=pm.id) AS quantity,(SELECT COUNT(*) FROM variants v WHERE v.model_id=pm.id) AS variantCount,(SELECT COUNT(*) FROM variants v WHERE v.model_id=pm.id AND v.enabled=1) AS enabledVariantCount,(SELECT COALESCE(SUM(CASE WHEN s.tracked=1 THEN s.quantity ELSE 0 END),0) FROM variants v LEFT JOIN stocks s ON s.variant_id=v.id WHERE v.model_id=pm.id) AS trackedStock FROM product_models pm JOIN site_categories sc ON sc.id=pm.category_id LEFT JOIN product_admin_data pad ON pad.model_id=pm.id LEFT JOIN printify_product_data ppd ON ppd.model_id=pm.id${where} ORDER BY ${sortKey} ${direction},pm.id LIMIT ? OFFSET ?`,...args,pageSize,offset).toArray();
    const categories=this.ctx.storage.sql.exec<any>("SELECT id,name_en AS nameEn,name_ar AS nameAr,enabled,home_featured AS homeFeatured,home_order AS homeOrder,mockup_mode AS mockupMode FROM site_categories ORDER BY home_order,name_en").toArray();
    return {items,categories,total,page,pageSize,pages};
  }

  adminProductDetail(modelId: string): unknown {
    this.bootstrapCatalog(); const id=String(modelId||"").trim();
    const product=this.ctx.storage.sql.exec<any>("SELECT pm.id AS modelId,pm.category_id AS categoryId,pm.name_en AS nameEn,pm.name_ar AS nameAr,pm.source,pm.enabled,CASE WHEN pm.source='printify' THEN COALESCE(ppd.description_en,'') ELSE COALESCE(pad.description_en,'') END AS descriptionEn,CASE WHEN pm.source='printify' THEN COALESCE(ppd.description_ar,'') ELSE COALESCE(pad.description_ar,'') END AS descriptionAr,CASE WHEN pm.source='printify' THEN ppd.display_image ELSE pad.display_image END AS displayImage,CASE WHEN pm.source='printify' THEN COALESCE(ppd.print_your_dream,1) ELSE COALESCE(pad.print_your_dream,1) END AS printYourDream,CASE WHEN pm.source='printify' THEN COALESCE(ppd.published,0) ELSE COALESCE(pad.published,pm.enabled) END AS published FROM product_models pm LEFT JOIN product_admin_data pad ON pad.model_id=pm.id LEFT JOIN printify_product_data ppd ON ppd.model_id=pm.id WHERE pm.id=?",id).toArray()[0];
    if(!product) return null;
    const parse=(v:any)=>{try{return JSON.parse(String(v??"{}"));}catch{return {};}};
    const variants=this.ctx.storage.sql.exec<any>("SELECT v.id AS variantId,v.sku,v.color,v.size,v.options_json AS optionsJson,CAST(v.retail_price_jod AS REAL)/100.0 AS retailPriceJod,v.enabled,COALESCE(s.tracked,0) AS tracked,COALESCE(s.quantity,0) AS quantity FROM variants v LEFT JOIN stocks s ON s.variant_id=v.id WHERE v.model_id=? ORDER BY v.sku",id).toArray().map((v:any)=>({...v,options:parse(v.optionsJson)}));
    const media=this.ctx.storage.sql.exec<any>("SELECT id AS mediaId,storage_key AS storageKey,media_kind AS mediaKind,alt_en AS altEn,alt_ar AS altAr FROM product_media WHERE model_id=? ORDER BY media_kind,id",id).toArray();
    const eligibility=this.ctx.storage.sql.exec<any>("SELECT product_type AS productType,enabled FROM product_type_eligibility WHERE model_id=? ORDER BY product_type",id).toArray();
    return {...product,variants,media,eligibility};
  }

  adminDownloads(filters:any={}):unknown {this.bootstrapCatalog();const q=String(filters.search||'').trim().toLowerCase(),like='%'+q+'%',where=q?' WHERE lower(name_en) LIKE ? OR lower(name_ar) LIKE ? OR lower(filename) LIKE ? OR lower(mask) LIKE ?':'',a=q?[like,like,like,like]:[],size=Math.max(1,Math.min(100,Number(filters.pageSize)||20)),total=Number(this.ctx.storage.sql.exec<any>('SELECT COUNT(*) count FROM catalog_downloads'+where,...a).toArray()[0]?.count||0),pages=Math.max(1,Math.ceil(total/size)),page=Math.max(1,Math.min(pages,Number(filters.page)||1)),items=this.ctx.storage.sql.exec<any>('SELECT id,name_en nameEn,name_ar nameAr,filename,mask,mime_type mimeType,byte_size byteSize,status,created_at createdAt FROM catalog_downloads'+where+' ORDER BY created_at DESC LIMIT ? OFFSET ?',...a,size,(page-1)*size).toArray();return {items,total,page,pageSize:size,pages};}
  private safeDownloadFilename(value:string):string { const name=String(value||'').trim().replace(/[\\/\u0000-\u001f]/g,'_').replace(/^\.+/,'').slice(0,240); if(!name||name==='.'||name==='..') throw new Error('A safe display filename is required.'); return name; }

[Showing lines 1205-1482 of 1924. Use offset=1483 to continue.]