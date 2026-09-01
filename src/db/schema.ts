import { pgTable, text, integer, doublePrecision, boolean, timestamp, jsonb, serial, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// -------------------------------------------------------------
// 1. ACCOUNTS & USERS
// -------------------------------------------------------------
export const users = pgTable('users', {
  id: text('id').primaryKey(), // user_admin, user_designer_1, etc.
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('customer'), // 'customer' | 'designer' | 'admin'
  phone: text('phone'),
  city: text('city'),
  address: text('address'),
  designerProfileId: text('designer_profile_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const designerProfiles = pgTable('designer_profiles', {
  id: text('id').primaryKey(), // designer_1
  userId: text('user_id').references(() => users.id),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  avatar: text('avatar'),
  bio: text('bio'),
  bioAr: text('bio_ar'),
  country: text('country').default('Jordan'),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  applicationDate: timestamp('application_date').defaultNow().notNull(),
  sampleDesigns: jsonb('sample_designs').$type<string[]>().default([]),
  totalDesignsCount: integer('total_designs_count').default(0).notNull(),
  totalSoldOrUsed: integer('total_sold_or_used').default(0).notNull(),
  totalEarnings: doublePrecision('total_earnings').default(0).notNull(),
  withdrawableBalance: doublePrecision('withdrawable_balance').default(0).notNull(),
  pendingEarnings: doublePrecision('pending_earnings').default(0).notNull(),
  pendingWithdrawals: doublePrecision('pending_withdrawals').default(0).notNull(),
  completedWithdrawals: doublePrecision('completed_withdrawals').default(0).notNull(),
  payoutDetails: jsonb('payout_details').$type<{
    method?: string;
    cliqAlias?: string;
    bankName?: string;
    iban?: string;
    accountHolder?: string;
  }>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  city: text('city'),
  address: text('address'),
  customerGroup: text('customer_group').default('retail').notNull(),
  ordersCount: integer('orders_count').default(0).notNull(),
  totalSpent: doublePrecision('total_spent').default(0).notNull(),
  dateAdded: timestamp('date_added').defaultNow().notNull(),
  status: text('status').default('active').notNull(),
});

// -------------------------------------------------------------
// 2. CATALOG & PRODUCTS
// -------------------------------------------------------------
export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nameAr: text('name_ar').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  status: text('status').default('enabled').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
});

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nameAr: text('name_ar').notNull(),
  description: text('description'),
  descriptionAr: text('description_ar'),
  type: text('type').notNull().default('ready_to_sell'), // 'ready_to_sell' | 'customizable'
  basePrice: doublePrecision('base_price').notNull(),
  rating: doublePrecision('rating').default(5.0).notNull(),
  reviewsCount: integer('reviews_count').default(0).notNull(),
  isBestSeller: boolean('is_best_seller').default(false).notNull(),
  category: text('category').notNull(),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  images: jsonb('images').$type<{ primary: string; model?: string; back?: string }>().notNull(),
  colors: jsonb('colors').$type<Array<{ name: string; hex: string }>>().default([]).notNull(),
  sizes: jsonb('sizes').$type<string[]>().default([]).notNull(),
  stock: integer('stock').default(0).notNull(),
  printableAreas: jsonb('printable_areas').$type<any[]>().default([]).notNull(),
  defaultDesignId: text('default_design_id'),
  variants: jsonb('variants').$type<any[]>().default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// -------------------------------------------------------------
// 3. DESIGNS & MARKETPLACE
// -------------------------------------------------------------
export const designs = pgTable('designs', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  titleAr: text('title_ar').notNull(),
  designerId: text('designer_id').references(() => designerProfiles.id),
  designerName: text('designer_name').notNull(),
  designerAvatar: text('designer_avatar'),
  imageUrl: text('image_url').notNull(),
  fileFormat: text('file_format').default('png').notNull(),
  category: text('category').default('popular').notNull(),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  soldCount: integer('sold_count').default(0).notNull(),
  usedCount: integer('used_count').default(0).notNull(),
  royaltyRate: doublePrecision('royalty_rate').default(1.5).notNull(),
  royaltyType: text('royalty_type').default('fixed').notNull(),
  status: text('status').default('published').notNull(), // 'pending' | 'published' | 'rejected'
  hasTransparency: boolean('has_transparency').default(true).notNull(),
  resolutionDpi: integer('resolution_dpi').default(300).notNull(),
  aspectRatio: doublePrecision('aspect_ratio').default(1.0).notNull(),
  readyToPrintFile: jsonb('ready_to_print_file').$type<{
    url: string;
    fileName: string;
    format: string;
    widthPx: number;
    heightPx: number;
    dpi: number;
    hasTransparency: boolean;
    targetPhysicalWidthCm: number;
    targetPhysicalHeightCm: number;
    edgeClarityScore?: number;
    dtfSuitabilityPass: boolean;
  }>(),
  presentationPhotos: jsonb('presentation_photos').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const designAssets = pgTable('design_assets', {
  id: text('id').primaryKey(), // ast_des1_master, ast_des1_psd, ast_des1_ai
  designId: text('design_id').references(() => designs.id).notNull(),
  name: text('name').notNull(),
  assetType: text('asset_type').notNull(), // 'ready_to_print_master' | 'source_file' | 'presentation_image'
  format: text('format').notNull(), // 'png' | 'psd' | 'ai' | 'svg' | 'jpg'
  url: text('url').notNull(),
  sizeBytes: integer('size_bytes'),
  isReadyToPrintMaster: boolean('is_ready_to_print_master').default(false).notNull(),
  preflightReport: jsonb('preflight_report').$type<{
    passed: boolean;
    dpi: number;
    widthPx: number;
    heightPx: number;
    hasTransparency: boolean;
    targetWidthCm: number;
    targetHeightCm: number;
    score: number;
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const productionJobs = pgTable('production_jobs', {
  id: text('id').primaryKey(),
  orderId: text('order_id').references(() => orders.id).notNull(),
  orderItemId: text('order_item_id').notNull(),
  designId: text('design_id').references(() => designs.id),
  masterAssetId: text('master_asset_id').references(() => designAssets.id),
  masterPrintUrl: text('master_print_url').notNull(),
  printLocation: text('print_location').default('front').notNull(),
  widthCm: doublePrecision('width_cm').notNull(),
  heightCm: doublePrecision('height_cm').notNull(),
  dpi: integer('dpi').default(300).notNull(),
  hasTransparency: boolean('has_transparency').default(true).notNull(),
  status: text('status').default('queued').notNull(), // 'queued' | 'printing' | 'heat_pressed' | 'qc_passed' | 'reprint_needed'
  heatPressParams: jsonb('heat_press_params').$type<{
    temperatureC: number;
    durationSeconds: number;
    peelType: string;
    postPressSeconds: number;
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// -------------------------------------------------------------
// 4. COMMERCE, ORDERS & ATOMIC RESERVATIONS
// -------------------------------------------------------------
export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  customerId: text('customer_id'),
  customerInfo: jsonb('customer_info').$type<{
    name: string;
    phone: string;
    email: string;
    city: string;
    address: string;
    notes?: string;
  }>().notNull(),
  items: jsonb('items').$type<any[]>().notNull(),
  subtotal: doublePrecision('subtotal').notNull(),
  deliveryFee: doublePrecision('delivery_fee').notNull(),
  discountAmount: doublePrecision('discount_amount').default(0).notNull(),
  total: doublePrecision('total').notNull(),
  currency: text('currency').default('JOD').notNull(),
  paymentMethod: text('payment_method').notNull(),
  paymentStatus: text('payment_status').default('unpaid').notNull(),
  deliveryType: text('delivery_type').default('delivery').notNull(),
  status: text('status').default('new').notNull(),
  statusHistory: jsonb('status_history').$type<Array<{ status: string; timestamp: string; note?: string }>>().default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const stockReservations = pgTable('stock_reservations', {
  id: text('id').primaryKey(),
  productId: text('product_id').references(() => products.id).notNull(),
  variantId: text('variant_id'),
  quantity: integer('quantity').notNull(),
  customerId: text('customer_id').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const coupons = pgTable('coupons', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  type: text('type').default('percentage').notNull(),
  discount: doublePrecision('discount').notNull(),
  minSpend: doublePrecision('min_spend').default(0).notNull(),
  maxUses: integer('max_uses').default(100).notNull(),
  usedCount: integer('used_count').default(0).notNull(),
  expiryDate: text('expiry_date'),
  status: text('status').default('enabled').notNull(),
});

// -------------------------------------------------------------
// 5. DESIGNER ECONOMICS & WITHDRAWALS
// -------------------------------------------------------------
export const withdrawals = pgTable('withdrawals', {
  id: text('id').primaryKey(),
  designerId: text('designer_id').references(() => designerProfiles.id).notNull(),
  amount: doublePrecision('amount').notNull(),
  currency: text('currency').default('JOD').notNull(),
  method: text('method').default('cliq').notNull(),
  status: text('status').default('pending').notNull(), // 'pending' | 'completed' | 'rejected'
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
  notes: text('notes'),
});

// -------------------------------------------------------------
// 6. NOTIFICATIONS, CMS & SETTINGS
// -------------------------------------------------------------
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  targetRole: text('target_role').default('all').notNull(),
  targetUserId: text('target_user_id'),
  title: text('title').notNull(),
  titleAr: text('title_ar').notNull(),
  message: text('message').notNull(),
  messageAr: text('message_ar').notNull(),
  type: text('type').default('system').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const businessSettings = pgTable('business_settings', {
  id: text('id').primaryKey(), // 'current_settings'
  currency: text('currency').default('JOD').notNull(),
  currencySymbol: text('currency_symbol').default('JD').notNull(),
  bankTransferReservationMinutes: integer('bank_transfer_reservation_minutes').default(15).notNull(),
  podConfirmationPeriodHours: integer('pod_confirmation_period_hours').default(4).notNull(),
  customerCancellationWindowMinutes: integer('customer_cancellation_window_minutes').default(30).notNull(),
  minimumWithdrawalAmount: doublePrecision('minimum_withdrawal_amount').default(10.0).notNull(),
  defaultDesignerCommissionRate: doublePrecision('default_designer_commission_rate').default(15.0).notNull(),
  defaultDesignerFlatRoyalty: doublePrecision('default_designer_flat_royalty').default(1.5).notNull(),
  standardDeliveryFee: doublePrecision('standard_delivery_fee').default(3.0).notNull(),
  freeDeliveryThreshold: doublePrecision('free_delivery_threshold').default(45.0).notNull(),
  storePickupEnabled: boolean('store_pickup_enabled').default(true).notNull(),
  storePickupAddress: text('store_pickup_address'),
  storePickupAddressAr: text('store_pickup_address_ar'),
  bankDetails: jsonb('bank_details').$type<{
    bankName: string;
    accountName: string;
    iban: string;
    cliqAlias: string;
    notes?: string;
    notesAr?: string;
  }>().notNull(),
  artworkValidationRules: jsonb('artwork_validation_rules').$type<any>().notNull(),
  termsAndConditions: text('terms_and_conditions'),
  termsAndConditionsAr: text('terms_and_conditions_ar'),
  privacyPolicy: text('privacy_policy'),
  privacyPolicyAr: text('privacy_policy_ar'),
  noReturnPolicy: text('no_return_policy'),
  noReturnPolicyAr: text('no_return_policy_ar'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
