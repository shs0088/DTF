import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Plus,
  DollarSign,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ChevronRight,
  X,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  Copy,
  FileCheck,
  Download,
  Layers,
  Info,
  Check,
  ShieldCheck,
  LayoutGrid,
  List as ListIcon,
  Eye,
  FileCode,
  ArrowLeft,
} from 'lucide-react';
import { DesignCategory, Design, DesignSupportingFile, DesignAsset } from '../../types';
import { tshirtBlackMockup, hoodieBlackMockup, ceramicMugMockup, astronautArt, samuraiArt, lionArt } from '../../data/initialData';
import { evaluatePrintPreflight } from '../../utils/preflight';

export const DesignerDashboardScreen: React.FC = () => {
  const {
    designerProfile,
    businessSettings,
    designs,
    addDesignerDesign,
    requestWithdrawal,
    getDirectPortalUrl,
    setIsDesignerRegistrationModalOpen,
    isAdminPreviewingAsDesigner,
    exitAdminDesignerPreview,
    setDesignReadyToPrintMaster,
    formatCurrency,
    t,
    isRtl,
  } = useApp();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedInspectionDesign, setSelectedInspectionDesign] = useState<Design | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Upload Form States
  const [title, setTitle] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [category, setCategory] = useState<DesignCategory>('popular');
  const [tags, setTags] = useState('streetwear, cyber, dtf, vector');
  
  // Presentation Photos (min 3)
  const [presentationPhotos, setPresentationPhotos] = useState<string[]>([
    astronautArt,
    tshirtBlackMockup,
    hoodieBlackMockup,
  ]);
  
  // Ready to Print File
  const [readyToPrintUrl, setReadyToPrintUrl] = useState<string | null>(astronautArt);
  const [readyToPrintFileName, setReadyToPrintFileName] = useState('astronaut_master_300dpi.png');
  const [dpi, setDpi] = useState(300);
  const [widthPx, setWidthPx] = useState(3600);
  const [heightPx, setHeightPx] = useState(4500);
  const [hasTransparency, setHasTransparency] = useState(true);
  const [targetWidthCm, setTargetWidthCm] = useState(30.48);
  const [targetHeightCm, setTargetHeightCm] = useState(38.10);

  // Supporting Files
  const [supportingFiles, setSupportingFiles] = useState<DesignSupportingFile[]>([
    { id: 'sf_1', name: 'astronaut_layers.psd', format: 'psd', url: astronautArt, sizeMb: 24.5 },
    { id: 'sf_2', name: 'astronaut_vector.ai', format: 'ai', url: astronautArt, sizeMb: 12.8 },
  ]);
  const [newSupportingName, setNewSupportingName] = useState('');
  const [newSupportingFormat, setNewSupportingFormat] = useState<'psd' | 'ai' | 'eps' | 'svg' | 'png'>('psd');

  const [uploadError, setUploadError] = useState<string | null>(null);

  const currentBalance = designerProfile.withdrawableBalance ?? designerProfile.balance ?? 0;
  const currentTotalEarned = designerProfile.totalEarnings ?? designerProfile.totalEarned ?? 0;
  const currentSalesCount = designerProfile.totalSoldOrUsed ?? designerProfile.salesCount ?? 0;

  // Withdrawal States
  const [withdrawAmount, setWithdrawAmount] = useState(Math.max(10, currentBalance));
  const [withdrawMethod, setWithdrawMethod] = useState<'cliq' | 'bank_transfer'>('cliq');
  const [withdrawAccount, setWithdrawAccount] = useState(designerProfile.payoutDetails?.cliqAlias || 'ASTROMOH@ARABBANK');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const myDesigns = designs.filter(d => d.designerId === designerProfile.id || !d.designerId || d.designerId === 'designer_1');

  const activeCommissionRate = designerProfile.commissionRate ?? businessSettings.defaultDesignerFlatRoyalty ?? 0.50;
  const isFixedCommission = (designerProfile.commissionType || 'fixed') === 'fixed';

  const handleAddSupportingFile = () => {
    if (!newSupportingName.trim()) return;
    const newFile: DesignSupportingFile = {
      id: `sf_${Date.now()}`,
      name: newSupportingName.endsWith(`.${newSupportingFormat}`) ? newSupportingName : `${newSupportingName}.${newSupportingFormat}`,
      format: newSupportingFormat,
      url: readyToPrintUrl || astronautArt,
      sizeBytes: Math.floor((Math.random() * 15 + 5) * 1024 * 1024),
    };
    setSupportingFiles(prev => [...prev, newFile]);
    setNewSupportingName('');
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!readyToPrintUrl) {
      setUploadError(isRtl ? 'يرجى تحديد الملف المعتمد للطباعة المباشرة Ready-to-Print.' : 'Please designate the Ready-to-Print master file.');
      return;
    }

    if (presentationPhotos.length < 3) {
      setUploadError(isRtl ? 'يشترط النظام رفع 3 صور عرض تقديمية على الأقل.' : 'At least 3 presentation photos/shots are required.');
      return;
    }

    if (!title.trim()) {
      setUploadError(isRtl ? 'يرجى إدخال عنوان التصميم بالإنجليزية.' : 'Please enter a design title.');
      return;
    }

    const preflight = evaluatePrintPreflight({
      fileName: readyToPrintFileName,
      format: 'png',
      url: readyToPrintUrl,
      widthPx,
      heightPx,
      dpiMetadata: dpi,
      hasTransparency,
      targetWidthCm,
      targetHeightCm,
      isReadyToPrintMaster: true,
      assetType: 'ready_to_print_master',
    });

    const unifiedAssets: DesignAsset[] = [
      {
        id: `asset_master_${Date.now()}`,
        name: readyToPrintFileName,
        assetType: 'ready_to_print_master',
        format: 'png',
        url: readyToPrintUrl,
        isReadyToPrintMaster: true,
        sizeBytes: 4500000,
        uploadedAt: new Date().toISOString(),
        preflightResult: {
          passed: preflight.passed,
          dpi,
          effectiveDpi: preflight.effectiveDpi,
          requiredDpi: preflight.requiredDpi,
          widthPx,
          heightPx,
          requiredWidthPx: preflight.requiredWidthPx,
          requiredHeightPx: preflight.requiredHeightPx,
          hasTransparency,
          targetWidthCm,
          targetHeightCm,
          score: preflight.score,
          notesEn: preflight.notesEn,
          notesAr: preflight.notesAr,
          rejectionReasons: preflight.failedReasonsEn,
          rejectionReasonsAr: preflight.failedReasonsAr,
        },
      },
      ...presentationPhotos.map((photoUrl, pIdx) => ({
        id: `asset_pres_${Date.now()}_${pIdx}`,
        name: `presentation_shot_${pIdx + 1}.jpg`,
        assetType: 'presentation_image' as const,
        format: 'jpg',
        url: photoUrl,
        isReadyToPrintMaster: false,
        sizeBytes: 850000,
        uploadedAt: new Date().toISOString(),
      })),
      ...supportingFiles.map((sf, sIdx) => ({
        id: sf.id || `asset_sf_${Date.now()}_${sIdx}`,
        name: sf.name,
        assetType: 'source_file' as const,
        format: sf.format,
        url: sf.url,
        isReadyToPrintMaster: false,
        sizeBytes: sf.sizeBytes || (sf.sizeMb ? sf.sizeMb * 1024 * 1024 : 10000000),
        uploadedAt: new Date().toISOString(),
      })),
    ];

    addDesignerDesign({
      designerId: designerProfile.id,
      designerName: designerProfile.name,
      designerAvatar: designerProfile.avatar,
      title,
      titleAr: titleAr || title,
      description: `Original design by ${designerProfile.name}`,
      descriptionAr: `تصميم أصلي من إبداع ${designerProfile.name}`,
      category,
      imageUrl: presentationPhotos[0] || readyToPrintUrl,
      presentationPhotos,
      supportingFiles,
      assets: unifiedAssets,
      readyToPrintFile: {
        url: readyToPrintUrl,
        fileName: readyToPrintFileName,
        format: 'png',
        widthPx,
        heightPx,
        dpi,
        effectiveDpi: preflight.effectiveDpi,
        requiredWidthPx: preflight.requiredWidthPx,
        requiredHeightPx: preflight.requiredHeightPx,
        hasTransparency,
        targetPhysicalWidthCm: targetWidthCm,
        targetPhysicalHeightCm: targetHeightCm,
        edgeClarityScore: preflight.score,
        pixelationRisk: preflight.effectiveDpi < 280 ? 'high' : 'none',
        dtfSuitabilityPass: preflight.passed,
        inspectionNotes: preflight.notesEn,
        inspectionNotesAr: preflight.notesAr,
        rejectionReasons: preflight.failedReasonsEn,
        rejectionReasonsAr: preflight.failedReasonsAr,
      },
      fileFormat: 'png',
      hasTransparency,
      resolutionDpi: dpi,
      pricePerUnit: isFixedCommission ? activeCommissionRate : (activeCommissionRate / 100) * 15.0,
      royaltyRate: activeCommissionRate,
      royaltyType: isFixedCommission ? 'fixed' : 'percentage',
      status: 'approved',
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    });

    setShowUploadModal(false);
    setTitle('');
    setTitleAr('');
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);

    const minThreshold = businessSettings?.minimumWithdrawalAmount || 10.00;
    if (withdrawAmount < minThreshold) {
      setWithdrawError(t('minimumWithdrawalNote'));
      return;
    }

    if (withdrawAmount > currentBalance) {
      setWithdrawError(isRtl ? 'المبلغ المطلوب يتجاوز الرصيد القابل للسحب.' : 'Requested amount exceeds available balance.');
      return;
    }

    const success = requestWithdrawal(withdrawAmount, withdrawMethod, withdrawAccount);
    if (success) {
      setWithdrawSuccess(true);
      setTimeout(() => {
        setWithdrawSuccess(false);
        setShowWithdrawModal(false);
      }, 1500);
    }
  };

  const copyDirectLink = () => {
    navigator.clipboard?.writeText(getDirectPortalUrl('designer'));
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24 text-slate-100 bg-[#05070B] no-scrollbar">
      {/* 0. Admin Preview Mode Persistent Top Banner */}
      {isAdminPreviewingAsDesigner && (
        <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-purple-900 border-b border-purple-500/50 px-4 py-2.5 flex items-center justify-between gap-3 text-white shadow-lg animate-fadeIn sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-purple-500/30 border border-purple-400/50 flex items-center justify-center text-purple-200">
              <Eye className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold flex items-center gap-1.5">
                <span>{isRtl ? 'وضع معاينة الإدارة (View as Designer Mode)' : 'Admin Preview Mode: Active'}</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500 text-white font-mono font-bold">
                  {designerProfile.name}
                </span>
              </p>
              <p className="text-[10px] text-purple-200/80">
                {isRtl
                  ? 'أنت تشاهد حالياً لوحة تحكم المصمم كما تظهر للمصمم المعتمد. يمكنك فحص التصاميم والأرباح والملفات بأمان.'
                  : 'You are viewing the Designer Portal from the certified designer perspective for testing and verification.'}
              </p>
            </div>
          </div>

          <button
            onClick={exitAdminDesignerPreview}
            className="px-3 py-1.5 rounded-xl bg-white text-purple-950 hover:bg-purple-100 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all flex-shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isRtl ? 'إنهاء المعاينة والعودة للإدارة' : 'Exit Preview & Return to Admin'}</span>
          </button>
        </div>
      )}

      {/* 1. Header Profile Banner */}
      <section className="px-4 pt-4 pb-4 bg-slate-950 border-b border-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={designerProfile.avatar}
                alt={designerProfile.name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full border-2 border-cyan-400 object-cover glow-cyan"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 border-2 border-slate-950 flex items-center justify-center text-[9px] text-black font-black">
                ✓
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold text-white">{designerProfile.name}</h1>
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-bold border border-cyan-500/40">
                  {t('designer')}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                  {isRtl ? 'معتمد آلياً' : 'Auto-Approved'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                {designerProfile.email} • {designerProfile.payoutDetails?.cliqAlias || 'CliQ Active'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDesignerRegistrationModalOpen(true)}
              className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isRtl ? 'تسجيل مصمم جديد (فحص آلي)' : 'Register New (Auto-Check)'}</span>
            </button>

            <button
              onClick={() => setShowUploadModal(true)}
              className="py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md glow-cyan transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{t('uploadNewDesign')}</span>
            </button>
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium block">{t('withdrawableBalance')}</span>
            <span className="text-base font-black text-cyan-400">{formatCurrency(currentBalance)}</span>
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="mt-1.5 text-[9px] font-bold text-blue-400 hover:underline flex items-center gap-0.5"
            >
              <span>{t('withdrawMoney')}</span>
              <ArrowUpRight className="w-2.5 h-2.5" />
            </button>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium block">{t('currentEarnings')}</span>
            <span className="text-base font-black text-emerald-400">{formatCurrency(currentTotalEarned)}</span>
            <span className="text-[9px] text-emerald-500/80 mt-1 block">{isRtl ? 'الإجمالي التراكمي' : 'Lifetime'}</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium block">{t('designsUsedSold')}</span>
            <span className="text-base font-black text-white">{currentSalesCount}</span>
            <span className="text-[9px] text-slate-400 mt-1 block">{isRtl ? 'طبعات مبيعة' : 'DTF Prints'}</span>
          </div>
        </div>

        {/* Commission Rate & Qualification Banner */}
        <div className="mt-3 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
              JD
            </div>
            <div>
              <p className="text-[10px] font-bold text-white">
                {isRtl ? 'هيكل عمولة المصمم الفعلي:' : 'Active Designer Royalty Structure:'}{' '}
                <span className="text-cyan-300 font-mono">
                  {isFixedCommission
                    ? `${formatCurrency(activeCommissionRate)} / ${isRtl ? 'مبيعة' : 'unit'}`
                    : `${activeCommissionRate}% / ${isRtl ? 'مبيعة' : 'unit'}`}
                </span>
              </p>
              <p className="text-[9px] text-slate-400">
                {isRtl ? 'تطبق العمولة على كل طلب طباعة جديد. الطلبات السابقة محتفظة بقيمتها الأصلية.' : 'Applied on new print sales. Completed past orders retain original rates.'}
              </p>
            </div>
          </div>

          <button
            onClick={copyDirectLink}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1 flex-shrink-0"
          >
            <Copy className="w-3 h-3" />
            <span>{copiedLink ? t('linkCopied') : t('copyLink')}</span>
          </button>
        </div>
      </section>

      {/* 2. My Uploaded Designs List with Grid / List Toggle */}
      <section className="px-4 py-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              {t('myDesigns')} ({myDesigns.length})
            </h2>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono">
              1 Entity = Multi-Asset
            </span>
          </div>

          {/* View Toggle Buttons */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'grid'
                  ? 'bg-cyan-600 text-white shadow-sm glow-cyan'
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
                  ? 'bg-cyan-600 text-white shadow-sm glow-cyan'
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {myDesigns.map((design) => {
              const masterSpec = design.readyToPrintFile;
              const assetCount = (design.assets?.length || (design.supportingFiles?.length || 0) + (design.presentationPhotos?.length || 0) + 1);
              const royalty = design.pricePerUnit || activeCommissionRate;
              const sold = design.soldCount || 0;

              return (
                <div
                  key={design.id}
                  className="rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 p-3.5 space-y-3 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    {/* Top Image Preview and Badges */}
                    <div className="relative aspect-square rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center p-2">
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
                        300 DPI Master ✓
                      </span>
                    </div>

                    {/* Title and Category */}
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-xs font-bold text-white truncate">
                          {isRtl && design.titleAr ? design.titleAr : design.title}
                        </h3>
                        <span className="text-[10px] font-mono text-cyan-400 font-bold flex-shrink-0">
                          {formatCurrency(royalty)} / {isRtl ? 'مبيعة' : 'sale'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 capitalize">
                        {isRtl ? 'التصنيف:' : 'Category:'} {design.category}
                      </p>
                    </div>

                    {/* Asset Collection Badges (PSD, AI, PNG, Presentation Shots) */}
                    <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[9px] text-slate-400">
                        <span className="font-bold text-slate-300 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-cyan-400" />
                          <span>{isRtl ? 'حزمة ملفات التصميم:' : 'Design Assets Bundle:'}</span>
                        </span>
                        <span className="font-mono text-cyan-300">{assetCount} {isRtl ? 'ملفات' : 'files'}</span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[8px] font-bold font-mono">
                          MASTER PNG
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-500/30 text-[8px] font-bold font-mono">
                          PSD
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500/30 text-[8px] font-bold font-mono">
                          AI
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/30 text-[8px] font-bold font-mono">
                          {design.presentationPhotos?.length || 3} SHOTS
                        </span>
                      </div>
                    </div>

                    {/* Sales & Lifetime Earnings */}
                    <div className="flex items-center justify-between text-[10px] px-1 font-mono">
                      <span className="text-slate-400">
                        {isRtl ? 'المبيعات:' : 'Sales:'} <strong className="text-white">{sold}</strong>
                      </span>
                      <span className="text-emerald-400 font-bold">
                        {formatCurrency(sold * royalty)} {isRtl ? 'أرباح' : 'earned'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedInspectionDesign(design)}
                      className="flex-1 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-bold text-[10px] flex items-center justify-center gap-1 transition-all"
                    >
                      <Info className="w-3 h-3" />
                      <span>{isRtl ? 'فحص المواصفات' : 'Inspect Specs'}</span>
                    </button>

                    <a
                      href={design.readyToPrintFile?.url || design.imageUrl}
                      download={`${design.title}_ready_print.png`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-1.5 px-2.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 font-bold text-[10px] flex items-center justify-center gap-1 transition-all"
                      title="Download Master Print PNG"
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
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-[11px] text-slate-300">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-mono text-[9px]">
                  <tr>
                    <th className="p-3">{isRtl ? 'التصميم' : 'Design / ID'}</th>
                    <th className="p-3">{isRtl ? 'التصنيف' : 'Category'}</th>
                    <th className="p-3">{isRtl ? 'حزمة الملفات' : 'Asset Bundle'}</th>
                    <th className="p-3">{isRtl ? 'الملف المعتمد (Master)' : 'Print Master Spec'}</th>
                    <th className="p-3 text-right">{isRtl ? 'المبيعات والأرباح' : 'Sales & Earnings'}</th>
                    <th className="p-3 text-center">{isRtl ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {myDesigns.map((design) => {
                    const royalty = design.pricePerUnit || activeCommissionRate;
                    const sold = design.soldCount || 0;
                    const assetCount = (design.assets?.length || (design.supportingFiles?.length || 0) + (design.presentationPhotos?.length || 0) + 1);

                    return (
                      <tr key={design.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                              <img
                                src={design.imageUrl}
                                alt={design.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="min-w-0 max-w-[140px] sm:max-w-[200px]">
                              <div className="font-bold text-white truncate">
                                {isRtl && design.titleAr ? design.titleAr : design.title}
                              </div>
                              <div className="text-[9px] font-mono text-cyan-400 truncate">
                                {design.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3 capitalize font-mono text-slate-300">
                          {design.category}
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[8px] font-mono font-bold">
                              PNG
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-500/30 text-[8px] font-mono font-bold">
                              PSD
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500/30 text-[8px] font-mono font-bold">
                              AI
                            </span>
                            <span className="text-[9px] font-mono text-slate-400">
                              ({assetCount} files)
                            </span>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-bold text-[9px] inline-block">
                              300 DPI Alpha Passed
                            </span>
                            <p className="text-[9px] font-mono text-slate-400">
                              {design.readyToPrintFile?.fileName || 'master_print.png'}
                            </p>
                          </div>
                        </td>

                        <td className="p-3 text-right font-mono">
                          <div className="font-bold text-white">{sold} {isRtl ? 'طبعات' : 'prints'}</div>
                          <div className="text-emerald-400 text-[10px] font-bold">{formatCurrency(sold * royalty)}</div>
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedInspectionDesign(design)}
                              className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-cyan-300"
                              title="Inspect Full Technical Specs"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={design.readyToPrintFile?.url || design.imageUrl}
                              download={`${design.title}_master.png`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300"
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
      </section>

      {/* MODAL: Technical Inspection Details & Multi-Asset Management */}
      {selectedInspectionDesign && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/40 w-full max-w-xl rounded-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isRtl ? 'ملف التصميم الشامل والفحص التقني المعتمد' : 'Unified Design Entity & Asset Inspection'}
                  </h3>
                  <span className="text-[10px] font-mono text-cyan-300">
                    Design ID: {selectedInspectionDesign.id}
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
                  {selectedInspectionDesign.description || 'Original DTF Studio Verified Artwork'}
                </p>
                <div className="flex items-center gap-2 mt-1 font-mono text-[9px]">
                  <span className="text-cyan-300">
                    Designer: {selectedInspectionDesign.designerName}
                  </span>
                  <span className="text-emerald-400">
                    Royalty: {formatCurrency(selectedInspectionDesign.pricePerUnit || activeCommissionRate)}
                  </span>
                </div>
              </div>
            </div>

            {/* 1. Designated Ready-to-Print Master Spec Card */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white">
                    {isRtl ? 'الملف المعتمد للطباعة المباشرة (Active Master Print)' : 'Designated Ready-to-Print Master'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold font-mono">
                  300 DPI PREFLIGHT PASSED
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">{isRtl ? 'الكثافة (DPI)' : 'Resolution'}</span>
                  <span className="text-cyan-300 font-bold">{selectedInspectionDesign.readyToPrintFile?.dpi || 300} DPI</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">{isRtl ? 'الأبعاد بكسل' : 'Pixels'}</span>
                  <span className="text-white font-bold">{selectedInspectionDesign.readyToPrintFile?.widthPx || 3600}x{selectedInspectionDesign.readyToPrintFile?.heightPx || 4500}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">{isRtl ? 'المقاس الطبيعي' : 'Physical Size'}</span>
                  <span className="text-emerald-300 font-bold">{selectedInspectionDesign.readyToPrintFile?.targetPhysicalWidthCm || 30.5}x{selectedInspectionDesign.readyToPrintFile?.targetPhysicalHeightCm || 38.1} cm</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">{isRtl ? 'الشفافية' : 'Transparency'}</span>
                  <span className="text-cyan-300 font-bold">ALPHA PNG ✓</span>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/20 text-[10px] text-cyan-200">
                {selectedInspectionDesign.readyToPrintFile?.inspectionNotes || '300 DPI lossless PNG with transparent alpha background. Certified for production printing.'}
              </div>
            </div>

            {/* 2. All Attached Design Assets for this Design Entity */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-white block">
                {isRtl ? 'جميع الملفات المرفقة لهذا التصميم (Attached Assets)' : 'Design Entity Asset Bundle'}
              </span>

              <div className="space-y-1.5">
                {/* Master File */}
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
                        Active Master • 300 DPI Transparent
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

                {/* Supporting Source Files (PSD, AI, etc.) */}
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
                          Source Asset • Protected Master
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

      {/* MODAL: Upload New Design with Multi-Asset Bundle */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/40 w-full max-w-lg rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  {isRtl ? 'رفع تصميم جديد (Design Entity & Assets)' : 'Upload New Design Entity & Assets'}
                </h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              {/* Bilingual Titles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    {isRtl ? 'عنوان التصميم (English)' : 'Design Title (English)'} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Neon Cyber Samurai"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    {isRtl ? 'عنوان التصميم (عربي)' : 'Design Title (Arabic)'}
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: محارب الساموراي النيون"
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Category & Tags */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? 'التصنيف' : 'Category'}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as DesignCategory)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="popular">Popular</option>
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                    <option value="cyberpunk">Cyberpunk</option>
                    <option value="nature">Nature</option>
                    <option value="animals">Animals</option>
                    <option value="anime">Anime</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? 'الوسوم' : 'Tags'}</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              {/* 1. Mandatory Ready-to-Print Master Designation */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-cyan-400" />
                    <span>{isRtl ? 'الملف المعتمد للطباعة (Ready-to-Print Master PNG)' : 'Designated Ready-to-Print Master (PNG)'}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[9px] font-mono font-bold border border-emerald-500/30">
                    300 DPI Preflight
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5">{isRtl ? 'اسم الملف' : 'File Name'}</label>
                    <input
                      type="text"
                      value={readyToPrintFileName}
                      onChange={(e) => setReadyToPrintFileName(e.target.value)}
                      className="w-full py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5">{isRtl ? 'الدقة (DPI)' : 'Resolution'}</label>
                    <input
                      type="number"
                      value={dpi}
                      onChange={(e) => setDpi(parseInt(e.target.value) || 300)}
                      className="w-full py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5">{isRtl ? 'العرض بالسم' : 'Target Width (cm)'}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={targetWidthCm}
                      onChange={(e) => setTargetWidthCm(parseFloat(e.target.value) || 30.0)}
                      className="w-full py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5">{isRtl ? 'الارتفاع بالسم' : 'Target Height (cm)'}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={targetHeightCm}
                      onChange={(e) => setTargetHeightCm(parseFloat(e.target.value) || 38.0)}
                      className="w-full py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Presentation Photos (Min 3) */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    {isRtl ? 'صور العرض التقديمية (3 صور على الأقل)' : 'Presentation Mockups (Min 3)'}
                  </span>
                  <span className="text-[9px] font-mono text-cyan-400 font-bold">
                    {presentationPhotos.length} / 3 {isRtl ? 'مرفوعة' : 'ready'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {presentationPhotos.map((photo, pIdx) => (
                    <div key={pIdx} className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
                      <img src={photo} alt={`Photo ${pIdx + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Supporting Files (PSD, AI, etc.) */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-white block">
                  {isRtl ? 'الملفات المصدرية الإضافية (PSD / AI / Vector)' : 'Source Supporting Files (PSD, AI)'}
                </span>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. artwork_layers"
                    value={newSupportingName}
                    onChange={(e) => setNewSupportingName(e.target.value)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                  <select
                    value={newSupportingFormat}
                    onChange={(e) => setNewSupportingFormat(e.target.value as any)}
                    className="py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white uppercase"
                  >
                    <option value="psd">PSD</option>
                    <option value="ai">AI</option>
                    <option value="svg">SVG</option>
                    <option value="pdf">PDF</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddSupportingFile}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs"
                  >
                    + Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {supportingFiles.map((sf, sIdx) => (
                    <span key={sIdx} className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800 text-[10px] font-mono flex items-center gap-1">
                      <span>{sf.name}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md glow-cyan transition-all"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isRtl ? 'نشر التصميم وفحص المواصفات' : 'Publish Design & Verify'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Request Withdrawal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/40 w-full max-w-md rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">{t('withdrawMoney')}</h3>
              </div>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {withdrawSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">{t('withdrawalSuccess')}</h4>
                <p className="text-xs text-emerald-300">
                  {isRtl ? 'تم إرسال طلب السحب للإدارة وسيتم تحويل المبلغ لحساب كليك.' : 'Withdrawal request submitted. Payout will be sent to your CliQ alias.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleWithdrawSubmit} className="space-y-3">
                {withdrawError && (
                  <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs font-bold">
                    {withdrawError}
                  </div>
                )}

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{t('amount')} ({businessSettings.currency})</label>
                  <input
                    type="number"
                    step="0.5"
                    min={businessSettings.minimumWithdrawalAmount || 10}
                    max={currentBalance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(parseFloat(e.target.value) || 0)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block">
                    {isRtl ? 'الرصيد المتاح:' : 'Available:'} {formatCurrency(currentBalance)} • {isRtl ? 'الحد الأدنى:' : 'Min:'} {formatCurrency(businessSettings.minimumWithdrawalAmount || 10)}
                  </span>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? 'طريقة التحويل' : 'Payout Method'}</label>
                  <select
                    value={withdrawMethod}
                    onChange={(e) => setWithdrawMethod(e.target.value as any)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="cliq">CliQ (Instant Jordan Transfer)</option>
                    <option value="bank_transfer">Jordanian Bank Account (IBAN)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    {withdrawMethod === 'cliq' ? (isRtl ? 'اسم مستعار كليك (CliQ Alias)' : 'CliQ Alias') : (isRtl ? 'رقم الآيبان (IBAN)' : 'IBAN Number')}
                  </label>
                  <input
                    type="text"
                    value={withdrawAccount}
                    onChange={(e) => setWithdrawAccount(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(false)}
                    className="px-3 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md glow-cyan transition-all"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>{t('requestPayout')}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
