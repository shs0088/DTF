import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, Package, Globe, Shield, HelpCircle, Paintbrush, ChevronRight, Phone, MessageSquare, AlertCircle } from 'lucide-react';

export const AccountScreen: React.FC = () => {
  const {
    orders,
    language,
    setLanguage,
    userRole,
    setUserRole,
    setActiveScreen,
    setCurrentOrderId,
    setIsDesignerRegistrationModalOpen,
    formatCurrency,
    t,
    isRtl,
  } = useApp();

  const [showPolicyModal, setShowPolicyModal] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto pb-24 text-slate-100 bg-[#05070B] no-scrollbar">
      {/* Profile Header */}
      <section className="p-4 bg-slate-950 border-b border-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-base glow-blue-sm">
            AK
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Ahmad Al-Khalil</h1>
            <p className="text-[11px] text-slate-400 font-mono">+962 79 123 4567</p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/40">
          Customer
        </span>
      </section>

      {/* Quick Menu Options */}
      <div className="p-4 space-y-3">
        {/* Portal Access Hub */}
        <div className="grid grid-cols-2 gap-2">
          {/* Designer Portal Card */}
          <div
            onClick={() => {
              setUserRole('designer');
              setActiveScreen('designer_dashboard');
            }}
            className="p-3 rounded-2xl bg-gradient-to-br from-cyan-950/50 via-slate-900 to-slate-900 border border-cyan-500/40 cursor-pointer hover:border-cyan-400 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-600/20 flex items-center justify-center text-cyan-400">
                <Paintbrush className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                {t('designer')}
              </span>
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">{isRtl ? 'بوابة المصممين' : 'Designer Portal'}</h3>
              <p className="text-[10px] text-cyan-300">{isRtl ? 'الرسومات والأرباح' : 'Artworks & Royalties'}</p>
            </div>
          </div>

          {/* Admin Portal Card */}
          <div
            onClick={() => {
              setUserRole('admin');
              setActiveScreen('admin_dashboard');
            }}
            className="p-3 rounded-2xl bg-gradient-to-br from-purple-950/50 via-slate-900 to-slate-900 border border-purple-500/40 cursor-pointer hover:border-purple-400 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400">
                <Shield className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">
                {t('admin')}
              </span>
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">{isRtl ? 'لوحة تحكم المالك' : 'Admin Center'}</h3>
              <p className="text-[10px] text-purple-300">{isRtl ? 'الإنتاج والمبيعات' : 'Production & Sales'}</p>
            </div>
          </div>
        </div>

        {/* Instant Designer Partner Auto-Qualification Banner */}
        <div
          onClick={() => setIsDesignerRegistrationModalOpen(true)}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/70 to-blue-950/70 border border-cyan-500/40 cursor-pointer hover:border-cyan-400 transition-all flex items-center justify-between gap-3 shadow-lg shadow-cyan-950/30"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
              ✨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white">
                  {isRtl ? 'انضم كشريك مصمم معتمد (تأهيل فوري)' : 'Become a DTF Partner Designer'}
                </h3>
                <span className="px-1.5 py-0.2 rounded bg-cyan-500/30 text-cyan-300 text-[9px] font-mono font-bold">
                  {isRtl ? 'فحص آلي 300 DPI' : 'Instant 300 DPI Check'}
                </span>
              </div>
              <p className="text-[10px] text-slate-300 mt-0.5">
                {isRtl
                  ? 'ارفع 3 نماذج تجريبية واحصل على اعتماد فوري وعمولة 0.50 د.أ لكل قطعة مبيعة'
                  : 'Submit 3 test samples for automated qualification & earn 0.50 JOD royalty per unit sold'}
              </p>
            </div>
          </div>

          <ChevronRight className={`w-4 h-4 text-cyan-400 flex-shrink-0 ${isRtl ? 'rotate-180' : ''}`} />
        </div>

        {/* My Orders History Section */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-400" />
              <span>{t('myOrders')} ({orders.length})</span>
            </h2>
          </div>

          <div className="space-y-2">
            {orders.map((order) => (
              <div
                key={order.id}
                onClick={() => {
                  setCurrentOrderId(order.id);
                  setActiveScreen('order_tracking');
                }}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-blue-500/60 cursor-pointer flex items-center justify-between transition-all"
              >
                <div>
                  <span className="font-mono text-xs font-bold text-white">{order.orderNumber}</span>
                  <p className="text-[10px] text-slate-400">{order.items.length} items • {formatCurrency(order.totalAmount || order.total || 0)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-blue-400 capitalize">
                    {order.status.replace('_', ' ')}
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 text-slate-500 ${isRtl ? 'rotate-180' : ''}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* General Settings */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
          {/* Language Switch */}
          <div
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="flex items-center justify-between py-1 cursor-pointer"
          >
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <Globe className="w-4 h-4 text-blue-400" />
              <span>{t('language')}</span>
            </div>
            <span className="text-xs font-bold text-blue-400">
              {language === 'en' ? 'English (US)' : 'العربية'}
            </span>
          </div>

          <div className="h-[1px] bg-slate-800" />

          {/* Return & Refund Policy */}
          <div
            onClick={() => setShowPolicyModal(true)}
            className="flex items-center justify-between py-1 cursor-pointer"
          >
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>{t('returnPolicy')}</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-slate-500 ${isRtl ? 'rotate-180' : ''}`} />
          </div>

          <div className="h-[1px] bg-slate-800" />

          {/* Support */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Customer Support</span>
            </div>
            <span className="text-xs font-mono text-emerald-400">+962 6 500 0000</span>
          </div>
        </div>
      </div>

      {/* MODAL: Return Policy */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-3">
            <div className="flex items-center gap-2 text-blue-400">
              <Shield className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Custom Print Return Policy</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Because all products are custom printed on-demand with your personalized artwork specifications and measurements, returns or exchanges for change of mind are strictly not permitted once heat-pressed.
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              If an item has a manufacturing or printing defect, our team guarantees immediate reprint or 100% refund upon photo verification within 48 hours of delivery.
            </p>
            <button
              onClick={() => setShowPolicyModal(false)}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold"
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
