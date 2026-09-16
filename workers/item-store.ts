import { DurableObject } from "cloudflare:workers";
import { allowedAdminOrderTransitions, canTransitionAdminOrder, normalizeAdminOrderStatus } from "./admin-orders";
import { allowedAdminProductionTransitions, canTransitionAdminProduction, normalizeAdminProductionStatus } from "./admin-production";
import { allowedAdminWithdrawalTransitions, canTransitionAdminWithdrawal, normalizeAdminWithdrawalStatus } from "./admin-payouts";

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

export class ItemStore extends DurableObject<ItemStoreEnv> {
  constructor(ctx: DurableObjectState, env: ItemStoreEnv) {
    super(ctx, env);
    this.ctx.storage.sql.exec(`
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
      try { this.ctx.storage.sql.exec("ALTER TABLE admin_users ADD COLUMN group_id TEXT"); } catch {}

      UPDATE admin_users SET group_id=CASE WHEN role='main_admin' THEN 'group-main-admin' ELSE 'group-printing-operator' END WHERE group_id IS NULL;

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
    this.ctx.storage.sql.exec(`
      INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('schema_version', 'phase-1.3');
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
  adminAuditList(limit=100): unknown[] { this.bootstrapCatalog(); return this.ctx.storage.sql.exec("SELECT id,actor_id AS actorId,actor_role AS actorRole,action,resource_type AS resourceType,resource_id AS resourceId,metadata_json AS metadata,created_at AS createdAt FROM audit_logs ORDER BY id DESC LIMIT ?",Math.max(1,Math.min(500,Math.floor(limit)))).toArray(); }

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
    return {...order,exchangeRate:parse(order.exchangeRateJson,null),defaultAddress:parse(order.defaultAddressJson,null),items,payments,history,allowedTransitions:[...allowedAdminOrderTransitions(order.status)]};
  }

  adminOrderUpdateStatus(actorId: string, orderId: string, nextStatus: string, comment = ""): unknown {
    this.bootstrapCatalog(); const id=String(orderId||"").trim(); const row=this.ctx.storage.sql.exec<any>("SELECT id,status,payment_status AS paymentStatus FROM orders WHERE id=?",id).toArray()[0]; if(!row) throw new Error("Order not found.");
    const next=normalizeAdminOrderStatus(nextStatus); if(!next) throw new Error("Invalid order status."); if(!canTransitionAdminOrder(row.status,next)) throw new Error(`Invalid status transition: ${row.status} → ${next}.`);
    const note=String(comment||"").trim().slice(0,2000); const paymentStatus=next==="payment_confirmed"?"confirmed":String(row.paymentStatus||"pending");
    const historyId=crypto.randomUUID();
    this.ctx.storage.transactionSync(()=>{ this.ctx.storage.sql.exec("UPDATE orders SET status=?,payment_status=? WHERE id=?",next,paymentStatus,id); if(next==="payment_confirmed") this.ctx.storage.sql.exec("UPDATE payments SET status='confirmed',confirmed_by=? WHERE order_id=? AND status<>'confirmed'",actorId,id); this.ctx.storage.sql.exec("INSERT INTO order_admin_history (id,order_id,event_type,from_status,to_status,payment_status,internal_comment,admin_actor_id) VALUES (?,?,'status_change',?,?,?,?,?)",historyId,id,String(row.status),next,paymentStatus,note||null,actorId); this.ctx.storage.sql.exec("INSERT INTO audit_logs (actor_id,actor_role,action,resource_type,resource_id,metadata_json) VALUES (?,'admin','admin.order.status_change','order',?,?)",actorId,id,JSON.stringify({result:"success",metadata:{fromStatus:row.status,toStatus:next,paymentStatus,comment:note}})); });
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

  adminProductsCatalog(filters: { search?:string; category?:string; source?:string; enabled?:string; published?:string; page?:number; pageSize?:number } = {}): unknown {
    this.bootstrapCatalog(); const conditions:string[]=[]; const args:any[]=[];
    const search=String(filters.search??"").trim().toLowerCase(); if(search){conditions.push("(lower(pm.id) LIKE ? OR lower(pm.name_en) LIKE ? OR lower(pm.name_ar) LIKE ?)");const q="%"+search+"%";args.push(q,q,q);}
    const category=String(filters.category??"").trim(); if(category){conditions.push("pm.category_id=?");args.push(category);}
    const source=String(filters.source??"").trim(); if(source){conditions.push("pm.source=?");args.push(source);}
    const enabled=String(filters.enabled??"").trim(); if(enabled==="yes"||enabled==="no"){conditions.push("pm.enabled=?");args.push(enabled==="yes"?1:0);}
    const published=String(filters.published??"").trim(); if(published==="yes"||published==="no"){conditions.push("(CASE WHEN pm.source='printify' THEN COALESCE(ppd.published,0) ELSE COALESCE(pad.published,pm.enabled) END)=?");args.push(published==="yes"?1:0);}
    const where=conditions.length?" WHERE "+conditions.join(" AND "):"";
    const pageSize=Math.max(1,Math.min(100,Math.floor(Number(filters.pageSize)||20)));
    const total=Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS count FROM product_models pm LEFT JOIN product_admin_data pad ON pad.model_id=pm.id LEFT JOIN printify_product_data ppd ON ppd.model_id=pm.id"+where,...args).toArray()[0]?.count??0);
    const pages=Math.max(1,Math.ceil(total/pageSize)); const page=Math.max(1,Math.min(pages,Math.floor(Number(filters.page)||1))); const offset=(page-1)*pageSize;
    const items=this.ctx.storage.sql.exec<any>(`SELECT pm.id AS modelId,pm.category_id AS categoryId,sc.name_en AS categoryNameEn,sc.name_ar AS categoryNameAr,pm.name_en AS nameEn,pm.name_ar AS nameAr,pm.source,pm.enabled,CASE WHEN pm.source='printify' THEN COALESCE(ppd.description_en,'') ELSE COALESCE(pad.description_en,'') END AS descriptionEn,CASE WHEN pm.source='printify' THEN COALESCE(ppd.description_ar,'') ELSE COALESCE(pad.description_ar,'') END AS descriptionAr,CASE WHEN pm.source='printify' THEN ppd.display_image ELSE pad.display_image END AS displayImage,CASE WHEN pm.source='printify' THEN COALESCE(ppd.print_your_dream,1) ELSE COALESCE(pad.print_your_dream,1) END AS printYourDream,CASE WHEN pm.source='printify' THEN COALESCE(ppd.published,0) ELSE COALESCE(pad.published,pm.enabled) END AS published,(SELECT COUNT(*) FROM variants v WHERE v.model_id=pm.id) AS variantCount,(SELECT COUNT(*) FROM variants v WHERE v.model_id=pm.id AND v.enabled=1) AS enabledVariantCount,(SELECT COALESCE(SUM(CASE WHEN s.tracked=1 THEN s.quantity ELSE 0 END),0) FROM variants v LEFT JOIN stocks s ON s.variant_id=v.id WHERE v.model_id=pm.id) AS trackedStock FROM product_models pm JOIN site_categories sc ON sc.id=pm.category_id LEFT JOIN product_admin_data pad ON pad.model_id=pm.id LEFT JOIN printify_product_data ppd ON ppd.model_id=pm.id${where} ORDER BY pm.name_en COLLATE NOCASE,pm.id LIMIT ? OFFSET ?`,...args,pageSize,offset).toArray();
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

  adminUpsertProductCategory(actorId: string, input: { id?:string; nameEn:string; nameAr:string; enabled?:boolean; homeFeatured?:boolean; homeOrder?:number; mockupMode?:string }): unknown {
    this.bootstrapCatalog(); const id=String(input.id||("cat-"+crypto.randomUUID())).replace(/[^a-zA-Z0-9_-]/g,"").slice(0,100);const nameEn=String(input.nameEn||"").trim().slice(0,160),nameAr=String(input.nameAr||"").trim().slice(0,160);if(!nameEn||!nameAr)throw new Error("Arabic and English category names are required.");const mode=input.mockupMode==="custom"?"custom":"mapped";const order=Math.max(0,Math.min(9999,Math.floor(Number(input.homeOrder)||0)));
    const exists=this.ctx.storage.sql.exec<any>("SELECT id FROM site_categories WHERE id=?",id).toArray()[0];
    if(exists)this.ctx.storage.sql.exec("UPDATE site_categories SET name_en=?,name_ar=?,enabled=?,home_featured=?,home_order=?,mockup_mode=? WHERE id=?",nameEn,nameAr,input.enabled===false?0:1,input.homeFeatured?1:0,order,mode,id);else this.ctx.storage.sql.exec("INSERT INTO site_categories (id,name_en,name_ar,enabled,home_featured,home_order,mockup_mode) VALUES (?,?,?,?,?,?,?)",id,nameEn,nameAr,input.enabled===false?0:1,input.homeFeatured?1:0,order,mode);
    this.adminAudit(actorId,exists?"admin.product_category.update":"admin.product_category.create","site_category",id,"success",{nameEn,nameAr});return this.ctx.storage.sql.exec<any>("SELECT id,name_en AS nameEn,name_ar AS nameAr,enabled,home_featured AS homeFeatured,home_order AS homeOrder,mockup_mode AS mockupMode FROM site_categories WHERE id=?",id).toArray()[0];
  }

  adminCreateProduct(actorId: string,input:{categoryId:string;nameEn:string;nameAr:string;descriptionEn?:string;descriptionAr?:string;displayImage?:string;printYourDream?:boolean}): unknown {
    this.bootstrapCatalog();const categoryId=String(input.categoryId||"").trim();if(!this.ctx.storage.sql.exec<any>("SELECT id FROM site_categories WHERE id=?",categoryId).toArray()[0])throw new Error("Category not found.");const nameEn=String(input.nameEn||"").trim().slice(0,200),nameAr=String(input.nameAr||"").trim().slice(0,200);if(!nameEn||!nameAr)throw new Error("Arabic and English product names are required.");const id="product-"+crypto.randomUUID();
    this.ctx.storage.transactionSync(()=>{this.ctx.storage.sql.exec("INSERT INTO product_models (id,category_id,name_ar,name_en,source,enabled) VALUES (?,?,?,?,'custom',0)",id,categoryId,nameAr,nameEn);this.ctx.storage.sql.exec("INSERT INTO product_admin_data (model_id,description_en,description_ar,display_image,print_your_dream,published) VALUES (?,?,?,?,?,0)",id,String(input.descriptionEn||"").trim().slice(0,5000),String(input.descriptionAr||"").trim().slice(0,5000),String(input.displayImage||"").trim().slice(0,1000)||null,input.printYourDream===false?0:1);this.adminAudit(actorId,"admin.product.create","product_model",id,"success",{categoryId,nameEn,nameAr});});
    return this.adminProductDetail(id);
  }

  adminUpdateProduct(actorId:string,modelId:string,input:{categoryId?:string;nameEn?:string;nameAr?:string;descriptionEn?:string;descriptionAr?:string;displayImage?:string|null;printYourDream?:boolean;enabled?:boolean}):unknown{
    this.bootstrapCatalog();const id=String(modelId||"").trim();const row=this.ctx.storage.sql.exec<any>("SELECT source,category_id AS categoryId,name_en AS nameEn,name_ar AS nameAr,enabled FROM product_models WHERE id=?",id).toArray()[0];if(!row)throw new Error("Product not found.");if(row.source==="printify")throw new Error("Printify-backed products must be edited through the existing Printify Catalog workflow.");const categoryId=input.categoryId===undefined?row.categoryId:String(input.categoryId);if(!this.ctx.storage.sql.exec<any>("SELECT id FROM site_categories WHERE id=?",categoryId).toArray()[0])throw new Error("Category not found.");const nameEn=String(input.nameEn??row.nameEn).trim().slice(0,200),nameAr=String(input.nameAr??row.nameAr).trim().slice(0,200);if(!nameEn||!nameAr)throw new Error("Arabic and English product names are required.");this.ctx.storage.sql.exec("INSERT OR IGNORE INTO product_admin_data (model_id,published) VALUES (?,0)",id);const current=this.ctx.storage.sql.exec<any>("SELECT * FROM product_admin_data WHERE model_id=?",id).toArray()[0];this.ctx.storage.transactionSync(()=>{this.ctx.storage.sql.exec("UPDATE product_models SET category_id=?,name_en=?,name_ar=?,enabled=? WHERE id=?",categoryId,nameEn,nameAr,input.enabled===undefined?row.enabled:(input.enabled?1:0),id);this.ctx.storage.sql.exec("UPDATE product_admin_data SET description_en=?,description_ar=?,display_image=?,print_your_dream=?,updated_at=CURRENT_TIMESTAMP WHERE model_id=?",String(input.descriptionEn??current.description_en??"").trim().slice(0,5000),String(input.descriptionAr??current.description_ar??"").trim().slice(0,5000),input.displayImage===undefined?current.display_image:(String(input.displayImage||"").trim().slice(0,1000)||null),input.printYourDream===undefined?Number(current.print_your_dream??1):(input.printYourDream?1:0),id);this.adminAudit(actorId,"admin.product.update","product_model",id,"success",{categoryId,nameEn,nameAr});});return this.adminProductDetail(id);
  }

  adminSetProductPublished(actorId:string,modelId:string,published:boolean):unknown{
    this.bootstrapCatalog();const id=String(modelId||"").trim();const row=this.ctx.storage.sql.exec<any>("SELECT pm.source,pm.name_en AS nameEn,pm.name_ar AS nameAr,pad.description_en AS descriptionEn,pad.description_ar AS descriptionAr,pad.display_image AS displayImage FROM product_models pm LEFT JOIN product_admin_data pad ON pad.model_id=pm.id WHERE pm.id=?",id).toArray()[0];if(!row)throw new Error("Product not found.");if(row.source==="printify")throw new Error("Printify-backed publication must use the existing Printify Catalog validation workflow.");this.ctx.storage.sql.exec("INSERT OR IGNORE INTO product_admin_data (model_id,published) VALUES (?,0)",id);if(published){const errors:string[]=[];if(!String(row.nameEn||"").trim())errors.push("English name is required.");if(!String(row.nameAr||"").trim())errors.push("Arabic name is required.");if(!String(row.descriptionEn||"").trim())errors.push("English description is required.");if(!String(row.descriptionAr||"").trim())errors.push("Arabic description is required.");if(!String(row.displayImage||"").trim())errors.push("Display image is required.");const validVariants=Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS count FROM variants WHERE model_id=? AND enabled=1 AND retail_price_jod>0",id).toArray()[0]?.count??0);if(validVariants<1)errors.push("At least one enabled variant with a positive retail price is required.");if(errors.length)throw new Error(errors.join(" "));}
    this.ctx.storage.transactionSync(()=>{this.ctx.storage.sql.exec("UPDATE product_admin_data SET published=?,updated_at=CURRENT_TIMESTAMP WHERE model_id=?",published?1:0,id);this.ctx.storage.sql.exec("UPDATE product_models SET enabled=? WHERE id=?",published?1:0,id);this.adminAudit(actorId,published?"admin.product.publish":"admin.product.unpublish","product_model",id,"success");});return this.adminProductDetail(id);
  }

  adminUpsertProductVariant(actorId:string,modelId:string,input:{variantId?:string;sku:string;color?:string;size?:string;options?:unknown;retailPriceJod:number;enabled?:boolean;tracked?:boolean;quantity?:number}):unknown{
    this.bootstrapCatalog();const model=String(modelId||"").trim();const product=this.ctx.storage.sql.exec<any>("SELECT source FROM product_models WHERE id=?",model).toArray()[0];if(!product)throw new Error("Product not found.");if(product.source==="printify")throw new Error("Printify variants must be managed through the existing Printify Catalog workflow.");const sku=String(input.sku||"").trim().slice(0,120);if(!sku)throw new Error("SKU is required.");const price=Math.round(Number(input.retailPriceJod)*100);if(!Number.isFinite(price)||price<0)throw new Error("Retail price must be a non-negative number.");const qty=Math.max(0,Math.floor(Number(input.quantity)||0));const id=String(input.variantId||("variant-"+crypto.randomUUID())).replace(/[^a-zA-Z0-9_-]/g,"").slice(0,120);const existing=this.ctx.storage.sql.exec<any>("SELECT id,model_id AS modelId FROM variants WHERE id=?",id).toArray()[0];if(existing&&existing.modelId!==model)throw new Error("Variant does not belong to this product.");const skuOwner=this.ctx.storage.sql.exec<any>("SELECT id FROM variants WHERE sku=? AND id<>?",sku,id).toArray()[0];if(skuOwner)throw new Error("SKU is already in use.");const beforeStock=Number(this.ctx.storage.sql.exec<any>("SELECT quantity FROM stocks WHERE variant_id=?",id).toArray()[0]?.quantity??0);
    this.ctx.storage.transactionSync(()=>{if(existing)this.ctx.storage.sql.exec("UPDATE variants SET sku=?,color=?,size=?,options_json=?,retail_price_jod=?,enabled=? WHERE id=? AND model_id=?",sku,String(input.color||"").trim().slice(0,100)||null,String(input.size||"").trim().slice(0,100)||null,JSON.stringify(input.options??{}),price,input.enabled===false?0:1,id,model);else this.ctx.storage.sql.exec("INSERT INTO variants (id,model_id,sku,color,size,options_json,retail_price_jod,enabled) VALUES (?,?,?,?,?,?,?,?)",id,model,sku,String(input.color||"").trim().slice(0,100)||null,String(input.size||"").trim().slice(0,100)||null,JSON.stringify(input.options??{}),price,input.enabled===false?0:1);this.ctx.storage.sql.exec("INSERT INTO stocks (variant_id,quantity,tracked) VALUES (?,?,?) ON CONFLICT(variant_id) DO UPDATE SET quantity=excluded.quantity,tracked=excluded.tracked",id,qty,input.tracked?1:0);const delta=qty-beforeStock;if(delta!==0)this.ctx.storage.sql.exec("INSERT INTO stock_movements (id,variant_id,quantity_delta,reason,reference_id) VALUES (?,?,?,?,?)",crypto.randomUUID(),id,delta,existing?"admin_adjustment":"initial_stock",model);this.adminAudit(actorId,existing?"admin.product_variant.update":"admin.product_variant.create","variant",id,"success",{modelId:model,sku,quantity:qty,tracked:Boolean(input.tracked)});});return this.adminProductDetail(model);
  }

  adminProductMediaAdd(actorId:string,modelId:string,input:{storageKey:string;mediaKind?:string;altEn?:string;altAr?:string}):unknown{
    this.bootstrapCatalog();const model=String(modelId||"").trim();if(!this.ctx.storage.sql.exec<any>("SELECT id FROM product_models WHERE id=?",model).toArray()[0])throw new Error("Product not found.");const key=String(input.storageKey||"").trim().replace(/^\/+|^public\//g,"").slice(0,1000);if(!key||key.includes(".."))throw new Error("Invalid media storage key.");const kind=["original","preview","mockup"].includes(String(input.mediaKind))?String(input.mediaKind):"preview";const id=crypto.randomUUID();this.ctx.storage.sql.exec("INSERT INTO product_media (id,model_id,storage_key,media_kind,alt_en,alt_ar) VALUES (?,?,?,?,?,?)",id,model,key,kind,String(input.altEn||"").trim().slice(0,300)||null,String(input.altAr||"").trim().slice(0,300)||null);this.adminAudit(actorId,"admin.product_media.add","product_media",id,"success",{modelId:model,kind});return this.adminProductDetail(model);
  }

  adminProductMediaRemove(actorId:string,modelId:string,mediaId:string):unknown{
    this.bootstrapCatalog();const model=String(modelId||"").trim(),id=String(mediaId||"").trim();const row=this.ctx.storage.sql.exec<any>("SELECT id FROM product_media WHERE id=? AND model_id=?",id,model).toArray()[0];if(!row)throw new Error("Product media not found.");this.ctx.storage.sql.exec("DELETE FROM product_media WHERE id=? AND model_id=?",id,model);this.adminAudit(actorId,"admin.product_media.remove","product_media",id,"success",{modelId:model});return this.adminProductDetail(model);
  }

  adminProductSetEligibility(actorId:string,modelId:string,types:string[]):unknown{
    this.bootstrapCatalog();const model=String(modelId||"").trim();if(!this.ctx.storage.sql.exec<any>("SELECT id FROM product_models WHERE id=?",model).toArray()[0])throw new Error("Product not found.");const allowed=["T-Shirt","Mug","Cap","T-Shirt+Mug","T-Shirt+Cap","Mug+Cap","T-Shirt+Mug+Cap"];const clean=[...new Set(types.map(x=>String(x)).filter(x=>allowed.includes(x)))];this.ctx.storage.transactionSync(()=>{this.ctx.storage.sql.exec("DELETE FROM product_type_eligibility WHERE model_id=?",model);for(const type of clean)this.ctx.storage.sql.exec("INSERT INTO product_type_eligibility (model_id,product_type,enabled) VALUES (?,?,1)",model,type);this.adminAudit(actorId,"admin.product.eligibility.update","product_model",model,"success",{types:clean});});return this.adminProductDetail(model);
  }

  adminCustomersList(filters: { search?:string; status?:string; dateFrom?:string; dateTo?:string; page?:number; pageSize?:number } = {}): unknown {
    this.bootstrapCatalog(); const conditions:string[]=["r.name='customer'"]; const args:any[]=[];
    const search=String(filters.search??"").trim().toLowerCase(); if(search){conditions.push("(lower(u.id) LIKE ? OR lower(u.display_name) LIKE ? OR lower(u.email) LIKE ? OR lower(COALESCE(cp.phone,'')) LIKE ?)");const q="%"+search+"%";args.push(q,q,q,q);}
    const status=String(filters.status??"").trim().toLowerCase(); if(status){conditions.push("lower(u.status)=?");args.push(status);}
    const dateFrom=String(filters.dateFrom??"").trim();if(/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)){conditions.push("date(u.created_at)>=date(?)");args.push(dateFrom);}
    const dateTo=String(filters.dateTo??"").trim();if(/^\d{4}-\d{2}-\d{2}$/.test(dateTo)){conditions.push("date(u.created_at)<=date(?)");args.push(dateTo);}
    const where=" WHERE "+conditions.join(" AND "); const pageSize=Math.max(1,Math.min(100,Math.floor(Number(filters.pageSize)||20)));
    const base=" FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id LEFT JOIN customer_profiles cp ON cp.user_id=u.id";
    const total=Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(DISTINCT u.id) AS count"+base+where,...args).toArray()[0]?.count??0);const pages=Math.max(1,Math.ceil(total/pageSize));const page=Math.max(1,Math.min(pages,Math.floor(Number(filters.page)||1)));const offset=(page-1)*pageSize;
    const items=this.ctx.storage.sql.exec<any>("SELECT u.id AS customerId,u.display_name AS displayName,u.email,u.locale,u.status,u.created_at AS createdAt,cp.phone,(SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id) AS orderCount,(SELECT COALESCE(SUM(o.total_jod),0) FROM orders o WHERE o.user_id=u.id AND lower(o.status)<>'cancelled') AS lifetimeOrderValueJod"+base+where+" GROUP BY u.id ORDER BY u.created_at DESC,u.id LIMIT ? OFFSET ?",...args,pageSize,offset).toArray();
    return {items,total,page,pageSize,pages};
  }

  adminCustomerDetail(customerId:string):unknown{
    this.bootstrapCatalog();const id=String(customerId||"").trim();
    const customer=this.ctx.storage.sql.exec<any>("SELECT u.id AS customerId,u.display_name AS displayName,u.email,u.locale,u.status,u.created_at AS createdAt,cp.phone,cp.default_address_json AS defaultAddressJson FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id LEFT JOIN customer_profiles cp ON cp.user_id=u.id WHERE u.id=? AND r.name='customer'",id).toArray()[0];if(!customer)return null;
    const parse=(v:any,f:any)=>{try{return JSON.parse(String(v??""));}catch{return f;}};
    const orders=this.ctx.storage.sql.exec<any>("SELECT id,status,payment_status AS paymentStatus,fulfillment_mode AS fulfillmentMode,total_jod AS totalJod,currency,created_at AS createdAt,(SELECT COUNT(*) FROM order_items oi WHERE oi.order_id=orders.id) AS itemCount FROM orders WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 100",id).toArray();
    const stats=this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS totalOrders,COALESCE(SUM(CASE WHEN lower(status)<>'cancelled' THEN total_jod ELSE 0 END),0) AS lifetimeValueJod,SUM(CASE WHEN lower(status)='completed' THEN 1 ELSE 0 END) AS completedOrders,SUM(CASE WHEN lower(status)='cancelled' THEN 1 ELSE 0 END) AS cancelledOrders FROM orders WHERE user_id=?",id).toArray()[0]??{};
    return {...customer,defaultAddress:parse(customer.defaultAddressJson,null),orders,stats};
  }

  adminUpdateCustomer(actorId:string,customerId:string,input:{displayName?:string;email?:string;phone?:string|null;locale?:string;status?:string;defaultAddress?:unknown}):unknown{
    this.bootstrapCatalog();const id=String(customerId||"").trim();const current=this.ctx.storage.sql.exec<any>("SELECT u.id,u.display_name AS displayName,u.email,u.locale,u.status FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE u.id=? AND r.name='customer'",id).toArray()[0];if(!current)throw new Error("Customer not found.");
    const displayName=String(input.displayName??current.displayName).trim().slice(0,160);if(displayName.length<2)throw new Error("Customer display name is required.");
    const email=String(input.email??current.email).trim().toLowerCase().slice(0,320);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error("Enter a valid customer email address.");const duplicate=this.ctx.storage.sql.exec<any>("SELECT id FROM users WHERE email=? AND id<>?",email,id).toArray()[0];if(duplicate)throw new Error("Email is already in use.");
    const locale=input.locale==="ar"?"ar":"en";const statusRaw=String(input.status??current.status).trim().toLowerCase();const status=["active","suspended","disabled"].includes(statusRaw)?statusRaw:String(current.status||"active");const phone=input.phone===undefined?undefined:(String(input.phone||"").trim().slice(0,60)||null);
    let addressJson:string|undefined=undefined;if(input.defaultAddress!==undefined){if(input.defaultAddress!==null&&(typeof input.defaultAddress!=="object"||Array.isArray(input.defaultAddress)))throw new Error("Default address must be an object or null.");const encoded=JSON.stringify(input.defaultAddress);if(encoded.length>5000)throw new Error("Default address is too large.");addressJson=encoded;}
    this.ctx.storage.transactionSync(()=>{this.ctx.storage.sql.exec("UPDATE users SET display_name=?,email=?,locale=?,status=? WHERE id=?",displayName,email,locale,status,id);this.ctx.storage.sql.exec("INSERT OR IGNORE INTO customer_profiles (user_id) VALUES (?)",id);if(phone!==undefined)this.ctx.storage.sql.exec("UPDATE customer_profiles SET phone=? WHERE user_id=?",phone,id);if(addressJson!==undefined)this.ctx.storage.sql.exec("UPDATE customer_profiles SET default_address_json=? WHERE user_id=?",addressJson,id);if(status!=="active")this.ctx.storage.sql.exec("DELETE FROM sessions WHERE user_id=?",id);this.adminAudit(actorId,"admin.customer.update","customer",id,"success",{displayName,email,locale,status,phoneChanged:phone!==undefined,addressChanged:addressJson!==undefined});});
    return this.adminCustomerDetail(id);
  }

  adminDesignersList(filters: { search?:string; accountStatus?:string; authorizationStatus?:string; page?:number; pageSize?:number } = {}): unknown {
    this.bootstrapCatalog(); const conditions:string[]=["r.name='designer'"]; const args:any[]=[];
    const search=String(filters.search??"").trim().toLowerCase();if(search){conditions.push("(lower(u.id) LIKE ? OR lower(u.display_name) LIKE ? OR lower(u.email) LIKE ?)");const q="%"+search+"%";args.push(q,q,q);}
    const accountStatus=String(filters.accountStatus??"").trim().toLowerCase();if(accountStatus){conditions.push("lower(u.status)=?");args.push(accountStatus);}
    const authorizationStatus=String(filters.authorizationStatus??"").trim().toLowerCase();if(authorizationStatus){conditions.push("lower(dp.authorization_status)=?");args.push(authorizationStatus);}
    const where=" WHERE "+conditions.join(" AND ");const pageSize=Math.max(1,Math.min(100,Math.floor(Number(filters.pageSize)||20)));
    const base=" FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id JOIN designer_profiles dp ON dp.user_id=u.id";
    const total=Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(DISTINCT u.id) AS count"+base+where,...args).toArray()[0]?.count??0);const pages=Math.max(1,Math.ceil(total/pageSize));const page=Math.max(1,Math.min(pages,Math.floor(Number(filters.page)||1)));const offset=(page-1)*pageSize;
    const items=this.ctx.storage.sql.exec<any>("SELECT u.id AS designerId,u.display_name AS displayName,u.email,u.locale,u.status AS accountStatus,u.created_at AS registeredAt,dp.authorization_status AS authorizationStatus,dp.rejection_reason AS rejectionReason,dp.review_due_at AS reviewDueAt,(SELECT COUNT(*) FROM designs d WHERE d.designer_id=u.id) AS designCount,(SELECT COUNT(*) FROM designs d WHERE d.designer_id=u.id AND lower(d.status)='published') AS publishedDesignCount,(SELECT COUNT(*) FROM designer_applications da WHERE da.designer_id=u.id) AS applicationCount,(SELECT COALESCE(SUM(de.amount_jod),0) FROM designer_earnings de WHERE de.designer_id=u.id) AS totalEarningsJod,(SELECT COALESCE(SUM(w.amount_jod),0) FROM withdrawals w WHERE w.designer_id=u.id AND lower(w.status)='paid') AS paidWithdrawalsJod"+base+where+" GROUP BY u.id ORDER BY u.created_at DESC,u.id LIMIT ? OFFSET ?",...args,pageSize,offset).toArray();
    return {items,total,page,pageSize,pages};
  }

  adminDesignerDetail(designerId:string):unknown{
    this.bootstrapCatalog();const id=String(designerId||"").trim();const designer=this.ctx.storage.sql.exec<any>("SELECT u.id AS designerId,u.display_name AS displayName,u.email,u.locale,u.status AS accountStatus,u.created_at AS registeredAt,dp.authorization_status AS authorizationStatus,dp.rejection_reason AS rejectionReason,dp.review_due_at AS reviewDueAt,dp.created_at AS designerProfileCreatedAt FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id JOIN designer_profiles dp ON dp.user_id=u.id WHERE u.id=? AND r.name='designer'",id).toArray()[0];if(!designer)return null;
    const parse=(v:any,f:any)=>{try{return JSON.parse(String(v??""));}catch{return f;}};
    const applications=this.ctx.storage.sql.exec<any>("SELECT id AS applicationId,status,submitted_at AS submittedAt,review_due_at AS reviewDueAt,rejection_reason AS rejectionReason,replacement_due_at AS replacementDueAt,escalation_state AS escalationState,(SELECT COUNT(*) FROM qualification_designs qd WHERE qd.application_id=designer_applications.id) AS qualificationDesignCount FROM designer_applications WHERE designer_id=? ORDER BY COALESCE(submitted_at,'') DESC,id DESC",id).toArray();
    const designs=this.ctx.storage.sql.exec<any>("SELECT id AS designId,title_en AS titleEn,title_ar AS titleAr,product_type AS productType,status,published_at AS publishedAt,created_at AS createdAt,(SELECT vr.status FROM validation_results vr WHERE vr.design_id=designs.id ORDER BY vr.created_at DESC LIMIT 1) AS latestPreflightStatus FROM designs WHERE designer_id=? ORDER BY created_at DESC,id DESC LIMIT 200",id).toArray();
    const earnings=this.ctx.storage.sql.exec<any>("SELECT de.id AS earningId,de.order_item_id AS orderItemId,de.amount_jod AS amountJod,de.status,de.created_at AS createdAt,oi.order_id AS orderId FROM designer_earnings de LEFT JOIN order_items oi ON oi.id=de.order_item_id WHERE de.designer_id=? ORDER BY de.created_at DESC,de.id DESC LIMIT 200",id).toArray();
    const withdrawals=this.ctx.storage.sql.exec<any>("SELECT id AS withdrawalId,amount_jod AS amountJod,status,payout_details_json AS payoutDetailsJson,created_at AS createdAt FROM withdrawals WHERE designer_id=? ORDER BY created_at DESC,id DESC LIMIT 200",id).toArray().map((w:any)=>({...w,payoutDetails:parse(w.payoutDetailsJson,{})}));
    const ledger=this.ctx.storage.sql.exec<any>("SELECT id AS ledgerId,entry_type AS entryType,amount_jod AS amountJod,reference_id AS referenceId,created_at AS createdAt FROM ledger_entries WHERE designer_id=? ORDER BY created_at DESC,id DESC LIMIT 200",id).toArray();
    const orderActivity=this.ctx.storage.sql.exec<any>("SELECT DISTINCT o.id AS orderId,o.status,o.payment_status AS paymentStatus,o.total_jod AS totalJod,o.currency,o.created_at AS createdAt FROM orders o JOIN order_items oi ON oi.order_id=o.id JOIN designs d ON d.id=oi.design_id WHERE d.designer_id=? ORDER BY o.created_at DESC,o.id DESC LIMIT 100",id).toArray();
    const stats=this.ctx.storage.sql.exec<any>("SELECT (SELECT COALESCE(SUM(amount_jod),0) FROM designer_earnings WHERE designer_id=?) AS totalEarningsJod,(SELECT COALESCE(SUM(amount_jod),0) FROM designer_earnings WHERE designer_id=? AND lower(status)='pending') AS pendingEarningsJod,(SELECT COALESCE(SUM(amount_jod),0) FROM withdrawals WHERE designer_id=? AND lower(status)='paid') AS paidWithdrawalsJod,(SELECT COALESCE(SUM(amount_jod),0) FROM withdrawals WHERE designer_id=? AND lower(status)='requested') AS requestedWithdrawalsJod",id,id,id,id).toArray()[0]??{};
    return {...designer,applications,designs,earnings,withdrawals,ledger,orderActivity,stats};
  }

  adminUpdateDesignerAccount(actorId:string,designerId:string,input:{displayName?:string;email?:string;locale?:string;accountStatus?:string}):unknown{
    this.bootstrapCatalog();const id=String(designerId||"").trim();const current=this.ctx.storage.sql.exec<any>("SELECT u.id,u.display_name AS displayName,u.email,u.locale,u.status AS accountStatus FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE u.id=? AND r.name='designer'",id).toArray()[0];if(!current)throw new Error("Designer not found.");const displayName=String(input.displayName??current.displayName).trim().slice(0,160);if(displayName.length<2)throw new Error("Designer display name is required.");const email=String(input.email??current.email).trim().toLowerCase().slice(0,320);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error("Enter a valid designer email address.");if(this.ctx.storage.sql.exec<any>("SELECT id FROM users WHERE email=? AND id<>?",email,id).toArray()[0])throw new Error("Email is already in use.");const locale=input.locale==="ar"?"ar":"en";const requested=String(input.accountStatus??current.accountStatus).trim().toLowerCase();const accountStatus=["active","suspended","disabled"].includes(requested)?requested:String(current.accountStatus||"active");
    this.ctx.storage.transactionSync(()=>{this.ctx.storage.sql.exec("UPDATE users SET display_name=?,email=?,locale=?,status=? WHERE id=?",displayName,email,locale,accountStatus,id);if(accountStatus!=="active")this.ctx.storage.sql.exec("DELETE FROM sessions WHERE user_id=?",id);this.adminAudit(actorId,"admin.designer.account.update","designer",id,"success",{displayName,email,locale,accountStatus});});return this.adminDesignerDetail(id);
  }

  adminPayoutsList(filters: { search?:string; status?:string; dateFrom?:string; dateTo?:string; page?:number; pageSize?:number } = {}): unknown {
    this.bootstrapCatalog(); const conditions:string[]=[]; const args:any[]=[];
    const search=String(filters.search??"").trim().toLowerCase();
    if(search){conditions.push("(lower(w.id) LIKE ? OR lower(w.designer_id) LIKE ? OR lower(u.display_name) LIKE ? OR lower(u.email) LIKE ?)");const q="%"+search+"%";args.push(q,q,q,q);}
    const status=String(filters.status??"").trim().toLowerCase();if(status){conditions.push("lower(w.status)=?");args.push(status);}
    const dateFrom=String(filters.dateFrom??"").trim();if(/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)){conditions.push("date(w.created_at)>=date(?)");args.push(dateFrom);}
    const dateTo=String(filters.dateTo??"").trim();if(/^\d{4}-\d{2}-\d{2}$/.test(dateTo)){conditions.push("date(w.created_at)<=date(?)");args.push(dateTo);}
    const where=conditions.length?" WHERE "+conditions.join(" AND "):"";
    const base=" FROM withdrawals w JOIN users u ON u.id=w.designer_id JOIN designer_profiles dp ON dp.user_id=w.designer_id";
    const pageSize=Math.max(1,Math.min(100,Math.floor(Number(filters.pageSize)||20)));
    const total=Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS count"+base+where,...args).toArray()[0]?.count??0);
    const pages=Math.max(1,Math.ceil(total/pageSize));const page=Math.max(1,Math.min(pages,Math.floor(Number(filters.page)||1)));const offset=(page-1)*pageSize;
    const items=this.ctx.storage.sql.exec<any>(`SELECT w.id AS withdrawalId,w.designer_id AS designerId,u.display_name AS designerName,u.email AS designerEmail,u.status AS designerAccountStatus,dp.authorization_status AS authorizationStatus,w.amount_jod AS amountJod,w.status,w.created_at AS createdAt,
      (SELECT COALESCE(SUM(de.amount_jod),0) FROM designer_earnings de WHERE de.designer_id=w.designer_id AND lower(de.status) IN ('available','approved','earned','payable')) AS eligibleEarningsJod,
      (SELECT COALESCE(SUM(w2.amount_jod),0) FROM withdrawals w2 WHERE w2.designer_id=w.designer_id AND lower(w2.status) IN ('approved','paid')) AS committedOrPaidJod,
      (SELECT wah.to_status FROM withdrawal_admin_history wah WHERE wah.withdrawal_id=w.id ORDER BY wah.created_at DESC,wah.id DESC LIMIT 1) AS latestAdminStatus
      ${base}${where} ORDER BY CASE lower(w.status) WHEN 'requested' THEN 0 WHEN 'approved' THEN 1 WHEN 'paid' THEN 2 ELSE 3 END,w.created_at,w.id LIMIT ? OFFSET ?`,...args,pageSize,offset).toArray()
      .map((x:any)=>({...x,availableForApprovalJod:Math.max(0,Number(x.eligibleEarningsJod||0)-Number(x.committedOrPaidJod||0)),allowedTransitions:[...allowedAdminWithdrawalTransitions(x.status)]}));
    const summary=this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS total,SUM(CASE WHEN lower(status)='requested' THEN 1 ELSE 0 END) AS requested,SUM(CASE WHEN lower(status)='approved' THEN 1 ELSE 0 END) AS approved,SUM(CASE WHEN lower(status)='paid' THEN 1 ELSE 0 END) AS paid,SUM(CASE WHEN lower(status)='rejected' THEN 1 ELSE 0 END) AS rejected,COALESCE(SUM(CASE WHEN lower(status)='requested' THEN amount_jod ELSE 0 END),0) AS requestedJod,COALESCE(SUM(CASE WHEN lower(status)='approved' THEN amount_jod ELSE 0 END),0) AS approvedJod,COALESCE(SUM(CASE WHEN lower(status)='paid' THEN amount_jod ELSE 0 END),0) AS paidJod FROM withdrawals").toArray()[0]??{};
    return {items,summary,total,page,pageSize,pages};
  }

  adminPayoutDetail(withdrawalId:string):unknown{
    this.bootstrapCatalog();const id=String(withdrawalId||"").trim();
    const row=this.ctx.storage.sql.exec<any>("SELECT w.id AS withdrawalId,w.designer_id AS designerId,u.display_name AS designerName,u.email AS designerEmail,u.status AS designerAccountStatus,dp.authorization_status AS authorizationStatus,w.amount_jod AS amountJod,w.status,w.payout_details_json AS payoutDetailsJson,w.created_at AS createdAt FROM withdrawals w JOIN users u ON u.id=w.designer_id JOIN designer_profiles dp ON dp.user_id=w.designer_id WHERE w.id=?",id).toArray()[0];
    if(!row)return null;const parse=(v:any,f:any)=>{try{return JSON.parse(String(v??""));}catch{return f;}};
    const history=this.ctx.storage.sql.exec<any>("SELECT wah.id,wah.from_status AS fromStatus,wah.to_status AS toStatus,wah.note,wah.admin_actor_id AS adminActorId,au.username AS adminUsername,wah.created_at AS createdAt FROM withdrawal_admin_history wah LEFT JOIN admin_users au ON au.id=wah.admin_actor_id WHERE wah.withdrawal_id=? ORDER BY wah.created_at DESC,wah.id DESC",id).toArray();
    const earnings=this.ctx.storage.sql.exec<any>("SELECT de.id AS earningId,de.order_item_id AS orderItemId,de.amount_jod AS amountJod,de.status,de.created_at AS createdAt,oi.order_id AS orderId FROM designer_earnings de LEFT JOIN order_items oi ON oi.id=de.order_item_id WHERE de.designer_id=? ORDER BY de.created_at DESC,de.id DESC LIMIT 200",row.designerId).toArray();
    const ledger=this.ctx.storage.sql.exec<any>("SELECT id AS ledgerId,entry_type AS entryType,amount_jod AS amountJod,reference_id AS referenceId,created_at AS createdAt FROM ledger_entries WHERE designer_id=? ORDER BY created_at DESC,id DESC LIMIT 200",row.designerId).toArray();
    const eligibleEarningsJod=Number(this.ctx.storage.sql.exec<any>("SELECT COALESCE(SUM(amount_jod),0) AS amount FROM designer_earnings WHERE designer_id=? AND lower(status) IN ('available','approved','earned','payable')",row.designerId).toArray()[0]?.amount??0);
    const committedOtherJod=Number(this.ctx.storage.sql.exec<any>("SELECT COALESCE(SUM(amount_jod),0) AS amount FROM withdrawals WHERE designer_id=? AND id<>? AND lower(status) IN ('approved','paid')",row.designerId,id).toArray()[0]?.amount??0);
    const paidJod=Number(this.ctx.storage.sql.exec<any>("SELECT COALESCE(SUM(amount_jod),0) AS amount FROM withdrawals WHERE designer_id=? AND lower(status)='paid'",row.designerId).toArray()[0]?.amount??0);
    const duplicatePaidLedger=Boolean(this.ctx.storage.sql.exec<any>("SELECT 1 AS ok FROM ledger_entries WHERE entry_type='withdrawal_paid' AND reference_id=? LIMIT 1",id).toArray()[0]?.ok);
    return {...row,payoutDetails:parse(row.payoutDetailsJson,{}),history,earnings,ledger,eligibleEarningsJod,committedOtherJod,paidJod,availableForThisWithdrawalJod:Math.max(0,eligibleEarningsJod-committedOtherJod),duplicatePaidLedger,allowedTransitions:[...allowedAdminWithdrawalTransitions(row.status)]};
  }

  adminPayoutTransition(actorId:string,withdrawalId:string,nextStatus:string,note=""):unknown{
    this.bootstrapCatalog();const id=String(withdrawalId||"").trim();const next=normalizeAdminWithdrawalStatus(nextStatus);if(!next)throw new Error("Invalid payout status.");const cleanNote=String(note||"").trim().slice(0,2000);
    this.ctx.storage.transactionSync(()=>{
      const row=this.ctx.storage.sql.exec<any>("SELECT id,designer_id AS designerId,amount_jod AS amountJod,status FROM withdrawals WHERE id=?",id).toArray()[0];if(!row)throw new Error("Withdrawal not found.");
      const current=normalizeAdminWithdrawalStatus(row.status);if(!current||!canTransitionAdminWithdrawal(current,next))throw new Error(`Invalid payout transition: ${row.status} → ${next}.`);
      if(next==="rejected"&&!cleanNote)throw new Error("Rejection reason is required.");
      if(next==="approved"){
        const eligible=Number(this.ctx.storage.sql.exec<any>("SELECT COALESCE(SUM(amount_jod),0) AS amount FROM designer_earnings WHERE designer_id=? AND lower(status) IN ('available','approved','earned','payable')",row.designerId).toArray()[0]?.amount??0);
        const committed=Number(this.ctx.storage.sql.exec<any>("SELECT COALESCE(SUM(amount_jod),0) AS amount FROM withdrawals WHERE designer_id=? AND id<>? AND lower(status) IN ('approved','paid')",row.designerId,id).toArray()[0]?.amount??0);
        if(Number(row.amountJod)>Math.max(0,eligible-committed))throw new Error("Withdrawal exceeds the designer's currently payoutable balance.");
      }
      if(next==="paid"){
        if(this.ctx.storage.sql.exec<any>("SELECT 1 AS ok FROM ledger_entries WHERE entry_type='withdrawal_paid' AND reference_id=? LIMIT 1",id).toArray()[0]?.ok)throw new Error("This withdrawal already has a paid ledger entry.");
        this.ctx.storage.sql.exec("INSERT INTO ledger_entries (id,designer_id,entry_type,amount_jod,reference_id) VALUES (?,?,?,?,?)",crypto.randomUUID(),row.designerId,"withdrawal_paid",-Math.abs(Number(row.amountJod)),id);
      }
      this.ctx.storage.sql.exec("UPDATE withdrawals SET status=? WHERE id=?",next,id);
      this.ctx.storage.sql.exec("INSERT INTO withdrawal_admin_history (id,withdrawal_id,from_status,to_status,note,admin_actor_id) VALUES (?,?,?,?,?,?)",crypto.randomUUID(),id,current,next,cleanNote||null,actorId);
      const titleEn=next==="approved"?"Withdrawal approved":next==="paid"?"Withdrawal paid":"Withdrawal rejected";const titleAr=next==="approved"?"تمت الموافقة على طلب السحب":next==="paid"?"تم دفع طلب السحب":"تم رفض طلب السحب";const bodyEn=next==="approved"?"Your withdrawal request has been approved.":next==="paid"?"Your withdrawal request has been marked paid.":"Your withdrawal request was rejected. Reason: "+cleanNote;const bodyAr=next==="approved"?"تمت الموافقة على طلب السحب الخاص بك.":next==="paid"?"تم تسجيل طلب السحب الخاص بك كمدفوع.":"تم رفض طلب السحب. السبب: "+cleanNote;
      this.ctx.storage.sql.exec("INSERT INTO notifications (id,user_id,title_ar,title_en,body_ar,body_en) VALUES (?,?,?,?,?,?)",crypto.randomUUID(),row.designerId,titleAr,titleEn,bodyAr,bodyEn);
      this.adminAudit(actorId,"admin.payout.status_change","withdrawal",id,"success",{designerId:row.designerId,amountJod:row.amountJod,fromStatus:current,toStatus:next,note:cleanNote||null});
    });
    return this.adminPayoutDetail(id);
  }

  adminManualReviewQueues(): unknown {
    this.bootstrapCatalog();
    const qualifications=this.ctx.storage.sql.exec<any>(`
      SELECT da.id AS applicationId,da.designer_id AS designerId,da.status,da.submitted_at AS submittedAt,
             COALESCE(da.review_due_at,CASE WHEN da.submitted_at IS NOT NULL THEN datetime(da.submitted_at,'+5 days') END) AS reviewDueAt,
             da.rejection_reason AS rejectionReason,da.replacement_due_at AS replacementDueAt,da.escalation_state AS escalationState,
             u.display_name AS designerName,u.email AS designerEmail,dp.authorization_status AS authorizationStatus,
             (SELECT COUNT(*) FROM qualification_designs qd WHERE qd.application_id=da.id) AS designCount,
             (SELECT COUNT(*) FROM manual_review_history mr WHERE mr.review_type='qualification' AND mr.subject_id=da.id AND mr.decision='reject') AS rejectionCount
      FROM designer_applications da JOIN designer_profiles dp ON dp.user_id=da.designer_id JOIN users u ON u.id=da.designer_id
      WHERE lower(da.status) NOT IN ('approved','rejected','cancelled')
      ORDER BY CASE WHEN COALESCE(da.review_due_at,datetime(da.submitted_at,'+5 days')) IS NULL THEN 1 ELSE 0 END,
               COALESCE(da.review_due_at,datetime(da.submitted_at,'+5 days')), da.submitted_at, da.id
    `).toArray().map((x:any)=>({...x,overdue:Boolean(x.reviewDueAt&&Date.parse(x.reviewDueAt)<Date.now()),exactlyThree:Number(x.designCount)===3}));
    const designs=this.ctx.storage.sql.exec<any>(`
      SELECT d.id AS designId,d.designer_id AS designerId,d.title_en AS titleEn,d.title_ar AS titleAr,d.product_type AS productType,d.status,d.created_at AS createdAt,
             u.display_name AS designerName,u.email AS designerEmail,
             (SELECT vr.status FROM validation_results vr WHERE vr.design_id=d.id ORDER BY vr.created_at DESC LIMIT 1) AS preflightStatus,
             (SELECT vr.errors_json FROM validation_results vr WHERE vr.design_id=d.id ORDER BY vr.created_at DESC LIMIT 1) AS preflightErrorsJson,
             (SELECT vr.warnings_json FROM validation_results vr WHERE vr.design_id=d.id ORDER BY vr.created_at DESC LIMIT 1) AS preflightWarningsJson
      FROM designs d LEFT JOIN users u ON u.id=d.designer_id
      WHERE lower(d.status) IN ('submitted','pending_review','under_review')
      ORDER BY d.created_at,d.id
    `).toArray();
    const parse=(v:any,f:any)=>{try{return JSON.parse(String(v??""));}catch{return f;}};
    return {qualifications,designs:designs.map((x:any)=>({...x,preflightErrors:parse(x.preflightErrorsJson,[]),preflightWarnings:parse(x.preflightWarningsJson,[])}))};
  }

  adminQualificationReviewDetail(applicationId: string): unknown {
    this.bootstrapCatalog(); const id=String(applicationId||"").trim();
    const application=this.ctx.storage.sql.exec<any>("SELECT da.id AS applicationId,da.designer_id AS designerId,da.status,da.submitted_at AS submittedAt,COALESCE(da.review_due_at,CASE WHEN da.submitted_at IS NOT NULL THEN datetime(da.submitted_at,'+5 days') END) AS reviewDueAt,da.rejection_reason AS rejectionReason,da.replacement_due_at AS replacementDueAt,da.escalation_state AS escalationState,u.display_name AS designerName,u.email AS designerEmail,dp.authorization_status AS authorizationStatus FROM designer_applications da JOIN designer_profiles dp ON dp.user_id=da.designer_id JOIN users u ON u.id=da.designer_id WHERE da.id=?",id).toArray()[0];
    if(!application) return null;
    const parse=(v:any,f:any)=>{try{return JSON.parse(String(v??""));}catch{return f;}};
    const rows=this.ctx.storage.sql.exec<any>("SELECT qd.slot,d.id AS designId,d.title_en AS titleEn,d.title_ar AS titleAr,d.description_en AS descriptionEn,d.description_ar AS descriptionAr,d.product_type AS productType,d.status AS designStatus,(SELECT vr.status FROM validation_results vr WHERE vr.design_id=d.id ORDER BY vr.created_at DESC LIMIT 1) AS preflightStatus,(SELECT vr.errors_json FROM validation_results vr WHERE vr.design_id=d.id ORDER BY vr.created_at DESC LIMIT 1) AS preflightErrorsJson,(SELECT vr.warnings_json FROM validation_results vr WHERE vr.design_id=d.id ORDER BY vr.created_at DESC LIMIT 1) AS preflightWarningsJson,(SELECT vr.created_at FROM validation_results vr WHERE vr.design_id=d.id ORDER BY vr.created_at DESC LIMIT 1) AS preflightAt FROM qualification_designs qd JOIN designs d ON d.id=qd.design_id WHERE qd.application_id=? ORDER BY qd.slot",id).toArray();
    const designs=rows.map((row:any)=>{const assets=this.ctx.storage.sql.exec<any>("SELECT a.id AS assetId,a.original_filename AS filename,a.mime_type AS mimeType,a.byte_size AS byteSize,a.storage_key AS storageKey,ar.format,ar.pixel_width AS pixelWidth,ar.pixel_height AS pixelHeight,ar.embedded_dpi AS embeddedDpi,ar.effective_dpi AS effectiveDpi,ar.has_alpha AS hasAlpha,ar.readable,ar.analyzable,ar.previewable FROM assets a LEFT JOIN analyzer_results ar ON ar.id=(SELECT ar2.id FROM analyzer_results ar2 WHERE ar2.asset_id=a.id ORDER BY ar2.created_at DESC LIMIT 1) WHERE a.design_id=? ORDER BY a.created_at,a.id",row.designId).toArray();return {...row,preflightErrors:parse(row.preflightErrorsJson,[]),preflightWarnings:parse(row.preflightWarningsJson,[]),assets};});
    const history=this.ctx.storage.sql.exec<any>("SELECT mr.id,mr.decision,mr.reason,mr.review_round AS reviewRound,mr.admin_actor_id AS adminActorId,au.username AS adminUsername,mr.created_at AS createdAt FROM manual_review_history mr LEFT JOIN admin_users au ON au.id=mr.admin_actor_id WHERE mr.review_type='qualification' AND mr.subject_id=? ORDER BY mr.created_at DESC,mr.id DESC",id).toArray();
    return {...application,designs,exactlyThree:designs.length===3,rejectionCount:history.filter((h:any)=>h.decision==="reject").length,history};
  }

  adminQualificationReviewDecision(actorId: string, applicationId: string, decision: "approve"|"reject", reason = ""): unknown {
    this.bootstrapCatalog(); const id=String(applicationId||"").trim(); const app=this.ctx.storage.sql.exec<any>("SELECT id,designer_id AS designerId,status FROM designer_applications WHERE id=?",id).toArray()[0]; if(!app) throw new Error("Designer qualification application not found."); if(["approved","rejected","cancelled"].includes(String(app.status||"").toLowerCase())) throw new Error("This qualification application is already final.");
    const designs=this.ctx.storage.sql.exec<any>("SELECT qd.design_id AS designId,(SELECT vr.status FROM validation_results vr WHERE vr.design_id=qd.design_id ORDER BY vr.created_at DESC LIMIT 1) AS preflightStatus FROM qualification_designs qd WHERE qd.application_id=? ORDER BY qd.slot",id).toArray();
    const rejectCount=Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS count FROM manual_review_history WHERE review_type='qualification' AND subject_id=? AND decision='reject'",id).toArray()[0]?.count??0);
    const round=rejectCount+1; const cleanReason=String(reason||"").trim().slice(0,2000);
    if(decision==="approve"){
      if(designs.length!==3) throw new Error("Qualification approval requires exactly 3 qualification designs.");
      if(designs.some((d:any)=>!d.preflightStatus)) throw new Error("Qualification approval requires preflight evidence for all 3 designs.");
      if(designs.some((d:any)=>String(d.preflightStatus).toLowerCase()==="failed")) throw new Error("Qualification approval is blocked while any qualification design has failed preflight.");
      this.ctx.storage.transactionSync(()=>{this.ctx.storage.sql.exec("UPDATE designer_applications SET status='approved',rejection_reason=NULL,replacement_due_at=NULL,escalation_state=NULL WHERE id=?",id);this.ctx.storage.sql.exec("UPDATE designer_profiles SET authorization_status='authorized',rejection_reason=NULL WHERE user_id=?",app.designerId);this.ctx.storage.sql.exec("INSERT INTO manual_review_history (id,review_type,subject_id,decision,reason,review_round,admin_actor_id) VALUES (?,'qualification',?,'approve',NULL,?,?)",crypto.randomUUID(),id,round,actorId);this.ctx.storage.sql.exec("INSERT INTO notifications (id,user_id,title_ar,title_en,body_ar,body_en) VALUES (?,?,?,?,?,?)",crypto.randomUUID(),app.designerId,"تم اعتماد المصمم","Designer qualification approved","تم اعتماد حسابك كمصمم بعد مراجعة تصاميم التأهيل الثلاثة.","Your designer account has been authorized after review of the three qualification designs.");this.ctx.storage.sql.exec("INSERT INTO audit_logs (actor_id,actor_role,action,resource_type,resource_id,metadata_json) VALUES (?,'admin','admin.manual_review.qualification.approve','designer_application',?,?)",actorId,id,JSON.stringify({result:"success",metadata:{designerId:app.designerId,round}}));});
    } else {
      if(!cleanReason) throw new Error("Rejection reason is required.");
      const secondOrLater=rejectCount>=1; const nextStatus=secondOrLater?"rejected":"replacement_required"; const escalation=secondOrLater?"second_rejection_escalated":"replacement_required";
      this.ctx.storage.transactionSync(()=>{this.ctx.storage.sql.exec("UPDATE designer_applications SET status=?,rejection_reason=?,replacement_due_at=?,escalation_state=? WHERE id=?",nextStatus,cleanReason,secondOrLater?null:new Date(Date.now()+5*24*60*60*1000).toISOString(),escalation,id);this.ctx.storage.sql.exec("UPDATE designer_profiles SET authorization_status=?,rejection_reason=? WHERE user_id=?",secondOrLater?"rejected":"pending",cleanReason,app.designerId);this.ctx.storage.sql.exec("INSERT INTO manual_review_history (id,review_type,subject_id,decision,reason,review_round,admin_actor_id) VALUES (?,'qualification',?,'reject',?,?,?)",crypto.randomUUID(),id,cleanReason,round,actorId);const titleAr=secondOrLater?"تم تصعيد رفض التأهيل":"مطلوب استبدال تصاميم التأهيل";const titleEn=secondOrLater?"Qualification rejection escalated":"Qualification replacement required";const bodyAr=secondOrLater?"تم رفض التأهيل للمرة الثانية وتحويل الحالة للتصعيد. السبب: "+cleanReason:"يرجى استبدال التصاميم المطلوبة وإعادة التقديم. السبب: "+cleanReason;const bodyEn=secondOrLater?"The qualification was rejected a second time and escalated. Reason: "+cleanReason:"Please replace the required qualification designs and resubmit. Reason: "+cleanReason;this.ctx.storage.sql.exec("INSERT INTO notifications (id,user_id,title_ar,title_en,body_ar,body_en) VALUES (?,?,?,?,?,?)",crypto.randomUUID(),app.designerId,titleAr,titleEn,bodyAr,bodyEn);this.ctx.storage.sql.exec("INSERT INTO audit_logs (actor_id,actor_role,action,resource_type,resource_id,metadata_json) VALUES (?,'admin','admin.manual_review.qualification.reject','designer_application',?,?)",actorId,id,JSON.stringify({result:"success",metadata:{designerId:app.designerId,round,reason:cleanReason,escalation}}));});
    }
    return this.adminQualificationReviewDetail(id);
  }

  adminDesignReviewDecision(actorId: string, designId: string, decision: "approve"|"reject", reason = ""): unknown {
    this.bootstrapCatalog(); const id=String(designId||"").trim(); const row=this.ctx.storage.sql.exec<any>("SELECT id,designer_id AS designerId,status FROM designs WHERE id=?",id).toArray()[0]; if(!row) throw new Error("Design not found."); if(!["submitted","pending_review","under_review"].includes(String(row.status||"").toLowerCase())) throw new Error("Design is not awaiting manual review."); const cleanReason=String(reason||"").trim().slice(0,2000);
    const latest=this.ctx.storage.sql.exec<any>("SELECT status FROM validation_results WHERE design_id=? ORDER BY created_at DESC LIMIT 1",id).toArray()[0];
    if(decision==="approve"&&String(latest?.status||"").toLowerCase()==="failed") throw new Error("Design approval is blocked while the latest preflight result is failed.");
    if(decision==="reject"&&!cleanReason) throw new Error("Rejection reason is required.");
    const round=Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS count FROM manual_review_history WHERE review_type='design' AND subject_id=?",id).toArray()[0]?.count??0)+1;
    this.ctx.storage.transactionSync(()=>{this.ctx.storage.sql.exec("UPDATE designs SET status=? WHERE id=?",decision==="approve"?"approved":"rejected",id);this.ctx.storage.sql.exec("INSERT INTO manual_review_history (id,review_type,subject_id,decision,reason,review_round,admin_actor_id) VALUES (?,'design',?,?,?,?,?)",crypto.randomUUID(),id,decision,cleanReason||null,round,actorId);if(row.designerId)this.ctx.storage.sql.exec("INSERT INTO notifications (id,user_id,title_ar,title_en,body_ar,body_en) VALUES (?,?,?,?,?,?)",crypto.randomUUID(),row.designerId,decision==="approve"?"تم قبول التصميم":"تم رفض التصميم",decision==="approve"?"Design approved":"Design rejected",decision==="approve"?"تم قبول التصميم في المراجعة الإدارية.":"تم رفض التصميم. السبب: "+cleanReason,decision==="approve"?"Your design passed Admin review.":"Your design was rejected. Reason: "+cleanReason);this.ctx.storage.sql.exec("INSERT INTO audit_logs (actor_id,actor_role,action,resource_type,resource_id,metadata_json) VALUES (?,'admin',?,'design',?,?)",actorId,decision==="approve"?"admin.manual_review.design.approve":"admin.manual_review.design.reject",id,JSON.stringify({result:"success",metadata:{designerId:row.designerId,round,reason:cleanReason||null}}));});
    return this.ctx.storage.sql.exec<any>("SELECT id AS designId,designer_id AS designerId,title_en AS titleEn,title_ar AS titleAr,status,created_at AS createdAt FROM designs WHERE id=?",id).toArray()[0];
  }

  adminIntegrationsStatus():unknown{
    this.bootstrapCatalog();
    const parse=(value:any,fallback:any)=>{try{return JSON.parse(String(value??""));}catch{return fallback;}};
    const lastSyncRow=this.ctx.storage.sql.exec<any>("SELECT value_json AS valueJson,updated_at AS updatedAt FROM business_settings WHERE key='printify_last_sync'").toArray()[0];
    const printify={
      localCatalogItems:Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS count FROM printify_catalog_items").toArray()[0]?.count??0),
      sourceAvailableItems:Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS count FROM printify_catalog_items WHERE source_available=1").toArray()[0]?.count??0),
      importedProducts:Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS count FROM product_models WHERE source='printify'").toArray()[0]?.count??0),
      publishedProducts:Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS count FROM printify_product_data WHERE published=1").toArray()[0]?.count??0),
      enabledVariants:Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS count FROM printify_variant_settings WHERE enabled=1").toArray()[0]?.count??0),
      supplierOrders:Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS count FROM supplier_orders WHERE lower(provider)='printify'").toArray()[0]?.count??0),
      supplierOrdersSubmitted:Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS count FROM supplier_orders WHERE lower(provider)='printify' AND lower(status)<>'not_submitted'").toArray()[0]?.count??0),
      lastSync:lastSyncRow?parse(lastSyncRow.valueJson,null):null,
      lastSyncUpdatedAt:lastSyncRow?.updatedAt??null
    };
    return {printify,serverManagedSecrets:{inventoryDisclosed:false,valuesExposed:false,namesExposed:false},internalSessionSecretHidden:true,payments:{provider:null,status:"not_configured"},courier:{provider:null,status:"not_configured"}};
  }

  businessSettingsSnapshot():unknown{
    this.bootstrapCatalog();const rows=this.ctx.storage.sql.exec<any>("SELECT key,value_json AS valueJson,updated_at AS updatedAt FROM business_settings").toArray();const map=new Map<string,any>();const updated:Record<string,string>={};for(const row of rows){try{map.set(String(row.key),JSON.parse(String(row.valueJson)));}catch{map.set(String(row.key),row.valueJson);}updated[String(row.key)]=String(row.updatedAt||"");}
    const stored=(map.get("storefront_config")&&typeof map.get("storefront_config")==="object"&&!Array.isArray(map.get("storefront_config")))?map.get("storefront_config"):{};
    const reservationRaw=map.has("reservation_minutes")?Number(map.get("reservation_minutes")):Number(stored.bankTransferReservationMinutes??15);
    const defaults:any={currency:"JOD",currencySymbol:"JD",bankTransferReservationMinutes:15,podConfirmationPeriodHours:24,customerCancellationWindowMinutes:60,minimumWithdrawalAmount:10,defaultDesignerCommissionRate:15,defaultDesignerFlatRoyalty:2.5,standardDeliveryFee:2.5,freeDeliveryThreshold:50,storePickupEnabled:true,storePickupAddress:"Amman, Jordan",storePickupAddressAr:"عمّان، الأردن",bankDetails:{bankName:"",accountName:"",iban:"",cliqAlias:"",notes:"",notesAr:""},artworkValidationRules:{maxFileSizeBytes:20971520,allowedFormats:["image/png","image/jpeg","application/pdf"],minDpi:300,requireTransparencyWarning:true},termsAndConditions:"",termsAndConditionsAr:"",privacyPolicy:"",privacyPolicyAr:"",noReturnPolicy:"",noReturnPolicyAr:""};
    const bank={...defaults.bankDetails,...(stored.bankDetails&&typeof stored.bankDetails==="object"?stored.bankDetails:{})};const artwork={...defaults.artworkValidationRules,...(stored.artworkValidationRules&&typeof stored.artworkValidationRules==="object"?stored.artworkValidationRules:{})};const settings={...defaults,...stored,bankDetails:bank,artworkValidationRules:artwork,bankTransferReservationMinutes:Number.isFinite(reservationRaw)?reservationRaw:defaults.bankTransferReservationMinutes,requiredDesignerSamples:3};return {settings,updatedAt:updated.storefront_config||updated.reservation_minutes||null};
  }

  adminUpdateBusinessSettings(actorId:string,input:any):unknown{
    this.bootstrapCatalog();const current=(this.businessSettingsSnapshot() as any).settings;const num=(value:any,fallback:number,min:number,max:number,name:string)=>{const n=value===undefined?fallback:Number(value);if(!Number.isFinite(n)||n<min||n>max)throw new Error(name+" is outside the allowed range.");return n;};const cleanText=(value:any,fallback:string,max=5000)=>String(value===undefined?fallback:value??"").trim().slice(0,max);
    const reservation=Math.round(num(input.bankTransferReservationMinutes,current.bankTransferReservationMinutes,5,120,"Stock reservation timeout"));const pod=Math.round(num(input.podConfirmationPeriodHours,current.podConfirmationPeriodHours,1,72,"POD confirmation period"));const cancellation=Math.round(num(input.customerCancellationWindowMinutes,current.customerCancellationWindowMinutes,0,240,"Customer cancellation window"));const minWithdrawal=num(input.minimumWithdrawalAmount,current.minimumWithdrawalAmount,0,100000,"Minimum withdrawal");const commission=num(input.defaultDesignerCommissionRate,current.defaultDesignerCommissionRate,0,100,"Designer commission rate");const royalty=num(input.defaultDesignerFlatRoyalty,current.defaultDesignerFlatRoyalty,0,100000,"Designer flat royalty");const delivery=num(input.standardDeliveryFee,current.standardDeliveryFee,0,100000,"Delivery fee");const freeThreshold=num(input.freeDeliveryThreshold,current.freeDeliveryThreshold,0,1000000,"Free delivery threshold");
    const bankInput=input.bankDetails&&typeof input.bankDetails==="object"?input.bankDetails:{};const bankDetails={bankName:cleanText(bankInput.bankName,current.bankDetails.bankName,200),accountName:cleanText(bankInput.accountName,current.bankDetails.accountName,200),iban:cleanText(bankInput.iban,current.bankDetails.iban,100),cliqAlias:cleanText(bankInput.cliqAlias,current.bankDetails.cliqAlias,100),notes:cleanText(bankInput.notes,current.bankDetails.notes,2000),notesAr:cleanText(bankInput.notesAr,current.bankDetails.notesAr,2000)};
    const artworkInput=input.artworkValidationRules&&typeof input.artworkValidationRules==="object"?input.artworkValidationRules:{};const minDpi=Math.round(num(artworkInput.minDpi,current.artworkValidationRules.minDpi,72,1200,"Minimum DPI"));const maxFileSizeBytes=Math.round(num(artworkInput.maxFileSizeBytes,current.artworkValidationRules.maxFileSizeBytes,1048576,209715200,"Maximum artwork file size"));const formatWhitelist=["image/png","image/jpeg","application/pdf","image/tiff","image/webp"];const requestedFormats=Array.isArray(artworkInput.allowedFormats)?artworkInput.allowedFormats.map((x:any)=>String(x).toLowerCase()).filter((x:string)=>formatWhitelist.includes(x)):current.artworkValidationRules.allowedFormats;const allowedFormats=[...new Set(requestedFormats)];if(!allowedFormats.length)throw new Error("At least one supported artwork format is required.");
    const settings={currency:"JOD",currencySymbol:"JD",bankTransferReservationMinutes:reservation,podConfirmationPeriodHours:pod,customerCancellationWindowMinutes:cancellation,minimumWithdrawalAmount:minWithdrawal,defaultDesignerCommissionRate:commission,defaultDesignerFlatRoyalty:royalty,standardDeliveryFee:delivery,freeDeliveryThreshold:freeThreshold,storePickupEnabled:input.storePickupEnabled===undefined?Boolean(current.storePickupEnabled):Boolean(input.storePickupEnabled),storePickupAddress:cleanText(input.storePickupAddress,current.storePickupAddress,500),storePickupAddressAr:cleanText(input.storePickupAddressAr,current.storePickupAddressAr,500),bankDetails,artworkValidationRules:{maxFileSizeBytes,allowedFormats,minDpi,requireTransparencyWarning:artworkInput.requireTransparencyWarning===undefined?Boolean(current.artworkValidationRules.requireTransparencyWarning):Boolean(artworkInput.requireTransparencyWarning)},termsAndConditions:cleanText(input.termsAndConditions,current.termsAndConditions,20000),termsAndConditionsAr:cleanText(input.termsAndConditionsAr,current.termsAndConditionsAr,20000),privacyPolicy:cleanText(input.privacyPolicy,current.privacyPolicy,20000),privacyPolicyAr:cleanText(input.privacyPolicyAr,current.privacyPolicyAr,20000),noReturnPolicy:cleanText(input.noReturnPolicy,current.noReturnPolicy,20000),noReturnPolicyAr:cleanText(input.noReturnPolicyAr,current.noReturnPolicyAr,20000)};
    this.ctx.storage.transactionSync(()=>{this.ctx.storage.sql.exec("INSERT INTO business_settings (key,value_json,updated_at) VALUES ('storefront_config',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP",JSON.stringify(settings));this.ctx.storage.sql.exec("INSERT INTO business_settings (key,value_json,updated_at) VALUES ('reservation_minutes',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP",JSON.stringify(reservation));this.adminAudit(actorId,"admin.settings.update","business_settings","storefront_config","success",{changedKeys:Object.keys(input||{}),reservationMinutes:reservation,minDpi});});return this.businessSettingsSnapshot();
  }

  adminPromotionsList(filters:{search?:string;status?:string;type?:string;page?:number;pageSize?:number}={}):unknown{
    this.bootstrapCatalog();const conditions:string[]=[];const args:any[]=[];const search=String(filters.search??"").trim().toLowerCase();if(search){conditions.push("(lower(p.code) LIKE ? OR lower(p.id) LIKE ?)");const q="%"+search+"%";args.push(q,q);}const status=String(filters.status??"").trim().toLowerCase();if(status==="enabled"||status==="disabled"){conditions.push("p.enabled=?");args.push(status==="enabled"?1:0);}const type=String(filters.type??"").trim().toLowerCase();if(type==="percentage"||type==="fixed"){conditions.push("p.discount_type=?");args.push(type);}const where=conditions.length?" WHERE "+conditions.join(" AND "):"";const pageSize=Math.max(1,Math.min(100,Math.floor(Number(filters.pageSize)||20)));const total=Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS count FROM promotions p"+where,...args).toArray()[0]?.count??0);const pages=Math.max(1,Math.ceil(total/pageSize));const page=Math.max(1,Math.min(pages,Math.floor(Number(filters.page)||1)));const offset=(page-1)*pageSize;
    const items=this.ctx.storage.sql.exec<any>(`SELECT p.id AS promotionId,p.code,p.discount_type AS discountType,p.discount_value AS discountValue,p.min_spend_jod AS minSpendJod,p.max_uses AS maxUses,p.starts_at AS startsAt,p.expires_at AS expiresAt,p.enabled,p.created_at AS createdAt,p.updated_at AS updatedAt,(SELECT COUNT(*) FROM promotion_redemptions pr WHERE pr.promotion_id=p.id) AS usedCount,(SELECT COALESCE(SUM(pr.discount_jod),0) FROM promotion_redemptions pr WHERE pr.promotion_id=p.id) AS totalDiscountJod FROM promotions p${where} ORDER BY p.created_at DESC,p.id DESC LIMIT ? OFFSET ?`,...args,pageSize,offset).toArray().map((x:any)=>({...x,state:this.promotionOperationalState(x)}));
    return {items,total,page,pageSize,pages};
  }

  private promotionOperationalState(row:any):string{
    if(Number(row.enabled)!==1)return "disabled";const now=Date.now();const starts=String(row.startsAt??row.starts_at??"").trim();const expires=String(row.expiresAt??row.expires_at??"").trim();if(starts&&Number.isFinite(Date.parse(starts))&&Date.parse(starts)>now)return "scheduled";if(expires&&Number.isFinite(Date.parse(expires))&&Date.parse(expires)<now)return "expired";const max=row.maxUses??row.max_uses;if(max!==null&&max!==undefined&&Number(row.usedCount??0)>=Number(max))return "exhausted";return "active";
  }

  adminPromotionDetail(promotionId:string):unknown{
    this.bootstrapCatalog();const id=String(promotionId||"").trim();const row=this.ctx.storage.sql.exec<any>("SELECT p.id AS promotionId,p.code,p.discount_type AS discountType,p.discount_value AS discountValue,p.min_spend_jod AS minSpendJod,p.max_uses AS maxUses,p.starts_at AS startsAt,p.expires_at AS expiresAt,p.enabled,p.created_at AS createdAt,p.updated_at AS updatedAt,(SELECT COUNT(*) FROM promotion_redemptions pr WHERE pr.promotion_id=p.id) AS usedCount,(SELECT COALESCE(SUM(pr.discount_jod),0) FROM promotion_redemptions pr WHERE pr.promotion_id=p.id) AS totalDiscountJod FROM promotions p WHERE p.id=?",id).toArray()[0];if(!row)return null;const redemptions=this.ctx.storage.sql.exec<any>("SELECT pr.id AS redemptionId,pr.order_id AS orderId,pr.customer_id AS customerId,u.display_name AS customerName,u.email AS customerEmail,pr.discount_jod AS discountJod,pr.created_at AS createdAt FROM promotion_redemptions pr LEFT JOIN users u ON u.id=pr.customer_id WHERE pr.promotion_id=? ORDER BY pr.created_at DESC,pr.id DESC LIMIT 200",id).toArray();return {...row,state:this.promotionOperationalState(row),redemptions};
  }

  adminCreatePromotion(actorId:string,input:{code:string;discountType:string;discountValue:number;minSpendJod?:number;maxUses?:number|null;startsAt?:string|null;expiresAt?:string|null;enabled?:boolean}):unknown{
    this.bootstrapCatalog();const code=String(input.code||"").trim().toUpperCase().replace(/[^A-Z0-9_-]/g,"").slice(0,40);if(code.length<3)throw new Error("Coupon code must be at least 3 valid characters.");if(this.ctx.storage.sql.exec<any>("SELECT id FROM promotions WHERE code=?",code).toArray()[0])throw new Error("Coupon code already exists.");const type=input.discountType==="fixed"?"fixed":"percentage";const value=Number(input.discountValue);if(!Number.isFinite(value)||value<=0)throw new Error("Discount value must be greater than zero.");if(type==="percentage"&&value>100)throw new Error("Percentage discount cannot exceed 100%.");const minSpend=Math.round(Math.max(0,Number(input.minSpendJod)||0)*100);const maxUses=input.maxUses===null||input.maxUses===undefined||String(input.maxUses)===""?null:Math.max(1,Math.floor(Number(input.maxUses)||0));const startsAt=this.normalizeOptionalDateTime(input.startsAt);const expiresAt=this.normalizeOptionalDateTime(input.expiresAt);if(startsAt&&expiresAt&&Date.parse(expiresAt)<=Date.parse(startsAt))throw new Error("Expiry must be after the start date.");const id="promo-"+crypto.randomUUID();this.ctx.storage.sql.exec("INSERT INTO promotions (id,code,discount_type,discount_value,min_spend_jod,max_uses,starts_at,expires_at,enabled) VALUES (?,?,?,?,?,?,?,?,?)",id,code,type,value,minSpend,maxUses,startsAt,expiresAt,input.enabled===false?0:1);this.adminAudit(actorId,"admin.promotion.create","promotion",id,"success",{code,type,value,minSpendJod:minSpend,maxUses,startsAt,expiresAt});return this.adminPromotionDetail(id);
  }

  private normalizeOptionalDateTime(value:unknown):string|null{
    const clean=String(value??"").trim();if(!clean)return null;const timestamp=Date.parse(clean);if(!Number.isFinite(timestamp))throw new Error("Enter a valid promotion date/time.");return new Date(timestamp).toISOString();
  }

  adminUpdatePromotion(actorId:string,promotionId:string,input:{code?:string;discountType?:string;discountValue?:number;minSpendJod?:number;maxUses?:number|null;startsAt?:string|null;expiresAt?:string|null;enabled?:boolean}):unknown{
    this.bootstrapCatalog();const id=String(promotionId||"").trim();const current=this.ctx.storage.sql.exec<any>("SELECT * FROM promotions WHERE id=?",id).toArray()[0];if(!current)throw new Error("Promotion not found.");const code=input.code===undefined?String(current.code):String(input.code||"").trim().toUpperCase().replace(/[^A-Z0-9_-]/g,"").slice(0,40);if(code.length<3)throw new Error("Coupon code must be at least 3 valid characters.");if(this.ctx.storage.sql.exec<any>("SELECT id FROM promotions WHERE code=? AND id<>?",code,id).toArray()[0])throw new Error("Coupon code already exists.");const type=input.discountType===undefined?String(current.discount_type):(input.discountType==="fixed"?"fixed":"percentage");const value=input.discountValue===undefined?Number(current.discount_value):Number(input.discountValue);if(!Number.isFinite(value)||value<=0)throw new Error("Discount value must be greater than zero.");if(type==="percentage"&&value>100)throw new Error("Percentage discount cannot exceed 100%.");const minSpend=input.minSpendJod===undefined?Number(current.min_spend_jod):Math.round(Math.max(0,Number(input.minSpendJod)||0)*100);const maxUses=input.maxUses===undefined?(current.max_uses===null?null:Number(current.max_uses)):(input.maxUses===null||String(input.maxUses)===""?null:Math.max(1,Math.floor(Number(input.maxUses)||0)));const startsAt=input.startsAt===undefined?(current.starts_at?String(current.starts_at):null):this.normalizeOptionalDateTime(input.startsAt);const expiresAt=input.expiresAt===undefined?(current.expires_at?String(current.expires_at):null):this.normalizeOptionalDateTime(input.expiresAt);if(startsAt&&expiresAt&&Date.parse(expiresAt)<=Date.parse(startsAt))throw new Error("Expiry must be after the start date.");const used=Number(this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS count FROM promotion_redemptions WHERE promotion_id=?",id).toArray()[0]?.count??0);if(maxUses!==null&&maxUses<used)throw new Error("Maximum uses cannot be lower than the existing redemption count.");const enabled=input.enabled===undefined?Number(current.enabled):(input.enabled?1:0);this.ctx.storage.sql.exec("UPDATE promotions SET code=?,discount_type=?,discount_value=?,min_spend_jod=?,max_uses=?,starts_at=?,expires_at=?,enabled=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",code,type,value,minSpend,maxUses,startsAt,expiresAt,enabled,id);this.adminAudit(actorId,"admin.promotion.update","promotion",id,"success",{code,type,value,minSpendJod:minSpend,maxUses,startsAt,expiresAt,enabled});return this.adminPromotionDetail(id);
  }

  adminSetPromotionEnabled(actorId:string,promotionId:string,enabled:boolean):unknown{
    this.bootstrapCatalog();const id=String(promotionId||"").trim();if(!this.ctx.storage.sql.exec<any>("SELECT id FROM promotions WHERE id=?",id).toArray()[0])throw new Error("Promotion not found.");this.ctx.storage.sql.exec("UPDATE promotions SET enabled=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",enabled?1:0,id);this.adminAudit(actorId,enabled?"admin.promotion.enable":"admin.promotion.disable","promotion",id,"success",{enabled});return this.adminPromotionDetail(id);
  }

  adminReports(filters: { dateFrom?:string; dateTo?:string } = {}): unknown {
    this.bootstrapCatalog();const dateFrom=String(filters.dateFrom??"").trim(),dateTo=String(filters.dateTo??"").trim();const conditions:string[]=[];const args:any[]=[];
    if(/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)){conditions.push("date(o.created_at)>=date(?)");args.push(dateFrom);}
    if(/^\d{4}-\d{2}-\d{2}$/.test(dateTo)){conditions.push("date(o.created_at)<=date(?)");args.push(dateTo);}
    const where=conditions.length?" WHERE "+conditions.join(" AND "):"";
    const range={dateFrom:/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)?dateFrom:null,dateTo:/^\d{4}-\d{2}-\d{2}$/.test(dateTo)?dateTo:null};
    const orderSummary=this.ctx.storage.sql.exec<any>(`SELECT COUNT(*) AS totalOrders,SUM(CASE WHEN lower(o.status)='completed' THEN 1 ELSE 0 END) AS completedOrders,SUM(CASE WHEN lower(o.status)='cancelled' THEN 1 ELSE 0 END) AS cancelledOrders,SUM(CASE WHEN lower(o.status) NOT IN ('completed','cancelled') THEN 1 ELSE 0 END) AS openOrders,COALESCE(SUM(CASE WHEN lower(o.status)<>'cancelled' THEN o.total_jod ELSE 0 END),0) AS grossOrderValueJod,COALESCE(SUM(CASE WHEN lower(o.status)<>'cancelled' AND lower(o.payment_status)='confirmed' THEN o.total_jod ELSE 0 END),0) AS confirmedRevenueJod${" FROM orders o"}${where}`,...args).toArray()[0]??{};
    const orderStatuses=this.ctx.storage.sql.exec<any>(`SELECT o.status,COUNT(*) AS count,COALESCE(SUM(o.total_jod),0) AS totalJod FROM orders o${where} GROUP BY o.status ORDER BY count DESC,o.status`,...args).toArray();
    const paymentStatuses=this.ctx.storage.sql.exec<any>(`SELECT o.payment_status AS paymentStatus,COUNT(*) AS count,COALESCE(SUM(o.total_jod),0) AS totalJod FROM orders o${where} GROUP BY o.payment_status ORDER BY count DESC,o.payment_status`,...args).toArray();
    const fulfillment=this.ctx.storage.sql.exec<any>(`SELECT o.fulfillment_mode AS fulfillmentMode,COUNT(*) AS count FROM orders o${where} GROUP BY o.fulfillment_mode ORDER BY count DESC,o.fulfillment_mode`,...args).toArray();
    const dailySales=this.ctx.storage.sql.exec<any>(`SELECT date(o.created_at) AS day,COUNT(*) AS orders,COALESCE(SUM(CASE WHEN lower(o.status)<>'cancelled' THEN o.total_jod ELSE 0 END),0) AS grossJod,COALESCE(SUM(CASE WHEN lower(o.status)<>'cancelled' AND lower(o.payment_status)='confirmed' THEN o.total_jod ELSE 0 END),0) AS confirmedJod FROM orders o${where} GROUP BY date(o.created_at) ORDER BY day`,...args).toArray().slice(-366);
    const productQuantities=this.ctx.storage.sql.exec<any>(`SELECT pm.id AS modelId,pm.name_en AS productNameEn,pm.name_ar AS productNameAr,SUM(oi.quantity) AS quantity,COUNT(DISTINCT o.id) AS orderCount FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN variants v ON v.id=oi.variant_id JOIN product_models pm ON pm.id=v.model_id${where} GROUP BY pm.id ORDER BY quantity DESC,orderCount DESC,pm.name_en LIMIT 50`,...args).toArray();
    const designerEarningsWhere=conditions.length?conditions.map(x=>x.replaceAll("o.created_at","de.created_at")).join(" AND "):"";
    const designerArgs=[...args];
    const designerEarnings=this.ctx.storage.sql.exec<any>(`SELECT de.designer_id AS designerId,u.display_name AS designerName,u.email AS designerEmail,COUNT(*) AS earningCount,COALESCE(SUM(de.amount_jod),0) AS earningsJod FROM designer_earnings de LEFT JOIN users u ON u.id=de.designer_id${designerEarningsWhere?" WHERE "+designerEarningsWhere:""} GROUP BY de.designer_id ORDER BY earningsJod DESC LIMIT 50`,...designerArgs).toArray();
    const withdrawalWhere=conditions.length?conditions.map(x=>x.replaceAll("o.created_at","w.created_at")).join(" AND "):"";
    const payouts=this.ctx.storage.sql.exec<any>(`SELECT w.status,COUNT(*) AS count,COALESCE(SUM(w.amount_jod),0) AS amountJod FROM withdrawals w${withdrawalWhere?" WHERE "+withdrawalWhere:""} GROUP BY w.status ORDER BY count DESC,w.status`,...args).toArray();
    const userRange=(alias:string)=>{const parts:string[]=[];const vals:any[]=[];if(range.dateFrom){parts.push(`date(${alias}.created_at)>=date(?)`);vals.push(range.dateFrom);}if(range.dateTo){parts.push(`date(${alias}.created_at)<=date(?)`);vals.push(range.dateTo);}return {where:parts.length?" WHERE "+parts.join(" AND "):"",args:vals};};
    const ur=userRange("u");
    const registrations=this.ctx.storage.sql.exec<any>(`SELECT r.name AS role,COUNT(DISTINCT u.id) AS count FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id${ur.where} GROUP BY r.name ORDER BY r.name`,...ur.args).toArray();
    const inventory=this.ctx.storage.sql.exec<any>("SELECT COUNT(*) AS trackedVariants,SUM(CASE WHEN quantity<=0 THEN 1 ELSE 0 END) AS outOfStock,SUM(CASE WHEN quantity BETWEEN 1 AND 5 THEN 1 ELSE 0 END) AS lowStock,COALESCE(SUM(quantity),0) AS totalTrackedUnits FROM stocks WHERE tracked=1").toArray()[0]??{};
    const generatedAt=new Date().toISOString();
    return {range,generatedAt,orderSummary,orderStatuses,paymentStatuses,fulfillment,dailySales,productQuantities,designerEarnings,payouts,registrations,inventory};
  }

  adminDashboardSummary(): unknown {
    this.bootstrapCatalog();
    const count=(sql:string,...args:any[])=>Number((this.ctx.storage.sql.exec<any>(sql,...args).toArray()[0]?.count)??0);
    const ordersTotal=count("SELECT COUNT(*) AS count FROM orders");
    const ordersOpen=count("SELECT COUNT(*) AS count FROM orders WHERE lower(status) NOT IN ('completed','cancelled')");
    const paymentPending=count("SELECT COUNT(*) AS count FROM orders WHERE lower(payment_status)='pending'");
    const productionOpen=count("SELECT COUNT(*) AS count FROM printing_jobs WHERE lower(status) NOT IN ('completed','cancelled')");
    const reviewPending=count("SELECT COUNT(*) AS count FROM designer_applications WHERE lower(status) IN ('submitted','pending','under_review')");
    const stockOut=count("SELECT COUNT(*) AS count FROM stocks WHERE tracked=1 AND quantity<=0");
    const stockLow=count("SELECT COUNT(*) AS count FROM stocks WHERE tracked=1 AND quantity BETWEEN 1 AND 5");
    const payoutPending=count("SELECT COUNT(*) AS count FROM withdrawals WHERE lower(status)='requested'");
    const recentOrders=this.ctx.storage.sql.exec<any>("SELECT o.id,o.status,o.payment_status AS paymentStatus,o.fulfillment_mode AS fulfillmentMode,o.total_jod AS totalJod,o.currency,o.created_at AS createdAt,u.display_name AS customerName,u.email AS customerEmail FROM orders o LEFT JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 8").toArray();
    const recentActivity=this.ctx.storage.sql.exec<any>("SELECT id,actor_id AS actorId,action,resource_type AS resourceType,resource_id AS resourceId,metadata_json AS metadata,created_at AS createdAt FROM audit_logs ORDER BY id DESC LIMIT 8").toArray();
    const dailyOrders=this.ctx.storage.sql.exec<any>("SELECT date(created_at) AS day,COUNT(*) AS orders,COALESCE(SUM(total_jod),0) AS totalJod FROM orders WHERE datetime(created_at)>=datetime('now','-6 days') GROUP BY date(created_at) ORDER BY day").toArray();
    return { orders:{total:ordersTotal,open:ordersOpen,paymentPending}, production:{open:productionOpen}, reviews:{pending:reviewPending}, stock:{outOfStock:stockOut,lowStock:stockLow,lowStockThreshold:5}, payouts:{requested:payoutPending}, recentOrders, recentActivity, dailyOrders };
  }

  async loginAdmin(username: string, password: string): Promise<{id:string;username:string;role:"main_admin"|"printing_technician"}|null> {
    this.bootstrapCatalog();
    const clean = String(username || "").trim().toLowerCase();
    if (!clean || !password) return null;
    const row = this.ctx.storage.sql.exec<any>("SELECT id,username,password_salt,password_hash,role FROM admin_users WHERE username=? AND enabled=1", clean).toArray()[0];
    if (!row) return null;
    let salt: Uint8Array;
    try { salt = base64ToBytes(String(row.password_salt || "")); } catch { return null; }
    const hash = await this.adminPasswordHash(password, salt);
    if (hash !== String(row.password_hash || "")) return null;
    this.ctx.storage.sql.exec("UPDATE admin_users SET last_login_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?", row.id);
    return { id: String(row.id), username: String(row.username), role: row.role };
  }
}
