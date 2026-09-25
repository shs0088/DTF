import { Form, Link, redirect, useActionData, useLoaderData } from "react-router";
import type { Route } from "./+types/checkout";
import { ArrowLeft, CheckCircle2, ShoppingBag, Tag, Truck, Store, Landmark } from "lucide-react";
import { localeDir, pick, useAppLocale } from "../i18n";
import {
  appendOdooSessionCookies,
  fetchOdooJsonRpc,
  fetchOdooResponse,
} from "../lib/odoo-api.server";

function money(value:number){return "JOD "+Number(value||0).toFixed(2);}

export async function loader({request,context}:Route.LoaderArgs){
  const url=new URL(request.url);
  const upstream=await fetchOdooResponse(request,context,"/api/dtf/v1/checkout/preview");
  if(upstream.status===401||upstream.status===403){
    throw redirect("/login?returnTo="+encodeURIComponent(url.pathname+url.search));
  }
  if(upstream.status===404) throw redirect("/cart");
  if(!upstream.ok) throw new Response("Checkout unavailable.",{status:502});
  const payload=await upstream.json() as any;
  const headers=new Headers();
  appendOdooSessionCookies(headers,upstream);
  const coupon=String(url.searchParams.get("coupon")??"").trim();
  return Response.json({
    identity:payload.identity,
    coupon,
    fulfillment:"delivery",
    preview:payload.preview,
    couponError:"",
    requestKey:crypto.randomUUID().replaceAll("-",""),
  },{headers});
}

export async function action({request,context}:Route.ActionArgs){
  const form=await request.formData();
  const fulfillment="delivery";
  const coupon=String(form.get("coupon")??"").trim();
  const intent=String(form.get("intent")??"place-order");
  try{
    if(intent==="apply-coupon"){
      if(!coupon) return {ok:false,error:"Enter a promotion code."};
      const {result,response}=await fetchOdooJsonRpc<any>(
        request,context,"/api/dtf/v1/checkout/coupon",{coupon}
      );
      const headers=new Headers();
      appendOdooSessionCookies(headers,response);
      if(result?.error) return Response.json({ok:false,error:String(result.error)},{status:400,headers});
      const qs=new URLSearchParams({coupon,fulfillment});
      throw redirect("/checkout?"+qs.toString(),{headers});
    }
    const {result,response}=await fetchOdooJsonRpc<any>(
      request,
      context,
      "/api/dtf/v1/checkout/place",
      {
        customer_name:String(form.get("customerName")??""),
        customer_phone:String(form.get("customerPhone")??""),
        city:String(form.get("city")??""),
        address:String(form.get("address")??""),
        notes:String(form.get("notes")??""),
        payment_method:String(form.get("paymentMethod")??"bank_transfer"),
        fulfillment,
      },
    );
    const headers=new Headers();
    appendOdooSessionCookies(headers,response);
    if(result?.error){
      const message=Array.isArray(result.issues)&&result.issues.length
        ? result.issues.join(" ")
        : String(result.error);
      return Response.json({ok:false,error:message},{status:400,headers});
    }
    if(!result?.order?.id) return Response.json({ok:false,error:"Order could not be created."},{status:400,headers});
    throw redirect("/order/"+encodeURIComponent(String(result.order.id)),{headers});
  }catch(error){
    if(error instanceof Response) throw error;
    return {ok:false,error:error instanceof Error?error.message:"Checkout failed."};
  }
}

export default function Checkout(){
  const data=useLoaderData<typeof loader>() as any;
  const result=useActionData<typeof action>() as any;
  const locale=useAppLocale();
  const t=(en:string,ar:string)=>pick(locale,en,ar);
  const p=data.preview;
  const storePickupAllowed=Boolean(p.settings?.storePickupEnabled);
  const codAllowed=Boolean(p.settings?.codEnabled);
  return <main className="studio-shell inner-page" dir={localeDir(locale)}>
    <header className="site-header container"><Link className="back-link" to="/cart"><ArrowLeft size={17}/></Link><span className="page-title">{t("Checkout","إتمام الطلب")}</span><div className="header-actions"><span className="cart-count">{p.lines.length} {t("lines","أسطر")}</span></div></header>
    <section className="container cart-page">
      <div className="cart-heading"><div><span className="eyebrow">{t("SECURE CHECKOUT","إتمام طلب آمن")}</span><h1>{t("Confirm your order.","تأكيد طلبك.")}</h1></div><span className="reservation-chip"><span className="status-dot"/> {t("Odoo stock, price and print evidence validation","التحقق في أودو من المخزون والسعر وملفات الطباعة")}</span></div>
      {result?.error&&<div className="auth-error">{result.error}</div>}{data.couponError&&<div className="auth-error">{data.couponError}</div>}
      {Array.isArray(p.issues)&&p.issues.length>0&&<div className="auth-error">{p.issues.join(" ")}</div>}
      <div className="cart-grid">
        <section className="cart-items">
          <div className="summary-card"><h2>{t("Customer","العميل")}</h2><p>{data.identity.displayName}<br/>{data.identity.email}</p>
            <Form method="post" id="checkout-form" className="auth-form">
              <input type="hidden" name="intent" value="place-order"/><input type="hidden" name="requestKey" value={data.requestKey}/><input type="hidden" name="coupon" value={data.coupon}/>
              <label>{t("Full name","الاسم الكامل")}</label><input name="customerName" defaultValue={data.identity.displayName} required/>
              <label>{t("Phone","رقم الهاتف")}</label><input name="customerPhone" required placeholder="+962..."/>
              <label>{t("City","المدينة")}</label><input name="city" placeholder={t("Amman / Aqaba","عمّان / العقبة")}/>
              <label>{t("Delivery address","عنوان التوصيل")}</label><input name="address" required placeholder={t("Required for delivery","مطلوب للتوصيل")}/>
              <label>{t("Notes","ملاحظات")}</label><input name="notes" placeholder={t("Optional order notes","ملاحظات اختيارية للطلب")}/>
              <label>{t("Fulfillment","طريقة الاستلام")}</label><select name="fulfillment" defaultValue="delivery"><option value="delivery">{t("Delivery","توصيل")}</option>{storePickupAllowed&&<option value="store_pickup">{t("Store pickup","استلام من المتجر")}</option>}</select>
              <label>{t("Payment","الدفع")}</label><select name="paymentMethod" defaultValue="bank_transfer"><option value="bank_transfer">{t("Bank transfer","تحويل بنكي")}</option>{codAllowed&&<option value="cod">{t("Cash on delivery","الدفع عند الاستلام")}</option>}</select>
            </Form>
          </div>
          <div className="summary-card"><h2>{t("Items","العناصر")}</h2>{p.lines.map((x:any)=><div className="summary-row" key={x.id}><span>{x.product_name||x.productName||x.variant} × {x.quantity}</span><b>{money(x.subtotal??x.lineTotalJod)}</b></div>)}</div>
        </section>
        <aside className="summary-card"><h2>{t("Order summary","ملخص الطلب")}</h2>
          <div className="summary-row"><span>{t("Subtotal","المجموع الفرعي")}</span><b>{money(p.subtotalJod)}</b></div>
          <div className="summary-row"><span>{t("Delivery","التوصيل")}</span><b>{money(p.deliveryFeeJod)}</b></div>
          {Number(p.taxJod||0)>0&&<div className="summary-row"><span>{t("Tax","الضريبة")}</span><b>{money(p.taxJod)}</b></div>}
          {p.discountJod>0&&<div className="summary-row"><span><Tag size={13}/> {t("Coupon","رمز الخصم")} {data.coupon}</span><b>-{money(p.discountJod)}</b></div>}
          <div className="summary-row total"><span>{t("Total","الإجمالي")}</span><b>{money(p.totalJod)}</b></div>
          <Form method="post" className="coupon"><input type="hidden" name="intent" value="apply-coupon"/><input name="coupon" defaultValue={data.coupon} placeholder={t("Promo code","رمز الخصم")}/><button>{t("Apply","تطبيق")}</button></Form>
          <button form="checkout-form" className="button button-primary full-button" disabled={!p.canCheckout}><CheckCircle2 size={16}/> {t("Place order","تنفيذ الطلب")}</button>
          <p className="summary-note"><ShoppingBag size={14}/> {t("Odoo revalidates stock, price and Ready-to-Print Master evidence before confirming the native order.","يعيد أودو التحقق من المخزون والسعر وملف الطباعة الرئيسي قبل تأكيد الطلب الأصلي.")}</p>
          <div className="auth-foot"><span><Truck size={14}/> {t("Delivery","توصيل")}</span>{storePickupAllowed&&<span><Store size={14}/> {t("Pickup","استلام")}</span>}<span><Landmark size={14}/> {t("Bank transfer","تحويل بنكي")}</span></div>
        </aside>
      </div>
    </section>
  </main>;
}
