import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Settings,
  ExternalLink,
  Copy,
  Save,
  Check,
  CreditCard,
  Truck,
  Building,
  ShieldCheck,
  Palette,
  Clock,
  Coins,
} from 'lucide-react';

export const SettingsTab: React.FC = () => {
  const {
    businessSettings,
    updateBusinessSettings,
    getDirectPortalUrl,
    formatCurrency,
    t,
    isRtl,
  } = useApp();

  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Form State
  const [cliqAlias, setCliqAlias] = useState(businessSettings.bankDetails?.cliqAlias || 'DTFSTUDIO_CLIQ');
  const [iban, setIban] = useState(businessSettings.bankDetails?.iban || 'JO94 ARAB 1234 5678 9012 3456 78');
  const [bankName, setBankName] = useState(businessSettings.bankDetails?.bankName || 'Arab Bank Jordan');
  const [reservationMinutes, setReservationMinutes] = useState(businessSettings.bankTransferReservationMinutes || 15);
  const [podConfirmationHours, setPodConfirmationHours] = useState(businessSettings.podConfirmationPeriodHours || 24);
  const [cancellationMinutes, setCancellationMinutes] = useState(businessSettings.customerCancellationWindowMinutes || 60);
  
  const [deliveryFee, setDeliveryFee] = useState(businessSettings.standardDeliveryFee || 2.5);
  const [freeThreshold, setFreeThreshold] = useState(businessSettings.freeDeliveryThreshold || 50);
  const [storePickupEnabled, setStorePickupEnabled] = useState(businessSettings.storePickupEnabled ?? true);
  const [storeAddress, setStoreAddress] = useState(businessSettings.storePickupAddress || 'Sweifieh Village, 7th Circle, Amman, Jordan');
  const [storeAddressAr, setStoreAddressAr] = useState(businessSettings.storePickupAddressAr || 'عمّان، الدوار السابع، مجمع الصويفية فيليدج');

  const [minWithdrawal, setMinWithdrawal] = useState(businessSettings.minimumWithdrawalAmount || 10);
  const [defaultRoyalty, setDefaultRoyalty] = useState(businessSettings.defaultDesignerFlatRoyalty || 2.5);
  const [minSamples, setMinSamples] = useState(3);
  const [minDpi, setMinDpi] = useState(businessSettings.artworkValidationRules?.minDpi || 300);

  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedLink(label);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusinessSettings({
      bankDetails: {
        ...businessSettings.bankDetails,
        bankName,
        cliqAlias,
        iban,
      },
      bankTransferReservationMinutes: Number(reservationMinutes),
      podConfirmationPeriodHours: Number(podConfirmationHours),
      customerCancellationWindowMinutes: Number(cancellationMinutes),
      minimumWithdrawalAmount: Number(minWithdrawal),
      defaultDesignerFlatRoyalty: Number(defaultRoyalty),
      standardDeliveryFee: Number(deliveryFee),
      freeDeliveryThreshold: Number(freeThreshold),
      storePickupEnabled,
      storePickupAddress: storeAddress,
      storePickupAddressAr: storeAddressAr,
      artworkValidationRules: {
        ...businessSettings.artworkValidationRules,
        minDpi: Number(minDpi),
      }
    });

    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">{t('businessSettings')} (OpenCart Configuration)</h2>
            <p className="text-[11px] text-purple-300/80">
              {isRtl ? 'إدارة بوابات الدفع (CliQ، بنك)، قواعد الحجز التلقائي، أسعار التوصيل وعمولات المصممين' : 'Configure store payment gateways (CliQ, Bank Transfer), inventory reservation rules, delivery pricing, and designer royalties'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Direct Portal Access Links */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-purple-500/30 space-y-3">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
          <ExternalLink className="w-4 h-4 text-purple-400" />
          <span>{t('directAccessLinks')}</span>
        </h3>
        <p className="text-[11px] text-slate-400">
          {isRtl ? 'روابط الوصول المباشر للوحة تحكم المصممين والإدارة دون المرور بالواجهة الرئيسية للعميل:' : 'Direct URLs to access Designer and Admin command centers without landing on customer home:'}
        </p>

        <div className="space-y-2">
          {/* Designer Portal Direct Link */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-blue-400">{isRtl ? 'بوابة المصممين' : 'Designer Portal'}</p>
              <p className="text-[10px] font-mono text-slate-400 truncate">{getDirectPortalUrl('designer')}</p>
            </div>
            <button
              onClick={() => copyToClipboard(getDirectPortalUrl('designer'), 'designer')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1 flex-shrink-0 transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedLink === 'designer' ? t('linkCopied') : t('copyLink')}</span>
            </button>
          </div>

          {/* Admin Portal Direct Link */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-purple-400">{isRtl ? 'مركز إدارة المتجر' : 'Admin Command Center'}</p>
              <p className="text-[10px] font-mono text-slate-400 truncate">{getDirectPortalUrl('admin')}</p>
            </div>
            <button
              onClick={() => copyToClipboard(getDirectPortalUrl('admin'), 'admin')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1 flex-shrink-0 transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedLink === 'admin' ? t('linkCopied') : t('copyLink')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Bank, CliQ & Shipping Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-4">
        {/* Payment details block */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-purple-400" />
            <span>{isRtl ? 'بيانات التحويل البنكي وتطبيق كليك CliQ' : 'Bank Transfer & CliQ Payment Gateway'}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">{isRtl ? 'اسم مستعار كليك CliQ Alias' : 'CliQ Alias / ID'}</label>
              <input
                type="text"
                value={cliqAlias}
                onChange={(e) => setCliqAlias(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">{isRtl ? 'اسم البنك' : 'Bank Name'}</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-purple-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">{isRtl ? 'رقم الحساب الدولي IBAN' : 'IBAN Number'}</label>
              <input
                type="text"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Timers & Stock Reservation block */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>{isRtl ? 'قواعد حجز المخزون والفترات الزمنية' : 'Stock Reservation & Timing Rules'}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                {isRtl ? 'مهلة حجز المخزون (بالدقائق)' : 'Stock Reservation Timeout (Minutes)'}
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={reservationMinutes}
                onChange={(e) => setReservationMinutes(parseInt(e.target.value) || 15)}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-purple-500 font-mono"
              />
              <span className="text-[9px] text-slate-500 block mt-0.5">{isRtl ? 'الافتراضي 15 دقيقة لتحويلات CliQ' : 'Default 15 min for CliQ orders'}</span>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                {isRtl ? 'نافذة إلغاء العميل (بالدقائق)' : 'Customer Cancel Window (Minutes)'}
              </label>
              <input
                type="number"
                min="0"
                max="240"
                value={cancellationMinutes}
                onChange={(e) => setCancellationMinutes(parseInt(e.target.value) || 60)}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-purple-500 font-mono"
              />
              <span className="text-[9px] text-slate-500 block mt-0.5">{isRtl ? 'قبل بدء مرحلة الطباعة' : 'Before printing commences'}</span>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                {isRtl ? 'تأكيد استلام POD (بالساعات)' : 'POD Confirmation Time (Hours)'}
              </label>
              <input
                type="number"
                min="1"
                max="72"
                value={podConfirmationHours}
                onChange={(e) => setPodConfirmationHours(parseInt(e.target.value) || 24)}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-purple-500 font-mono"
              />
              <span className="text-[9px] text-slate-500 block mt-0.5">{isRtl ? 'مهلة تأكيد التسليم مع شركة الشحن' : 'Courier delivery settlement period'}</span>
            </div>
          </div>
        </div>

        {/* Designer Marketplace Economics */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-emerald-400" />
            <span>{isRtl ? 'قواعد عمولات المصممين وسحب الأرباح' : 'Designer Royalties & Withdrawal Limits'}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                {isRtl ? 'عمولة التصميم الافتراضية (د.أ / مبيعة)' : 'Default Royalty (JD / sale)'}
              </label>
              <input
                type="number"
                step="0.25"
                min="0.5"
                value={defaultRoyalty}
                onChange={(e) => setDefaultRoyalty(parseFloat(e.target.value) || 2.5)}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-purple-500 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                {isRtl ? 'الحد الأدنى لسحب الأرباح (د.أ)' : 'Minimum Withdrawal (JD)'}
              </label>
              <input
                type="number"
                step="1"
                min="5"
                value={minWithdrawal}
                onChange={(e) => setMinWithdrawal(parseFloat(e.target.value) || 10)}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-purple-500 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                {isRtl ? 'عدد عينات قبول المصمم (تصاميم)' : 'Required Designer Samples'}
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={minSamples}
                onChange={(e) => setMinSamples(parseInt(e.target.value) || 3)}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-purple-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Shipping & Delivery block */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-purple-400" />
            <span>{isRtl ? 'خيارات الشحن والتوصيل والاستلام' : 'Delivery & Courier Logistics Rules'}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">{isRtl ? 'رسوم التوصيل الموحدة (د.أ)' : 'Standard Delivery Fee (JD)'}</label>
              <input
                type="number"
                step="0.5"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-purple-500 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">{isRtl ? 'حد التوصيل المجاني (د.أ)' : 'Free Delivery Threshold (JD)'}</label>
              <input
                type="number"
                step="1"
                value={freeThreshold}
                onChange={(e) => setFreeThreshold(parseFloat(e.target.value) || 0)}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-purple-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">{isRtl ? 'عنوان الاستلام من المعمل / المتجر (عربي)' : 'Store Pickup Address (Arabic)'}</label>
              <input
                type="text"
                value={storeAddressAr}
                onChange={(e) => setStoreAddressAr(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-purple-900/40 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>{isRtl ? 'حفظ كافة إعدادات النظام والمتجر' : 'Save Store & Payment Configuration'}</span>
        </button>

        {settingsSavedToast && (
          <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs text-center font-bold flex items-center justify-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{isRtl ? 'تم تحديث الإعدادات وحفظها بنجاح في قاعدة البيانات!' : 'Business settings updated and persisted successfully!'}</span>
          </div>
        )}
      </form>
    </div>
  );
};
