import { Form, Link, useLoaderData } from "react-router";
import type { Route } from "./+types/admin";
import { adminConfigured, createAdminSession, verifyAdminSession } from "../../workers/admin-auth";
import { ArrowLeft, BarChart3, Boxes, ClipboardCheck, FileText, LayoutDashboard, LockKeyhole, LogIn, Package, Settings2, ShieldCheck, Users } from "lucide-react";

function envForAuth(context: Route.LoaderArgs["context"]) { return context.cloudflare.env as unknown as { ADMIN_WEB_KEY?: string }; }

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = envForAuth(context);
  return { configured: adminConfigured(env), authenticated: await verifyAdminSession(request, env), error: new URL(request.url).searchParams.get("error") === "1" };
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  if (form.get("intent") === "logout") return new Response(null, { status: 303, headers: { "Location": "/admin", "Set-Cookie": "dtf_admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0" } });
  const env = context.cloudflare.env as unknown as { ADMIN_WEB_KEY?: string };
  if (!env.ADMIN_WEB_KEY || String(form.get("accessKey") ?? "") !== env.ADMIN_WEB_KEY) return new Response(null, { status: 303, headers: { "Location": "/admin?error=1" } });
  const session = await createAdminSession(env, { id: "legacy-admin-web", role: "main_admin", username: "legacy" });
  return new Response(null, { status: 303, headers: { "Location": "/admin", "Set-Cookie": `dtf_admin_session=${session}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=28800` } });
}

const nav = [["Dashboard", LayoutDashboard], ["Orders", Package], ["Products", Boxes], ["Production", ClipboardCheck], ["Designers", Users], ["Reports", BarChart3], ["Audit history", FileText], ["Settings", Settings2]] as const;

export default function Admin() {
  const state = useLoaderData<typeof loader>();
  if (!state.configured) return <main className="admin-shell admin-gate" dir="ltr"><section className="admin-gate-card"><span className="gate-icon"><LockKeyhole size={26} /></span><span className="eyebrow">ADMIN WEB / LOCKED</span><h1>Secure access is not configured.</h1><p>The independent Admin Web is intentionally unavailable until the server-side <code>ADMIN_WEB_KEY</code> secret is configured. No dashboard, order data, or operational controls are exposed in this state.</p><Link className="button button-primary" to="/"><ArrowLeft size={16} /> Back to storefront</Link></section></main>;
  if (!state.authenticated) return <main className="admin-shell admin-gate" dir="ltr"><section className="admin-gate-card"><span className="gate-icon"><ShieldCheck size={26} /></span><span className="eyebrow">ADMIN WEB / SIGN IN</span><h1>Independent operations access.</h1><p>Use the server-configured admin access key. Customer and designer sessions cannot enter this workspace.</p>{state.error && <div className="auth-error">Access denied. Check the configured key and try again.</div>}<Form method="post" className="admin-login-form"><label htmlFor="accessKey">Admin access key</label><input id="accessKey" name="accessKey" type="password" autoComplete="off" required /><button className="button button-primary" type="submit"><LogIn size={16} /> Enter Admin Web</button></Form><Link className="back-link" to="/"><ArrowLeft size={15} /> Back to storefront</Link></section></main>;
  return <main className="admin-shell" dir="ltr"><aside className="admin-sidebar"><Link className="brand" to="/"><span className="brand-mark">◈</span><span>DTF <b>STUDIO</b></span></Link><div className="admin-lock"><LockKeyhole size={15} /> Independent admin access</div><nav className="admin-nav"><span className="nav-caption">Workspace</span>{nav.slice(0, 5).map(([label, Icon], index) => <a className={index === 0 ? "active" : ""} key={label}><Icon size={16} /> {label}</a>)}<span className="nav-caption">Control</span>{nav.slice(5).map(([label, Icon]) => <a key={label}><Icon size={16} /> {label}</a>)}</nav><Link className="admin-back" to="/"><ArrowLeft size={15} /> Back to storefront</Link></aside><section className="admin-main"><header className="admin-top"><div><span className="eyebrow">ADMIN / OWNER</span><h1>Operations workspace.</h1></div><div className="admin-top-right"><span className="status-chip"><span className="status-dot" /> Authenticated</span><Form method="post"><input type="hidden" name="intent" value="logout" /><button className="admin-link" type="submit">Sign out</button></Form></div></header><div className="admin-banner"><div><span className="eyebrow">SECURE ADMIN WEB</span><h2>Operational data stays behind the role boundary.</h2><p>The authenticated workspace is ready for database-backed orders, production, designers, reports, and audit history. Preview data is not displayed.</p></div><span className="banner-mark">DTF</span></div><div className="kpi-grid"><div className="kpi"><span>Orders today</span><b>—</b><small>Awaiting live order data</small></div><div className="kpi"><span>Pending review</span><b>—</b><small>Awaiting designer data</small></div><div className="kpi"><span>Production queue</span><b>—</b><small>Awaiting job data</small></div><div className="kpi"><span>Ledger balance</span><b>—</b><small>Awaiting ledger data</small></div></div></section></main>;
}
