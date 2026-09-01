export interface TranslationsSchema {
  // Navigation & Core Labels
  home: string;
  shop: string;
  designs: string;
  cart: string;
  account: string;
  admin: string;
  designer: string;
  customer: string;
  preview: string;
  customize: string;
  viewAll: string;
  search: string;
  filter: string;
  save: string;
  cancel: string;
  back: string;
  done: string;
  loading: string;
  all: string;
  popular: string;
  new: string;
  men: string;
  women: string;
  kids: string;
  unisex: string;
  sold: string;
  reviews: string;
  bestSeller: string;
  close: string;
  apply: string;
  delete: string;
  edit: string;
  status: string;
  date: string;
  total: string;
  actions: string;

  // Home Screen
  premiumDtfPrinting: string;
  bringImaginationToLife: string;
  toLife: string;
  printYourDream: string;
  shopProducts: string;
  freshFromDesigners: string;
  meetOurDesigners: string;
  featuredProducts: string;
  howItWorks: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  step4Title: string;
  step4Desc: string;

  // Categories & Pricing
  tshirts: string;
  mugs: string;
  caps: string;
  hoodies: string;
  tshirtsFrom: string;
  mugsFrom: string;
  capsFrom: string;
  hoodiesFrom: string;
  fromPrice: string;

  // Shop & Catalog
  searchShopPlaceholder: string;
  allItems: string;
  plainBlankApparel: string;
  readyToSellFeatured: string;
  blankCanvas: string;
  selectProductToCustomize: string;

  // Design Gallery
  designsUploadedBy: string;
  designersCount: string;
  searchDesignsPlaceholder: string;
  designerUploadTip: string;
  uploadedBy: string;
  useThisDesign: string;
  allCategories: string;

  // Product Detail
  productDetail: string;
  color: string;
  size: string;
  premiumQualityMaterial: string;
  vibrantLongLasting: string;
  washDurable: string;
  addToCart: string;
  customizeDesign: string;
  itemAddedToCart: string;

  // Customizer Studio
  undo: string;
  redo: string;
  dragToMovePinch: string;
  front: string;
  backLocation: string;
  leftSleeve: string;
  rightSleeve: string;
  left: string;
  right: string;
  printSize: string;
  exactSizeNote: string;
  gallery: string;
  upload: string;
  rotate: string;
  flip: string;
  approveAndAddToCart: string;
  printableAreaExceeded: string;
  fileValid: string;
  pickDesignFromGallery: string;
  uploadYourArtwork: string;
  dropzoneTitle: string;
  dropzoneSub: string;
  browseFiles: string;
  maxFileSize: string;
  validDtfFileFormats: string;

  // Cart & Checkout
  myCart: string;
  cartEmpty: string;
  startCustomizing: string;
  checkout: string;
  proceedToCheckout: string;
  deliveryMethod: string;
  homeDelivery: string;
  storePickup: string;
  contactInformation: string;
  fullName: string;
  phoneNumber: string;
  deliveryAddress: string;
  city: string;
  orderSummary: string;
  subtotal: string;
  deliveryFee: string;
  freeDeliveryApplied: string;
  paymentMethod: string;
  bankTransfer: string;
  cashOnDelivery: string;
  creditCard: string;
  placeOrder: string;

  // Bank Transfer Instructions
  bankTransferTitle: string;
  bankTransferInstructions: string;
  reservationExpiresIn: string;
  confirmPaymentSent: string;
  cliqAliasLabel: string;
  bankNameLabel: string;
  ibanLabel: string;

  // Order Status & Tracking
  orderStatusTimeline: string;
  statusNew: string;
  statusPaymentPending: string;
  statusPaymentConfirmed: string;
  statusUnderPreparation: string;
  statusReadyForDeliveryOrPickup: string;
  statusGivenToDelivery: string;
  statusUnderDelivery: string;
  statusReadyForPickup: string;
  statusCompleted: string;
  statusCancelled: string;
  trackOrder: string;
  orderNumber: string;
  courierInfo: string;
  needHelpWithOrder: string;
  callSupport: string;

  // Designer Dashboard
  designerDashboard: string;
  totalDesigns: string;
  designsUsedSold: string;
  currentEarnings: string;
  withdrawableBalance: string;
  pendingEarnings: string;
  pendingWithdrawal: string;
  completedWithdrawal: string;
  uploadNewDesign: string;
  withdrawMoney: string;
  myDesigns: string;
  designStatus: string;
  salesCount: string;
  requestPayout: string;
  minimumWithdrawalNote: string;
  designerPortalDirectLink: string;

  // Admin Dashboard & CMS
  adminDashboard: string;
  totalOrders: string;
  totalRevenue: string;
  totalCustomers: string;
  activeDesigners: string;
  pendingPayments: string;
  stockAlerts: string;
  productionQueue: string;
  pendingWithdrawals: string;
  manageOrders: string;
  manageProducts: string;
  manageDesigners: string;
  businessSettings: string;
  cmsContentManagement: string;
  cmsDescription: string;
  confirmPaymentReceived: string;
  cancelOrderAction: string;
  updateStatus: string;
  printProductionTicket: string;
  exactPrintSpecs: string;
  download300DpiFile: string;
  markHeatPressed: string;
  filterByPageSection: string;
  searchTranslationKeys: string;
  saveAllTranslations: string;
  resetDefaultTranslations: string;
  addNewTranslation: string;
  keyIdentifier: string;
  englishText: string;
  arabicText: string;
  addTranslationButton: string;
  translationsSavedToast: string;
  translationsResetToast: string;

  // Policies & Legal
  termsAndConditions: string;
  privacyPolicy: string;
  noReturnPolicy: string;
  noReturnNoticeTitle: string;
  noReturnNoticeDesc: string;

  // Role Switcher & Testing
  switchRole: string;
  testingNotice: string;
  directAccessLinks: string;
  copyLink: string;
  linkCopied: string;

  [key: string]: string;
}

export const defaultTranslations: { en: TranslationsSchema; ar: TranslationsSchema } = {
  en: {
    // Navigation & Core Labels
    home: 'Home',
    shop: 'Shop',
    designs: 'Designs',
    cart: 'Cart',
    account: 'Account',
    admin: 'Admin',
    designer: 'Designer',
    customer: 'Customer',
    preview: 'Preview',
    customize: 'Customize',
    viewAll: 'View all',
    search: 'Search',
    filter: 'Filter',
    save: 'Save',
    cancel: 'Cancel',
    back: 'Back',
    done: 'Done',
    loading: 'Loading...',
    all: 'All',
    popular: 'Popular',
    new: 'New',
    men: 'Men',
    women: 'Women',
    kids: 'Kids',
    unisex: 'Unisex',
    sold: 'sold',
    reviews: 'reviews',
    bestSeller: 'Best Seller',
    close: 'Close',
    apply: 'Apply',
    delete: 'Delete',
    edit: 'Edit',
    status: 'Status',
    date: 'Date',
    total: 'Total',
    actions: 'Actions',

    // Home Screen
    premiumDtfPrinting: 'PREMIUM DTF PRINTING',
    bringImaginationToLife: 'Bring Your Imagination',
    toLife: 'To Life',
    printYourDream: 'Print Your Dream',
    shopProducts: 'Shop Products',
    freshFromDesigners: 'Fresh from Our Designers',
    meetOurDesigners: 'Meet our designers',
    featuredProducts: 'Featured Products',
    howItWorks: 'How It Works',
    step1Title: 'Choose Product',
    step1Desc: 'Pick a blank apparel or item',
    step2Title: 'Pick or Upload Design',
    step2Desc: 'Explore gallery or upload artwork',
    step3Title: 'Customize & Preview',
    step3Desc: 'Adjust size, rotation, & position',
    step4Title: 'We Print & Deliver',
    step4Desc: 'Vibrant durable DTF shipped to you',

    // Categories & Pricing
    tshirts: 'T-Shirts',
    mugs: 'Mugs',
    caps: 'Caps',
    hoodies: 'Hoodies',
    tshirtsFrom: 'T-Shirts from 9.99 JD',
    mugsFrom: 'Mugs from 7.99 JD',
    capsFrom: 'Caps from 8.99 JD',
    hoodiesFrom: 'Hoodies from 17.99 JD',
    fromPrice: 'from',

    // Shop & Catalog
    searchShopPlaceholder: 'Search blank apparel, mugs, caps, hoodies...',
    allItems: 'All Items',
    plainBlankApparel: 'Plain / Blank Apparel',
    readyToSellFeatured: 'Ready-to-Sell Featured',
    blankCanvas: 'Blank Canvas',
    selectProductToCustomize: 'Select a product to customize with your artwork',

    // Design Gallery
    designsUploadedBy: 'Designs uploaded by independent creators',
    designersCount: '12 designers • 240+ designs',
    searchDesignsPlaceholder: 'Search designs, styles, or designer names...',
    designerUploadTip: "Any designer's upload works on any product — pick one and see it live",
    uploadedBy: 'Uploaded by',
    useThisDesign: 'Customize on Product',
    allCategories: 'All Categories',

    // Product Detail
    productDetail: 'Product Detail',
    color: 'Color',
    size: 'Size',
    premiumQualityMaterial: '100% premium quality ring-spun material',
    vibrantLongLasting: 'Vibrant high-density DTF print with rich color gamut',
    washDurable: 'Wash durable & stretch resistant for 60+ cycles',
    addToCart: 'Add to Cart',
    customizeDesign: 'Customize Design',
    itemAddedToCart: 'Added to cart successfully!',

    // Customizer Studio
    undo: 'Undo',
    redo: 'Redo',
    dragToMovePinch: 'Drag to move • Pinch to resize',
    front: 'Front',
    backLocation: 'Back',
    leftSleeve: 'Left Sleeve',
    rightSleeve: 'Right Sleeve',
    left: 'Left',
    right: 'Right',
    printSize: 'Print size',
    exactSizeNote: 'Exact physical size in CM goes directly to RIP production',
    gallery: 'Gallery',
    upload: 'Upload',
    rotate: 'Rotate',
    flip: 'Flip',
    approveAndAddToCart: 'Approve & Add to Cart',
    printableAreaExceeded: 'Design exceeds maximum printable boundary for this product!',
    fileValid: 'Artwork verified: 300 DPI high resolution with alpha transparency',
    pickDesignFromGallery: 'Pick a Design from Gallery',
    uploadYourArtwork: 'Upload Your Artwork',
    dropzoneTitle: 'Tap or drag artwork file here',
    dropzoneSub: 'Supports PNG, SVG, PDF, AI, PSD with transparent background',
    browseFiles: 'Browse File',
    maxFileSize: 'Maximum file size: 50MB (Ultra High Res 300DPI)',
    validDtfFileFormats: 'Accepted formats: PNG (Recommended), SVG, PDF, AI, PSD',

    // Cart & Checkout
    myCart: 'My Cart',
    cartEmpty: 'Your cart is empty',
    startCustomizing: 'Start Customizing',
    checkout: 'Checkout',
    proceedToCheckout: 'Proceed to Checkout',
    deliveryMethod: 'Delivery Method',
    homeDelivery: 'Home Delivery',
    storePickup: 'Store Pickup',
    contactInformation: 'Contact Information',
    fullName: 'Full Name',
    phoneNumber: 'Phone Number',
    deliveryAddress: 'Delivery Address / Street',
    city: 'City',
    orderSummary: 'Order Summary',
    subtotal: 'Subtotal',
    deliveryFee: 'Delivery Fee',
    freeDeliveryApplied: 'Free Delivery Applied!',
    paymentMethod: 'Payment Method',
    bankTransfer: 'Bank Transfer / CliQ',
    cashOnDelivery: 'Cash on Delivery (POD)',
    creditCard: 'Credit Card (Coming Soon)',
    placeOrder: 'Place Order',

    // Bank Transfer Instructions
    bankTransferTitle: 'Bank Transfer / CliQ Payment Details',
    bankTransferInstructions: 'Please transfer the exact total amount within 30 minutes to hold inventory and start DTF printing immediately.',
    reservationExpiresIn: 'Stock Reservation Expires in',
    confirmPaymentSent: 'I Have Completed the Transfer',
    cliqAliasLabel: 'CliQ Alias',
    bankNameLabel: 'Bank Name',
    ibanLabel: 'IBAN Number',

    // Order Status & Tracking
    orderStatusTimeline: 'Order Status & Live Tracking',
    statusNew: 'New Order',
    statusPaymentPending: 'Payment Pending (Bank Transfer)',
    statusPaymentConfirmed: 'Payment Confirmed',
    statusUnderPreparation: 'Under Preparation & DTF Printing',
    statusReadyForDeliveryOrPickup: 'Ready for Delivery / Pickup',
    statusGivenToDelivery: 'Handed Over to Courier',
    statusUnderDelivery: 'Out for Delivery',
    statusReadyForPickup: 'Ready for Store Pickup',
    statusCompleted: 'Completed & Delivered',
    statusCancelled: 'Cancelled',
    trackOrder: 'Track Order',
    orderNumber: 'Order Number',
    courierInfo: 'Courier & Delivery Info',
    needHelpWithOrder: 'Need help with this order?',
    callSupport: 'Call Direct Support',

    // Designer Dashboard
    designerDashboard: 'Designer Command Center',
    totalDesigns: 'Total Designs',
    designsUsedSold: 'Designs Sold',
    currentEarnings: 'Current Earnings',
    withdrawableBalance: 'Available Balance',
    pendingEarnings: 'Pending Earnings',
    pendingWithdrawal: 'Pending Payout',
    completedWithdrawal: 'Completed Payouts',
    uploadNewDesign: 'Upload New Design',
    withdrawMoney: 'Request Withdrawal',
    myDesigns: 'My Portfolio',
    designStatus: 'Status',
    salesCount: 'Sales',
    requestPayout: 'Request Payout',
    minimumWithdrawalNote: 'Minimum withdrawal threshold is 10.00 JD',
    designerPortalDirectLink: 'Designer Portal Direct Link',

    // Admin Dashboard & CMS
    adminDashboard: 'Owner / Admin Business Center',
    totalOrders: 'Total Orders',
    totalRevenue: 'Total Revenue',
    totalCustomers: 'Total Customers',
    activeDesigners: 'Active Designers',
    pendingPayments: 'Pending Payments',
    stockAlerts: 'Stock Alerts',
    productionQueue: 'DTF Production RIP Queue',
    pendingWithdrawals: 'Pending Withdrawals',
    manageOrders: 'Manage Orders',
    manageProducts: 'Manage Products',
    manageDesigners: 'Manage Designers',
    businessSettings: 'Business Settings',
    cmsContentManagement: 'Site Content & Dual-Language CMS',
    cmsDescription: 'Edit and manage all text content in Arabic and English across every screen of the website.',
    confirmPaymentReceived: 'Mark Payment Received',
    cancelOrderAction: 'Cancel Order',
    updateStatus: 'Advance Status',
    printProductionTicket: 'Print Production Specs',
    exactPrintSpecs: 'Exact Production Specs',
    download300DpiFile: 'Download 300DPI File',
    markHeatPressed: 'Mark Heat Pressed',
    filterByPageSection: 'Filter by Page / Section',
    searchTranslationKeys: 'Search translation keys or text...',
    saveAllTranslations: 'Save All Website Text Changes',
    resetDefaultTranslations: 'Reset to Factory Defaults',
    addNewTranslation: 'Add New Custom Translation Key',
    keyIdentifier: 'Key Identifier (e.g. heroSubtitle)',
    englishText: 'English Text',
    arabicText: 'Arabic Text (النص العربي)',
    addTranslationButton: 'Add Key to CMS',
    translationsSavedToast: 'All website texts saved successfully!',
    translationsResetToast: 'Translations reset to original default state.',

    // Policies & Legal
    termsAndConditions: 'Terms & Conditions',
    privacyPolicy: 'Privacy Policy & Intellectual Property',
    noReturnPolicy: 'Customized Products No-Return Policy',
    noReturnNoticeTitle: 'Custom Print Disclaimer',
    noReturnNoticeDesc: 'Due to the personalized nature of customized DTF apparel and products, all custom-printed orders are final and non-refundable once production starts, except for manufacturing defects.',

    // Role Switcher & Testing
    switchRole: 'Mode Switcher',
    testingNotice: 'Testing Mode Active: Switch seamlessly between Customer, Designer, and Admin dashboards.',
    directAccessLinks: 'Direct Portal Access Links',
    copyLink: 'Copy Link',
    linkCopied: 'Link Copied!',
  },
  ar: {
    // Navigation & Core Labels
    home: 'الرئيسية',
    shop: 'المتجر',
    designs: 'التصاميم',
    cart: 'السلة',
    account: 'الحساب',
    admin: 'لوحة الإدارة',
    designer: 'لوحة المصمم',
    customer: 'العميل',
    preview: 'معاينة',
    customize: 'تخصيص',
    viewAll: 'عرض الكل',
    search: 'بحث',
    filter: 'تصفية',
    save: 'حفظ',
    cancel: 'إلغاء',
    back: 'رجوع',
    done: 'تم',
    loading: 'جاري التحميل...',
    all: 'الكل',
    popular: 'الأكثر طلباً',
    new: 'جديد',
    men: 'رجالي',
    women: 'نسائي',
    kids: 'أطفال',
    unisex: 'للجنسين',
    sold: 'تم بيعه',
    reviews: 'تقييمات',
    bestSeller: 'الأكثر مبيعاً',
    close: 'إغلاق',
    apply: 'تطبيق',
    delete: 'حذف',
    edit: 'تعديل',
    status: 'الحالة',
    date: 'التاريخ',
    total: 'المجموع',
    actions: 'الإجراءات',

    // Home Screen
    premiumDtfPrinting: 'طباعة DTF فائقة الجودة',
    bringImaginationToLife: 'حوّل خيالك',
    toLife: 'إلى حقيقة',
    printYourDream: 'اطبع حلمك',
    shopProducts: 'تسوق المنتجات',
    freshFromDesigners: 'جديد المصممين',
    meetOurDesigners: 'تعرف على المصممين',
    featuredProducts: 'منتجات مميزة',
    howItWorks: 'كيف يعمل DTF Studio',
    step1Title: 'اختر المنتج',
    step1Desc: 'تيشيرت، ماج، كاب، أو هودي خام',
    step2Title: 'اختر أو ارفع التصميم',
    step2Desc: 'من معرض المصممين أو ملفك الخاص',
    step3Title: 'التخصيص والمعاينة الحية',
    step3Desc: 'حدد الحجم، الدوران، والمكان بالسنتيمتر',
    step4Title: 'الطباعة والتوصيل',
    step4Desc: 'طباعة DTF احترافية تدوم لسنوات',

    // Categories & Pricing
    tshirts: 'تيشيرتات',
    mugs: 'أكواب',
    caps: 'كابات',
    hoodies: 'هوديات',
    tshirtsFrom: 'تيشيرتات تبدأ من 9.99 د.أ',
    mugsFrom: 'أكواب تبدأ من 7.99 د.أ',
    capsFrom: 'كابات تبدأ من 8.99 د.أ',
    hoodiesFrom: 'هوديات تبدأ من 17.99 د.أ',
    fromPrice: 'من',

    // Shop & Catalog
    searchShopPlaceholder: 'ابحث عن تيشيرت، ماج، كاب، هودي...',
    allItems: 'جميع المنتجات',
    plainBlankApparel: 'الملابس والمنتجات الخام',
    readyToSellFeatured: 'منتجات مميزة جاهزة للبيع',
    blankCanvas: 'منتج خام قابل للتخصيص',
    selectProductToCustomize: 'اختر منتجاً لتخصيصه بتصميمك المفضل',

    // Design Gallery
    designsUploadedBy: 'تصاميم تم رفعها بواسطة نخبة من المبدعين المستقلين',
    designersCount: '12 مصمم • أكثر من 240 تصميماً',
    searchDesignsPlaceholder: 'ابحث عن تصميم أو ستايل أو اسم مصمم...',
    designerUploadTip: 'أي تصميم من المصممين يعمل على جميع المنتجات — اختر تصميماً وعاينه فوراً',
    uploadedBy: 'تم الرفع بواسطة',
    useThisDesign: 'تخصيص على منتج',
    allCategories: 'جميع التصنيفات',

    // Product Detail
    productDetail: 'تفاصيل المنتج',
    color: 'اللون',
    size: 'المقاس',
    premiumQualityMaterial: 'خامات قطنية فاخرة 100% فائقة النعومة',
    vibrantLongLasting: 'ألوان DTF زاهية فائقة الثبات وتدرجات غنية',
    washDurable: 'مقاوم للغسيل والتمزق لأكثر من 60 غسلة',
    addToCart: 'إضافة إلى السلة',
    customizeDesign: 'تخصيص التصميم',
    itemAddedToCart: 'تمت إضافة المنتج للسلة بنجاح!',

    // Customizer Studio
    undo: 'تراجع',
    redo: 'إعادة',
    dragToMovePinch: 'اسحب للتحريك • باعد للإصبعين لتغيير الحجم',
    front: 'الأمام',
    backLocation: 'الخلف',
    leftSleeve: 'الكم الأيسر',
    rightSleeve: 'الكم الأيمن',
    left: 'يسار',
    right: 'يمين',
    printSize: 'حجم الطباعة',
    exactSizeNote: 'المقاس الدقيق بالسنتيمتر يُرسل مباشرة لبرنامج الإنتاج RIP',
    gallery: 'المعرض',
    upload: 'رفع ملف',
    rotate: 'تدوير',
    flip: 'عكس',
    approveAndAddToCart: 'اعتماد وإضافة للسلة',
    printableAreaExceeded: 'تجاوز التصميم حدود الطباعة المسموحة لهذا المنتج!',
    fileValid: 'تم التحقق: دقة 300 DPI عالية مع خلفية شفافة Alpha',
    pickDesignFromGallery: 'اختر تصميماً من المعرض',
    uploadYourArtwork: 'ارفع ملف التصميم الخاص بك',
    dropzoneTitle: 'انقر أو اسحب ملف التصميم هنا',
    dropzoneSub: 'يدعم صيغ PNG, SVG, PDF, AI, PSD بخلفية شفافة',
    browseFiles: 'تصفح الملفات',
    maxFileSize: 'أقصى حجم للملف: 50 ميجابايت (دقة فائقة 300DPI)',
    validDtfFileFormats: 'الصيغ المقبولة: PNG (موصى به), SVG, PDF, AI, PSD',

    // Cart & Checkout
    myCart: 'سلة المشتريات',
    cartEmpty: 'السلة فارغة حالياً',
    startCustomizing: 'ابدأ التخصيص الآن',
    checkout: 'إتمام الطلب',
    proceedToCheckout: 'الانتقال إلى الدفع',
    deliveryMethod: 'طريقة الاستلام',
    homeDelivery: 'توصيل للمنزل',
    storePickup: 'استلام من الفرع',
    contactInformation: 'بيانات العميل والتوصيل',
    fullName: 'الاسم الكامل',
    phoneNumber: 'رقم الهاتف',
    deliveryAddress: 'عنوان التوصيل / الشارع',
    city: 'المدينة',
    orderSummary: 'ملخص الطلب',
    subtotal: 'المجموع الفرعي',
    deliveryFee: 'أجور التوصيل',
    freeDeliveryApplied: 'توصيل مجاني مطبق!',
    paymentMethod: 'طريقة الدفع',
    bankTransfer: 'تحويل بنكي / كليك (CliQ)',
    cashOnDelivery: 'الدفع عند الاستلام (POD)',
    creditCard: 'بطاقة ائتمان (قريباً)',
    placeOrder: 'تأكيد الطلب',

    // Bank Transfer Instructions
    bankTransferTitle: 'تعليمات التحويل البنكي و CliQ',
    bankTransferInstructions: 'يرجى تحويل المبلغ الإجمالي خلال 30 دقيقة لتأكيد حجز المخزون والبدء بالطباعة فوراً.',
    reservationExpiresIn: 'ينتهي حجز المخزون خلال',
    confirmPaymentSent: 'لقد أتممت التحويل البنكي',
    cliqAliasLabel: 'اسم مستعار كليك (CliQ Alias)',
    bankNameLabel: 'اسم البنك',
    ibanLabel: 'رقم الآيبان (IBAN)',

    // Order Status & Tracking
    orderStatusTimeline: 'تتبع حالة ومراحل الطلب المباشرة',
    statusNew: 'طلب جديد',
    statusPaymentPending: 'في انتظار الدفع (تحويل بنكي)',
    statusPaymentConfirmed: 'تم تأكيد الدفع بنجاح',
    statusUnderPreparation: 'قيد التجهيز وطباعة DTF الحرارية',
    statusReadyForDeliveryOrPickup: 'جاهز للتسليم / الاستلام',
    statusGivenToDelivery: 'تم التسليم لشركة التوصيل',
    statusUnderDelivery: 'جاري التوصيل للعميل',
    statusReadyForPickup: 'جاهز للاستلام من المحل',
    statusCompleted: 'تم التسليم والإنهاء',
    statusCancelled: 'ملغي',
    trackOrder: 'تتبع الطلب',
    orderNumber: 'رقم الطلب',
    courierInfo: 'بيانات شركة الشحن والتوصيل',
    needHelpWithOrder: 'هل تحتاج مساعدة بخصوص هذا الطلب؟',
    callSupport: 'الاتصال المباشر بالدعم',

    // Designer Dashboard
    designerDashboard: 'مركز تحكم وإدارة المصمم',
    totalDesigns: 'إجمالي التصاميم',
    designsUsedSold: 'مرات البيع والاستخدام',
    currentEarnings: 'الأرباح الكلية',
    withdrawableBalance: 'الرصيد القابل للسحب',
    pendingEarnings: 'أرباح قيد المراجعة',
    pendingWithdrawal: 'سحوبات قيد المعالجة',
    completedWithdrawal: 'سحوبات مكتملة',
    uploadNewDesign: 'رفع تصميم جديد',
    withdrawMoney: 'طلب سحب الأرباح',
    myDesigns: 'معرض تصاميمي',
    designStatus: 'الحالة',
    salesCount: 'المبيعات',
    requestPayout: 'طلب سحب',
    minimumWithdrawalNote: 'الحد الأدنى للسحب هو 10.00 د.أ',
    designerPortalDirectLink: 'رابط مباشر لبوابة المصمم',

    // Admin Dashboard & CMS
    adminDashboard: 'مركز التحكم وإدارة الأعمال',
    totalOrders: 'إجمالي الطلبات',
    totalRevenue: 'إجمالي الإيرادات',
    totalCustomers: 'عدد العملاء',
    activeDesigners: 'المصممون المعتمدون',
    pendingPayments: 'دفعات بانتظار التأكيد',
    stockAlerts: 'تنبيهات المخزون',
    productionQueue: 'طابور تجهيز وطباعة DTF',
    pendingWithdrawals: 'طلبات سحب المصممين',
    manageOrders: 'إدارة الطلبات',
    manageProducts: 'إدارة المنتجات والمخزون',
    manageDesigners: 'إدارة المصممين واعتمادهم',
    businessSettings: 'إعدادات المتجر والأعمال',
    cmsContentManagement: 'إدارة محتوى ونصوص الموقع باللغتين',
    cmsDescription: 'تعديل وإدارة كافة نصوص الموقع باللغتين العربية والإنجليزية لجميع الصفحات والأزرار والبانرات.',
    confirmPaymentReceived: 'تأكيد استلام الدفعة',
    cancelOrderAction: 'إلغاء الطلب',
    updateStatus: 'تحديث المرحلة التالية',
    printProductionTicket: 'طباعة تذكرة الإنتاج والمقاسات',
    exactPrintSpecs: 'المواصفات الفنية للطباعة',
    download300DpiFile: 'تحميل ملف 300DPI',
    markHeatPressed: 'تم الكبس الحراري',
    filterByPageSection: 'تصفية حسب الصفحة / القسم',
    searchTranslationKeys: 'ابحث في مفاتيح ونصوص الموقع...',
    saveAllTranslations: 'حفظ كافة تعديلات نصوص الموقع',
    resetDefaultTranslations: 'استعادة النصوص الافتراضية',
    addNewTranslation: 'إضافة نص جديد للموقع',
    keyIdentifier: 'معرف النص (مثال: specialBannerText)',
    englishText: 'النص بالإنجليزية',
    arabicText: 'النص بالعربية',
    addTranslationButton: 'إضافة النص لنظام المحتوى',
    translationsSavedToast: 'تم حفظ كافة نصوص الموقع بنجاح!',
    translationsResetToast: 'تمت استعادة النصوص الأصلية بنجاح.',

    // Policies & Legal
    termsAndConditions: 'الشروط والأحكام',
    privacyPolicy: 'سياسة الخصوصية وحقوق التصاميم',
    noReturnPolicy: 'سياسة عدم استرجاع المنتجات المطبوعة حسب الطلب',
    noReturnNoticeTitle: 'تنويه المنتجات المخصصة',
    noReturnNoticeDesc: 'نظراً لطبيعة المنتجات المطبوعة خصيصاً بالاسم أو التصميم المطلوب، لا يمكن استرجاع أو استبدال المنتجات المخصصة بعد بدء الإنتاج إلا في حالة وجود عيب مصنعي مثبت.',

    // Role Switcher & Testing
    switchRole: 'مبدل الصلاحيات للتجربة',
    testingNotice: 'وضع الفحص نشط: تنقل بين واجهة العميل، لوحة المصمم، ولوحة المدير لتجربة كافة الوظائف.',
    directAccessLinks: 'روابط الدخول المباشر للبوابات',
    copyLink: 'نسخ الرابط',
    linkCopied: 'تم نسخ الرابط بنجاح!',
  }
};

export const translations = defaultTranslations;
