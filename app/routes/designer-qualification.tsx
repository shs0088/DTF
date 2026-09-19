import { Link } from "react-router";
import { ArrowLeft, Check, FileUp, LockKeyhole, X } from "lucide-react";
import { useMemo, useState } from "react";

type QualificationFile = { id: string; file: File; previewUrl?: string; state: "ready" | "blocked"; message?: string };
type Slot = { files: QualificationFile[] };

const COPY = {
  en: { eyebrow: "DESIGNER QUALIFICATION / 3 DESIGNS", title: <>Show us<br /><em>your point of view.</em></>, intro: "Exactly three qualification designs are required. Each design may contain multiple files. Files are checked locally first; nothing is submitted or marked successful until server storage and preflight are available.", upload: "Add files", formats: "PNG, JPG, WebP, SVG or PDF · up to 50 MB each", remove: "Remove", empty: "No files selected", ready: "Ready for server preflight", blocked: "Needs review", submit: "Submit for review", locked: "Submission is unavailable until secure upload storage is configured.", dashboard: "Designer Dashboard unlocks after Admin approval.", back: "Back to storefront", lang: "العربية" },
  ar: { eyebrow: "تأهيل المصمم / ٣ تصاميم", title: <>أرنا<br /><em>وجهة نظرك.</em></>, intro: "يلزم تقديم ثلاثة تصاميم بالضبط. يمكن أن يحتوي كل تصميم على عدة ملفات. يتم الفحص محلياً أولاً؛ لا يتم الإرسال أو ادعاء النجاح قبل توفر التخزين الآمن والفحص على الخادم.", upload: "إضافة ملفات", formats: "PNG وJPG وWebP وSVG وPDF · حد ٥٠ ميجابايت لكل ملف", remove: "حذف", empty: "لم يتم اختيار ملفات", ready: "جاهز للفحص على الخادم", blocked: "يتطلب المراجعة", submit: "إرسال للمراجعة", locked: "الإرسال غير متاح حتى يتم إعداد التخزين الآمن للرفع.", dashboard: "تُفتح لوحة المصمم بعد موافقة الإدارة.", back: "العودة إلى المتجر", lang: "English" }
} as const;

function inspect(file: File): QualificationFile {
  const name = file.name.toLowerCase();
  const allowed = [".png", ".jpg", ".jpeg", ".webp", ".svg", ".pdf"].some((ext) => name.endsWith(ext));
  const sizeOk = file.size > 0 && file.size <= 50 * 1024 * 1024;
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
    file,
    previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    state: allowed && sizeOk ? "ready" : "blocked",
    message: !allowed ? "Unsupported file format." : !sizeOk ? "File must be between 1 byte and 50 MB." : undefined,
  };
}

export default function DesignerQualification() {
  const [locale, setLocale] = useState<"en" | "ar">("en");
  const [slots, setSlots] = useState<Slot[]>([{ files: [] }, { files: [] }, { files: [] }]);
  const t = COPY[locale];
  const selectedCount = useMemo(() => slots.filter((slot) => slot.files.length > 0).length, [slots]);
  const canSubmit = selectedCount === 3 && slots.every((slot) => slot.files.every((item) => item.state === "ready"));

  function addFiles(slotIndex: number, list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).map(inspect);
    setSlots((current) => current.map((slot, index) => index === slotIndex ? { files: [...slot.files, ...next] } : slot));
  }

  function removeFile(slotIndex: number, id: string) {
    setSlots((current) => current.map((slot, index) => {
      if (index !== slotIndex) return slot;
      const target = slot.files.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return { files: slot.files.filter((item) => item.id !== id) };
    }));
  }

  return <main className="auth-shell qualification-shell" dir={locale === "ar" ? "rtl" : "ltr"}>
    <section className="qualification-card qualification-workflow">
      <div className="qualification-top"><Link className="auth-brand" to="/"><span className="brand-mark">◈</span><span>DTF <b>STUDIO</b></span></Link><button className="lang-switch" type="button" onClick={() => setLocale(locale === "en" ? "ar" : "en")}>{t.lang}</button></div>
      <span className="eyebrow">{t.eyebrow}</span><h1>{t.title}</h1><p className="auth-intro">{t.intro}</p>
      <div className="qualification-grid">{slots.map((slot, index) => <div className="qualification-slot" key={index}>
        <span className="slot-number">0{index + 1}</span><FileUp size={22} /><b>{t.upload}</b><small>{t.formats}</small>
        <input aria-label={`${t.upload} ${index + 1}`} type="file" multiple accept=".png,.jpg,.jpeg,.webp,.svg,.pdf" onChange={(event) => { addFiles(index, event.currentTarget.files); event.currentTarget.value = ""; }} />
        {slot.files.length === 0 && <span className="qualification-empty">{t.empty}</span>}
        <div className="qualification-files">{slot.files.map((item) => <div className="qualification-file" key={item.id}>
          {item.previewUrl ? <img src={item.previewUrl} alt="" /> : <span className="qualification-file-icon">PDF</span>}
          <span><b>{item.file.name}</b><small>{item.state === "ready" ? t.ready : `${t.blocked} · ${item.message}`}</small></span>
          <button type="button" aria-label={`${t.remove} ${item.file.name}`} onClick={() => removeFile(index, item.id)}><X size={14} /></button>
        </div>)}</div>
      </div>)}</div>
      <div className="qualification-foot"><span><LockKeyhole size={14} /> {t.dashboard}</span><button className="button button-primary" type="button" disabled={!canSubmit} title={t.locked}>{t.submit} <Check size={16} /></button></div>
      <p className="qualification-storage-note">{t.locked}</p><Link className="auth-back" to="/"><ArrowLeft size={14} /> {t.back}</Link>
    </section>
  </main>;
}
