import { Form, Link, useActionData, useLoaderData } from "react-router";
import type { Route } from "./+types/register";
import type { ItemStore } from "../../workers/item-store";
import { ArrowLeft, Brush, Check, ShoppingBag } from "lucide-react";

function store(context: Route.ActionArgs["context"]) { const namespace = context.cloudflare.env.ITEMS as DurableObjectNamespace<ItemStore>; return namespace.get(namespace.idFromName("default")); }

export async function loader({ request }: Route.LoaderArgs) {
  const url=new URL(request.url);
  const type = url.searchParams.get("type") === "designer" ? "designer" : "customer";
  const raw=url.searchParams.get("returnTo")??"/";
  return { type, returnTo:raw.startsWith("/")?raw:"/" };
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const type = String(form.get("type")) === "designer" ? "designer" : "customer";
  const name = String(form.get("displayName") ?? ""), email = String(form.get("email") ?? ""), password = String(form.get("password") ?? ""), confirm = String(form.get("confirmPassword") ?? "");
  const rawReturn=String(form.get("returnTo")??"/"),returnTo=rawReturn.startsWith("/")?rawReturn:"/";
  if (password !== confirm) return { ok: false, error: "Passwords do not match." };
  try {
    const result = await store(context).registerUser({ displayName: name, email, password, role: type });
    const location=type==="designer"?"/designer-qualification":returnTo;
    return new Response(null,{status:303,headers:{Location:location,"Set-Cookie":`dtf_session=${result.sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`}});
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Registration failed." }; }
}

export default function Register() {
  const { type,returnTo } = useLoaderData<typeof loader>(); const result = useActionData<typeof action>(); const designer = type === "designer";
  return <main className="auth-shell" dir="ltr"><div className="auth-orbit" /><section className="auth-card"><Link className="auth-brand" to="/"><span className="brand-mark">◈</span><span>DTF <b>STUDIO</b></span></Link><span className="eyebrow">{designer ? "DESIGNER REGISTRATION" : "CUSTOMER REGISTRATION"}</span><h1>Start your<br /><em>studio account.</em></h1><div className="account-type-note"><span className="option-icon">{designer ? <Brush size={16} /> : <ShoppingBag size={16} />}</span>{designer ? "Designer account · authorization follows qualification review" : "Customer account · shop and personalize prints"}</div>{result?.error && <div className="auth-error">{result.error}</div>}<Form method="post" className="auth-form"><input type="hidden" name="type" value={type} /><input type="hidden" name="returnTo" value={returnTo}/><label htmlFor="displayName">Full name</label><input id="displayName" name="displayName" required autoComplete="name" placeholder="Your full name" /><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" /><label htmlFor="password">Password</label><input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" /><label htmlFor="confirmPassword">Confirm password</label><input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" placeholder="Repeat your password" /><button className="button button-primary full-button" type="submit">Create {designer ? "designer" : "customer"} account <Check size={16} /></button></Form>{designer && <p className="auth-foot designer-note"><Brush size={14} /> Designer approval requires exactly 3 qualification designs and analyzer/preflight review.</p>}<Link className="auth-back" to={"/account-type?returnTo="+encodeURIComponent(returnTo)}><ArrowLeft size={14} /> Change account type</Link></section></main>;
}
