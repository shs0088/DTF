import { Form, Link, redirect, useActionData, useLoaderData } from "react-router";
import type { Route } from "./+types/checkout";
import type { ItemStore } from "../../workers/item-store";
import { ArrowLeft, CheckCircle2, ShoppingBag, Tag, Truck, Store, Landmark } from "lucide-react";
import { localeDir, pick, useAppLocale } from "../i18n";

function cookieValue(request: Request, name: string): string {
  const cookie=request.headers.get("cookie")??"";
  const part=cookie.split(";").map((x)=>x.trim()).find((x)=>x.startsWith(name+"="));
  return (part?.slice(name.length+1)??"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,120);
}
function itemStore(context: Route.LoaderArgs["context"] | Route.ActionArgs["context"]) {
  const ns=context.cloudflare.env.ITEMS as DurableObjectNamespace<ItemStore>;
  return ns.get(ns.idFromName("default"));
}
function money(cents:number){return "JOD "+(Number(cents||0)/100).toFixed(2);}

export async function loader({request,context}:Route.LoaderArgs){
  const url=new URL(request.url),store=itemStore(context),sessionId=cookieValue(request,"dtf_session");
  const identity=await store.sessionIdentity(sessionId);
  if(!identity||identity.role!=="customer") throw redirect("/login?returnTo="+encodeURIComponent(url.pathname+url.search));
  const cartKey=cookieValue(request,"dtf_cart_session");
  if(!cartKey) throw redirect("/cart");
  const coupon=String(url.searchParams.get("coupon")??"").trim();
  const fulfillment=url.searchParams.get("fulfillment")==="store_pickup"?"store_pickup":"delivery";
  let preview:any,couponError="";
  try{preview=await store.checkoutPreview(cartKey,coupon,fulfillment);}
  catch(error){
    if(coupon){couponError=error instanceof Error?error.message:"Coupon validation failed.";preview=await store.checkoutPreview(cartKey,"",fulfillment);}
    else throw redirect("/cart");
  }
  return {identity,cartKey,coupon:couponError?"":coupon,fulfillment,preview,couponError,requestKey:crypto.randomUUID().replaceAll("-","")};
}

export async function action({request,context}:Route.ActionArgs){
  const form=await request.formData(),store=itemStore(context);
  const sessionId=cookieValue(request,"dtf_session"),cartKey=cookieValue(request,"dtf_cart_session")||String(form.get("cartKey")??"");
  const fulfillment=String(form.get("fulfillment"))==="store_pickup"?"store_pickup":"delivery";
  const coupon=String(form.get("coupon")??"").trim();
  const intent=String(form.get("intent")??"place-order");
  try{
    if(intent==="apply-coupon"){
      await store.checkoutPreview(cartKey,coupon,fulfillment);
      const qs=new URLSearchParams();if(coupon)qs.set("coupon",coupon);qs.set("fulfillment",fulfillment);
      throw redirect("/checkout?"+qs.toString());
    }
    const order:any=await store.createCheckoutOrder({
      sessionId,cartSessionKey:cartKey,requestKey:String(form.get("requestKey")??""),couponCode:coupon,
      fulfillmentMode:fulfillment,paymentMethod:String(form.get("paymentMethod"))==="cod"?"cod":"bank_transfer",
      customerName:String(form.get("customerName")??""),customerPhone:String(form.get("customerPhone")??""),
      city:String(form.get("city")??""),address:String(form.get("address")??""),notes:String(form.get("notes")??"")
    });
    if(!order?.id) return {ok:false,error:"Order could not be created."};
    throw redirect("/order/"+encodeURIComponent(String(order.id)));
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
  return <main className="studio-shell inner-page" dir={localeDir(locale)}>
    <header className="site-header container"><Link className="back-link" to="/cart"><ArrowLeft size={17}/></Link><span className="page-title">{t("Checkout","إتمام الطلب")}</span><div className="header-actions"><span className="cart-count">{p.lines.length} {t("lines","أسطر")}</span></div></header>
    <section className="container cart-page">
      <div className="cart-heading"><div><span className="eyebrow">{t("SECURE CHECKOUT","إتمام طلب آمن")}</span><h1>{t("Confirm your order.","تأكيد طلبك.")}</h1></div><span className="reservation-chip"><span className="status-dot"/> {p.settings?.reservationMinutes??30} {t("min stock reservation","دقيقة حجز للمخزون")}</span></div>
      {result?.error&&<div className="auth-error">{result.error}</div>}{data.couponError&&<div className="auth-error">{data.couponError}</div>}
      {Array.isArray(p.issues)&&p.issues.length>0&&<div className="auth-error">{p.issues.join(" ")}</div>}
      <div className="cart-grid">
        <section className="cart-items">
          <div className="summary-card"><h2>{t("Customer","العميل")}</h2><p>{data.identity.displayName}<br/>{data.identity.email}</p>
            <Form method="post" id="checkout-form" className="auth-form">
              <input type="hidden" name="intent" value="place-order"/><input type="hidden" name="cartKey" value={data.cartKey}/><input type="hidden" name="requestKey" value={data.requestKey}/><input type="hidden" name="coupon" value={data.coupon}/>
              <label>{t("Full name","الاسم الكامل")}</label><input name="customerName" defaultValue={data.identity.displayName} required/>
              <label>{t("Phone","رقم الهاتف")}</label><input name="customerPhone" required placeholder="+962..."/>
              <label>{t("City","المدينة")}</label><input name="city" placeholder={t("Amman / Aqaba","عمّان / العقبة")}/>
              <label>{t("Delivery address","عنوان التوصيل")}</label><input name="address" placeholder={t("Required for delivery","مطلوب للتوصيل")}/>
              <label>{t("Notes","ملاحظات")}</label><input name="notes" placeholder={t("Optional order notes","ملاحظات اختيارية للطلب")}/>
              <label>{t("Fulfillment","طريقة الاستلام")}</label><select name="fulfillment" defaultValue={data.fulfillment}><option value="delivery">{t("Delivery","توصيل")}</option>{storePickupAllowed&&<option value="store_pickup">{t("Store pickup","استلام من المتجر")}</option>}</select>
              <label>{t("Payment","الدفع")}</label><select name="paymentMethod" defaultValue="bank_transfer"><option value="bank_transfer">{t("Bank / CliQ transfer","تحويل بنكي / كليك")}</option><option value="cod">{t("Cash on delivery","الدفع عند الاستلام")}</option></select>
            </Form>
          </div>
          <div className="summary-card"><h2>{t("Items","العناصر")}</h2>{p.lines.map((x:any)=><div className="summary-row" key={x.id}><span>{x.productName} × {x.quantity}</span><b>{money(x.lineTotalJod)}</b></div>)}</div>
        </section>
        <aside className="summary-card"><h2>{t("Order summary","ملخص الطلب")}</h2>
          <div className="summary-row"><span>{t("Subtotal","المجموع الفرعي")}</span><b>{money(p.subtotalJod)}</b></div>
          <div className="summary-row"><span>{t("Delivery","التوصيل")}</span><b>{money(p.deliveryFeeJod)}</b></div>
          {p.discountJod>0&&<div className="summary-row"><span><Tag size={13}/> {t("Coupon","رمز الخصم")} {data.coupon}</span><b>-{money(p.discountJod)}</b></div>}
          <div className="summary-row total"><span>{t("Total","الإجمالي")}</span><b>{money(p.totalJod)}</b></div>
          <Form method="post" className="coupon"><input type="hidden" name="intent" value="apply-coupon"/><input type="hidden" name="cartKey" value={data.cartKey}/><input type="hidden" name="fulfillment" value={data.fulfillment}/><input name="coupon" defaultValue={data.coupon} placeholder={t("Promo code","رمز الخصم")}/><button>{t("Apply","تطبيق")}</button></Form>
          <button form="checkout-form" className="button button-primary full-button" disabled={!p.canCheckout}><CheckCircle2 size={16}/> {t("Place order","تنفيذ الطلب")}</button>
          <p className="summary-note"><ShoppingBag size={14}/> {t("Coupon, stock, price and Ready-to-Print Master rules are revalidated server-side when the order is created.","تتم إعادة التحقق على الخادم من الخصم والمخزون والسعر وقواعد ملف الطباعة الرئيسي عند إنشاء الطلب.")}</p>
          <div className="auth-foot"><span><Truck size={14}/> {t("Delivery","توصيل")}</span><span><Store size={14}/> {t("Pickup","استلام")}</span><span><Landmark size={14}/> {t("Bank/CliQ","بنك/كليك")}</span></div>
        </aside>
      </div>
    </section>
  </main>;
}
