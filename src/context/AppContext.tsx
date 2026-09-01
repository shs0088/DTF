import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserRole,
  Language,
  Product,
  Design,
  DesignerProfile,
  Order,
  BusinessSettings,
  AppNotification,
  CartItem,
  OrderStatus,
  PaymentMethod,
  DeliveryType,
  OrderCustomerInfo,
  ProductionSpecification,
  CategoryItem,
  CustomerRecord,
  CouponCode,
} from '../types';
import {
  INITIAL_DESIGNS,
  INITIAL_PRODUCTS,
  INITIAL_DESIGNER_PROFILE,
  INITIAL_DESIGNERS,
  INITIAL_BUSINESS_SETTINGS,
  INITIAL_ORDERS,
  INITIAL_NOTIFICATIONS,
  INITIAL_CATEGORIES,
  INITIAL_CUSTOMERS,
  INITIAL_COUPONS,
} from '../data/initialData';
import { translations } from '../translations';
import { formatCurrency as formatCurrencyUtil } from '../utils/currency';
import { evaluatePrintPreflight } from '../utils/preflight';

export type ScreenType =
  | 'home'
  | 'shop'
  | 'designs'
  | 'cart'
  | 'account'
  | 'product_detail'
  | 'customize'
  | 'customizer'
  | 'checkout'
  | 'order_tracking'
  | 'designer_dashboard'
  | 'admin_dashboard';

interface AppContextType {
  // Navigation & View
  activeScreen: ScreenType;
  setActiveScreen: (screen: ScreenType) => void;
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  selectedDesignId: string | null;
  setSelectedDesignId: (id: string | null) => void;
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  currentOrderId: string | null;
  setCurrentOrderId: (id: string | null) => void;
  
  // Customization Session State
  customizerProduct: Product | null;
  customizerDesign: Design | null;
  customizerArtworkUrl: string | null;
  startCustomizer: (product: Product, design?: Design | null, artworkUrl?: string | null) => void;

  // Role & i18n
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRtl: boolean;
  formatCurrency: (amount: number) => string;
  siteTranslations: typeof translations;
  updateTranslation: (lang: Language, key: string, value: string) => void;
  updateTranslationsBatch: (newTranslations: typeof translations) => void;
  addNewTranslationKey: (key: string, enVal: string, arVal: string) => void;
  resetTranslations: () => void;

  // Admin Designer Preview Testing Mode
  isAdminPreviewingAsDesigner: boolean;
  previewDesignerId: string | null;
  startAdminDesignerPreview: (designerId?: string) => void;
  exitAdminDesignerPreview: () => void;
  setDesignReadyToPrintMaster: (designId: string, assetIdOrFileName: string) => void;

  // Direct Portals & Authentication
  isDirectPortalModalOpen: boolean;
  setIsDirectPortalModalOpen: (open: boolean) => void;
  isDesignerRegistrationModalOpen: boolean;
  setIsDesignerRegistrationModalOpen: (open: boolean) => void;
  loginAsDesigner: () => void;
  loginAsAdmin: () => void;
  loginAsCustomer: () => void;
  getDirectPortalUrl: (portal: 'designer' | 'admin' | 'customizer' | 'shop') => string;

  // Data Collections
  products: Product[];
  designs: Design[];
  orders: Order[];
  designerProfile: DesignerProfile;
  designers: DesignerProfile[];
  businessSettings: BusinessSettings;
  notifications: AppNotification[];
  cart: CartItem[];
  categories: CategoryItem[];
  customers: CustomerRecord[];
  coupons: CouponCode[];

  // Cart Operations
  addToCart: (item: Omit<CartItem, 'id' | 'timestamp'>) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartQuantity: (cartItemId: string, qty: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;

  // Orders Operations
  createOrder: (params: {
    customerInfo: OrderCustomerInfo;
    paymentMethod: PaymentMethod;
    deliveryType: DeliveryType;
  }) => Order;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, note?: string) => void;
  confirmPaymentReceived: (orderId: string) => void;
  confirmOrderPayment: (orderId: string) => void;
  cancelOrder: (orderId: string, reason: string) => void;
  deleteOrder: (orderId: string) => void;

  // Designer Operations
  uploadNewDesign: (newDesign: Omit<Design, 'id' | 'soldCount' | 'usedCount' | 'createdAt'>) => Design;
  addDesignerDesign: (newDesign: Omit<Design, 'id' | 'soldCount' | 'usedCount' | 'createdAt'>) => Design;
  registerAndQualifyDesigner: (params: {
    name: string;
    email: string;
    phone: string;
    bio?: string;
    bioAr?: string;
    cliqAlias?: string;
    iban?: string;
    sampleDesigns: Array<{
      title: string;
      titleAr?: string;
      category?: string;
      imageUrl: string;
      readyToPrintFileName?: string;
      widthPx: number;
      heightPx: number;
      dpi: number;
      hasTransparency: boolean;
      targetWidthCm: number;
      targetHeightCm: number;
    }>;
  }) => { success: boolean; profile: DesignerProfile; inspections: any[]; errors?: string[] };
  updateDesignerCommission: (designerId: string, commissionType: 'fixed' | 'percentage', rate: number) => void;
  requestWithdrawal: (amount: number, method: string, details: string) => boolean;
  updateDesignStatus: (designId: string, status: Design['status']) => void;

  // Admin & Catalog Operations
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  updateProductStock: (productId: string, newStock: number) => void;
  addCategory: (category: CategoryItem) => void;
  updateCategory: (category: CategoryItem) => void;
  deleteCategory: (categoryId: string) => void;
  addCustomer: (customer: CustomerRecord) => void;
  updateCustomer: (customer: CustomerRecord) => void;
  deleteCustomer: (customerId: string) => void;
  addCoupon: (coupon: CouponCode) => void;
  updateCoupon: (coupon: CouponCode) => void;
  deleteCoupon: (couponId: string) => void;
  updateBusinessSettings: (settings: Partial<BusinessSettings>) => void;
  approveDesignerApplication: (designerId: string) => void;
  rejectDesignerApplication: (designerId: string) => void;
  markWithdrawalAsPaid: (designerId: string, amount: number) => void;

  // Notifications
  markNotificationAsRead: (id: string) => void;
  unreadNotificationsCount: number;

  // Reset Demo Data
  resetToDemoDefaults: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check URL parameters for direct deep link access (?portal=designer, ?portal=admin, ?role=designer, etc.)
  const getInitialRoleAndScreen = (): { role: UserRole; screen: ScreenType } => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash.toLowerCase();
        const portalParam = urlParams.get('portal') || urlParams.get('role');

        if (portalParam === 'designer' || hash === '#designer' || hash === '#/designer') {
          return { role: 'designer', screen: 'designer_dashboard' };
        }
        if (portalParam === 'admin' || hash === '#admin' || hash === '#/admin') {
          return { role: 'admin', screen: 'admin_dashboard' };
        }
        if (portalParam === 'customizer' || portalParam === 'customize' || hash === '#customizer') {
          return { role: 'customer', screen: 'customizer' };
        }
        if (portalParam === 'shop' || hash === '#shop') {
          return { role: 'customer', screen: 'shop' };
        }
      }
    } catch {
      // Fall through to local storage or defaults
    }

    try {
      const savedRole = localStorage.getItem('dtf_user_role') as UserRole;
      const savedScreen = localStorage.getItem('dtf_active_screen') as ScreenType;
      if (savedRole && savedScreen) {
        return { role: savedRole, screen: savedScreen };
      }
    } catch {
      // fallback
    }

    return { role: 'customer', screen: 'home' };
  };

  const initialConfig = getInitialRoleAndScreen();

  // Navigation State
  const [activeScreen, setActiveScreenState] = useState<ScreenType>(initialConfig.screen);
  const [selectedProductId, setSelectedProductId] = useState<string | null>('prod_tshirt');
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>('design_astronaut');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>('ord_1001');

  // Customizer scratchpad
  const [customizerProduct, setCustomizerProduct] = useState<Product | null>(INITIAL_PRODUCTS[0]);
  const [customizerDesign, setCustomizerDesign] = useState<Design | null>(INITIAL_DESIGNS[0]);
  const [customizerArtworkUrl, setCustomizerArtworkUrl] = useState<string | null>(null);

  // Role & i18n
  const [userRole, setUserRoleState] = useState<UserRole>(initialConfig.role);
  const [language, setLanguage] = useState<Language>('en');

  // Admin Designer Preview Testing State
  const [isAdminPreviewingAsDesigner, setIsAdminPreviewingAsDesigner] = useState<boolean>(false);
  const [previewDesignerId, setPreviewDesignerId] = useState<string | null>(null);

  const startAdminDesignerPreview = (designerId?: string) => {
    setIsAdminPreviewingAsDesigner(true);
    setPreviewDesignerId(designerId || 'designer_1');
    setUserRoleState('designer');
    setActiveScreenState('designer_dashboard');
    try {
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '?portal=designer&preview=true');
      }
    } catch {
      // ignore
    }
  };

  const exitAdminDesignerPreview = () => {
    setIsAdminPreviewingAsDesigner(false);
    setPreviewDesignerId(null);
    setUserRoleState('admin');
    setActiveScreenState('admin_dashboard');
    try {
      localStorage.setItem('dtf_user_role', 'admin');
      localStorage.setItem('dtf_active_screen', 'admin_dashboard');
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '?portal=admin');
      }
    } catch {
      // ignore
    }
  };

  // Direct Portal Modal
  const [isDirectPortalModalOpen, setIsDirectPortalModalOpen] = useState<boolean>(false);
  const [isDesignerRegistrationModalOpen, setIsDesignerRegistrationModalOpen] = useState<boolean>(false);

  // Wrapper for setActiveScreen that persists and updates URL hash for seamless bookmarking
  const setActiveScreen = (screen: ScreenType) => {
    setActiveScreenState(screen);
    try {
      localStorage.setItem('dtf_active_screen', screen);
      if (typeof window !== 'undefined') {
        if (screen === 'designer_dashboard') {
          window.history.replaceState(null, '', '?portal=designer');
        } else if (screen === 'admin_dashboard') {
          window.history.replaceState(null, '', '?portal=admin');
        } else if (screen === 'customizer' || screen === 'customize') {
          window.history.replaceState(null, '', '?portal=customizer');
        } else if (screen === 'home') {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    } catch {
      // ignore
    }
  };

  const setUserRole = (role: UserRole) => {
    setUserRoleState(role);
    try {
      localStorage.setItem('dtf_user_role', role);
    } catch {
      // ignore
    }
  };

  // Direct login helpers
  const loginAsDesigner = () => {
    setUserRole('designer');
    setActiveScreen('designer_dashboard');
    setIsDirectPortalModalOpen(false);
  };

  const loginAsAdmin = () => {
    setUserRole('admin');
    setActiveScreen('admin_dashboard');
    setIsDirectPortalModalOpen(false);
  };

  const loginAsCustomer = () => {
    setUserRole('customer');
    setActiveScreen('home');
    setIsDirectPortalModalOpen(false);
  };

  const getDirectPortalUrl = (portal: 'designer' | 'admin' | 'customizer' | 'shop') => {
    if (typeof window !== 'undefined') {
      const base = window.location.origin + window.location.pathname;
      return `${base}?portal=${portal}`;
    }
    return `https://dtfstudio.app/?portal=${portal}`;
  };

  // Persistent Collections with LocalStorage hydration
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('dtf_products');
      if (saved) {
        const parsed: Product[] = JSON.parse(saved);
        return parsed.map((p) => {
          const init = INITIAL_PRODUCTS.find((ip) => ip.id === p.id);
          return init ? { ...p, images: init.images } : p;
        });
      }
      return INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [designs, setDesigns] = useState<Design[]>(() => {
    try {
      const saved = localStorage.getItem('dtf_designs');
      if (saved) {
        const parsed: Design[] = JSON.parse(saved);
        return parsed.map((d) => {
          const init = INITIAL_DESIGNS.find((id) => id.id === d.id);
          return init ? { ...d, imageUrl: init.imageUrl } : d;
        });
      }
      return INITIAL_DESIGNS;
    } catch {
      return INITIAL_DESIGNS;
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('dtf_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((ord: any) => ({
            ...ord,
            total: ord.total ?? ord.totalAmount ?? 0,
            totalAmount: ord.totalAmount ?? ord.total ?? 0,
            subtotal: ord.subtotal ?? 0,
            deliveryFee: ord.deliveryFee ?? 0,
          }));
        }
      }
      return INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  const [designerProfile, setDesignerProfile] = useState<DesignerProfile>(() => {
    try {
      const saved = localStorage.getItem('dtf_designer_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        const withdrawable = parsed.withdrawableBalance ?? parsed.balance ?? INITIAL_DESIGNER_PROFILE.withdrawableBalance;
        const totalEarn = parsed.totalEarnings ?? parsed.totalEarned ?? INITIAL_DESIGNER_PROFILE.totalEarnings;
        const totalSold = parsed.totalSoldOrUsed ?? parsed.salesCount ?? INITIAL_DESIGNER_PROFILE.totalSoldOrUsed;
        return {
          ...INITIAL_DESIGNER_PROFILE,
          ...parsed,
          withdrawableBalance: withdrawable,
          balance: withdrawable,
          totalEarnings: totalEarn,
          totalEarned: totalEarn,
          totalSoldOrUsed: totalSold,
          salesCount: totalSold,
        };
      }
      return INITIAL_DESIGNER_PROFILE;
    } catch {
      return INITIAL_DESIGNER_PROFILE;
    }
  });

  const [designers, setDesigners] = useState<DesignerProfile[]>(() => {
    try {
      const saved = localStorage.getItem('dtf_designers');
      if (saved) {
        return JSON.parse(saved);
      }
      return INITIAL_DESIGNERS;
    } catch {
      return INITIAL_DESIGNERS;
    }
  });

  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(() => {
    try {
      const saved = localStorage.getItem('dtf_settings');
      return saved ? JSON.parse(saved) : INITIAL_BUSINESS_SETTINGS;
    } catch {
      return INITIAL_BUSINESS_SETTINGS;
    }
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('dtf_notifications');
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('dtf_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('dtf_categories');
      return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
    } catch {
      return INITIAL_CATEGORIES;
    }
  });

  const [customers, setCustomers] = useState<CustomerRecord[]>(() => {
    try {
      const saved = localStorage.getItem('dtf_customers');
      return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
    } catch {
      return INITIAL_CUSTOMERS;
    }
  });

  const [coupons, setCoupons] = useState<CouponCode[]>(() => {
    try {
      const saved = localStorage.getItem('dtf_coupons');
      return saved ? JSON.parse(saved) : INITIAL_COUPONS;
    } catch {
      return INITIAL_COUPONS;
    }
  });

  // Sync with central backend database
  useEffect(() => {
    const fetchServerData = async () => {
      try {
        const [prodRes, desRes, ordRes, setRes, profRes] = await Promise.allSettled([
          fetch('/api/products').then(r => r.ok ? r.json() : null),
          fetch('/api/designs').then(r => r.ok ? r.json() : null),
          fetch('/api/orders', { headers: { 'x-role': userRole } }).then(r => r.ok ? r.json() : null),
          fetch('/api/settings').then(r => r.ok ? r.json() : null),
          fetch('/api/designer/profile', { headers: { 'x-role': 'designer' } }).then(r => r.ok ? r.json() : null),
        ]);

        if (prodRes.status === 'fulfilled' && prodRes.value?.products) {
          setProducts(prodRes.value.products);
        }
        if (desRes.status === 'fulfilled' && desRes.value?.designs) {
          setDesigns(desRes.value.designs);
        }
        if (ordRes.status === 'fulfilled' && ordRes.value?.orders) {
          setOrders(ordRes.value.orders);
        }
        if (setRes.status === 'fulfilled' && setRes.value?.settings) {
          setBusinessSettings(setRes.value.settings);
        }
        if (profRes.status === 'fulfilled' && profRes.value?.profile) {
          setDesignerProfile(profRes.value.profile);
        }
      } catch (err) {
        console.warn('Backend sync note: running with local cached state fallback.');
      }
    };

    fetchServerData();
  }, [userRole]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('dtf_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('dtf_designs', JSON.stringify(designs));
  }, [designs]);

  useEffect(() => {
    localStorage.setItem('dtf_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('dtf_designer_profile', JSON.stringify(designerProfile));
  }, [designerProfile]);

  useEffect(() => {
    localStorage.setItem('dtf_designers', JSON.stringify(designers));
  }, [designers]);

  useEffect(() => {
    localStorage.setItem('dtf_settings', JSON.stringify(businessSettings));
  }, [businessSettings]);

  useEffect(() => {
    localStorage.setItem('dtf_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('dtf_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('dtf_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('dtf_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('dtf_coupons', JSON.stringify(coupons));
  }, [coupons]);

  // Dynamic Translations State & Sync
  const [siteTranslations, setSiteTranslations] = useState<typeof translations>(() => {
    try {
      const saved = localStorage.getItem('dtf_site_translations');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          en: { ...translations.en, ...(parsed.en || {}) },
          ar: { ...translations.ar, ...(parsed.ar || {}) },
        };
      }
      return translations;
    } catch {
      return translations;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('dtf_site_translations', JSON.stringify(siteTranslations));
    } catch {
      // ignore
    }
  }, [siteTranslations]);

  const updateTranslation = (lang: Language, key: string, value: string) => {
    setSiteTranslations(prev => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [key]: value,
      },
    }));
  };

  const updateTranslationsBatch = (newTranslations: typeof translations) => {
    setSiteTranslations(newTranslations);
  };

  const addNewTranslationKey = (key: string, enVal: string, arVal: string) => {
    setSiteTranslations(prev => ({
      en: { ...prev.en, [key]: enVal },
      ar: { ...prev.ar, [key]: arVal },
    }));
  };

  const resetTranslations = () => {
    setSiteTranslations(translations);
    try {
      localStorage.removeItem('dtf_site_translations');
    } catch {
      // ignore
    }
  };

  // Handle Document Direction
  const isRtl = language === 'ar';
  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [isRtl, language]);

  // Dynamic Translation helper
  const t = (key: string): string => {
    const dict = siteTranslations[language] || siteTranslations.en;
    const fallbackDict = siteTranslations.en;
    return dict[key] || fallbackDict[key] || translations[language]?.[key] || translations.en?.[key] || key;
  };

  // Start customizer helper
  const startCustomizer = (product: Product, design?: Design | null, artworkUrl?: string | null) => {
    setCustomizerProduct(product);
    const chosenDesign = design !== undefined ? design : (product.defaultDesignId ? designs.find(d => d.id === product.defaultDesignId) || null : null);
    setCustomizerDesign(chosenDesign);
    setCustomizerArtworkUrl(artworkUrl || null);
    setSelectedProductId(product.id);
    if (chosenDesign) {
      setSelectedDesignId(chosenDesign.id);
    }
    setActiveScreen('customizer');
  };

  // Cart operations
  const addToCart = (itemData: Omit<CartItem, 'id' | 'timestamp'>) => {
    const newItem: CartItem = {
      ...itemData,
      id: `cart_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };
    setCart(prev => [newItem, ...prev]);

    // Add customer notification
    const newNotif: AppNotification = {
      id: `notif_${Date.now()}`,
      targetRole: 'customer',
      title: 'Item added to Cart',
      titleAr: 'تمت إضافة المنتج للسلة',
      message: `${newItem.productName} with custom print specs is ready in your cart.`,
      messageAr: `تمت إضافة ${newItem.productName} مع مواصفات الطباعة للسلة.`,
      type: 'order',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
  };

  const updateCartQuantity = (cartItemId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart(prev => prev.map(item => (item.id === cartItemId ? { ...item, quantity: qty } : item)));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  // Orders creation and life-cycle
  const createOrder = ({
    customerInfo,
    paymentMethod,
    deliveryType,
  }: {
    customerInfo: OrderCustomerInfo;
    paymentMethod: PaymentMethod;
    deliveryType: DeliveryType;
  }): Order => {
    const subtotal = cartTotal;
    const deliveryFee = deliveryType === 'store_pickup' ? 0 : subtotal >= businessSettings.freeDeliveryThreshold ? 0 : businessSettings.standardDeliveryFee;
    const total = subtotal + deliveryFee;

    const reservationExpiresAt = paymentMethod === 'bank_transfer'
      ? new Date(Date.now() + businessSettings.bankTransferReservationMinutes * 60 * 1000).toISOString()
      : undefined;

    // Process items and snapshot designer commission at time of order creation
    const processedItems: CartItem[] = cart.map(item => {
      if (item.design) {
        const isOwner = Boolean(
          item.design.isOwnerDesign ||
          item.design.designerId === 'owner_inhouse' ||
          item.design.designerId === 'owner' ||
          item.design.designerName?.toLowerCase().includes('in-house') ||
          item.design.designerName?.toLowerCase().includes('dtf studio creative')
        );

        if (isOwner) {
          return {
            ...item,
            designerId: 'owner_inhouse',
            designerName: 'DTF Studio Creative Lab (In-House)',
            isOwnerDesign: true,
            appliedRoyaltyType: 'fixed' as const,
            appliedRoyaltyRate: 0.00,
            royaltyPerUnit: 0.00,
            totalRoyaltyAmount: 0.00,
          };
        } else {
          const desId = item.design.designerId || 'designer_1';
          const targetDesigner = designers.find(d => d.id === desId) || (designerProfile.id === desId ? designerProfile : null);
          const commissionType = targetDesigner?.commissionType || item.design.royaltyType || 'fixed';
          const commissionRate = targetDesigner?.commissionRate ?? item.design.royaltyRate ?? businessSettings.defaultDesignerFlatRoyalty ?? 0.50;

          const royaltyPerUnit = commissionType === 'fixed'
            ? Number(commissionRate)
            : Number(((item.unitPrice * commissionRate) / 100).toFixed(3));
          const totalRoyalty = Number((royaltyPerUnit * item.quantity).toFixed(3));

          return {
            ...item,
            designerId: desId,
            designerName: targetDesigner?.name || item.design.designerName || 'Designer',
            isOwnerDesign: false,
            appliedRoyaltyType: commissionType,
            appliedRoyaltyRate: commissionRate,
            royaltyPerUnit,
            totalRoyaltyAmount: totalRoyalty,
          };
        }
      }
      return item;
    });

    const newOrder: Order = {
      id: `ord_${Date.now()}`,
      orderNumber: `#DTF-${Math.floor(100000 + Math.random() * 900000)}`,
      customerId: 'cust_current',
      customerInfo,
      items: processedItems,
      subtotal,
      deliveryFee,
      total,
      totalAmount: total,
      currency: businessSettings.currency,
      paymentMethod,
      paymentStatus: paymentMethod === 'bank_transfer' ? 'pending' : 'paid',
      deliveryType,
      status: paymentMethod === 'bank_transfer' ? 'payment_pending' : 'payment_confirmed',
      statusHistory: [
        {
          status: paymentMethod === 'bank_transfer' ? 'payment_pending' : 'payment_confirmed',
          timestamp: new Date().toISOString(),
          note: paymentMethod === 'bank_transfer'
            ? 'Order reserved awaiting bank/CliQ transfer'
            : 'Order received and payment authorized',
        },
      ],
      createdAt: new Date().toISOString(),
      reservationExpiresAt,
    };

    // Deduct stock for all items
    setProducts(prevProducts =>
      prevProducts.map(prod => {
        const orderItem = cart.find(ci => ci.productId === prod.id);
        if (orderItem) {
          return {
            ...prod,
            stock: Math.max(0, prod.stock - orderItem.quantity),
          };
        }
        return prod;
      })
    );

    // Update Designer Earnings based on snapshotted commission
    processedItems.forEach(item => {
      if (!item.isOwnerDesign && item.designerId && item.totalRoyaltyAmount && item.totalRoyaltyAmount > 0) {
        const royaltyAmount = item.totalRoyaltyAmount;
        const targetDesignerId = item.designerId;

        // Credit designer in designers collection
        setDesigners(prevDesigners =>
          prevDesigners.map(d =>
            d.id === targetDesignerId
              ? {
                  ...d,
                  totalSoldOrUsed: (d.totalSoldOrUsed || 0) + item.quantity,
                  totalEarnings: Number(((d.totalEarnings || 0) + royaltyAmount).toFixed(3)),
                  withdrawableBalance: Number(((d.withdrawableBalance || 0) + royaltyAmount).toFixed(3)),
                  balance: Number(((d.withdrawableBalance || 0) + royaltyAmount).toFixed(3)),
                  totalEarned: Number(((d.totalEarnings || 0) + royaltyAmount).toFixed(3)),
                  salesCount: (d.totalSoldOrUsed || 0) + item.quantity,
                }
              : d
          )
        );

        // Credit active designerProfile if it matches
        if (designerProfile.id === targetDesignerId) {
          setDesignerProfile(prev => ({
            ...prev,
            totalSoldOrUsed: prev.totalSoldOrUsed + item.quantity,
            totalEarnings: Number((prev.totalEarnings + royaltyAmount).toFixed(3)),
            withdrawableBalance: Number((prev.withdrawableBalance + royaltyAmount).toFixed(3)),
            balance: Number((prev.withdrawableBalance + royaltyAmount).toFixed(3)),
            totalEarned: Number((prev.totalEarnings + royaltyAmount).toFixed(3)),
            salesCount: prev.totalSoldOrUsed + item.quantity,
          }));
        }

        // Increment design sold count
        if (item.design?.id) {
          setDesigns(prevDesigns =>
            prevDesigns.map(d =>
              d.id === item.design?.id
                ? { ...d, soldCount: (d.soldCount || 0) + item.quantity, usedCount: (d.usedCount || 0) + item.quantity }
                : d
            )
          );
        }

        // Send notification to designer
        const designerNotif: AppNotification = {
          id: `notif_royalty_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          targetRole: 'designer',
          title: '🎉 New Royalty Earned!',
          titleAr: '🎉 أرباح جديدة من مبيعات تصميمك!',
          message: `Your artwork "${item.design?.title || 'Design'}" was printed on ${item.productName} (Qty: ${item.quantity}). Preserved royalty earned: +${royaltyAmount.toFixed(2)} ${businessSettings.currency} (${item.appliedRoyaltyType === 'fixed' ? `${item.appliedRoyaltyRate?.toFixed(2)} ${businessSettings.currency}/unit` : `${item.appliedRoyaltyRate}%/unit`}).`,
          messageAr: `تمت طباعة تصميمك "${item.design?.titleAr || item.design?.title || 'تصميم'}" على ${item.productName} (الكمية: ${item.quantity}). قيمة الأرباح المكتسبة: +${royaltyAmount.toFixed(2)} د.أ (${item.appliedRoyaltyType === 'fixed' ? `${item.appliedRoyaltyRate?.toFixed(2)} د.أ لكل قطعة` : `${item.appliedRoyaltyRate}% لكل قطعة`}).`,
          type: 'royalty',
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        setNotifications(prev => [designerNotif, ...prev]);
      }
    });

    // Add Order to database
    setOrders(prev => [newOrder, ...prev]);
    setSelectedOrderId(newOrder.id);
    clearCart();

    // Persist to server API
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-role': userRole },
      body: JSON.stringify({
        customerInfo,
        paymentMethod,
        deliveryType,
        items: cart,
      }),
    }).catch(err => console.warn('Order sync to server failed:', err));

    // Notify Admin of New Order
    const adminNotif: AppNotification = {
      id: `notif_admin_${Date.now()}`,
      targetRole: 'admin',
      title: '📦 New Order Received',
      titleAr: '📦 طلب طباعة جديد',
      message: `Order ${newOrder.orderNumber} for ${total.toFixed(2)} ${businessSettings.currency} (${newOrder.items.length} custom DTF items) is ready for RIP production.`,
      messageAr: `طلب جديد ${newOrder.orderNumber} بقيمة ${total.toFixed(2)} ${businessSettings.currency} جاهز للتجهيز والطباعة.`,
      type: 'order',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [adminNotif, ...prev]);

    return newOrder;
  };

  const updateOrderStatus = (orderId: string, newStatus: OrderStatus, note?: string) => {
    // Send to backend API
    fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-role': 'admin' },
      body: JSON.stringify({ status: newStatus, note }),
    }).catch(err => console.warn('Status sync to server failed:', err));

    setOrders(prevOrders =>
      prevOrders.map(order => {
        if (order.id === orderId) {
          const updatedHistory = [
            ...order.statusHistory,
            {
              status: newStatus,
              timestamp: new Date().toISOString(),
              note: note || `Order status updated to ${newStatus.replace('_', ' ')}`,
            },
          ];

          return {
            ...order,
            status: newStatus,
            statusHistory: updatedHistory,
          };
        }
        return order;
      })
    );

    // Notify customer
    const order = orders.find(o => o.id === orderId);
    if (order) {
      const statusTitles: Record<OrderStatus, { en: string; ar: string }> = {
        new: { en: 'Order Placed', ar: 'تم استلام الطلب' },
        payment_pending: { en: 'Awaiting Bank Payment', ar: 'بانتظار تأكيد التحويل' },
        payment_confirmed: { en: 'Payment Confirmed', ar: 'تم تأكيد الدفع بنجاح' },
        under_preparation: { en: 'DTF Printing in Progress', ar: 'جاري الطباعة والكبس الحراري' },
        ready_for_delivery: { en: 'Order Ready & Packed', ar: 'الطلب جاهز ومغلف' },
        ready_for_delivery_or_pickup: { en: 'Order Ready & Packed', ar: 'الطلب جاهز ومغلف' },
        ready_for_pickup: { en: 'Ready for Store Pickup', ar: 'الطلب جاهز للاستلام من الفرع' },
        given_to_courier: { en: 'Handed to Courier', ar: 'تم تسليم الشحنة لشركة التوصيل' },
        given_to_delivery: { en: 'Handed to Courier', ar: 'تم تسليم الشحنة لشركة التوصيل' },
        under_delivery: { en: 'Out for Delivery', ar: 'الطلب في طريقه إليك' },
        completed: { en: 'Order Delivered', ar: 'تم التوصيل بنجاح' },
        cancelled: { en: 'Order Cancelled', ar: 'تم إلغاء الطلب' },
      };

      const titleObj = statusTitles[newStatus] || { en: 'Order Updated', ar: 'تحديث في حالة الطلب' };

      const custNotif: AppNotification = {
        id: `notif_cust_${Date.now()}`,
        targetRole: 'customer',
        title: titleObj.en,
        titleAr: titleObj.ar,
        message: `Order ${order.orderNumber} is now ${newStatus.replace('_', ' ')}.`,
        messageAr: `طلبك ${order.orderNumber} أصبح الآن بحالة: ${titleObj.ar}.`,
        type: 'order',
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications(prev => [custNotif, ...prev]);
    }
  };

  const confirmPaymentReceived = (orderId: string) => {
    setOrders(prevOrders =>
      prevOrders.map(order => {
        if (order.id === orderId) {
          return {
            ...order,
            paymentStatus: 'paid',
            status: 'payment_confirmed',
            statusHistory: [
              ...order.statusHistory,
              {
                status: 'payment_confirmed',
                timestamp: new Date().toISOString(),
                note: 'Bank/CliQ transfer verified by store accountant. Printing queue activated.',
              },
            ],
          };
        }
        return order;
      })
    );

    const targetOrder = orders.find(o => o.id === orderId);
    if (targetOrder) {
      const confirmNotif: AppNotification = {
        id: `notif_paid_${Date.now()}`,
        targetRole: 'customer',
        title: 'Payment Confirmed! 🚀',
        titleAr: 'تم تأكيد الدفع بنجاح! 🚀',
        message: `Your payment for order ${targetOrder.orderNumber} is confirmed. Your high-definition DTF print is being prepared.`,
        messageAr: `تم التحقق من دفعتك للطلب ${targetOrder.orderNumber}. تم تحويل طلبك لخط الطباعة المباشرة.`,
        type: 'payment',
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications(prev => [confirmNotif, ...prev]);
    }
  };

  const cancelOrder = (orderId: string, reason: string) => {
    const orderToCancel = orders.find(o => o.id === orderId);
    if (!orderToCancel) return;

    // Restore inventory stock
    setProducts(prevProducts =>
      prevProducts.map(prod => {
        const item = orderToCancel.items.find(ci => ci.productId === prod.id);
        if (item) {
          return {
            ...prod,
            stock: prod.stock + item.quantity,
          };
        }
        return prod;
      })
    );

    setOrders(prevOrders =>
      prevOrders.map(o =>
        o.id === orderId
          ? {
              ...o,
              status: 'cancelled',
              cancellationReason: reason,
              statusHistory: [
                ...o.statusHistory,
                {
                  status: 'cancelled',
                  timestamp: new Date().toISOString(),
                  note: `Order cancelled: ${reason}. Stock returned to inventory.`,
                },
              ],
            }
          : o
      )
    );
  };

  // Designer Upload & Management
  const uploadNewDesign = (newDesignData: Omit<Design, 'id' | 'soldCount' | 'usedCount' | 'createdAt'>): Design => {
    const newDesign: Design = {
      ...newDesignData,
      id: `design_${Date.now()}`,
      soldCount: 0,
      usedCount: 0,
      status: 'pending_review',
      createdAt: new Date().toISOString(),
      pricePerUnit: newDesignData.royaltyRate,
    };

    setDesigns(prev => [newDesign, ...prev]);
    setDesignerProfile(prev => ({
      ...prev,
      totalDesignsCount: prev.totalDesignsCount + 1,
    }));

    // Notify Admin of pending artwork review
    const reviewNotif: AppNotification = {
      id: `notif_design_review_${Date.now()}`,
      targetRole: 'admin',
      title: '🎨 New Designer Artwork Uploaded',
      titleAr: '🎨 عمل فني جديد بانتظار الاعتماد',
      message: `Designer "${designerProfile.name}" submitted "${newDesign.title}". Inspect transparency, 300 DPI, and approve for gallery.`,
      messageAr: `المصمم "${designerProfile.name}" أرسل تصميماً جديداً "${newDesign.titleAr || newDesign.title}" للمراجعة.`,
      type: 'system',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [reviewNotif, ...prev]);

    return newDesign;
  };

  const requestWithdrawal = (amount: number, method: string, details: string): boolean => {
    if (amount <= 0 || amount > designerProfile.withdrawableBalance) {
      return false;
    }

    setDesignerProfile(prev => ({
      ...prev,
      withdrawableBalance: prev.withdrawableBalance - amount,
      balance: prev.withdrawableBalance - amount,
      pendingWithdrawals: prev.pendingWithdrawals + amount,
    }));

    // Post to server API
    fetch('/api/designer/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-role': 'designer' },
      body: JSON.stringify({ amount, method, cliqAlias: details, iban: details }),
    }).catch(err => console.warn('Withdrawal sync to server failed:', err));

    const withdrawNotif: AppNotification = {
      id: `notif_withdraw_${Date.now()}`,
      targetRole: 'admin',
      title: '💸 Designer Payout Request',
      titleAr: '💸 طلب سحب أرباح مصمم',
      message: `${designerProfile.name} requested payout of ${amount.toFixed(2)} ${businessSettings.currency} via ${method} (${details}).`,
      messageAr: `طلب المصمم ${designerProfile.name} سحب ${amount.toFixed(2)} ${businessSettings.currency} عبر ${method}.`,
      type: 'payout',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [withdrawNotif, ...prev]);

    return true;
  };

  const updateDesignStatus = (designId: string, status: Design['status']) => {
    setDesigns(prev => prev.map(d => (d.id === designId ? { ...d, status } : d)));
  };

  const setDesignReadyToPrintMaster = (designId: string, assetIdOrFileName: string) => {
    setDesigns(prev =>
      prev.map(design => {
        if (design.id !== designId) return design;

        // 1. Update supportingFiles
        const updatedSupportingFiles = (design.supportingFiles || []).map(sf => ({
          ...sf,
          isReadyToPrint: sf.id === assetIdOrFileName || sf.name === assetIdOrFileName || sf.url === assetIdOrFileName,
        }));

        // 2. Update assets collection if present
        const updatedAssets = (design.assets || []).map(asset => ({
          ...asset,
          isReadyToPrintMaster: asset.id === assetIdOrFileName || asset.name === assetIdOrFileName || asset.url === assetIdOrFileName,
          assetType: (asset.id === assetIdOrFileName || asset.name === assetIdOrFileName || asset.url === assetIdOrFileName)
            ? ('ready_to_print_master' as const)
            : asset.assetType === 'ready_to_print_master' ? ('source_file' as const) : asset.assetType,
        }));

        // 3. Find matching file
        const matchedFile = (design.supportingFiles || []).find(
          sf => sf.id === assetIdOrFileName || sf.name === assetIdOrFileName || sf.url === assetIdOrFileName
        );

        const updatedReadyToPrintFile = matchedFile
          ? {
              ...(design.readyToPrintFile || {
                widthPx: 3600,
                heightPx: 4500,
                dpi: 300,
                hasTransparency: true,
                targetPhysicalWidthCm: 30.0,
                targetPhysicalHeightCm: 38.0,
                edgeClarityScore: 98,
                pixelationRisk: 'none' as const,
                dtfSuitabilityPass: true,
              }),
              url: matchedFile.url,
              fileName: matchedFile.name,
              format: 'png' as const,
            }
          : design.readyToPrintFile;

        return {
          ...design,
          supportingFiles: updatedSupportingFiles,
          assets: updatedAssets,
          readyToPrintFile: updatedReadyToPrintFile,
        };
      })
    );
  };

  // Automatic Designer Registration & 3-Sample DTF Quality Qualification
  const registerAndQualifyDesigner = (params: {
    name: string;
    email: string;
    phone: string;
    bio?: string;
    bioAr?: string;
    cliqAlias?: string;
    iban?: string;
    sampleDesigns: Array<{
      title: string;
      titleAr?: string;
      category?: string;
      imageUrl: string;
      readyToPrintFileName?: string;
      widthPx: number;
      heightPx: number;
      dpi: number;
      hasTransparency: boolean;
      targetWidthCm: number;
      targetHeightCm: number;
    }>;
  }) => {
    // 1. Strict Count Validation: MUST be exactly 3 sample designs
    if (!params.sampleDesigns || params.sampleDesigns.length !== 3) {
      return {
        success: false,
        profile: designerProfile,
        errors: [`Qualification requires exactly 3 sample designs. Provided: ${params.sampleDesigns?.length || 0}/3.`],
        errorsAr: [`يتطلب التأهيل 3 تصاميم تجريبية بالضبط. المقدم: ${params.sampleDesigns?.length || 0}/3.`],
      };
    }

    // 2. Automated Print-Preflight Criteria Check on each sample using numeric engine
    const inspections = params.sampleDesigns.map((sample, idx) => {
      const evaluation = evaluatePrintPreflight({
        fileName: sample.readyToPrintFileName || `sample_${idx + 1}_ready.png`,
        format: 'png',
        url: sample.imageUrl,
        widthPx: sample.widthPx,
        heightPx: sample.heightPx,
        dpiMetadata: sample.dpi,
        hasTransparency: sample.hasTransparency,
        targetWidthCm: sample.targetWidthCm,
        targetHeightCm: sample.targetHeightCm,
        isReadyToPrintMaster: true,
        assetType: 'ready_to_print_master',
      });

      return {
        id: `insp_${Date.now()}_${idx}`,
        title: sample.title,
        titleAr: sample.titleAr || sample.title,
        readyToPrintFileName: sample.readyToPrintFileName || `sample_${idx + 1}_ready.png`,
        previewUrl: sample.imageUrl,
        readyToPrintUrl: sample.imageUrl,
        dpi: sample.dpi,
        effectiveDpi: evaluation.effectiveDpi,
        requiredDpi: evaluation.requiredDpi,
        widthPx: sample.widthPx,
        heightPx: sample.heightPx,
        requiredWidthPx: evaluation.requiredWidthPx,
        requiredHeightPx: evaluation.requiredHeightPx,
        hasTransparency: sample.hasTransparency,
        targetWidthCm: sample.targetWidthCm,
        targetHeightCm: sample.targetHeightCm,
        passedQuality: evaluation.passed,
        score: evaluation.score,
        failedReasonsEn: evaluation.failedReasonsEn,
        failedReasonsAr: evaluation.failedReasonsAr,
        rejectionReason: evaluation.rejectionReason,
        rejectionReasonAr: evaluation.rejectionReasonAr,
        notes: evaluation.notesEn,
        notesAr: evaluation.notesAr,
      };
    });

    const allPassed = inspections.length === 3 && inspections.every(i => i.passedQuality);

    if (!allPassed) {
      const failedSamples = inspections.filter(i => !i.passedQuality);
      const errorSummaries = failedSamples.map(f => `Sample "${f.title}": ${f.rejectionReason}`);
      const errorSummariesAr = failedSamples.map(f => `التصميم "${f.titleAr}": ${f.rejectionReasonAr}`);

      return {
        success: false,
        profile: designerProfile,
        inspections,
        errors: errorSummaries,
        errorsAr: errorSummariesAr,
      };
    }

    const newDesignerId = `designer_${Date.now()}`;
    const newProfile: DesignerProfile = {
      id: newDesignerId,
      name: params.name,
      email: params.email,
      phone: params.phone,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      bio: params.bio || 'Independent DTF Master Creator',
      bioAr: params.bioAr || 'مصمم مستقل معتمد في منصة DTF Studio',
      country: 'Jordan',
      status: 'approved',
      applicationDate: new Date().toISOString(),
      autoApprovedAt: new Date().toISOString(),
      commissionType: 'fixed',
      commissionRate: businessSettings.defaultDesignerFlatRoyalty || 0.50, // default 0.50 JOD
      sampleDesigns: params.sampleDesigns.map(s => s.imageUrl),
      sampleInspections: inspections,
      totalDesignsCount: params.sampleDesigns.length,
      totalSoldOrUsed: 0,
      totalEarnings: 0,
      withdrawableBalance: 0,
      pendingEarnings: 0,
      pendingWithdrawals: 0,
      completedWithdrawals: 0,
      balance: 0,
      totalEarned: 0,
      salesCount: 0,
      payoutDetails: {
        method: 'cliq',
        cliqAlias: params.cliqAlias || params.phone,
        bankName: 'Arab Bank / Bank of Jordan',
        iban: params.iban || '',
        accountHolder: params.name,
      },
    };

    // Publish the 3 qualified sample designs under the unified Design entity + Assets structure
    const newDesigns: Design[] = params.sampleDesigns.map((sample, idx) => {
      const designEntityId = `design_${newDesignerId}_sample_${idx + 1}`;
      const masterAssetId = `ast_${designEntityId}_master`;
      const inspection = inspections[idx];

      return {
        id: designEntityId,
        title: sample.title,
        titleAr: sample.titleAr || sample.title,
        description: `Original qualification artwork by ${params.name}`,
        descriptionAr: `عمل فني مؤهل أصلي من إبداع ${params.name}`,
        designerId: newDesignerId,
        designerName: params.name,
        designerAvatar: newProfile.avatar,
        imageUrl: sample.imageUrl,
        presentationPhotos: [sample.imageUrl],
        supportingFiles: [
          { id: `sf_${designEntityId}_png`, name: sample.readyToPrintFileName || `sample_${idx + 1}_master.png`, format: 'png', url: sample.imageUrl, isReadyToPrint: true }
        ],
        assets: [
          {
            id: masterAssetId,
            name: sample.readyToPrintFileName || `sample_${idx + 1}_master.png`,
            assetType: 'ready_to_print_master',
            format: 'png',
            url: sample.imageUrl,
            isReadyToPrintMaster: true,
            sizeBytes: 4500000,
            sizeFormatted: '4.5 MB',
            uploadedAt: new Date().toISOString(),
            preflightResult: {
              passed: inspection.passedQuality,
              dpi: sample.dpi,
              effectiveDpi: inspection.effectiveDpi,
              requiredDpi: inspection.requiredDpi,
              widthPx: sample.widthPx,
              heightPx: sample.heightPx,
              requiredWidthPx: inspection.requiredWidthPx,
              requiredHeightPx: inspection.requiredHeightPx,
              hasTransparency: sample.hasTransparency,
              targetWidthCm: sample.targetWidthCm,
              targetHeightCm: sample.targetHeightCm,
              score: inspection.score,
              notesEn: inspection.notes,
              notesAr: inspection.notesAr || '',
              rejectionReasons: inspection.failedReasonsEn,
              rejectionReasonsAr: inspection.failedReasonsAr,
            }
          },
          {
            id: `ast_${designEntityId}_pres`,
            name: `presentation_preview.jpg`,
            assetType: 'presentation_image',
            format: 'jpg',
            url: sample.imageUrl,
            isReadyToPrintMaster: false,
            sizeBytes: 850000,
            uploadedAt: new Date().toISOString(),
          }
        ],
        readyToPrintFile: {
          url: sample.imageUrl,
          fileName: sample.readyToPrintFileName || `sample_${idx + 1}_ready.png`,
          format: 'png',
          widthPx: sample.widthPx,
          heightPx: sample.heightPx,
          dpi: sample.dpi,
          effectiveDpi: inspection.effectiveDpi,
          requiredWidthPx: inspection.requiredWidthPx,
          requiredHeightPx: inspection.requiredHeightPx,
          hasTransparency: sample.hasTransparency,
          targetPhysicalWidthCm: sample.targetWidthCm,
          targetPhysicalHeightCm: sample.targetHeightCm,
          edgeClarityScore: inspection.score,
          pixelationRisk: 'none',
          dtfSuitabilityPass: inspection.passedQuality,
          inspectionNotes: inspection.notes,
          inspectionNotesAr: inspection.notesAr,
          rejectionReasons: inspection.failedReasonsEn,
          rejectionReasonsAr: inspection.failedReasonsAr,
        },
        fileFormat: 'png',
        category: (sample.category as any) || 'popular',
        tags: ['new', 'original', 'designer', 'qualified'],
        soldCount: 0,
        usedCount: 0,
        royaltyRate: businessSettings.defaultDesignerFlatRoyalty || 0.50,
        pricePerUnit: businessSettings.defaultDesignerFlatRoyalty || 0.50,
        royaltyType: 'fixed',
        status: 'approved',
        createdAt: new Date().toISOString(),
        hasTransparency: sample.hasTransparency,
        resolutionDpi: sample.dpi,
      };
    });

    setDesignerProfile(newProfile);
    setDesigners(prev => [newProfile, ...prev]);
    setDesigns(prev => [...newDesigns, ...prev]);
    setUserRole('designer');
    setActiveScreen('designer_dashboard');
    setIsDesignerRegistrationModalOpen(false);

    const qualifyNotif: AppNotification = {
      id: `notif_qual_${Date.now()}`,
      targetRole: 'designer',
      title: '🎉 Congratulations! You are an Approved DTF Designer',
      titleAr: '🎉 مبروك! تم اعتمادك كمصمم رسمي في DTF Studio',
      message: `All 3 submitted sample designs passed automated 300 DPI transparency inspection. Your royalty rate is set to ${businessSettings.defaultDesignerFlatRoyalty || 0.50} ${businessSettings.currency}/sale.`,
      messageAr: `اجتازت التصاميم الثلاثة الفحص الآلي للمواصفات بنجاح. تم تفعيل نسبة أرباحك بمعدل ${businessSettings.defaultDesignerFlatRoyalty || 0.50} د.أ لكل قطعة تباع.`,
      type: 'system',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [qualifyNotif, ...prev]);

    return {
      success: true,
      profile: newProfile,
      inspections,
    };
  };

  const updateDesignerCommission = (designerId: string, commissionType: 'fixed' | 'percentage', rate: number) => {
    // 1. Update the matching designer in the designers collection independently
    setDesigners(prev => prev.map(d => {
      if (d.id === designerId) {
        return {
          ...d,
          commissionType,
          commissionRate: rate,
        };
      }
      return d;
    }));

    // 2. If the currently loaded active designer profile matches, update its active rate
    setDesignerProfile(prev => {
      if (prev.id === designerId) {
        return {
          ...prev,
          commissionType,
          commissionRate: rate,
        };
      }
      return prev;
    });

    // 3. Historical orders and previous earnings remain strictly untouched and immutable.
    // Notify the designer
    const commNotif: AppNotification = {
      id: `notif_comm_${Date.now()}`,
      targetRole: 'designer',
      title: '💼 Designer Commission Updated',
      titleAr: '💼 تم تحديث نسبة أرباحك',
      message: `Owner updated commission structure to: ${commissionType === 'fixed' ? `${rate.toFixed(2)} ${businessSettings.currency} per unit` : `${rate}% per unit`}. Note: Completed past orders preserve their original rate.`,
      messageAr: `قام مالك المتجر بتحديث هيكل عمولتك إلى: ${commissionType === 'fixed' ? `${rate.toFixed(2)} د.أ لكل مبيعة` : `${rate}% من قيمة الطلب`}. الطلبات السابقة المكتملة تحتفظ بعمولتها الأصلية.`,
      type: 'payout',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [commNotif, ...prev]);
  };

  // Admin Actions
  const approveDesignerApplication = (designerId: string) => {
    setDesignerProfile(prev => ({ ...prev, status: 'approved' }));
  };

  const rejectDesignerApplication = (designerId: string) => {
    setDesignerProfile(prev => ({ ...prev, status: 'rejected' }));
  };

  const markWithdrawalAsPaid = (designerId: string, amount: number) => {
    setDesignerProfile(prev => ({
      ...prev,
      pendingWithdrawals: Math.max(0, prev.pendingWithdrawals - amount),
      completedWithdrawals: prev.completedWithdrawals + amount,
    }));

    const paidNotif: AppNotification = {
      id: `notif_paid_des_${Date.now()}`,
      targetRole: 'designer',
      title: '💰 Payout Transferred!',
      titleAr: '💰 تم تحويل أرباحك بنجاح!',
      message: `Your requested withdrawal of $${amount.toFixed(2)} has been sent via CliQ/Bank transfer.`,
      messageAr: `تم تحويل دفعة الأرباح بمبلغ $${amount.toFixed(2)} لحسابك البنكي / كليك.`,
      type: 'payout',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [paidNotif, ...prev]);
  };

  const updateProductStock = (productId: string, newStock: number) => {
    setProducts(prev => prev.map(p => (p.id === productId ? { ...p, stock: Math.max(0, newStock) } : p)));
  };

  const addCategory = (category: CategoryItem) => {
    setCategories(prev => [...prev, category]);
  };

  const updateCategory = (updated: CategoryItem) => {
    setCategories(prev => prev.map(c => (c.id === updated.id ? updated : c)));
  };

  const deleteCategory = (categoryId: string) => {
    setCategories(prev => prev.filter(c => c.id !== categoryId));
  };

  const addCustomer = (customer: CustomerRecord) => {
    setCustomers(prev => [customer, ...prev]);
  };

  const updateCustomer = (updated: CustomerRecord) => {
    setCustomers(prev => prev.map(c => (c.id === updated.id ? updated : c)));
  };

  const deleteCustomer = (customerId: string) => {
    setCustomers(prev => prev.filter(c => c.id !== customerId));
  };

  const addCoupon = (coupon: CouponCode) => {
    setCoupons(prev => [coupon, ...prev]);
  };

  const updateCoupon = (updated: CouponCode) => {
    setCoupons(prev => prev.map(c => (c.id === updated.id ? updated : c)));
  };

  const deleteCoupon = (couponId: string) => {
    setCoupons(prev => prev.filter(c => c.id !== couponId));
  };

  const deleteOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const addProduct = (newProduct: Product) => {
    setProducts(prev => [newProduct, ...prev]);
  };

  const updateProduct = (updated: Product) => {
    setProducts(prev => prev.map(p => (p.id === updated.id ? updated : p)));
  };

  const deleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const updateBusinessSettings = (newSettings: Partial<BusinessSettings>) => {
    setBusinessSettings(prev => ({ ...prev, ...newSettings }));
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const unreadNotificationsCount = notifications.filter(
    n => n.targetRole === userRole && !n.isRead
  ).length;

  const resetToDemoDefaults = () => {
    setProducts(INITIAL_PRODUCTS);
    setDesigns(INITIAL_DESIGNS);
    setOrders(INITIAL_ORDERS);
    setDesignerProfile(INITIAL_DESIGNER_PROFILE);
    setBusinessSettings(INITIAL_BUSINESS_SETTINGS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setCategories(INITIAL_CATEGORIES);
    setCustomers(INITIAL_CUSTOMERS);
    setCoupons(INITIAL_COUPONS);
    setCart([]);
    localStorage.clear();
  };

  return (
    <AppContext.Provider
      value={{
        activeScreen,
        setActiveScreen,
        selectedProductId,
        setSelectedProductId,
        selectedDesignId,
        setSelectedDesignId,
        selectedOrderId,
        setSelectedOrderId,
        currentOrderId: selectedOrderId,
        setCurrentOrderId: setSelectedOrderId,
        customizerProduct,
        customizerDesign,
        customizerArtworkUrl,
        startCustomizer,
        userRole,
        setUserRole,
        language,
        setLanguage,
        t,
        isRtl,
        formatCurrency: (amt: number) => formatCurrencyUtil(amt, businessSettings.currency, isRtl),
        siteTranslations,
        updateTranslation,
        updateTranslationsBatch,
        addNewTranslationKey,
        resetTranslations,
        isAdminPreviewingAsDesigner,
        previewDesignerId,
        startAdminDesignerPreview,
        exitAdminDesignerPreview,
        setDesignReadyToPrintMaster,
        isDirectPortalModalOpen,
        setIsDirectPortalModalOpen,
        isDesignerRegistrationModalOpen,
        setIsDesignerRegistrationModalOpen,
        loginAsDesigner,
        loginAsAdmin,
        loginAsCustomer,
        getDirectPortalUrl,
        products,
        designs,
        orders,
        designerProfile,
        designers,
        businessSettings,
        notifications,
        cart,
        categories,
        customers,
        coupons,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartCount,
        cartTotal,
        createOrder,
        updateOrderStatus,
        confirmPaymentReceived,
        confirmOrderPayment: confirmPaymentReceived,
        cancelOrder,
        deleteOrder,
        uploadNewDesign,
        addDesignerDesign: uploadNewDesign,
        registerAndQualifyDesigner,
        updateDesignerCommission,
        requestWithdrawal,
        updateDesignStatus,
        addProduct,
        updateProduct,
        deleteProduct,
        updateProductStock,
        addCategory,
        updateCategory,
        deleteCategory,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addCoupon,
        updateCoupon,
        deleteCoupon,
        updateBusinessSettings,
        approveDesignerApplication,
        rejectDesignerApplication,
        markWithdrawalAsPaid,
        markNotificationAsRead,
        unreadNotificationsCount,
        resetToDemoDefaults,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
