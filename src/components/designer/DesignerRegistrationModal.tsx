import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Sparkles,
  Upload,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Zap,
  ArrowRight,
  FileCheck,
  Eye,
  Info,
  DollarSign,
  Layers,
} from 'lucide-react';
import { astronautArt, samuraiArt, lionArt, wolfNightArt } from '../../data/initialData';
import { evaluatePrintPreflight } from '../../utils/preflight';

export const DesignerRegistrationModal: React.FC = () => {
  const {
    isDesignerRegistrationModalOpen,
    setIsDesignerRegistrationModalOpen,
    registerAndQualifyDesigner,
    businessSettings,
    formatCurrency,
    t,
    isRtl,
  } = useApp();

  // Form Fields
  const [name, setName] = useState('Tareq Al-Masri');
  const [email, setEmail] = useState('tareq.designs@dtfstudio.io');
  const [phone, setPhone] = useState('+962 79 555 9876');
  const [bio, setBio] = useState('Digital artist specializing in streetwear graphics, anime vector art, and DTF print preparation.');
  const [bioAr, setBioAr] = useState('فنان ومصمم رسومات رقمية متخصص في طباعة الأزياء وDTF عالية الدقة.');
  const [cliqAlias, setCliqAlias] = useState('TAREQ_ART@ARABBANK');
  const [iban, setIban] = useState('JO44ARAB0000000987654321098765');

  // 3 Required Sample Designs
  const [sample1, setSample1] = useState({
    title: 'Cyberpunk Night Wolf',
    titleAr: 'ذئب الليل السيبراني',
    category: 'popular',
    imageUrl: wolfNightArt,
    fileName: 'cyber_phoenix_300dpi.png',
    widthPx: 3600,
    heightPx: 4800,
    dpi: 300,
    hasTransparency: true,
    targetWidthCm: 30.5,
    targetHeightCm: 40.6,
  });

  const [sample2, setSample2] = useState({
    title: 'Neo Tokyo Samurai',
    titleAr: 'ساموراي نيو طوكيو',
    category: 'popular',
    imageUrl: samuraiArt,
    fileName: 'samurai_vector_print.png',
    widthPx: 3200,
    heightPx: 4200,
    dpi: 300,
    hasTransparency: true,
    targetWidthCm: 28.0,
    targetHeightCm: 36.0,
  });

  const [sample3, setSample3] = useState({
    title: 'Golden Lion Crest',
    titleAr: 'تاج الأسد الذهبي',
    category: 'popular',
    imageUrl: lionArt,
    fileName: 'lion_crest_dtf.png',
    widthPx: 4000,
    heightPx: 4000,
    dpi: 300,
    hasTransparency: true,
    targetWidthCm: 33.0,
    targetHeightCm: 33.0,
  });

  const [inspectionResults, setInspectionResults] = useState<any[] | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isDesignerRegistrationModalOpen) return null;

  const handleRunInspection = () => {
    setIsInspecting(true);
    setRegistrationError(null);

    setTimeout(() => {
      const evaluateSample = (s: typeof sample1, id: number) => {
        const evaluation = evaluatePrintPreflight({
          fileName: s.fileName,
          format: 'png',
          url: s.imageUrl,
          widthPx: s.widthPx,
          heightPx: s.heightPx,
          dpiMetadata: s.dpi,
          hasTransparency: s.hasTransparency,
          targetWidthCm: s.targetWidthCm,
          targetHeightCm: s.targetHeightCm,
          isReadyToPrintMaster: true,
          assetType: 'ready_to_print_master',
        });

        return {
          id,
          title: s.title,
          titleAr: s.titleAr,
          passed: evaluation.passed,
          dpi: s.dpi,
          effectiveDpi: evaluation.effectiveDpi,
          requiredDpi: evaluation.requiredDpi,
          dimensions: `${s.widthPx} × ${s.heightPx} px`,
          requiredDimensions: `${evaluation.requiredWidthPx} × ${evaluation.requiredHeightPx} px`,
          printSize: `${s.targetWidthCm} × ${s.targetHeightCm} cm`,
          transparency: s.hasTransparency ? (isRtl ? 'خلفية ألفا شفافة ممتازة ✓' : 'Transparent Alpha Pass ✓') : (isRtl ? 'خلفية معتمة (فشل) ✗' : 'Opaque Background (Fail) ✗'),
          score: evaluation.score,
          failedReasons: evaluation.failedReasonsEn,
          failedReasonsAr: evaluation.failedReasonsAr,
          rejectionReason: evaluation.rejectionReason,
          rejectionReasonAr: evaluation.rejectionReasonAr,
          notes: isRtl ? evaluation.notesAr : evaluation.notesEn,
        };
      };

      const results = [
        evaluateSample(sample1, 1),
        evaluateSample(sample2, 2),
        evaluateSample(sample3, 3),
      ];

      setInspectionResults(results);
      setIsInspecting(false);
    }, 600);
  };

  const handleCompleteRegistration = () => {
    setRegistrationError(null);

    const res = registerAndQualifyDesigner({
      name,
      email,
      phone,
      bio,
      bioAr,
      cliqAlias,
      iban,
      sampleDesigns: [
        {
          title: sample1.title,
          titleAr: sample1.titleAr,
          category: sample1.category,
          imageUrl: sample1.imageUrl,
          readyToPrintFileName: sample1.fileName,
          widthPx: sample1.widthPx,
          heightPx: sample1.heightPx,
          dpi: sample1.dpi,
          hasTransparency: sample1.hasTransparency,
          targetWidthCm: sample1.targetWidthCm,
          targetHeightCm: sample1.targetHeightCm,
        },
        {
          title: sample2.title,
          titleAr: sample2.titleAr,
          category: sample2.category,
          imageUrl: sample2.imageUrl,
          readyToPrintFileName: sample2.fileName,
          widthPx: sample2.widthPx,
          heightPx: sample2.heightPx,
          dpi: sample2.dpi,
          hasTransparency: sample2.hasTransparency,
          targetWidthCm: sample2.targetWidthCm,
          targetHeightCm: sample2.targetHeightCm,
        },
        {
          title: sample3.title,
          titleAr: sample3.titleAr,
          category: sample3.category,
          imageUrl: sample3.imageUrl,
          readyToPrintFileName: sample3.fileName,
          widthPx: sample3.widthPx,
          heightPx: sample3.heightPx,
          dpi: sample3.dpi,
          hasTransparency: sample3.hasTransparency,
          targetWidthCm: sample3.targetWidthCm,
          targetHeightCm: sample3.targetHeightCm,
        },
      ],
    });

    if (res.success) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsDesignerRegistrationModalOpen(false);
      }, 1800);
    } else {
      setRegistrationError(res.errors?.[0] || 'Registration failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#0B0F19] border border-cyan-500/40 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white flex items-center justify-center font-bold shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white">
                  {isRtl ? 'تسجيل شريك مصمم معتمد (تأهيل آلي فوري)' : 'Become a DTF Partner Designer (Instant Auto-Qualification)'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-black border border-cyan-500/40">
                  {formatCurrency(businessSettings.defaultDesignerFlatRoyalty || 0.50)} / {isRtl ? 'قطعة' : 'sale'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isRtl ? 'قدّم 3 تصاميم تجريبية، يفحصها النظام آلياً ويمنحك الاعتماد الفوري بدون انتظار الموافقة اليدوية' : 'Submit 3 sample designs. System automatically checks 300 DPI transparency & grants instant approval'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsDesignerRegistrationModalOpen(false)}
            className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-100 no-scrollbar">
          {isSuccess ? (
            <div className="py-12 px-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-white">
                {isRtl ? '🎉 مبروك! تم اعتماد حسابك كمصمم رسمي فوراً' : '🎉 Instant Qualification Approved!'}
              </h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                {isRtl
                  ? `اجتازت تصاميمك الثلاثة معايير 300 DPI والشفافية بنجاح بنسبة 100%. تم تفعيل ملفك وتعيين عمولتك الافتراضية ${formatCurrency(businessSettings.defaultDesignerFlatRoyalty || 0.50)} لكل قطعة. جاري تحويلك للوحة التحكم...`
                  : `All 3 sample designs verified successfully. Your royalty is active at ${formatCurrency(businessSettings.defaultDesignerFlatRoyalty || 0.50)} per sold unit. Redirecting to your Designer Dashboard...`}
              </p>
            </div>
          ) : (
            <>
              {/* Step 1: Personal & Payout Info */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-black">1</span>
                  <span>{isRtl ? 'بيانات المصمم ومعلومات تحويل الأرباح (كليك / بنك)' : 'Designer Profile & Payout Details'}</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-1">
                      {isRtl ? 'الاسم الكامل / الاسم التجاري *' : 'Full Name / Brand Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-1">
                      {isRtl ? 'البريد الإلكتروني *' : 'Email Address *'}
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-1">
                      {isRtl ? 'رقم الهاتف (الأردن +962) *' : 'Phone Number (+962) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-1">
                      {isRtl ? 'الاسم المستعار في كليك (CliQ Alias) *' : 'CliQ Alias (Jordan) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={cliqAlias}
                      onChange={(e) => setCliqAlias(e.target.value)}
                      placeholder="e.g. USERNAME@BANK"
                      className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-cyan-500/40 text-xs text-cyan-300 outline-none focus:border-cyan-400 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-300 block mb-1">
                    {isRtl ? 'الآيبان البنكي (IBAN اختياري)' : 'Bank IBAN (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 outline-none focus:border-cyan-500 font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Step 2: 3 Mandatory Sample Designs for Auto Inspection */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-black">2</span>
                    <span>{isRtl ? 'تقديم 3 تصاميم تجريبية مختلفة للفحص الآلي' : 'Submit 3 Different Sample Designs for Automated Inspection'}</span>
                  </h3>
                  <span className="text-[10px] text-cyan-400 font-mono font-bold">
                    3 / 3 {isRtl ? 'تصاميم مطلوبة' : 'Required'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {isRtl
                    ? 'يشترط النظام تقديم 3 ملفات بصيغة PNG بدقة لا تقل عن 300 DPI مع خلفية شفافة مفروغة بالكامل وطباعة واضحة.'
                    : 'System requires 3 lossless PNG files at ≥300 DPI with 100% transparent alpha backgrounds.'}
                </p>

                {/* Grid of 3 Samples */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Sample 1 Card */}
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-cyan-400">#1 {isRtl ? 'التصميم الأول' : 'Sample 1'}</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                        sample1.dpi >= 300 && sample1.hasTransparency
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {sample1.dpi} DPI • {sample1.hasTransparency ? 'PNG' : 'Opaque'}
                      </span>
                    </div>

                    <div className="w-full h-24 rounded-xl bg-slate-900 overflow-hidden relative border border-slate-800 flex items-center justify-center">
                      <img
                        src={sample1.imageUrl}
                        alt="Sample 1"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain p-1"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-0.5">{isRtl ? 'العنوان' : 'Title'}</label>
                      <input
                        type="text"
                        value={sample1.title}
                        onChange={(e) => setSample1({ ...sample1, title: e.target.value })}
                        className="w-full py-1 px-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-white"
                      />
                    </div>

                    {/* Quality Controls */}
                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                      <div>
                        <label className="text-[8px] font-bold text-slate-400 block mb-0.5">DPI</label>
                        <select
                          value={sample1.dpi}
                          onChange={(e) => setSample1({ ...sample1, dpi: Number(e.target.value) })}
                          className="w-full py-1 px-1 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-white"
                        >
                          <option value={300}>300 DPI (Pass)</option>
                          <option value={200}>200 DPI (Low)</option>
                          <option value={72}>72 DPI (Fail)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[8px] font-bold text-slate-400 block mb-0.5">{isRtl ? 'الشفافية' : 'Alpha'}</label>
                        <button
                          type="button"
                          onClick={() => setSample1({ ...sample1, hasTransparency: !sample1.hasTransparency })}
                          className={`w-full py-1 px-1 rounded-md text-[10px] font-bold border transition-colors ${
                            sample1.hasTransparency
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                          }`}
                        >
                          {sample1.hasTransparency ? 'Transparent ✓' : 'Opaque ✗'}
                        </button>
                      </div>
                    </div>

                    <div className="text-[9px] font-mono text-slate-400 space-y-0.5 bg-slate-900/80 p-1.5 rounded-lg">
                      <p className="flex justify-between"><span>Resolution:</span> <span className="text-slate-200">{sample1.widthPx}x{sample1.heightPx}px</span></p>
                      <p className="flex justify-between"><span>Print Size:</span> <span className="text-slate-200">{sample1.targetWidthCm}x{sample1.targetHeightCm}cm</span></p>
                    </div>
                  </div>

                  {/* Sample 2 Card */}
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-cyan-400">#2 {isRtl ? 'التصميم الثاني' : 'Sample 2'}</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                        sample2.dpi >= 300 && sample2.hasTransparency
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {sample2.dpi} DPI • {sample2.hasTransparency ? 'PNG' : 'Opaque'}
                      </span>
                    </div>

                    <div className="w-full h-24 rounded-xl bg-slate-900 overflow-hidden relative border border-slate-800 flex items-center justify-center">
                      <img
                        src={sample2.imageUrl}
                        alt="Sample 2"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain p-1"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-0.5">{isRtl ? 'العنوان' : 'Title'}</label>
                      <input
                        type="text"
                        value={sample2.title}
                        onChange={(e) => setSample2({ ...sample2, title: e.target.value })}
                        className="w-full py-1 px-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-white"
                      />
                    </div>

                    {/* Quality Controls */}
                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                      <div>
                        <label className="text-[8px] font-bold text-slate-400 block mb-0.5">DPI</label>
                        <select
                          value={sample2.dpi}
                          onChange={(e) => setSample2({ ...sample2, dpi: Number(e.target.value) })}
                          className="w-full py-1 px-1 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-white"
                        >
                          <option value={300}>300 DPI (Pass)</option>
                          <option value={200}>200 DPI (Low)</option>
                          <option value={72}>72 DPI (Fail)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[8px] font-bold text-slate-400 block mb-0.5">{isRtl ? 'الشفافية' : 'Alpha'}</label>
                        <button
                          type="button"
                          onClick={() => setSample2({ ...sample2, hasTransparency: !sample2.hasTransparency })}
                          className={`w-full py-1 px-1 rounded-md text-[10px] font-bold border transition-colors ${
                            sample2.hasTransparency
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                          }`}
                        >
                          {sample2.hasTransparency ? 'Transparent ✓' : 'Opaque ✗'}
                        </button>
                      </div>
                    </div>

                    <div className="text-[9px] font-mono text-slate-400 space-y-0.5 bg-slate-900/80 p-1.5 rounded-lg">
                      <p className="flex justify-between"><span>Resolution:</span> <span className="text-slate-200">{sample2.widthPx}x{sample2.heightPx}px</span></p>
                      <p className="flex justify-between"><span>Print Size:</span> <span className="text-slate-200">{sample2.targetWidthCm}x{sample2.targetHeightCm}cm</span></p>
                    </div>
                  </div>

                  {/* Sample 3 Card */}
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-cyan-400">#3 {isRtl ? 'التصميم الثالث' : 'Sample 3'}</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                        sample3.dpi >= 300 && sample3.hasTransparency
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {sample3.dpi} DPI • {sample3.hasTransparency ? 'PNG' : 'Opaque'}
                      </span>
                    </div>

                    <div className="w-full h-24 rounded-xl bg-slate-900 overflow-hidden relative border border-slate-800 flex items-center justify-center">
                      <img
                        src={sample3.imageUrl}
                        alt="Sample 3"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain p-1"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-0.5">{isRtl ? 'العنوان' : 'Title'}</label>
                      <input
                        type="text"
                        value={sample3.title}
                        onChange={(e) => setSample3({ ...sample3, title: e.target.value })}
                        className="w-full py-1 px-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-white"
                      />
                    </div>

                    {/* Quality Controls */}
                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                      <div>
                        <label className="text-[8px] font-bold text-slate-400 block mb-0.5">DPI</label>
                        <select
                          value={sample3.dpi}
                          onChange={(e) => setSample3({ ...sample3, dpi: Number(e.target.value) })}
                          className="w-full py-1 px-1 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-white"
                        >
                          <option value={300}>300 DPI (Pass)</option>
                          <option value={200}>200 DPI (Low)</option>
                          <option value={72}>72 DPI (Fail)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[8px] font-bold text-slate-400 block mb-0.5">{isRtl ? 'الشفافية' : 'Alpha'}</label>
                        <button
                          type="button"
                          onClick={() => setSample3({ ...sample3, hasTransparency: !sample3.hasTransparency })}
                          className={`w-full py-1 px-1 rounded-md text-[10px] font-bold border transition-colors ${
                            sample3.hasTransparency
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                          }`}
                        >
                          {sample3.hasTransparency ? 'Transparent ✓' : 'Opaque ✗'}
                        </button>
                      </div>
                    </div>

                    <div className="text-[9px] font-mono text-slate-400 space-y-0.5 bg-slate-900/80 p-1.5 rounded-lg">
                      <p className="flex justify-between"><span>Resolution:</span> <span className="text-slate-200">{sample3.widthPx}x{sample3.heightPx}px</span></p>
                      <p className="flex justify-between"><span>Print Size:</span> <span className="text-slate-200">{sample3.targetWidthCm}x{sample3.targetHeightCm}cm</span></p>
                    </div>
                  </div>
                </div>

                {/* Trigger Automated Inspection Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleRunInspection}
                    disabled={isInspecting}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Zap className={`w-4 h-4 ${isInspecting ? 'animate-spin' : ''}`} />
                    <span>
                      {isInspecting
                        ? (isRtl ? 'جاري فحص دقة وجودة الـ 3 تصاميم...' : 'Inspecting 3 Samples at 300 DPI...')
                        : (isRtl ? 'تشغيل الفحص الآلي لمواصفات الطباعة (Run Automated DTF Inspection)' : 'Run Automated DTF Quality Inspection on 3 Samples')}
                    </span>
                  </button>
                </div>

                {/* Inspection Results Dashboard */}
                {inspectionResults && (
                  <div className={`p-3.5 rounded-2xl border space-y-3 animate-fadeIn ${
                    inspectionResults.every(r => r.passed)
                      ? 'bg-slate-950 border-emerald-500/40'
                      : 'bg-rose-950/20 border-rose-500/40'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {inspectionResults.every(r => r.passed) ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-rose-400" />
                        )}
                        <h4 className="text-xs font-bold text-white">
                          {inspectionResults.every(r => r.passed)
                            ? (isRtl ? 'نتائج الفحص الآلي: مؤهل للاعتماد الفوري 100%' : 'Automated Inspection Results: 100% Qualified!')
                            : (isRtl ? 'نتائج الفحص الآلي: تم رفض بعض النماذج لعدم استيفاء المعايير' : 'Automated Inspection: Rejection Criteria Detected')}
                        </h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        inspectionResults.every(r => r.passed)
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {inspectionResults.filter(r => r.passed).length} / 3 PASSED
                      </span>
                    </div>

                    <div className="space-y-2">
                      {inspectionResults.map((r) => (
                        <div
                          key={r.id}
                          className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] ${
                            r.passed
                              ? 'bg-slate-900/90 border-slate-800'
                              : 'bg-rose-950/40 border-rose-500/50'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white truncate">{r.title}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                r.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                              }`}>
                                {r.passed ? `${r.score}/100 PASS` : 'REJECTED'}
                              </span>
                            </div>
                            <p className={`text-[10px] mt-0.5 ${r.passed ? 'text-slate-400' : 'text-rose-300 font-semibold'}`}>
                              {r.notes}
                            </p>
                          </div>

                          <div className="text-right flex-shrink-0 font-mono text-[10px] space-y-0.5">
                            <span className="text-cyan-300 block">{r.dimensions} ({r.printSize})</span>
                            <span className={r.passed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                              {r.dpi} DPI • {r.transparency}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-[10px] ${
                      inspectionResults.every(r => r.passed)
                        ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300'
                        : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                    }`}>
                      <Info className="w-4 h-4 flex-shrink-0" />
                      <span>
                        {inspectionResults.every(r => r.passed)
                          ? (isRtl
                              ? `سيتم اعتمادك فوراً بدون انتظار موافقة المسؤول، وتفعيل عمولتك الافتراضية ${formatCurrency(businessSettings.defaultDesignerFlatRoyalty || 0.50)} لكل مبيعة.`
                              : `Instant approval enabled! Your initial commission rate will be set to ${formatCurrency(businessSettings.defaultDesignerFlatRoyalty || 0.50)} per unit sold.`)
                          : (isRtl
                              ? 'يجب أن تجتاز جميع النماذج الثلاثة الفحص الفني (300 DPI وخلفية شفافة) لتتمكن من إتمام التسجيل.'
                              : 'All 3 sample designs must pass 300 DPI transparent alpha inspection to complete registration.')}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {registrationError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{registrationError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsDesignerRegistrationModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 transition-all"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="button"
                  onClick={handleCompleteRegistration}
                  className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all active:scale-95"
                >
                  <span>{isRtl ? 'إتمام التسجيل والاعتماد الفوري' : 'Complete Instant Registration & Activate'}</span>
                  <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
