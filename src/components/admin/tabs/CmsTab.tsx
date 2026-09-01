import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Languages,
  RotateCcw,
  Save,
  Check,
  Plus,
  Search,
} from 'lucide-react';

export const CmsTab: React.FC = () => {
  const {
    siteTranslations,
    updateTranslationsBatch,
    addNewTranslationKey,
    resetTranslations,
    t,
  } = useApp();

  const [cmsFilter, setCmsFilter] = useState<string>('all');
  const [cmsSearch, setCmsSearch] = useState<string>('');
  const [localTranslations, setLocalTranslations] = useState<typeof siteTranslations>(siteTranslations);
  const [newKey, setNewKey] = useState('');
  const [newEnText, setNewEnText] = useState('');
  const [newArText, setNewArText] = useState('');
  const [cmsSavedToast, setCmsSavedToast] = useState(false);

  const handleCmsTextChange = (lang: 'en' | 'ar', key: string, val: string) => {
    setLocalTranslations(prev => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [key]: val,
      },
    }));
  };

  const handleSaveAllCms = () => {
    updateTranslationsBatch(localTranslations);
    setCmsSavedToast(true);
    setTimeout(() => setCmsSavedToast(false), 2500);
  };

  const handleAddNewKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newEnText.trim() || !newArText.trim()) return;

    const trimmedKey = newKey.trim();
    addNewTranslationKey(trimmedKey, newEnText.trim(), newArText.trim());
    setLocalTranslations(prev => ({
      en: { ...prev.en, [trimmedKey]: newEnText.trim() },
      ar: { ...prev.ar, [trimmedKey]: newArText.trim() },
    }));

    setNewKey('');
    setNewEnText('');
    setNewArText('');
    setCmsSavedToast(true);
    setTimeout(() => setCmsSavedToast(false), 2500);
  };

  const handleResetCms = () => {
    if (window.confirm('Reset all site texts to original defaults?')) {
      resetTranslations();
      setLocalTranslations(siteTranslations);
    }
  };

  const getSectionForKey = (key: string): string => {
    if (['premiumDtfPrinting', 'bringImaginationToLife', 'toLife', 'printYourDream', 'shopProducts', 'freshFromDesigners', 'meetOurDesigners', 'featuredProducts', 'howItWorks', 'step1Title', 'step1Desc', 'step2Title', 'step2Desc', 'step3Title', 'step3Desc', 'step4Title', 'step4Desc'].includes(key)) return 'home';
    if (['searchShopPlaceholder', 'allItems', 'plainBlankApparel', 'readyToSellFeatured', 'blankCanvas', 'selectProductToCustomize', 'tshirts', 'mugs', 'caps', 'hoodies'].includes(key)) return 'shop';
    if (['undo', 'redo', 'front', 'backLocation', 'leftSleeve', 'rightSleeve', 'printSize', 'exactSizeNote', 'gallery', 'upload', 'rotate', 'flip', 'approveAndAddToCart', 'printableAreaExceeded', 'fileValid', 'pickDesignFromGallery', 'uploadYourArtwork', 'dropzoneTitle', 'dropzoneSub', 'browseFiles', 'maxFileSize', 'validDtfFileFormats'].includes(key)) return 'customizer';
    if (['designsUploadedBy', 'designersCount', 'searchDesignsPlaceholder', 'designerUploadTip', 'uploadedBy', 'useThisDesign', 'allCategories'].includes(key)) return 'designs';
    if (['myCart', 'cartEmpty', 'startCustomizing', 'checkout', 'proceedToCheckout', 'deliveryMethod', 'homeDelivery', 'storePickup', 'contactInformation', 'fullName', 'phoneNumber', 'deliveryAddress', 'city', 'orderSummary', 'subtotal', 'deliveryFee', 'freeDeliveryApplied', 'paymentMethod', 'bankTransfer', 'cashOnDelivery', 'creditCard', 'placeOrder', 'bankTransferTitle', 'bankTransferInstructions', 'reservationExpiresIn', 'confirmPaymentSent', 'cliqAliasLabel', 'bankNameLabel', 'ibanLabel'].includes(key)) return 'checkout';
    if (['orderStatusTimeline', 'statusNew', 'statusPaymentPending', 'statusPaymentConfirmed', 'statusUnderPreparation', 'statusReadyForDeliveryOrPickup', 'statusGivenToDelivery', 'statusUnderDelivery', 'statusReadyForPickup', 'statusCompleted', 'statusCancelled', 'trackOrder', 'orderNumber', 'courierInfo', 'needHelpWithOrder', 'callSupport'].includes(key)) return 'orders';
    if (['designerDashboard', 'totalDesigns', 'designsUsedSold', 'currentEarnings', 'withdrawableBalance', 'pendingEarnings', 'pendingWithdrawal', 'completedWithdrawal', 'uploadNewDesign', 'withdrawMoney', 'myDesigns', 'designStatus', 'salesCount', 'requestPayout', 'minimumWithdrawalNote'].includes(key)) return 'designer';
    if (['adminDashboard', 'totalOrders', 'totalRevenue', 'totalCustomers', 'activeDesigners', 'pendingPayments', 'stockAlerts', 'productionQueue', 'pendingWithdrawals', 'manageOrders', 'manageProducts', 'manageDesigners', 'businessSettings', 'cmsContentManagement', 'cmsDescription', 'confirmPaymentReceived', 'cancelOrderAction', 'updateStatus', 'printProductionTicket', 'exactPrintSpecs', 'download300DpiFile', 'markHeatPressed'].includes(key)) return 'admin';
    return 'general';
  };

  const allKeys = Object.keys(localTranslations.en || {});
  const filteredKeys = allKeys.filter(k => {
    const section = getSectionForKey(k);
    const matchesSection = cmsFilter === 'all' || section === cmsFilter;
    const enVal = (localTranslations.en[k] || '').toLowerCase();
    const arVal = (localTranslations.ar[k] || '').toLowerCase();
    const query = cmsSearch.toLowerCase();
    const matchesSearch = k.toLowerCase().includes(query) || enVal.includes(query) || arVal.includes(query);
    return matchesSection && matchesSearch;
  });

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{t('cmsContentManagement')}</h2>
              <p className="text-[11px] text-purple-300/80">
                {t('cmsDescription')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetCms}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 transition-all"
              title="Reset to factory defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('resetDefaultTranslations')}</span>
            </button>
            <button
              onClick={handleSaveAllCms}
              className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-900/40 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t('saveAllTranslations')}</span>
            </button>
          </div>
        </div>

        {cmsSavedToast && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{t('translationsSavedToast')}</span>
          </div>
        )}
      </div>

      {/* Add New Custom Key Form */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-purple-400" />
          <span>{t('addNewTranslation')}</span>
        </h3>
        <form onSubmit={handleAddNewKey} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder={t('keyIdentifier')}
            className="py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white outline-none focus:border-purple-500"
          />
          <input
            type="text"
            value={newEnText}
            onChange={(e) => setNewEnText(e.target.value)}
            placeholder={t('englishText')}
            className="py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-purple-500"
          />
          <div className="flex gap-2">
            <input
              type="text"
              dir="rtl"
              value={newArText}
              onChange={(e) => setNewArText(e.target.value)}
              placeholder={t('arabicText')}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-md"
            >
              {t('addTranslationButton')}
            </button>
          </div>
        </form>
      </div>

      {/* Search & Section Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={cmsSearch}
            onChange={(e) => setCmsSearch(e.target.value)}
            placeholder={t('searchTranslationKeys')}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All Pages' },
            { id: 'home', label: 'Home' },
            { id: 'shop', label: 'Shop' },
            { id: 'customizer', label: 'Customizer' },
            { id: 'designs', label: 'Gallery' },
            { id: 'checkout', label: 'Checkout' },
            { id: 'orders', label: 'Orders' },
            { id: 'designer', label: 'Designer' },
            { id: 'admin', label: 'Admin' },
            { id: 'general', label: 'General' },
          ].map(sec => (
            <button
              key={sec.id}
              onClick={() => setCmsFilter(sec.id)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all ${
                cmsFilter === sec.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      {/* Translation Key & Dual Language Editor List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold px-1">
          <span>Showing {filteredKeys.length} text keys</span>
          <span>Instant real-time synchronization</span>
        </div>

        {filteredKeys.map((key) => (
          <div
            key={key}
            className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-purple-400">
                {key}
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 uppercase font-semibold">
                {getSectionForKey(key)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                  English (LTR)
                </label>
                <input
                  type="text"
                  value={localTranslations.en[key] ?? ''}
                  onChange={(e) => handleCmsTextChange('en', key, e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold block mb-1 text-right">
                  العربية (RTL)
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={localTranslations.ar[key] ?? ''}
                  onChange={(e) => handleCmsTextChange('ar', key, e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-purple-500 text-right"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Bottom Save Button */}
      <div className="sticky bottom-20 z-20 pt-2">
        <button
          onClick={handleSaveAllCms}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xl shadow-purple-900/50 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>{t('saveAllTranslations')}</span>
        </button>
      </div>
    </div>
  );
};
