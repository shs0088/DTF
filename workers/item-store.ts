import { DurableObject } from "cloudflare:workers";

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

  printifyCatalogLocalState(): unknown[] {
    this.bootstrapCatalog();
    return this.ctx.storage.sql.exec<any>(`SELECT c.blueprint_id, c.imported_model_id, c.provider_id, c.source_available, c.sync_status, p.title_en, p.title_ar, p.description_en, p.description_ar, p.customer_price_jod, p.display_image, p.published, p.print_your_dream, p.selected_provider_id FROM printify_catalog_items c LEFT JOIN printify_product_data p ON p.model_id = c.imported_model_id`).toArray();
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

  private async adminPasswordHash(password: string, salt: Uint8Array): Promise<string> {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: 100000, hash: "SHA-256" }, key, 256);
    return btoa(String.fromCharCode(...new Uint8Array(bits)));
  }
  private adminB64(bytes: Uint8Array): string { return btoa(String.fromCharCode(...bytes)); }
  async adminIdentity(id: string): Promise<{id:string;username:string;role:"main_admin"|"printing_technician"}|null> { this.bootstrapCatalog(); const row=this.ctx.storage.sql.exec<any>("SELECT id,username,role FROM admin_users WHERE id=? AND enabled=1",id).toArray()[0]; return row ? {id:row.id,username:row.username,role:row.role} : null; }
  async getOrCreateAdminSessionKey(): Promise<string> { this.bootstrapCatalog(); const existing=this.ctx.storage.sql.exec<any>("SELECT secret_value FROM server_secrets WHERE key_name=?","ADMIN_WEB_KEY").toArray()[0]; if(existing?.secret_value) return existing.secret_value; const bytes=crypto.getRandomValues(new Uint8Array(32)); const value=btoa(String.fromCharCode(...bytes)).replaceAll("+","-").replaceAll("/","_").replaceAll("=",""); this.ctx.storage.sql.exec("INSERT OR IGNORE INTO server_secrets (key_name,secret_value) VALUES (?,?)","ADMIN_WEB_KEY",value); return this.ctx.storage.sql.exec<any>("SELECT secret_value FROM server_secrets WHERE key_name=?","ADMIN_WEB_KEY").toArray()[0].secret_value; }
  async adminCount(): Promise<number> { this.bootstrapCatalog(); return this.ctx.storage.sql.exec<{count:number}>("SELECT COUNT(*) AS count FROM admin_users").one().count; }
  async bootstrapAdmin(username: string, password: string, role: "main_admin"|"printing_technician" = "main_admin"): Promise<{id:string;username:string;role:string}> {
    this.bootstrapCatalog(); const clean=String(username||"").trim().toLowerCase(); if(!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(clean)) throw new Error("Username must be 3-64 characters and use letters, numbers, dot, underscore, or hyphen."); if(String(password||"").length<12) throw new Error("Password must be at least 12 characters."); if(await this.adminCount()>0) throw new Error("Admin bootstrap is already completed."); const salt=crypto.getRandomValues(new Uint8Array(16)); const id=crypto.randomUUID(); const hash=await this.adminPasswordHash(password,salt); this.ctx.storage.sql.exec("INSERT INTO admin_users (id,username,password_salt,password_hash,role) VALUES (?,?,?,?,?)",id,clean,this.adminB64(salt),hash,role); return {id,username:clean,role};
  }
  async updateAdminAccount(id: string, currentPassword: string, newUsername: string, newPassword: string): Promise<{id:string;username:string;role:"main_admin"|"printing_technician"}> {

[Showing lines 1-731 of 780. Use offset=732 to continue.]