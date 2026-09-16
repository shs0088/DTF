import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/account-type";
import { ArrowLeft, ArrowRight, Brush, ShoppingBag } from "lucide-react";

export async function loader({request}:Route.LoaderArgs){
  const raw=new URL(request.url).searchParams.get("returnTo")??"/";
  return {returnTo:raw.startsWith("/")?raw:"/"};
}

export default function AccountType() {
  const {returnTo}=useLoaderData<typeof loader>();
  const customer="/register?type=customer&returnTo="+encodeURIComponent(returnTo);
  const designer="/register?type=designer";
  const login="/login?returnTo="+encodeURIComponent(returnTo);
  return <main className="auth-shell" dir="ltr"><div className="auth-orbit" /><section className="auth-card account-type-card"><Link className="auth-brand" to="/"><span className="brand-mark">◈</span><span>DTF <b>STUDIO</b></span></Link><span className="eyebrow">CREATE ACCOUNT</span><h1>Choose how<br /><em>you create.</em></h1><p className="auth-intro">Account type is selected only during registration. You can still shop as a customer after becoming a designer.</p><div className="account-options"><Link className="account-option" to={customer}><span className="option-icon"><ShoppingBag size={20} /></span><span><b>Customer</b><small>Shop, customize and order prints.</small></span><ArrowRight size={17} /></Link><Link className="account-option" to={designer}><span className="option-icon blue"><Brush size={20} /></span><span><b>Designer</b><small>Submit your work for authorization and publish designs.</small></span><ArrowRight size={17} /></Link></div><Link className="auth-back" to={login}><ArrowLeft size={14} /> Already have an account? Sign in</Link></section></main>;
}
