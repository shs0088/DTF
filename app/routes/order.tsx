import { Link, redirect, useLoaderData } from "react-router";
import type { Route } from "./+types/order";
import type { ItemStore } from "../../workers/item-store";
import { ArrowLeft, CheckCircle2, Clock, ShoppingBag } from "lucide-react";

function cookieValue(request: Request, name: string): string {
  const cookie=request.headers.get("cookie")??"";
  const part=cookie.split(";").map((x)=>x.trim()).find((x)=>x.startsWith(name+"="));
  return (part?.slice(name.length+1)??"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,120);
}
function store(context: Route.LoaderArgs["context"]) {
  const ns=context.cloudflare.env.ITEMS as DurableObjectNamespace<ItemStore>;
  return ns.get(ns.idFromName("default"));
}
function money(cents:number){return "JOD "+(Number(cents||0)/100).toFixed(2);}

export async function loader({request,context,params}:Route.LoaderArgs){
  const sessionId=cookieValue(request,"dtf_session");
  const s=store(context),identity=await s.sessionIdentity(sessionId);
  if(!identity||identity.role!=="customer") throw redirect("/login?returnTo="+encodeURIComponent(new URL(request.url).pathname));
  const order:any=await s.customerOrderSummary(sessionId,String(params.orderId??""));
  if(!order) throw new Response("Order not found",{status:404});
  const settings:any=(await s.businessSettingsSnapshot() as any).settings;
  return {order,settings};
}

export default function OrderConfirmation(){
  const {order,settings}=useLoaderData<typeof loader>() as any;
  const pending=order.status==="payment_pending";
  return <main className="studio-shell inner-page" dir="ltr">
    <header className="site-header container"><Link className="back-link" to="/"><ArrowLeft size={17}/></Link><span className="page-title">Order confirmed</span><div className="header-actions"><span className="cart-count">{order.status}</span></div></header>
    <section className="container cart-page"><div className="cart-heading"><div><span className="eyebrow">ORDER SAVED</span><h1>{pending?"Awaiting payment.":"Your order is received."}</h1></div><span className="reservation-chip"><CheckCircle2 size={14}/> {order.id}</span></div>
      <div className="cart-grid"><section className="cart-items">
        <div className="summary-card"><h2>Order details</h2><div className="summary-row"><span>Status</span><b>{order.status}</b></div><div className="summary-row"><span>Payment</span><b>{order.paymentStatus}</b></div><div className="summary-row"><span>Fulfillment</span><b>{order.fulfillmentMode}</b></div>{order.promotionCode&&<div className="summary-row"><span>Coupon</span><b>{order.promotionCode}</b></div>}{order.discountJod>0&&<div className="summary-row"><span>Discount</span><b>-{money(order.discountJod)}</b></div>}<div className="summary-row total"><span>Total</span><b>{money(order.totalJod)}</b></div></div>
        <div className="summary-card"><h2>Items</h2>{order.items.map((x:any)=><div className="summary-row" key={x.id}><span>{x.productNameEn} × {x.quantity}</span><b>{money(x.unitPriceJod*x.quantity)}</b></div>)}</div>
      </section>
      <aside className="summary-card"><h2>{pending?"Payment reservation":"Next step"}</h2>
        {pending?<><p className="summary-note"><Clock size={14}/> Stock is reserved until {order.reservationExpiresAt?new Date(order.reservationExpiresAt).toLocaleString():"the reservation deadline"}.</p><p><b>Bank:</b> {settings.bankDetails?.bankName||"—"}<br/><b>Account:</b> {settings.bankDetails?.accountName||"—"}<br/><b>IBAN:</b> {settings.bankDetails?.iban||"—"}<br/><b>CliQ:</b> {settings.bankDetails?.cliqAlias||"—"}</p></>:<p className="summary-note"><ShoppingBag size={14}/> The order will move through preparation after payment/order confirmation.</p>}
        <Link className="button button-primary full-button" to="/">Back to storefront</Link>
      </aside></div>
    </section>
  </main>;
}
