import { Link } from "react-router";
import { ArrowLeft, Check, FileUp, LockKeyhole } from "lucide-react";
import { localeDir, pick, useAppLocale } from "../i18n";

export default function DesignerQualification() {
  const locale=useAppLocale();
  const t=(en:string,ar:string)=>pick(locale,en,ar);
  return <main className="auth-shell qualification-shell" dir={localeDir(locale)}><section className="qualification-card"><Link className="auth-brand" to="/"><span className="brand-mark">◈</span><span>DTF <b>STUDIO</b></span></Link><span className="eyebrow">{t("DESIGNER QUALIFICATION / 3 DESIGNS","تأهيل المصمم / 3 تصاميم")}</span><h1>{t("Show us","أرنا")}<br /><em>{t("your point of view.","وجهة نظرك.")}</em></h1><p className="auth-intro">{t("Exactly three qualification designs are required. Each design will be previewed and analyzed before Submit for Review becomes available.","مطلوب ثلاثة تصاميم تأهيلية بالضبط. تتم معاينة كل تصميم وتحليله قبل تفعيل زر الإرسال للمراجعة.")}</p><div className="qualification-grid">{[1, 2, 3].map((slot) => <div className="qualification-slot" key={slot}><span className="slot-number">0{slot}</span><FileUp size={22} /><b>{t("Upload design","رفع التصميم")}</b><small>PNG, JPG, WebP, SVG, PDF</small></div>)}</div><div className="qualification-foot"><span><LockKeyhole size={14} /> {t("Designer Dashboard unlocks after Admin approval.","يتم فتح لوحة المصمم بعد موافقة الإدارة.")}</span><button className="button button-primary" disabled>{t("Submit for review","إرسال للمراجعة")} <Check size={16} /></button></div><Link className="auth-back" to="/"><ArrowLeft size={14} /> {t("Back to storefront","العودة للمتجر")}</Link></section></main>;
}
