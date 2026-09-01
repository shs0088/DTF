import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ChevronLeft, Truck, Store, CreditCard, Building2, Banknote, ShieldCheck, CheckCircle2, AlertCircle, User, LogIn, UserPlus, X, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PaymentMethod, DeliveryType } from '../../types';

export const CheckoutScreen: React.FC = () => {
  const {
    cart,
    cartTotal,
    businessSettings,
    createOrder,
    setActiveScreen,
    setCurrentOrderId,
    formatCurrency,
    t,
    isRtl,
    userRole,
    setUserRole,
  } = useApp();

  const [deliveryType, setDeliveryType] = useState<DeliveryType>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');

  // Customer Contact Fields
  const [name, setName] = useState('Ahmad Al-Khalil');
  const [phone, setPhone] = useState('+962 79 123 4567');
  const [city, setCity] = useState('Amman');
  const [address, setAddress] = useState('7th Circle, Zahran St, Building 14');
  const [notes, setNotes] = useState('Call before arrival please');
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer Authentication state
  const [isCustomerAuthenticated, setIsCustomerAuthenticated] = useState<boolean>(() => {
    try {
      const storedAuth = localStorage.getItem('dtf_customer_authenticated');
      return storedAuth === 'true' || userRole === 'customer';
    } catch {
      return true;
    }
  });

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('ahmad.khalil@example.com');
  const [authPassword, setAuthPassword] = useState('••••••••');
  const [authName, setAuthName] = useState('Ahmad Al-Khalil');
  const [authPhone, setAuthPhone] = useState('+962 79 123 4567');
  const [authError, setAuthError] = useState<string | null>(null);

  const deliveryFee = deliveryType === 'store_pickup' ? 0 : cartTotal >= businessSettings.freeDeliveryThreshold ? 0 : businessSettings.standardDeliveryFee;
  const grandTotal = cartTotal + deliveryFee;

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'register' && (!authName || !authPhone)) {
      setAuthError(isRtl ? 'يرجى إدخال الاسم ورقم الهاتف' : 'Please provide name and phone number');
      return;
    }
    if (!authEmail) {
      setAuthError(isRtl ? 'يرجى إدخال البريد الإلكتروني' : 'Please provide email');
      return;
    }

    setAuthError(null);
    if (authMode === 'register') {
      setName(authName);
      setPhone(authPhone);
    }
    setIsCustomerAuthenticated(true);
    setUserRole('customer');
    try {
      localStorage.setItem('dtf_customer_authenticated', 'true');
    } catch {}
    setShowAuthModal(false);
  };

  const handlePlaceOrder = () => {
    // 1. Authentication check
    if (!isCustomerAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    // 2. Validate fields
    if (!name || !phone) {
      alert(isRtl ? 'يرجى إدخال الاسم ورقم هاتف التواصل' : 'Please provide your name and contact phone number.');
      return;
    }
    if (!agreedTerms) {
      alert(isRtl ? 'يرجى الموافقة على الشروط وسياسة المنتجات المطبوعة حسب الطلب' : 'Please accept the Terms & Conditions and No-Return Policy for custom printed goods.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const order = createOrder({
        customerInfo: {
          name,
          phone,
          city,
          address: deliveryType === 'store_pickup' ? businessSettings.storePickupAddress : address,
          notes,
        },
        paymentMethod,
        deliveryType,
      });

      if (order?.id) {
        setCurrentOrderId(order.id);
      }

      // Blast Confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#0066FF', '#00D2FF', '#FFFFFF', '#3B82F6'],
        });
      } catch {}

      setIsSubmitting(false);
      setActiveScreen('order_tracking');
    }, 600);
  };

  return (
    <div className="flex-1 overflow-y-auto pb-32 text-slate-100 bg-[#05070B] no-scrollbar">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#05070B]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-900">
        <button
          onClick={() => setActiveScreen('cart')}
          className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
        >
          <ChevronLeft className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
        </button>
        <h1 className="text-sm font-bold text-white tracking-wide">{t('checkout')}</h1>
        <div className="w-9" />
      </div>

      <div className="p-4 space-y-4">
        {/* Customer Account Authentication Badge / Quick Sign-In */}
        {!isCustomerAuthenticated ? (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/80 to-slate-900 border border-blue-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">
                    {isRtl ? 'تسجيل الدخول مطلوب لإتمام الطلب' : 'Customer Account Required'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {isRtl ? 'عناصر السلة محفوظة وستبقى معك' : 'Cart items are preserved and safe'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setShowAuthModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-md glow-blue-sm transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isRtl ? 'تسجيل دخول' : 'Login / Register'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="px-3.5 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                ✓
              </div>
              <div>
                <span className="text-[11px] font-bold text-white">{name}</span>
                <span className="text-[10px] text-emerald-400 font-mono ml-2">({phone})</span>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
              {isRtl ? 'حساب موثق' : 'Authenticated'}
            </span>
          </div>
        )}

        {/* 1. Delivery Type Selector */}
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-2">{t('deliveryMethod')}</label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setDeliveryType('delivery')}
              className={`p-3 rounded-2xl border flex flex-col items-center text-center transition-all ${
                deliveryType === 'delivery'
                  ? 'bg-blue-600/15 border-blue-500 text-blue-400 glow-blue-sm'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Truck className="w-5 h-5 mb-1 text-blue-400" />
              <span className="text-xs font-bold text-white">{t('homeDelivery')}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                {formatCurrency(businessSettings.standardDeliveryFee)} ({isRtl ? 'مجاني فوق' : 'Free over'} {formatCurrency(businessSettings.freeDeliveryThreshold)})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDeliveryType('store_pickup')}
              className={`p-3 rounded-2xl border flex flex-col items-center text-center transition-all ${
                deliveryType === 'store_pickup'
                  ? 'bg-blue-600/15 border-blue-500 text-blue-400 glow-blue-sm'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Store className="w-5 h-5 mb-1 text-cyan-400" />
              <span className="text-xs font-bold text-white">{t('storePickup')}</span>
              <span className="text-[10px] text-emerald-400 mt-0.5 font-semibold">Free Pickup</span>
            </button>
          </div>
        </div>

        {/* 2. Customer Contact Information */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/90 space-y-2.5">
          <h2 className="text-xs font-bold text-white">{t('contactInformation')}</h2>

          <div>
            <label className="text-[10px] font-medium text-slate-400 block mb-1">{t('fullName')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-medium text-slate-400 block mb-1">{t('phoneNumber')}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-blue-500"
            />
          </div>

          {deliveryType === 'delivery' ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-slate-400 block mb-1">{t('city')}</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-400 block mb-1">Building / Apt</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
              <span className="font-bold text-blue-400">Pickup Address:</span> {businessSettings.storePickupAddress}
            </div>
          )}
        </div>

        {/* 3. Payment Method Selection (Bank Transfer vs POD vs Card) */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/90 space-y-2.5">
          <h2 className="text-xs font-bold text-white">{t('paymentMethod')}</h2>

          {/* Option A: Bank Transfer / CliQ */}
          <div
            onClick={() => setPaymentMethod('bank_transfer')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              paymentMethod === 'bank_transfer'
                ? 'bg-blue-600/15 border-blue-500 text-white glow-blue-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold">{t('bankTransfer')}</span>
              </div>
              <span className="text-[10px] text-amber-400 font-semibold px-2 py-0.5 bg-amber-500/10 rounded-full border border-amber-500/30">
                {businessSettings.bankTransferReservationMinutes}m Stock Hold
              </span>
            </div>
            {paymentMethod === 'bank_transfer' && (
              <div className="mt-2 text-[10px] text-slate-300 space-y-1 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <p><strong>Bank:</strong> {businessSettings.bankDetails.bankName}</p>
                <p><strong>CliQ Alias:</strong> <span className="font-mono text-cyan-300 font-bold">{businessSettings.bankDetails.cliqAlias}</span></p>
                <p><strong>Account:</strong> {businessSettings.bankDetails.accountName}</p>
                <p><strong>IBAN:</strong> <span className="font-mono text-slate-300">{businessSettings.bankDetails.iban}</span></p>
              </div>
            )}
          </div>

          {/* Option B: Payment On Delivery (POD) */}
          <div
            onClick={() => setPaymentMethod('cash_on_delivery')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              paymentMethod === 'cash_on_delivery'
                ? 'bg-blue-600/15 border-blue-500 text-white glow-blue-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold">{t('cashOnDelivery')}</span>
              </div>
              <span className="text-[10px] text-slate-400">Pay upon receipt</span>
            </div>
          </div>

          {/* Option C: Credit Card (Preparation) */}
          <div
            onClick={() => setPaymentMethod('card_online')}
            className={`p-3 rounded-xl border cursor-pointer transition-all opacity-60 ${
              paymentMethod === 'card_online'
                ? 'bg-blue-600/15 border-blue-500 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold">{t('creditCard')}</span>
              </div>
              <span className="text-[10px] text-purple-400">Visa / MC</span>
            </div>
          </div>
        </div>

        {/* 4. Terms & No-Return Agreement */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
          <input
            type="checkbox"
            id="terms"
            checked={agreedTerms}
            onChange={(e) => setAgreedTerms(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer bg-slate-900 border-slate-700"
          />
          <label htmlFor="terms" className="text-[11px] text-slate-300 leading-snug cursor-pointer">
            {isRtl ? (
              <>
                أوافق على <span className="text-blue-400 font-semibold">{t('termsAndConditions')}</span> وأقر بأن المنتجات المطبوعة حسب الطلب تخضع لـ <span className="text-blue-400 font-semibold">{t('noReturnPolicy')}</span> بمجرد بدء الطباعة.
              </>
            ) : (
              <>
                I agree to the <span className="text-blue-400 font-semibold">{t('termsAndConditions')}</span> and acknowledge that on-demand DTF printed goods follow a <span className="text-blue-400 font-semibold">{t('noReturnPolicy')}</span> once printed.
              </>
            )}
          </label>
        </div>

        {/* 5. Order Total Breakdown */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>{t('subtotal')} ({cart.length} {t('items')})</span>
            <span className="text-white font-semibold">{formatCurrency(cartTotal)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>{t('deliveryFee')}</span>
            <span className={deliveryFee === 0 ? 'text-emerald-400 font-bold' : 'text-white font-semibold'}>
              {deliveryFee === 0 ? t('freeDelivery') : formatCurrency(deliveryFee)}
            </span>
          </div>
          <div className="h-[1px] bg-slate-800 my-1" />
          <div className="flex justify-between text-sm font-black text-white">
            <span>{t('total')}</span>
            <span className="text-blue-400">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Place Order Action */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0F19]/95 backdrop-blur-md border-t border-slate-800 p-3 max-w-md mx-auto">
        <button
          onClick={handlePlaceOrder}
          disabled={isSubmitting}
          className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xl glow-blue transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <span>{isRtl ? 'جاري تأكيد الطلب...' : 'Processing Order...'}</span>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('placeOrder')} — {formatCurrency(grandTotal)}</span>
            </>
          )}
        </button>
      </div>

      {/* Customer Login/Register Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border border-slate-800 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">
                    {authMode === 'login'
                      ? isRtl ? 'تسجيل دخول العميل' : 'Customer Sign In'
                      : isRtl ? 'إنشاء حساب عميل جديد' : 'Create Customer Account'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {isRtl ? 'السلة ستبقى محفوظة بالكامل' : 'Cart items are preserved'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="w-7 h-7 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="p-5 space-y-3">
              {authError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {authError}
                </div>
              )}

              {authMode === 'register' && (
                <>
                  <div>
                    <label className="text-[10px] font-medium text-slate-400 block mb-1">{t('fullName')}</label>
                    <input
                      type="text"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="e.g. Ahmad Al-Khalil"
                      className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-400 block mb-1">{t('phoneNumber')}</label>
                    <input
                      type="tel"
                      required
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      placeholder="+962 79 123 4567"
                      className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-[10px] font-medium text-slate-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@domain.jo"
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-medium text-slate-400 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg glow-blue-sm transition-all"
              >
                {authMode === 'login' ? <LogIn className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                <span>
                  {authMode === 'login'
                    ? isRtl ? 'دخول ومتابعة الطلب' : 'Sign In & Return to Checkout'
                    : isRtl ? 'تسجيل ومتابعة الطلب' : 'Register & Return to Checkout'}
                </span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                    setAuthError(null);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                >
                  {authMode === 'login'
                    ? isRtl ? 'ليس لديك حساب؟ إنشاء حساب جديد' : 'New customer? Create an account'
                    : isRtl ? 'لديك حساب بالفعل؟ تسجيل الدخول' : 'Already have an account? Sign in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
