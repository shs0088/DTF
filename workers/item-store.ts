import { DurableObject } from "cloudflare:workers";
import { allowedAdminOrderTransitions, canTransitionAdminOrder, normalizeAdminOrderStatus } from "./admin-orders";
import { allowedAdminProductionTransitions, canTransitionAdminProduction, normalizeAdminProductionStatus } from "./admin-production";
import { allowedAdminWithdrawalTransitions, canTransitionAdminWithdrawal, normalizeAdminWithdrawalStatus } from "./admin-payouts";
import { DESIGN_PRODUCT_TYPES } from "./analyzer";

interface ItemStoreEnv {}

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
  constructor(ctx: DurableObjectState, env: ItemStoreEnv) {
    super(ctx, env);
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
      INSERT OR IGNORE INTO admin_group_permissions (group_id,resource,permission) SELECT 'group-main-admin',resource,permission FROM (SELECT 'admin.dashboard' AS resource UNION SELECT 'admin.orders' UNION SELECT 'admin.production' UNION SELECT 'admin.products.printify' UNION SELECT 'admin.users' UNION SELECT 'admin.user_groups' UNION SELECT 'admin.settings') CROSS JOIN (SELECT 'access' AS permission UNION SELECT 'modify');
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
        const validation=this.ctx.storage.sql.exec<any>("SELECT status,errors_json AS errorsJson,warnings_json AS warningsJson,created_at AS createdAt FROM validation_results WHERE design_id=? AND asset_id=? ORDER BY created_at DESC LIMIT 1",line.designId,line.masterAssetId).toArray()[0];
        if(!validation||String(validation.status).toLowerCase()!=="passed")issues.push(`${line.sku}: approved master has no passing preflight result.`);
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

[Showing lines 1-852 of 1747. Use offset=853 to continue.]