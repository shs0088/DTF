import { Form, Link, redirect, useLoaderData } from "react-router";
import type { Route } from "./+types/customize";
import { ArrowLeft, Check, Copy, FlipHorizontal2, Layers3, Minus, Move, Plus, Redo2, RotateCw, Ruler, ShoppingBag, Trash2, Undo2, Upload, ZoomIn } from "lucide-react";
import { localeDir, pick, useAppLocale } from "../i18n";
import {
  appendOdooSessionCookies,
  fetchOdooJson,
  fetchOdooJsonRpc,
  mapOdooProducts,
} from "../lib/odoo-api.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const payload = await fetchOdooJson<any>(
    request,
    context,
    "/api/dtf/v1/products",
  );
  const products = mapOdooProducts(payload);
  const requested = new URL(request.url).searchParams.get("variantId") ?? "";
  const selected = products.find((row) => row.variantId === requested)
    ?? products.find((row) => row.source === "custom")
    ?? products[0];
  return { variantId: selected?.variantId ?? "" };
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  if (form.get("intent") !== "add-to-cart") return null;
  const variantId = Number(form.get("variantId") ?? 0);
  if (!Number.isInteger(variantId) || variantId <= 0) {
    throw new Response("A valid Odoo product variant is required.", { status: 400 });
  }
  const { result, response } = await fetchOdooJsonRpc<any>(
    request,
    context,
    "/api/dtf/v1/cart/add",
    { product_id: variantId, quantity: 1 },
  );
  if (result?.error) {
    throw new Response("Unable to add this product to the cart.", { status: 400 });
  }
  const headers = new Headers({ Location: "/cart" });
  appendOdooSessionCookies(headers, response);
  return new Response(null, { status: 303, headers });
}

export default function Customize() {
  const { variantId } = useLoaderData<typeof loader>();
  const locale=useAppLocale();
  const t=(en:string,ar:string)=>pick(locale,en,ar);
  return <main className="studio-shell inner-page" dir={localeDir(locale)}>
    <header className="site-header container">
      <Link className="back-link" to="/"><ArrowLeft size={17} /></Link>
      <span className="page-title">{t("Print Your Dream","اطبع حلمك")}</span>
      <div className="header-actions"><Link className="icon-button" to="/cart"><ShoppingBag size={18} /></Link></div>
    </header>
    <div className="customizer-layout container">
      <section className="customizer-stage">
        <div className="stage-top"><div><span className="eyebrow">{t("PRODUCT FIRST / DESIGN FIRST","المنتج أولاً / التصميم أولاً")}</span><h1>{t("Build your print.","أنشئ طباعتك.")}</h1></div><span className="local-status"><span className="status-dot" /> {t("Local preview","معاينة محلية")}</span></div>
        <div className="canvas-wrap"><div className="canvas-grid" /><div className="canvas-shirt"><span>{t("YOUR","تصميمك")}<br /><b>{t("ART","الفني")}</b></span><div className="selection-box"><span className="handle h-tl" /><span className="handle h-tr" /><span className="handle h-bl" /><span className="handle h-br" /><div className="selected-art">◢</div></div></div><div className="print-boundary">{t("SAFE PRINT AREA","منطقة الطباعة الآمنة")}</div><button className="zoom-control"><Minus size={14} /><span>100%</span><Plus size={14} /><ZoomIn size={15} /></button></div>
        <div className="stage-bottom"><button className="button button-ghost"><Upload size={16} /> {t("Upload artwork","رفع التصميم")}</button><p><Check size={15} /> {t("Your changes are saved to this print specification","يتم حفظ تغييراتك ضمن مواصفات الطباعة")}</p></div>
      </section>
      <aside className="tools-corner">
        <div className="tools-title"><div><span className="eyebrow">{t("TOOLS CORNER","أدوات التخصيص")}</span><h2>{t("Customize","تخصيص")}</h2></div><span className="tool-count">1 / 1</span></div>
        <div className="tool-tabs"><button className="active">{t("Front","أمام")}</button><button>{t("Back","خلف")}</button><button>{t("Left","يسار")}</button><button>{t("Right","يمين")}</button></div>
        <div className="tool-section"><span className="tool-label">{t("Transform","تحويل")}</span><div className="tool-grid"><button><Move size={16} />{t("Move","تحريك")}</button><button><Ruler size={16} />{t("Scale","تحجيم")}</button><button><RotateCw size={16} />{t("Rotate","تدوير")}</button><button><FlipHorizontal2 size={16} />{t("Flip","عكس")}</button></div></div>
        <div className="tool-section"><span className="tool-label">{t("Print size","حجم الطباعة")} <small>cm</small></span><div className="field-row"><label>W <input defaultValue="25.0" /></label><label>H <input defaultValue="30.0" /></label></div><span className="tool-label position-label">{t("Position","الموقع")} <small>cm</small></span><div className="field-row"><label>X <input defaultValue="5.0" /></label><label>Y <input defaultValue="10.0" /></label></div></div>
        <div className="quality-card"><div className="quality-icon"><Check size={17} /></div><div><b>{t("Good print quality","جودة طباعة جيدة")}</b><p>{t("Effective DPI 300 · no scaling risk","دقة فعالة 300 DPI · لا يوجد خطر تحجيم")}</p></div></div>
        <div className="tool-section layer-section"><span className="tool-label">{t("Layers","الطبقات")}</span><div className="layer-row active"><span className="layer-thumb">◢</span><span>{t("Artwork · Master","التصميم · الماستر")}</span><Layers3 size={15} /></div><button className="layer-action"><Copy size={15} /> {t("Duplicate","نسخ")}</button><button className="layer-action"><Trash2 size={15} /> {t("Delete","حذف")}</button></div>
        <div className="history-row"><button><Undo2 size={16} /> {t("Undo","تراجع")}</button><button><Redo2 size={16} /> {t("Redo","إعادة")}</button></div>
        <Form method="post"><input type="hidden" name="intent" value="add-to-cart" /><input type="hidden" name="variantId" value={variantId} /><button type="submit" className="button button-primary full-button" disabled={!variantId}>{t("Add to cart","أضف للسلة")} <ShoppingBag size={16} /></button></Form>
        <p className="supplier-note">{t("Local preview is separate from any official supplier mockup. Supplier rendering becomes available after a mapped product is selected.","المعاينة المحلية منفصلة عن أي نموذج رسمي من المورّد. تتوفر معاينة المورّد بعد اختيار منتج مربوط بالنظام.")}</p>
      </aside>
    </div>
  </main>;
}
