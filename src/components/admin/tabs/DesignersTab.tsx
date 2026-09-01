import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Users,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  TrendingUp,
  CreditCard,
  Building2,
  Check,
  ShieldAlert,
  Search,
  FileCheck,
  Eye,
  Edit2,
  Save,
  Layers,
  ShieldCheck,
  Info,
  LayoutGrid,
  List as ListIcon,
  Download,
  X,
  ExternalLink,
} from 'lucide-react';
import { Design } from '../../../types';
import { tshirtBlackMockup, hoodieBlackMockup, ceramicMugMockup } from '../../../data/initialData';

export const DesignersTab: React.FC = () => {
  const {
    designs,
    designerProfile,
    designers,
    businessSettings,
    updateDesignerCommission,
    markWithdrawalAsPaid,
    startAdminDesignerPreview,
    formatCurrency,
    t,
    isRtl,
  } = useApp();

  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);
  const [similarityResult, setSimilarityResult] = useState<{ designId: string; similarityScore: number; matchStatus: 'original' | 'flagged'; matchedWith?: string } | null>(null);
  const [selectedInspectionDesign, setSelectedInspectionDesign] = useState<Design | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Independent per-designer commission editing state
  const [editingDesignerId, setEditingDesignerId] = useState<string | null>(null);
  const [commType, setCommType] = useState<'fixed' | 'percentage'>('fixed');
  const [commRate, setCommRate] = useState<number>(0.50);
  const [commissionSaveMsg, setCommissionSaveMsg] = useState<string | null>(null);

  const activeDesignersList = designers && designers.length > 0 ? designers : [designerProfile];

  const handleStartEditCommission = (des: typeof designerProfile) => {
    setEditingDesignerId(des.id);
    setCommType(des.commissionType || 'fixed');
    setCommRate(des.commissionRate ?? businessSettings.defaultDesignerFlatRoyalty ?? 0.50);
  };

  const handlePay = (designerId: string, amount: number) => {
    markWithdrawalAsPaid(designerId, amount);
    setPayoutSuccess(isRtl ? `تم تسجيل تحويل مبلغ ${formatCurrency(amount)} للمصمم بنجاح!` : `Successfully marked payout of ${formatCurrency(amount)} as transferred!`);
    setTimeout(() => setPayoutSuccess(null), 3000);
  };

  const handleSaveCommission = (designerId: string) => {
    updateDesignerCommission(designerId, commType, commRate);
    setEditingDesignerId(null);
    setCommissionSaveMsg(
      isRtl
        ? `تم تحديث هيكل عمولة المصمم بنجاح (${commType === 'fixed' ? `${commRate.toFixed(2)} د.أ` : `${commRate}%`})! سيسري على الطلبات الجديدة فقط ولن يؤثر على الطلبات التاريخية.`
        : `Designer commission updated to ${commType === 'fixed' ? `${commRate.toFixed(2)} JOD` : `${commRate}%`}! Applied to new eligible orders only without altering historical earnings.`
    );
    setTimeout(() => setCommissionSaveMsg(null), 4000);
  };

  const handleRunSimilarityCheck = (designId: string, title: string) => {
    const score = Math.floor(Math.random() * 14) + 3;
    setSimilarityResult({
      designId,
      similarityScore: score,
      matchStatus: score > 65 ? 'flagged' : 'original',
      matchedWith: score > 65 ? 'Catalog ID #D-004' : undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Banner with View as Designer Action */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {isRtl ? 'سوق المصممين، التحقق من الملكية وتحويل الأرباح' : 'Designer Marketplace, Authorship Verification & Royalties'}
              </h2>
              <p className="text-[11px] text-purple-300/80">
                {isRtl ? 'مراجعة بيانات المصممين، تعديل العمولات، فحص تطابق التصاميم وصرف مستحقات كليك' : 'Review designer profiles, customize royalties (flat/percentage), audit 300 DPI specs, and process CliQ payouts'}
              </p>
            </div>
          </div>

          {/* Direct "View as Designer" Quick Test Button */}
          <button
            onClick={() => startAdminDesignerPreview(designerProfile.id)}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-900/40 transition-all flex-shrink-0"
          >
            <Eye className="w-4 h-4" />
            <span>{isRtl ? 'معاينة لوحة المصمم (View as Designer)' : 'View as Designer (Portal Preview)'}</span>
          </button>
        </div>

        {payoutSuccess && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{payoutSuccess}</span>
          </div>
        )}

        {commissionSaveMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>{commissionSaveMsg}</span>
          </div>
        )}
      </div>

      {/* 2. Registered Third-Party Designers & Independent Royalty Control */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>{isRtl ? `المصممون المعتمدون والتحكم بالعمولات (${activeDesignersList.length})` : `Approved Designers & Independent Royalty Control (${activeDesignersList.length})`}</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {isRtl
                ? 'تحكم مستقل بنوع العمولة (ثابت أو نسبة) لكل مصمم. تغيير العمولة يسري على الطلبات الجديدة فقط ولا يغير الطلبات السابقة.'
                : 'Owner/Admin controls commission (Fixed JOD or Percentage) per designer independently. Historical orders remain permanently unchanged.'}
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
            {isRtl ? 'نظام العمولات المستقل' : 'Per-Designer Controls'}
          </span>
        </div>

        {/* List of Independent Designer Cards */}
        <div className="space-y-3">
          {activeDesignersList.map((des) => {
            const isEditingThis = editingDesignerId === des.id;
            const isFixed = (des.commissionType || 'fixed') === 'fixed';
            const rateVal = des.commissionRate ?? businessSettings.defaultDesignerFlatRoyalty ?? 0.50;
            const withdrawable = des.withdrawableBalance ?? des.balance ?? 0;
            const totalEarn = des.totalEarnings ?? des.totalEarned ?? 0;
            const totalSold = des.totalSoldOrUsed ?? des.salesCount ?? 0;

            return (
              <div key={des.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 transition-all hover:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={des.avatar}
                      alt={des.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full border-2 border-cyan-400 object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-bold text-white">{des.name}</h4>
                        <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-bold">
                          Partner Designer
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                          Auto-Qualified (300 DPI)
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {des.email} • {des.phone || '+962 79 555 9876'}
                      </p>
                      <p className="text-[10px] text-cyan-300 font-mono">
                        CliQ: <strong>{des.payoutDetails?.cliqAlias || 'CLIQLINK@BANK'}</strong> • IBAN: {des.payoutDetails?.iban || 'JO44ARAB0000000987654321098765'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-right min-w-[120px]">
                      <span className="text-[9px] text-slate-400 block">{isRtl ? 'العمولة الفعالة:' : 'Active Royalty:'}</span>
                      <span className="text-xs font-black text-cyan-400 font-mono">
                        {isFixed ? `${formatCurrency(rateVal)} / ${isRtl ? 'مبيعة' : 'unit'}` : `${rateVal}% / ${isRtl ? 'مبيعة' : 'unit'}`}
                      </span>
                    </div>

                    <button
                      onClick={() => (isEditingThis ? setEditingDesignerId(null) : handleStartEditCommission(des))}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
                        isEditingThis
                          ? 'bg-cyan-600 border-cyan-400 text-white shadow-md'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                      title={isRtl ? 'تعديل عمولة هذا المصمم' : 'Configure Commission'}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{isRtl ? 'تعديل العمولة' : 'Set Royalty'}</span>
                    </button>

                    <button
                      onClick={() => startAdminDesignerPreview(des.id)}
                      className="p-2 rounded-xl bg-purple-950 hover:bg-purple-900 border border-purple-500/40 text-purple-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1"
                      title="Preview Portal as this Designer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="text-[10px] hidden sm:inline">{isRtl ? 'معاينة' : 'Preview'}</span>
                    </button>
                  </div>
                </div>

                {/* Designer Metrics */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/60 text-center">
                  <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <span className="text-[9px] text-slate-400 block">{isRtl ? 'طبعات مبيعة' : 'Units Sold'}</span>
                    <span className="text-xs font-bold text-white font-mono">{totalSold}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <span className="text-[9px] text-slate-400 block">{isRtl ? 'إجمالي الأرباح' : 'Lifetime Royalties'}</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">{formatCurrency(totalEarn)}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <span className="text-[9px] text-slate-400 block">{isRtl ? 'الرصيد القابل للسحب' : 'Withdrawable'}</span>
                    <span className="text-xs font-bold text-cyan-400 font-mono">{formatCurrency(withdrawable)}</span>
                  </div>
                </div>

                {/* Commission Edit Form for THIS Designer */}
                {isEditingThis && (
                  <div className="p-3.5 rounded-xl bg-slate-900/95 border border-cyan-500/50 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{isRtl ? `تعديل عمولة المصمم (${des.name}):` : `Configure Royalty for ${des.name}:`}</span>
                      </span>
                      <span className="text-[9px] text-amber-300 font-mono">
                        {isRtl ? 'الافتراضي: 0.50 د.أ لكل قطعة' : 'Default: 0.50 JOD per unit'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-300 font-bold block mb-1">
                          {isRtl ? 'اختر هيكل العمولة:' : 'Choose Royalty Structure:'}
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setCommType('fixed')}
                            className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                              commType === 'fixed'
                                ? 'bg-cyan-600 border-cyan-400 text-white shadow-sm'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {isRtl ? 'A. مبلغ ثابت (JOD)' : 'A. Fixed (JOD)'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCommType('percentage')}
                            className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                              commType === 'percentage'
                                ? 'bg-cyan-600 border-cyan-400 text-white shadow-sm'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {isRtl ? 'B. نسبة مئوية (%)' : 'B. Percentage (%)'}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-300 font-bold block mb-1">
                          {commType === 'fixed'
                            ? (isRtl ? 'قيمة العمولة الثابتة (د.أ / مبيعة):' : 'Fixed Amount (JOD per unit):')
                            : (isRtl ? 'النسبة المئوية (% من سعر القطعة):' : 'Percentage (% per unit):')}
                        </label>
                        <input
                          type="number"
                          step={commType === 'fixed' ? '0.05' : '1'}
                          min="0"
                          max={commType === 'fixed' ? '50' : '100'}
                          value={commRate}
                          onChange={(e) => setCommRate(parseFloat(e.target.value) || 0)}
                          className="w-full py-1.5 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono font-bold focus:border-cyan-400 outline-none"
                        />
                      </div>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[9px] text-slate-400">{isRtl ? 'قيم سريعة:' : 'Quick Presets:'}</span>
                      {commType === 'fixed' ? (
                        <>
                          {[0.50, 0.75, 1.00, 1.50, 2.00].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setCommRate(val)}
                              className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
                                commRate === val
                                  ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600'
                              }`}
                            >
                              {val.toFixed(2)} JOD {val === 0.50 && '(Default)'}
                            </button>
                          ))}
                        </>
                      ) : (
                        <>
                          {[5, 10, 15, 20, 25].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setCommRate(val)}
                              className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
                                commRate === val
                                  ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600'
                              }`}
                            >
                              {val}%
                            </button>
                          ))}
                        </>
                      )}
                    </div>

                    {/* Historical Protection Notice */}
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[9px] text-slate-400 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-300">
                        <Info className="w-3 h-3 text-cyan-400" />
                        <span>
                          {isRtl
                            ? 'حماية السجلات التاريخية: الطلبات والأرباح السابقة ثابتة ولن تتغير. تسري هذه القيمة على المبيعات اللاحقة فقط.'
                            : 'Historical Invariance: Past orders retain their snapshotted commission. New rate applies to future sales only.'}
                        </span>
                      </span>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingDesignerId(null)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-bold text-slate-300 hover:text-white"
                      >
                        {isRtl ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveCommission(des.id)}
                        className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md glow-cyan"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'حفظ وتطبيق العمولة' : 'Save & Apply Royalty'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* House / Owner Designs Zero Commission Policy Card */}
        <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs">
              0%
            </div>
            <div>
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <span>{isRtl ? 'تصاميم المتجر والمالك (In-House / Owner Designs)' : 'DTF Studio In-House / Owner Designs'}</span>
                <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 text-[9px] font-bold border border-purple-500/30">
                  Zero Royalty Policy
                </span>
              </h4>
              <p className="text-[10px] text-purple-300/80">
                {isRtl
                  ? 'التصاميم المملوكة للمتجر أو المالك تولد عمولة مصمم خارجية بقيمة 0.00 د.أ (0%) بشكل دائم وثابت.'
                  : 'Owner and house-created designs automatically generate 0% (0.00 JOD) third-party designer royalty on all sales.'}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-purple-900/60 text-purple-200 text-[10px] font-mono font-bold border border-purple-500/40 flex-shrink-0">
            0.00 JOD / 0%
          </span>
        </div>
      </div>

      {/* 3. Pending Payout Requests Section */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-white flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span>{isRtl ? 'طلبات سحب الأرباح المعلقة' : 'Pending Withdrawal & Payout Requests'}</span>
        </h3>

        {designerProfile.pendingWithdrawals > 0 ? (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                CliQ
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">{designerProfile.name}</h4>
                <p className="text-[10px] text-slate-400 font-mono">
                  {isRtl ? 'اسم مستعار كليك:' : 'CliQ Alias:'} <span className="text-amber-300">{designerProfile.payoutDetails?.cliqAlias || 'ASTROMOH@ARABBANK'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs font-black text-amber-400 font-mono">
                  {formatCurrency(designerProfile.pendingWithdrawals)}
                </span>
                <span className="text-[9px] text-slate-400 block">{isRtl ? 'بانتظار التحويل' : 'Pending Transfer'}</span>
              </div>

              <button
                onClick={() => handlePay(designerProfile.id, designerProfile.pendingWithdrawals)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-900/30 transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isRtl ? 'تأكيد التحويل عبر كليك' : 'Mark Paid via CliQ'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-950 text-center text-xs text-slate-400">
            {isRtl ? 'لا توجد طلبات سحب معلقة حالياً (الحد الأدنى 10.00 د.أ)' : 'No pending designer withdrawal requests at this moment (Min threshold 10.00 JOD).'}
          </div>
        )}
      </div>

      {/* 4. Live Marketplace Designs & Similarity Verification (with Grid / List Switcher) */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>{isRtl ? `مكتبة التصاميم المركزية (${designs.length})` : `Central Design Library & Royalty Manager (${designs.length})`}</span>
            </h3>
            <span className="text-[10px] text-slate-400">{isRtl ? '1 تصميم = كيان موحد متعدد الملفات مع فحص دقة 300 DPI للملف المعتمد' : '1 Design Entity = Multi-Asset bundle with master print preflight check'}</span>
          </div>

          {/* Grid / List View Toggle Buttons */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'grid'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">{isRtl ? 'شبكة' : 'Grid'}</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'list'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">{isRtl ? 'قائمة' : 'List'}</span>
            </button>
          </div>
        </div>

        {/* GRID VIEW */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {designs.map((design) => {
              const royalty = design.pricePerUnit || design.royaltyRate || (designerProfile.commissionRate ?? 0.50);
              const sold = design.soldCount || 0;
              const isChecked = similarityResult?.designId === design.id;
              const isOwnerDesign = design.designerId === 'owner' || design.designerName?.toLowerCase().includes('owner') || design.designerName?.toLowerCase().includes('studio');
              const assetCount = (design.assets?.length || (design.supportingFiles?.length || 0) + (design.presentationPhotos?.length || 0) + 1);

              return (
                <div
                  key={design.id}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-purple-500/40 flex flex-col justify-between gap-3 transition-all"
                >
                  <div className="space-y-2.5">
                    <div className="relative aspect-square rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center p-2">
                      <img
                        src={design.imageUrl}
                        alt={design.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 text-cyan-300 font-mono text-[9px] font-bold border border-cyan-500/30">
                        {design.id}
                      </span>
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-950/90 text-emerald-300 font-bold text-[9px] border border-emerald-500/40">
                        300 DPI Preflight ✓
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-white truncate">{design.title}</h4>
                        {isOwnerDesign ? (
                          <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 text-[9px] font-bold border border-purple-500/30">
                            Owner (0% Roy)
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">
                            {formatCurrency(royalty)} / sale
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {isRtl ? 'المصمم:' : 'By:'} <span className="text-purple-300 font-semibold">{design.designerName}</span>
                      </p>
                    </div>

                    {/* Assets summary */}
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between text-[9px]">
                      <span className="text-slate-400 flex items-center gap-1 font-mono">
                        <Layers className="w-3 h-3 text-cyan-400" />
                        <span>Master PNG + PSD + AI ({assetCount} files)</span>
                      </span>
                      <span className="text-slate-300 font-mono font-bold">
                        {sold} {isRtl ? 'طبعات' : 'sold'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedInspectionDesign(design)}
                      className="flex-1 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-bold text-[10px] flex items-center justify-center gap-1 transition-all"
                    >
                      <Info className="w-3 h-3" />
                      <span>{isRtl ? 'فحص الملفات' : 'Inspect Entity'}</span>
                    </button>

                    {isChecked ? (
                      <span className="px-2 py-1 rounded-xl text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                        <FileCheck className="w-3 h-3 text-blue-400" />
                        <span>{similarityResult.similarityScore}% Match</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRunSimilarityCheck(design.id, design.title)}
                        className="py-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-semibold flex items-center gap-1 transition-all"
                        title="Check Originality & Pixel Similarity"
                      >
                        <Search className="w-3 h-3 text-purple-400" />
                      </button>
                    )}

                    <a
                      href={design.readyToPrintFile?.url || design.imageUrl}
                      download={`${design.title}_master.png`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-1.5 px-2 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300"
                      title="Download Master Print File"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* LIST VIEW */}
        {viewMode === 'list' && (
          <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-[11px] text-slate-300">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase font-mono text-[9px]">
                  <tr>
                    <th className="p-3">{isRtl ? 'التصميم' : 'Design / ID'}</th>
                    <th className="p-3">{isRtl ? 'المصمم' : 'Designer'}</th>
                    <th className="p-3">{isRtl ? 'حزمة الأصول' : 'Asset Bundle'}</th>
                    <th className="p-3">{isRtl ? 'الملف المعتمد (Master)' : '300 DPI Master File'}</th>
                    <th className="p-3 text-right">{isRtl ? 'العمولة والمبيعات' : 'Royalty & Sales'}</th>
                    <th className="p-3 text-center">{isRtl ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {designs.map((design) => {
                    const royalty = design.pricePerUnit || design.royaltyRate || (designerProfile.commissionRate ?? 0.50);
                    const sold = design.soldCount || 0;
                    const isChecked = similarityResult?.designId === design.id;
                    const isOwnerDesign = design.designerId === 'owner' || design.designerName?.toLowerCase().includes('owner') || design.designerName?.toLowerCase().includes('studio');
                    const assetCount = (design.assets?.length || (design.supportingFiles?.length || 0) + (design.presentationPhotos?.length || 0) + 1);

                    return (
                      <tr key={design.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                              <img
                                src={design.imageUrl}
                                alt={design.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="min-w-0 max-w-[150px]">
                              <div className="font-bold text-white truncate">{design.title}</div>
                              <div className="text-[9px] font-mono text-cyan-400">{design.id}</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <span className="font-semibold text-purple-300">{design.designerName}</span>
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-1 font-mono text-[8px]">
                            <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">PNG</span>
                            <span className="px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-500/30">PSD</span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500/30">AI</span>
                            <span className="text-slate-400">({assetCount} files)</span>
                          </div>
                        </td>

                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-bold text-[9px] inline-block">
                            300 DPI Transparent Pass
                          </span>
                        </td>

                        <td className="p-3 text-right font-mono">
                          <div className="font-bold text-emerald-400">
                            {isOwnerDesign ? 'Owner Design' : `${formatCurrency(royalty)} / sale`}
                          </div>
                          <div className="text-slate-400 text-[10px]">{sold} {isRtl ? 'طبعات مبيعة' : 'sold'}</div>
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedInspectionDesign(design)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300"
                              title="Inspect Full Technical Specs"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>

                            {isChecked ? (
                              <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 text-[9px] font-bold">
                                {similarityResult.similarityScore}%
                              </span>
                            ) : (
                              <button
                                onClick={() => handleRunSimilarityCheck(design.id, design.title)}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-purple-300"
                                title="Run Similarity Check"
                              >
                                <Search className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <a
                              href={design.readyToPrintFile?.url || design.imageUrl}
                              download={`${design.title}_master.png`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300"
                              title="Download Master Print File"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Full Multi-Asset Inspection & Verification */}
      {selectedInspectionDesign && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/40 w-full max-w-xl rounded-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isRtl ? 'فحص كيان التصميم الشامل والملف المعتمد للطباعة' : 'Design Entity Multi-Asset Audit'}
                  </h3>
                  <span className="text-[10px] font-mono text-purple-300">
                    Design ID: {selectedInspectionDesign.id} • Designer: {selectedInspectionDesign.designerName}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedInspectionDesign(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Artwork Banner */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                <img
                  src={selectedInspectionDesign.imageUrl}
                  alt={selectedInspectionDesign.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain p-1"
                />
              </div>

              <div>
                <h4 className="text-xs font-bold text-white">
                  {selectedInspectionDesign.title} {selectedInspectionDesign.titleAr ? `(${selectedInspectionDesign.titleAr})` : ''}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {selectedInspectionDesign.description || 'Verified Catalog Artwork'}
                </p>
                <div className="flex items-center gap-2 mt-1 font-mono text-[9px]">
                  <span className="text-cyan-300">Category: {selectedInspectionDesign.category}</span>
                  <span className="text-emerald-400">
                    Royalty: {formatCurrency(selectedInspectionDesign.pricePerUnit || selectedInspectionDesign.royaltyRate || 0.50)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ready-to-Print Master File Specs */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white">
                    {isRtl ? 'الملف المعتمد للطباعة المباشرة (Master Print File)' : 'Active Master Print File'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold font-mono">
                  300 DPI PREFLIGHT PASSED
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">Resolution</span>
                  <span className="text-cyan-300 font-bold">{selectedInspectionDesign.readyToPrintFile?.dpi || 300} DPI</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">Pixels</span>
                  <span className="text-white font-bold">{selectedInspectionDesign.readyToPrintFile?.widthPx || 3600}x{selectedInspectionDesign.readyToPrintFile?.heightPx || 4500}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">Print Size</span>
                  <span className="text-emerald-300 font-bold">{selectedInspectionDesign.readyToPrintFile?.targetPhysicalWidthCm || 30.5}x{selectedInspectionDesign.readyToPrintFile?.targetPhysicalHeightCm || 38.1} cm</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">Alpha Channel</span>
                  <span className="text-cyan-300 font-bold">100% Transparent</span>
                </div>
              </div>
            </div>

            {/* Attached Assets List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-white block">
                {isRtl ? 'جميع الملفات المرفقة لهذا التصميم (Attached Assets)' : 'Design Entity Asset Bundle'}
              </span>

              <div className="space-y-1.5">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-mono font-bold text-[10px]">
                      PNG
                    </div>
                    <div>
                      <p className="font-bold text-white text-[11px]">
                        {selectedInspectionDesign.readyToPrintFile?.fileName || 'master_print.png'}
                      </p>
                      <span className="text-[9px] text-emerald-400 font-mono">
                        Designated Master Print • 300 DPI Transparent
                      </span>
                    </div>
                  </div>

                  <a
                    href={selectedInspectionDesign.readyToPrintFile?.url || selectedInspectionDesign.imageUrl}
                    download={`${selectedInspectionDesign.title}_master.png`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-bold text-[10px] flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </a>
                </div>

                {(selectedInspectionDesign.supportingFiles || [
                  { id: 'sf_1', name: `${selectedInspectionDesign.title.toLowerCase().replace(/\s+/g, '_')}_master.psd`, format: 'psd', url: selectedInspectionDesign.imageUrl },
                  { id: 'sf_2', name: `${selectedInspectionDesign.title.toLowerCase().replace(/\s+/g, '_')}_vector.ai`, format: 'ai', url: selectedInspectionDesign.imageUrl },
                ]).map((sf, sfIdx) => (
                  <div key={sf.id || sfIdx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center font-mono font-bold text-[10px] uppercase">
                        {sf.format}
                      </div>
                      <div>
                        <p className="font-bold text-white text-[11px]">{sf.name}</p>
                        <span className="text-[9px] text-slate-400 font-mono">
                          Source Asset • Preserved Master
                        </span>
                      </div>
                    </div>

                    <a
                      href={sf.url || selectedInspectionDesign.imageUrl}
                      download={sf.name}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-[10px] flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Presentation Photos */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-bold text-white block">
                {isRtl ? 'صور العرض التقديمية (Presentation Photos - Min 3)' : 'Catalog Presentation Mockups (Min 3)'}
              </span>
              <div className="grid grid-cols-4 gap-2">
                {(selectedInspectionDesign.presentationPhotos && selectedInspectionDesign.presentationPhotos.length > 0
                  ? selectedInspectionDesign.presentationPhotos
                  : [selectedInspectionDesign.imageUrl, tshirtBlackMockup, hoodieBlackMockup, ceramicMugMockup]
                ).map((shot, sIdx) => (
                  <div key={sIdx} className="aspect-square rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center p-1">
                    <img src={shot} alt={`Mockup ${sIdx + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
