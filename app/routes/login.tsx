import { Form, Link, useActionData, useLoaderData } from "react-router";
import type { Route } from "./+types/login";
import type { ItemStore } from "../../workers/item-store";
import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";

function store(context: Route.ActionArgs["context"]) { const namespace = context.cloudflare.env.ITEMS as DurableObjectNamespace<ItemStore>; return namespace.get(namespace.idFromName("default")); }

export async function loader({ request }: Route.LoaderArgs) { return { returnTo: new URL(request.url).searchParams.get("returnTo") ?? "/" }; }

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const identifier = String(form.get("identifier") ?? "");
  const password = String(form.get("password") ?? "");
  if (!identifier || !password) return { ok: false, error: "Enter your email or phone and password." };
  const result = await store(context).loginUser(identifier, password);
  if (!result) return { ok: false, error: "The sign-in details were not recognized." };
  const returnTo = String(form.get("returnTo") ?? "/");
  return new Response(null, { status: 303, headers: { Location: returnTo.startsWith("/") ? returnTo : "/", "Set-Cookie": `dtf_session=${result.sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000` } });
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const { returnTo } = useLoaderData<typeof loader>();
  return <main className="auth-shell" dir="ltr"><div className="auth-orbit" /><section className="auth-card"><Link className="auth-brand" to="/"><span className="brand-mark">◈</span><span>DTF <b>STUDIO</b></span></Link><span className="eyebrow">WELCOME BACK</span><h1>Make something<br /><em>worth wearing.</em></h1><p className="auth-intro">Sign in to continue as a customer or designer. Your permissions decide where you go next — there is no role switcher.</p>{actionData?.error && <div className="auth-error">{actionData.error}</div>}<Form method="post" className="auth-form"><input type="hidden" name="returnTo" value={returnTo} /><label htmlFor="identifier">Email or phone</label><input id="identifier" name="identifier" type="text" autoComplete="username" required placeholder="you@example.com" /><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required placeholder="Your password" /><button className="button button-primary full-button" type="submit">Sign in <ArrowRight size={16} /></button></Form><div className="auth-divider"><span /> or <span /></div><Link className="button button-ghost full-button" to={"/account-type?returnTo="+encodeURIComponent(returnTo)}>Create account</Link><div className="auth-foot"><span><ShieldCheck size={14} /> Secure session</span><Link to="/login">Forgot password?</Link></div><Link className="auth-back" to="/"><ArrowLeft size={14} /> Back to storefront</Link></section></main>;
}
