import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/designs";
import type { ItemStore } from "../../workers/item-store";
import { ArrowLeft, Heart, Search, SlidersHorizontal } from "lucide-react";

function store(context: Route.LoaderArgs["context"]) {
  const namespace = context.cloudflare.env.ITEMS as DurableObjectNamespace<ItemStore>;
  return namespace.get(namespace.idFromName("default"));
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const lang = url.searchParams.get("lang") === "ar" ? "ar" : "en";
  const search = url.searchParams.get("search")?.trim().toLowerCase() ?? "";
  const rows = await store(context).designs();
  const designs = (Array.isArray(rows) ? rows : []).map((design: any) => ({
    id: String(design.id ?? ""),
    titleEn: String(design.titleEn ?? ""),
    titleAr: String(design.titleAr ?? ""),
    imageUrl: String(design.imageUrl ?? ""),
    designer: String(design.designerName ?? "DTF Studio"),
  })).filter((design) => !search || `${design.titleEn} ${design.titleAr} ${design.designer}`.toLowerCase().includes(search));
  return { lang, search, designs };
}

export default function Designs() {
  const { lang, search, designs } = useLoaderData<typeof loader>();
  const ar = lang === "ar";
  const makeUrl = (nextLang: string, nextSearch = search) => {
    const params = new URLSearchParams();
    if (nextLang === "ar") params.set("lang", "ar");
    if (nextSearch) params.set("search", nextSearch);
    const query = params.toString();
    return `/designs${query ? `?${query}` : ""}`;
  };
  return <main className="studio-shell inner-page" dir={ar ? "rtl" : "ltr"}>
    <header className="site-header container"><Link className="back-link" to={ar ? "/?lang=ar" : "/"}><ArrowLeft size={17} /></Link><span className="page-title">{ar ? "معرض التصاميم" : "Design Gallery"}</span><div className="header-actions"><Link className="lang-switch" to={makeUrl(ar ? "en" : "ar")}>{ar ? "EN" : "عربي"}</Link></div></header>
    <section className="container gallery-head"><span className="eyebrow">DESIGN FIRST</span><h1>{ar ? "فنّك، ثم منتجك." : "Your art. Then your product."}</h1><p>{ar ? "اختر العمل الفني أولاً، وسنساعدك في اختيار المنتج المناسب." : "Choose the artwork first, then we’ll help you find the right product for it."}</p><form className="gallery-tools" method="get"><label className="search-field"><Search size={16} /><input name="search" defaultValue={search} placeholder={ar ? "ابحث في التصاميم" : "Search designs"} /></label>{ar && <input type="hidden" name="lang" value="ar" />}<button className="filter-button" type="submit"><SlidersHorizontal size={16} /> {ar ? "بحث" : "Search"}</button></form><div className="filter-pills"><span className="active">{ar ? "الكل" : "All"}</span></div></section>
    <section className="container gallery-grid">{designs.length ? designs.map((design) => <Link className="gallery-card" to={`/customize?designId=${encodeURIComponent(design.id)}`} key={design.id}><div className="gallery-media">{design.imageUrl ? <img src={design.imageUrl} alt={ar ? design.titleAr : design.titleEn} loading="lazy" /> : <div className="artwork artwork-large"><span>✦</span></div>}<button className="heart" aria-label={`${ar ? "حفظ" : "Save"} ${ar ? design.titleAr : design.titleEn}`} onClick={(event) => event.preventDefault()}><Heart size={16} /></button></div><div className="gallery-card-copy"><div><h3>{ar ? design.titleAr : design.titleEn}</h3><p>{design.designer}</p></div><span className="choose-pill">{ar ? "اختر" : "Choose"}</span></div></Link>) : <div className="empty-cart"><Search size={20} /><h2>{ar ? "لا توجد تصاميم" : "No designs found"}</h2><p>{ar ? "جرّب كلمة بحث أخرى." : "Try another search term."}</p></div>}</section>
  </main>;
}
