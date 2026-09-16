import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/account-type";
import { ArrowLeft, ArrowRight, Brush, ShoppingBag } from "lucide-react";
import { localeDir, pick, useAppLocale } from "../i18n";

export async function loader({request}:Route.LoaderArgs){
  const raw=new URL(request.url).searchParams.get("returnTo")??"/";
  return {returnTo:raw.startsWith("/")?raw:"/"};
}

export default function AccountType() {
  const {returnTo}=useLoaderData<typeof loader>();
  const locale=useAppLocale();
  const t=(en:string,ar:string)=>pick(locale,en,ar);
  const customer="/register?type=customer&returnTo="+encodeURIComponent(returnTo);
  const designer="/register?type=designer";
  const login="/login?returnTo="+encodeURIComponent(returnTo);
  return <main className="auth-shell" dir={localeDir(locale)}><div className="auth-orbit" /><section className="auth-card account-type-card"><Link className="auth-brand" to="/"><span className="brand-mark">◈</span><span>DTF <b>STUDIO</b></span></Link><span className="eyebrow">{t("CREATE ACCOUNT","إنشاء حساب")}</span><h1>{t("Choose how","اختر كيف")}<br /><em>{t("you create.","تريد أن تبدأ.")}</em></h1><p className="auth-intro">{t("Account type is selected only during registration. You can still shop as a customer after becoming a designer.","يتم اختيار نوع الحساب أثناء التسجيل فقط. ويمكنك الاستمرار في التسوق كعميل حتى بعد أن تصبح مصمماً.")}</p><div className="account-options"><Link className="account-option" to={customer}><span className="option-icon"><ShoppingBag size={20} /></span><span><b>{t("Customer","عميل")}</b><small>{t("Shop, customize and order prints.","تسوق وخصص واطلب المطبوعات.")}</small></span><ArrowRight size={17} /></Link><Link className="account-option" to={designer}><span className="option-icon blue"><Brush size={20} /></span><span><b>{t("Designer","مصمم")}</b><small>{t("Submit your work for authorization and publish designs.","أرسل أعمالك للاعتماد ثم انشر تصاميمك.")}</small></span><ArrowRight size={17} /></Link></div><Link className="auth-back" to={login}><ArrowLeft size={14} /> {t("Already have an account? Sign in","لديك حساب؟ سجّل الدخول")}</Link></section></main>;
}
