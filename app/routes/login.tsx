import { Form, Link, useActionData, useLoaderData } from "react-router";
import type { Route } from "./+types/login";
import type { ItemStore } from "../../workers/item-store";
import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { localeDir, localeFromRequest, pick, useAppLocale } from "../i18n";

function store(context: Route.ActionArgs["context"]) { const namespace = context.cloudflare.env.ITEMS as DurableObjectNamespace<ItemStore>; return namespace.get(namespace.idFromName("default")); }

export async function loader({ request }: Route.LoaderArgs) { return { returnTo: new URL(request.url).searchParams.get("returnTo") ?? "/" }; }

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const identifier = String(form.get("identifier") ?? "");
  const password = String(form.get("password") ?? "");
  const locale=localeFromRequest(request);
  if (!identifier || !password) return { ok: false, error: pick(locale,"Enter your email or phone and password.","أدخل البريد الإلكتروني أو رقم الهاتف وكلمة المرور.") };
  const result = await store(context).loginUser(identifier, password);
  if (!result) return { ok: false, error: pick(locale,"The sign-in details were not recognized.","بيانات تسجيل الدخول غير صحيحة.") };
  const returnTo = String(form.get("returnTo") ?? "/");
  return new Response(null, { status: 303, headers: { Location: returnTo.startsWith("/") ? returnTo : "/", "Set-Cookie": `dtf_session=${result.sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000` } });
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const { returnTo } = useLoaderData<typeof loader>();
  const locale=useAppLocale();
  const t=(en:string,ar:string)=>pick(locale,en,ar);
  return <main className="auth-shell" dir={localeDir(locale)}><div className="auth-orbit" /><section className="auth-card"><Link className="auth-brand" to="/"><span className="brand-mark">◈</span><span>DTF <b>STUDIO</b></span></Link><span className="eyebrow">{t("WELCOME BACK","مرحباً بعودتك")}</span><h1>{t("Make something","اصنع شيئاً")}<br /><em>{t("worth wearing.","يستحق أن ترتديه.")}</em></h1><p className="auth-intro">{t("Sign in to continue as a customer or designer. Your permissions decide where you go next — there is no role switcher.","سجّل الدخول للمتابعة كعميل أو مصمم. صلاحيات حسابك تحدد وجهتك التالية ولا يوجد تبديل يدوي للأدوار.")}</p>{actionData?.error && <div className="auth-error">{actionData.error}</div>}<Form method="post" className="auth-form"><input type="hidden" name="returnTo" value={returnTo} /><label htmlFor="identifier">{t("Email or phone","البريد الإلكتروني أو الهاتف")}</label><input id="identifier" name="identifier" type="text" autoComplete="username" required placeholder={t("you@example.com","you@example.com")} /><label htmlFor="password">{t("Password","كلمة المرور")}</label><input id="password" name="password" type="password" autoComplete="current-password" required placeholder={t("Your password","كلمة المرور")}/><button className="button button-primary full-button" type="submit">{t("Sign in","تسجيل الدخول")} <ArrowRight size={16} /></button></Form><div className="auth-divider"><span /> {t("or","أو")} <span /></div><Link className="button button-ghost full-button" to={"/account-type?returnTo="+encodeURIComponent(returnTo)}>{t("Create account","إنشاء حساب")}</Link><div className="auth-foot"><span><ShieldCheck size={14} /> {t("Secure session","جلسة آمنة")}</span><Link to="/login">{t("Forgot password?","نسيت كلمة المرور؟")}</Link></div><Link className="auth-back" to="/"><ArrowLeft size={14} /> {t("Back to storefront","العودة للمتجر")}</Link></section></main>;
}
