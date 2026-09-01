export type UserRole = 'customer' | 'designer' | 'admin';
export type Language = 'en' | 'ar';

export type ProductType = 'blank' | 'ready_to_sell' | 'printed';

export type PrintLocation = 'front' | 'back' | 'left_sleeve' | 'right_sleeve' | 'left' | 'right' | 'chest' | 'hood';

export interface ProductVariant {
  id: string;
  name: string; // e.g. "Black / M"
  color: string; // hex or color code e.g. "#111827"
  colorName: string; // "Black", "White", "Navy", etc.
  size?: string; // "S", "M", "L", "XL", "XXL"
  sku: string;
  stock: number;
  priceModifier?: number; // extra charge if any
}

export interface PrintableAreaConfig {
  location: PrintLocation;
  name: string;
  maxWidthCm: number;
  maxHeightCm: number;
  defaultWidthCm: number;
  defaultHeightCm: number;
  centerXPercent: number; // percentage on canvas
  centerYPercent: number;
  aspectRatio: number; // width / height
}

export interface Product {
  id: string;
  name: string;
  nameAr?: string;
  description: string;
  descriptionAr?: string;
  type: ProductType;
  basePrice: number;
  rating?: number;
  reviewsCount?: number;
  isBestSeller?: boolean;
  category: string; // e.g. "t_shirts", "mugs", "caps", "hoodies"
  tags?: string[];
  material?: string;
  images: {
    primary: string;
    model?: string;
    back?: string;
    angle?: string;
    angles?: {
      front?: string;
      back?: string;
      [key: string]: string | undefined;
    };
  };
  colors: {
    name: string;
    hex: string;
    image?: string;
  }[];
  sizes?: string[];
  variants?: ProductVariant[];
  printableAreas?: PrintableAreaConfig[];
  printableArea?: any;
  defaultDesignId?: string; // for ready-to-sell products
  stock: number;
  features?: string[];
  featuresAr?: string[];
}

export type DesignStatus = 'pending' | 'pending_review' | 'approved' | 'rejected' | 'published' | 'archived';
export type DesignCategory = 'all' | 'popular' | 'new' | 'men' | 'women' | 'kids' | 'unisex' | 'cyberpunk' | 'nature' | 'animals' | 'anime';

export type DesignAssetType = 'ready_to_print_master' | 'presentation_image' | 'source_file' | 'preview_thumbnail' | 'vector_asset';

export interface DesignAsset {
  id: string;
  name: string;
  assetType: DesignAssetType;
  format: 'png' | 'svg' | 'ai' | 'psd' | 'pdf' | 'jpg' | 'jpeg' | string;
  url: string;
  sizeBytes?: number;
  sizeFormatted?: string;
  isReadyToPrintMaster: boolean;
  uploadedAt?: string;
  preflightResult?: {
    passed: boolean;
    dpi: number;
    effectiveDpi?: number;
    requiredDpi?: number;
    widthPx: number;
    heightPx: number;
    requiredWidthPx?: number;
    requiredHeightPx?: number;
    hasTransparency: boolean;
    targetWidthCm: number;
    targetHeightCm: number;
    score: number; // 0-100
    notesEn: string;
    notesAr: string;
    rejectionReasons?: string[];
    rejectionReasonsAr?: string[];
  };
}

export interface DesignSupportingFile {
  id: string;
  name: string;
  format: 'png' | 'svg' | 'ai' | 'psd' | 'pdf' | string;
  url: string;
  sizeBytes?: number;
  sizeMb?: number;
  isReadyToPrint?: boolean;
}

export interface ReadyToPrintSpec {
  url: string;
  fileName: string;
  format: 'png';
  widthPx: number;
  heightPx: number;
  dpi: number;
  effectiveDpi?: number;
  requiredWidthPx?: number;
  requiredHeightPx?: number;
  hasTransparency: boolean;
  targetPhysicalWidthCm: number;
  targetPhysicalHeightCm: number;
  edgeClarityScore?: number; // 0-100
  pixelationRisk?: 'none' | 'low' | 'high';
  dtfSuitabilityPass: boolean;
  inspectionNotes?: string;
  inspectionNotesAr?: string;
  rejectionReasons?: string[];
  rejectionReasonsAr?: string[];
}

export interface Design {
  id: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  designerId: string;
  designerName: string;
  designerAvatar: string;
  isOwnerDesign?: boolean; // Owner designs have 0 commission
  imageUrl: string; // Primary thumbnail / display image
  presentationPhotos?: string[]; // Minimum 3 presentation mockups/shots for catalog display
  supportingFiles?: DesignSupportingFile[]; // PSD, AI, PNG, etc.
  assets?: DesignAsset[]; // Unified multi-asset collection belonging to this single design entity
  readyToPrintFile?: ReadyToPrintSpec; // The designated Ready-to-Print PNG
  sourceFileUrl?: string; // Protected source PSD/AI
  fileFormat: 'png' | 'svg' | 'ai' | 'psd' | 'pdf';
  category: DesignCategory;
  tags: string[];
  soldCount: number;
  usedCount: number;
  royaltyRate: number; // e.g. 0.50 JD or 10%
  pricePerUnit?: number; // alias for royaltyRate
  royaltyType: 'fixed' | 'percentage';
  status: DesignStatus;
  createdAt: string;
  aspectRatio?: number;
  widthPx?: number;
  heightPx?: number;
  hasTransparency?: boolean;
  resolutionDpi?: number;
}

export interface ProductionSpecification {
  printLocation: PrintLocation;
  widthCm: number;
  heightCm: number;
  positionX: number; // % offset
  positionY: number; // % offset
  rotationDeg: number;
  isFlippedHorizontally: boolean;
  previewUrl: string; // rendered production mock
  productionFileUrl: string; // clean high-res transparent artwork
  originalDpi?: number;
  notes?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  productType: ProductType;
  selectedColor: string;
  selectedColorHex: string;
  selectedSize?: string;
  unitPrice: number;
  quantity: number;
  design?: Design;
  customUploadedArtworkUrl?: string;
  productionSpec: ProductionSpecification;
  timestamp: number;
  // Historical Snapshot of Designer Commission for this order line item:
  designerId?: string;
  designerName?: string;
  isOwnerDesign?: boolean;
  appliedRoyaltyType?: 'fixed' | 'percentage';
  appliedRoyaltyRate?: number;
  royaltyPerUnit?: number;
  totalRoyaltyAmount?: number;
}

export type OrderStatus =
  | 'new'
  | 'payment_pending'
  | 'payment_confirmed'
  | 'under_preparation'
  | 'ready_for_delivery'
  | 'ready_for_delivery_or_pickup'
  | 'given_to_courier'
  | 'given_to_delivery'
  | 'under_delivery'
  | 'ready_for_pickup'
  | 'completed'
  | 'cancelled';

export type PaymentMethod = 'bank_transfer' | 'cash_on_delivery' | 'card_online';
export type DeliveryType = 'delivery' | 'store_pickup';

export interface OrderCustomerInfo {
  name: string;
  phone: string;
  email?: string;
  city: string;
  address: string;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerInfo: OrderCustomerInfo;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  totalAmount?: number; // alias for total
  currency: string;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  deliveryType: DeliveryType;
  status: OrderStatus;
  statusHistory: {
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }[];
  createdAt: string;
  reservationExpiresAt?: string; // ISO date for bank transfer stock hold
  cancellationReason?: string;
  paymentReceiptUrl?: string;
  adminNotes?: string;
}

export interface DesignerSampleInspection {
  id: string;
  title: string;
  titleAr?: string;
  readyToPrintFileName: string;
  previewUrl: string;
  readyToPrintUrl: string;
  dpi: number;
  effectiveDpi?: number;
  requiredDpi?: number;
  widthPx: number;
  heightPx: number;
  requiredWidthPx?: number;
  requiredHeightPx?: number;
  hasTransparency: boolean;
  targetWidthCm: number;
  targetHeightCm: number;
  passedQuality: boolean;
  score: number; // 0-100
  notes: string;
  notesAr?: string;
  rejectionReason?: string | null;
  rejectionReasonAr?: string | null;
  failedReasonsEn?: string[];
  failedReasonsAr?: string[];
}

export interface DesignerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  bio?: string;
  bioAr?: string;
  country: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  applicationDate: string;
  autoApprovedAt?: string;
  commissionType: 'fixed' | 'percentage'; // 'fixed' default 0.50 JOD per unit or 'percentage'
  commissionRate: number; // default 0.50 JOD or percentage (e.g. 10%)
  sampleDesigns: string[]; // URLs or placeholders of 3 submitted sample designs
  sampleInspections?: DesignerSampleInspection[]; // 3 inspected designs
  totalDesignsCount: number;
  totalSoldOrUsed: number;
  totalEarnings: number; // in JD / currency
  withdrawableBalance: number;
  pendingEarnings: number;
  pendingWithdrawals: number;
  completedWithdrawals: number;
  balance?: number; // alias for withdrawableBalance
  totalEarned?: number; // alias for totalEarnings
  salesCount?: number; // alias for totalSoldOrUsed
  payoutDetails?: {
    method: 'cliq' | 'bank_transfer' | 'paypal';
    cliqAlias?: string;
    bankName?: string;
    iban?: string;
    accountHolder?: string;
    paypalEmail?: string;
  };
}

export interface WithdrawalRequest {
  id: string;
  designerId: string;
  designerName: string;
  amount: number;
  currency: string;
  payoutMethod: string;
  payoutDetailsSummary: string;
  status: 'pending' | 'paid' | 'rejected';
  requestDate: string;
  paidDate?: string;
  transactionRef?: string;
  adminNote?: string;
}

export interface BusinessSettings {
  currency: string;
  currencySymbol: string;
  bankTransferReservationMinutes: number;
  podConfirmationPeriodHours: number;
  customerCancellationWindowMinutes: number;
  minimumWithdrawalAmount: number;
  defaultDesignerCommissionRate: number; // e.g. 15%
  defaultDesignerFlatRoyalty: number; // e.g. 1.50 JD
  standardDeliveryFee: number;
  freeDeliveryThreshold: number;
  storePickupEnabled: boolean;
  storePickupAddress: string;
  storePickupAddressAr?: string;
  bankDetails: {
    bankName: string;
    accountName: string;
    iban: string;
    cliqAlias: string;
    notes: string;
    notesAr?: string;
  };
  artworkValidationRules: {
    maxFileSizeBytes: number;
    allowedFormats: string[];
    minDpi: number;
    requireTransparencyWarning: boolean;
  };
  termsAndConditions: string;
  termsAndConditionsAr: string;
  privacyPolicy: string;
  privacyPolicyAr: string;
  noReturnPolicy: string;
  noReturnPolicyAr: string;
}

export interface AppNotification {
  id: string;
  targetRole: UserRole;
  targetUserId?: string;
  title: string;
  titleAr?: string;
  message: string;
  messageAr?: string;
  type: 'order' | 'payment' | 'designer' | 'stock' | 'system' | 'royalty' | 'payout';
  linkTo?: string;
  isRead: boolean;
  createdAt: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  description: string;
  image?: string;
  status: 'enabled' | 'disabled';
  sortOrder: number;
}

export interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  customerGroup: 'retail' | 'vip' | 'wholesale';
  ordersCount: number;
  totalSpent: number;
  dateAdded: string;
  status: 'active' | 'inactive';
}

export interface CouponCode {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  discount: number;
  minSpend: number;
  maxUses: number;
  usedCount: number;
  expiryDate: string;
  status: 'enabled' | 'disabled';
}
