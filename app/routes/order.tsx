import { Link, redirect, useLoaderData } from "react-router";
import type { Route } from "./+types/order";
import { ArrowLeft, CheckCircle2, Clock, ShoppingBag } from "lucide-react";
import { localeDir, pick, useAppLocale } from "../i18n";
import {
  appendOdooSessionCookies,
  fetchOdooResponse,
} from "../lib/odoo-api.server";

function money(value:number){return "JOD "+Number(value||0).toFixed(2);}

export async function loader({request,context,params}:Route.LoaderArgs){
  const orderId=Number(params.orderId??0);
  if(!Number.isInteger(orderId)||orderId<=0) throw new Response("Order not found",{status:404});
  const upstream=await fetchOdooResponse(request,context,`/api/dtf/v1/orders/${orderId}`);
  if(upstream.status===401||upstream.status===403){
    throw redirect("/login?returnTo="+encodeURIComponent(new URL(request.url).pathname));
  }
  if(upstream.status===404) throw new Response("Order not found",{status:404});
  if(!upstream.ok) throw new Response("Order unavailable.",{status:502});
  const payload=await upstream.json() as any;
  const headers=new Headers();
  appendOdooSessionCookies(headers,upstream);
  return Response.json({order:payload.order,settings:payload.order?.settings??{}},{headers});
}

export default function OrderConfirmation(){
  const {order,settings}=useLoaderData<typeof loader>() as any;
  const locale=useAppLocale();
  const t=(en:string,ar:string)=>pick(locale,en,ar);
  const pending=order.paymentStatus!=="paid";
  return <main className="studio-shell inner-page" dir={localeDir(locale)}>
    <header className="site-header container"><Link className="back-link" to="/"><ArrowLeft size={17}/></Link><span className="page-title">{t("Order confirmed","تم تأكيد الطلب")}</span><div className="header-actions"><span className="cart-count">{order.status}</span></div></header>
    <section className="container cart-page">
      <div className="cart-heading"><div><span className="eyebrow">{t("ORDER SAVED","تم حفظ الطلب")}</span><h1>{pending?t("Awaiting payment.","بانتظار الدفع."):t("Payment confirmed.","تم تأكيد الدفع.")}</h1></div><span className="reservation-chip"><CheckCircle2 size={14}/> {order.name||order.id}</span></div>
      <div className="cart-grid">
        <section className="cart-items">
          <div className="summary-card"><h2>{t("Order details","تفاصيل الطلب")}</h2><div className="summary-row"><span>{t("Status","الحالة")}</span><b>{order.status}</b></div><div className="summary-row"><span>{t("Payment","الدفع")}</span><b>{order.paymentStatus}</b></div><div className="summary-row"><span>{t("Fulfillment","الاستلام")}</span><b>{order.fulfillmentMode}</b></div>{order.promotionCode&&<div className="summary-row"><span>{t("Coupon","رمز الخصم")}</span><b>{order.promotionCode}</b></div>}{order.discountJod>0&&<div className="summary-row"><span>{t("Discount","الخصم")}</span><b>-{money(order.discountJod)}</b></div>}{Number(order.taxJod||0)>0&&<div className="summary-row"><span>{t("Tax","الضريبة")}</span><b>{money(order.taxJod)}</b></div>}<div className="summary-row total"><span>{t("Total","الإجمالي")}</span><b>{money(order.totalJod)}</b></div></div>
          <div className="summary-card"><h2>{t("Items","العناصر")}</h2>{order.items.map((x:any)=><div className="summary-row" key={x.id}><span>{locale==="ar"?(x.productNameAr||x.productNameEn):x.productNameEn} × {x.quantity}</span><b>{money(x.unitPriceJod*x.quantity)}</b></div>)}</div>
        </section>
        <aside className="summary-card"><h2>{pending?t("Payment instructions","تعليمات الدفع"):t("Next step","الخطوة التالية")}</h2>
          {pending?<><p className="summary-note"><Clock size={14}/> {t("Your native Odoo order is confirmed and awaiting payment. No custom timed stock hold is used.","تم تأكيد طلب أودو الأصلي وهو بانتظار الدفع. لا يتم استخدام حجز مخزون مؤقت مخصص.")}</p><p><b>{t("Bank","البنك")}:</b> {settings.bankDetails?.bankName||"—"}<br/><b>{t("Account","الحساب")}:</b> {settings.bankDetails?.accountName||"—"}<br/><b>IBAN:</b> {settings.bankDetails?.iban||"—"}</p></>:<p className="summary-note"><ShoppingBag size={14}/> {t("Payment is confirmed in native Odoo accounting.","تم تأكيد الدفع في محاسبة أودو الأصلية.")}</p>}
          <Link className="button button-primary full-button" to="/">{t("Back to storefront","العودة للمتجر")}</Link>
        </aside>
      </div>
    </section>
  </main>;
}
