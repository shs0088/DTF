import { Link, redirect, useLoaderData } from "react-router";
import type { Route } from "./+types/order";
import type { ItemStore } from "../../workers/item-store";
import { ArrowLeft, CheckCircle2, Clock, ShoppingBag } from "lucide-react";
import { localeDir, pick, useAppLocale } from "../i18n";

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
  const locale=useAppLocale();
  const t=(en:string,ar:string)=>pick(locale,en,ar);
  const pending=order.status==="payment_pending";
  return <main className="studio-shell inner-page" dir={localeDir(locale)}>
    <header className="site-header container"><Link className="back-link" to="/"><ArrowLeft size={17}/></Link><span className="page-title">{t("Order confirmed","تم تأكيد الطلب")}</span><div className="header-actions"><span className="cart-count">{order.status}</span></div></header>
    <section className="container cart-page">
      <div className="cart-heading"><div><span className="eyebrow">{t("ORDER SAVED","تم حفظ الطلب")}</span><h1>{pending?t("Awaiting payment.","بانتظار الدفع."):t("Your order is received.","تم استلام طلبك.")}</h1></div><span className="reservation-chip"><CheckCircle2 size={14}/> {order.id}</span></div>
      <div className="cart-grid">
        <section className="cart-items">
          <div className="summary-card"><h2>{t("Order details","تفاصيل الطلب")}</h2><div className="summary-row"><span>{t("Status","الحالة")}</span><b>{order.status}</b></div><div className="summary-row"><span>{t("Payment","الدفع")}</span><b>{order.paymentStatus}</b></div><div className="summary-row"><span>{t("Fulfillment","الاستلام")}</span><b>{order.fulfillmentMode}</b></div>{order.promotionCode&&<div className="summary-row"><span>{t("Coupon","رمز الخصم")}</span><b>{order.promotionCode}</b></div>}{order.discountJod>0&&<div className="summary-row"><span>{t("Discount","الخصم")}</span><b>-{money(order.discountJod)}</b></div>}<div className="summary-row total"><span>{t("Total","الإجمالي")}</span><b>{money(order.totalJod)}</b></div></div>
          <div className="summary-card"><h2>{t("Items","العناصر")}</h2>{order.items.map((x:any)=><div className="summary-row" key={x.id}><span>{locale==="ar"?(x.productNameAr||x.productNameEn):x.productNameEn} × {x.quantity}</span><b>{money(x.unitPriceJod*x.quantity)}</b></div>)}</div>
        </section>
        <aside className="summary-card"><h2>{pending?t("Payment reservation","حجز الدفع"):t("Next step","الخطوة التالية")}</h2>
          {pending?<><p className="summary-note"><Clock size={14}/> {t("Stock is reserved until","المخزون محجوز حتى")} {order.reservationExpiresAt?new Date(order.reservationExpiresAt).toLocaleString(locale==="ar"?"ar-JO":"en-JO"):t("the reservation deadline","موعد انتهاء الحجز")}.</p><p><b>{t("Bank","البنك")}:</b> {settings.bankDetails?.bankName||"—"}<br/><b>{t("Account","الحساب")}:</b> {settings.bankDetails?.accountName||"—"}<br/><b>IBAN:</b> {settings.bankDetails?.iban||"—"}<br/><b>CliQ:</b> {settings.bankDetails?.cliqAlias||"—"}</p></>:<p className="summary-note"><ShoppingBag size={14}/> {t("The order will move through preparation after payment/order confirmation.","سينتقل الطلب إلى مرحلة التحضير بعد تأكيد الدفع/الطلب.")}</p>}
          <Link className="button button-primary full-button" to="/">{t("Back to storefront","العودة للمتجر")}</Link>
        </aside>
      </div>
    </section>
  </main>;
}
