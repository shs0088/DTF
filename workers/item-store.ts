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

      CREATE TABLE IF NOT EXISTS site_categories (
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
        note TEXT,
        admin_actor_id TEXT REFERENCES admin_users(id),
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

[Showing lines 1-845 of 1924. Use offset=846 to continue.]