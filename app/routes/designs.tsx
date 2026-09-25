import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/designs";
import { ArrowLeft, Heart, Search, SlidersHorizontal } from "lucide-react";
import { localeDir, pick, useAppLocale } from "../i18n";
import {
  fetchOdooJson,
  mapOdooDesigns,
  type LegacyStudioDesign,
} from "../lib/odoo-api.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const payload = await fetchOdooJson(request, context, "/api/dtf/v1/designs");
  return { designs: mapOdooDesigns(payload as any) };
}

function Artwork({ design }: { design: LegacyStudioDesign }) {
  if (design.imageUrl) {
    return <img
      src={design.imageUrl}
      alt={design.titleEn}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />;
  }
  return <div className="artwork artwork-vibes artwork-large"><span>✦</span></div>;
}

export default function Designs() {
  const { designs } = useLoaderData<typeof loader>();
  const lang = useAppLocale();
  const ar = lang === "ar";
  return <main className="studio-shell inner-page" dir={localeDir(lang)}>
    <header className="site-header container"><Link className="back-link" to="/"><ArrowLeft size={17} /></Link><span className="page-title">{ar ? "معرض التصاميم" : "Design Gallery"}</span><div className="header-actions" /></header>
    <section className="container gallery-head"><span className="eyebrow">{pick(lang,"DESIGN FIRST","التصميم أولاً")}</span><h1>{ar ? "فنّك، ثم منتجك." : "Your art. Then your product."}</h1><p>{ar ? "اختر العمل الفني أولاً، وسنساعدك في اختيار المنتج المناسب." : "Choose the artwork first, then we’ll help you find the right product for it."}</p><div className="gallery-tools"><label className="search-field"><Search size={16} /><input placeholder={ar ? "ابحث في التصاميم" : "Search designs"} /></label><button className="filter-button"><SlidersHorizontal size={16} /> {ar ? "تصفية" : "Filters"}</button></div><div className="filter-pills"><span className="active">{ar ? "الكل" : "All"}</span><span>{ar ? "الأحدث" : "New"}</span><span>{ar ? "الأكثر شعبية" : "Trending"}</span><span>{ar ? "عربي" : "Arabic"}</span></div></section>
    <section className="container gallery-grid">{designs.map((design) => <Link className="gallery-card" to={"/customize?designId="+encodeURIComponent(design.id)} key={design.id}><div className="gallery-media"><Artwork design={design} /><button className="heart" aria-label={pick(lang,`Save ${design.titleEn}`,`حفظ ${design.titleAr}`)} onClick={(event) => event.preventDefault()}><Heart size={16} /></button></div><div className="gallery-card-copy"><div><h3>{ar ? (design.titleAr || design.titleEn) : design.titleEn}</h3><p>{design.designerName}</p></div><span className="choose-pill">{ar ? "اختر" : "Choose"}</span></div></Link>)}</section>
  </main>;
}
