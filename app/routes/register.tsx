import { Form, Link, useActionData, useLoaderData } from "react-router";
import type { Route } from "./+types/register";
import { ArrowLeft, Brush, Check, ShoppingBag } from "lucide-react";
import { localeDir, localeFromRequest, pick, useAppLocale } from "../i18n";
import { appendOdooSessionCookies, fetchOdooResponse } from "../lib/odoo-api.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url=new URL(request.url); const type=url.searchParams.get("type")==="designer"?"designer":"customer";
  const raw=url.searchParams.get("returnTo")??"/"; return {type,returnTo:raw.startsWith("/")?raw:"/"};
}
export async function action({ request, context }: Route.ActionArgs) {
  const form=await request.formData(); const type=String(form.get("type"))==="designer"?"designer":"customer";
  const name=String(form.get("displayName")??""), email=String(form.get("email")??""), password=String(form.get("password")??""), confirm=String(form.get("confirmPassword")??"");
  const rawReturn=String(form.get("returnTo")??"/"), returnTo=rawReturn.startsWith("/")?rawReturn:"/"; const locale=localeFromRequest(request);
  if(password!==confirm) return {ok:false,error:pick(locale,"Passwords do not match.","كلمتا المرور غير متطابقتين.")};
  const upstream=await fetchOdooResponse(request,context,"/api/dtf/v1/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({displayName:name,email,password,role:type})});
  if(!upstream.ok) return {ok:false,error:pick(locale,"Registration failed. Please check your details or use another email.","فشل التسجيل. تحقق من البيانات أو استخدم بريداً آخر.")};
  const headers=new Headers({Location:type==="designer"?"/designer-qualification":returnTo}); appendOdooSessionCookies(headers,upstream);
  return new Response(null,{status:303,headers});
}
export default function Register() {
  const { type,returnTo } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const designer = type === "designer";
  const locale=useAppLocale();
  const t=(en:string,ar:string)=>pick(locale,en,ar);
  return <main className="auth-shell" dir={localeDir(locale)}><div className="auth-orbit" /><section className="auth-card"><Link className="auth-brand" to="/"><span className="brand-mark">◈</span><span>DTF <b>STUDIO</b></span></Link><span className="eyebrow">{designer ? t("DESIGNER REGISTRATION","تسجيل مصمم") : t("CUSTOMER REGISTRATION","تسجيل عميل")}</span><h1>{t("Start your","ابدأ")}<br /><em>{t("studio account.","حسابك في الاستوديو.")}</em></h1><div className="account-type-note"><span className="option-icon">{designer ? <Brush size={16} /> : <ShoppingBag size={16} />}</span>{designer ? t("Designer account · authorization follows qualification review","حساب مصمم · الاعتماد بعد مراجعة التأهيل") : t("Customer account · shop and personalize prints","حساب عميل · تسوق وخصص المطبوعات")}</div>{result?.error && <div className="auth-error">{result.error}</div>}<Form method="post" className="auth-form"><input type="hidden" name="type" value={type} /><input type="hidden" name="returnTo" value={returnTo}/><label htmlFor="displayName">{t("Full name","الاسم الكامل")}</label><input id="displayName" name="displayName" required autoComplete="name" placeholder={t("Your full name","اسمك الكامل")} /><label htmlFor="email">{t("Email","البريد الإلكتروني")}</label><input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" /><label htmlFor="password">{t("Password","كلمة المرور")}</label><input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" placeholder={t("At least 8 characters","8 أحرف على الأقل")} /><label htmlFor="confirmPassword">{t("Confirm password","تأكيد كلمة المرور")}</label><input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" placeholder={t("Repeat your password","أعد إدخال كلمة المرور")} /><button className="button button-primary full-button" type="submit">{designer ? t("Create designer account","إنشاء حساب مصمم") : t("Create customer account","إنشاء حساب عميل")} <Check size={16} /></button></Form>{designer && <p className="auth-foot designer-note"><Brush size={14} /> {t("Designer approval requires exactly 3 qualification designs and analyzer/preflight review.","اعتماد المصمم يتطلب ثلاثة تصاميم تأهيلية بالضبط مع فحص وتحليل مسبق.")}</p>}<Link className="auth-back" to={"/account-type?returnTo="+encodeURIComponent(returnTo)}><ArrowLeft size={14} /> {t("Change account type","تغيير نوع الحساب")}</Link></section></main>;
}
