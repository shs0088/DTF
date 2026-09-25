import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/home";
import {
  ArrowRight, Gem, Globe2, Headphones, Heart, Home as HomeIcon,
  Menu, Palette, Search, ShieldCheck, ShoppingBag, ShoppingCart, Store, Truck, UserRound,
} from "lucide-react";
import { localeDir, pick, useAppLocale } from "../i18n";
import { fetchOdooJson, mapOdooDesigns, type LegacyStudioDesign } from "../lib/odoo-api.server";

type HomepageBanner = {
  id: number; sequence?: number;
  eyebrow_en?: string; eyebrow_ar?: string;
  title_en?: string; title_ar?: string;
  subtitle_en?: string; subtitle_ar?: string;
  image_url?: string | null;
  image_alt_en?: string; image_alt_ar?: string;
  primary_cta_label_en?: string; primary_cta_label_ar?: string;
  primary_cta_url?: string;
  secondary_cta_label_en?: string; secondary_cta_label_ar?: string;
  secondary_cta_url?: string;
};
type HomepagePayload = { banners?: HomepageBanner[] };
type CategoryRow = { id:number; name?:string; name_ar?:string; sequence?:number };
type ProductRow = {
  id:number; name?:string; name_ar?:string; price?:number; currency?:string;
  image_1920?:boolean; variants?:Array<{id?:number;active?:boolean;stock_available?:number}>;
};

export async function loader({ request, context }: Route.LoaderArgs) {
  const [homepage, categories, products, designs] = await Promise.all([
    fetchOdooJson<HomepagePayload>(request, context, "/api/dtf/v1/homepage").catch(() => ({ banners: [] })),
    fetchOdooJson<{ items?: CategoryRow[] }>(request, context, "/api/dtf/v1/categories"),
    fetchOdooJson<{ items?: ProductRow[] }>(request, context, "/api/dtf/v1/products"),
    fetchOdooJson(request, context, "/api/dtf/v1/designs"),
  ]);
  return {
    banners: homepage.banners ?? [],
    categories: (categories.items ?? []).slice(0, 6),
    products: (products.items ?? []).slice(0, 6),
    designs: mapOdooDesigns(designs as any).slice(0, 6),
  };
}

function DesignArtwork({ design }: { design: LegacyStudioDesign }) {
  return design.imageUrl
    ? <img className="f6-design-image" src={design.imageUrl} alt={design.titleEn}/>
    : <div className="f6-design-fallback"><span>✦</span></div>;
}

export default function Home() {
  const { banners, categories, products, designs } = useLoaderData<typeof loader>();
  const locale = useAppLocale();
  const ar = locale === "ar";
  const banner = banners[0];
  const nextLocale = ar ? "en" : "ar";
  const text = (en?:string, arText?:string, fallbackEn="", fallbackAr="") =>
    ar ? (arText || fallbackAr) : (en || fallbackEn);
  const fallbackTitle = ar ? ["حوّل أفكارك", "إلى واقع مطبوع"] : ["Turn your ideas", "into printed reality"];
  const rawTitle = text(banner?.title_en, banner?.title_ar, fallbackTitle.join("\n"), fallbackTitle.join("\n"));
  const titleParts = rawTitle.split(/\n|<br\s*\/?\s*>/i);
  const firstTitle = titleParts[0] || fallbackTitle[0];
  const secondTitle = titleParts.slice(1).join(" ") || fallbackTitle[1];
  const subtitle = text(
    banner?.subtitle_en, banner?.subtitle_ar,
    "Premium DTF prints on distinctive products. Create without limits.",
    "طباعات DTF عالية الجودة على منتجات مميزة بلا حدود للإبداع."
  );

  return (
    <main className="f6-wrap home-page" dir={localeDir(locale)} data-home-source="odoo19" data-home-style="v48.22e">
      <div className="f6-home">
        <header className="f6-header">
          <button className="f6-menu" aria-label={pick(locale,"Menu","القائمة")}><Menu/></button>
          <Link className="f6-logo" to="/">
            <span>DTF <strong>STUDIO</strong></span>
            <small>PRINT YOUR DREAM</small>
          </Link>
          <div className="f6-search">
            <input aria-label={pick(locale,"Search","بحث")} placeholder={pick(locale,"Search products, designs or designers","بحث عن منتجات، تصاميم أو مصممين")}/>
            <button aria-label={pick(locale,"Search","بحث")}><Search/></button>
          </div>
          <a className="f6-language" href={"/language/"+nextLocale+"?returnTo=%2F"}>
            <Globe2/><span>{ar ? "English" : "عربي"}</span>
          </a>
          <nav className="f6-nav" aria-label={pick(locale,"Main navigation","التنقل الرئيسي")}>
            <Link className="active" to="/">{pick(locale,"Home","الرئيسية")}</Link>
            <Link to="/customize">{pick(locale,"Shop","المتجر")}</Link>
            <Link to="/designs">{pick(locale,"Design Gallery","التصاميم")}</Link>
            <Link to="/customize">{pick(locale,"Print Your Dream","اطبع حلمك")}</Link>
          </nav>
          <div className="f6-tools">
            <Link className="f6-account" to="/login"><UserRound/><span>{pick(locale,"My account","حسابي")}</span></Link>
            <Link className="f6-cart" to="/cart" aria-label={pick(locale,"Cart","السلة")}>
              <ShoppingCart/><span>0</span>
            </Link>
          </div>
        </header>

        <section className="f6-hero" data-home-visible="hero">
          <div className="f6-hero-picture">
            {banner?.image_url
              ? <img src={"/api/studio/homepage-banners/"+banner.id+"/image"} alt={text(banner.image_alt_en,banner.image_alt_ar,banner.title_en,banner.title_ar)}/>
              : <div className="f6-hoodie-fallback"><div className="f6-hoodie-print">✦</div></div>}
          </div>
          <div className="f6-hero-copy">
            <h1>{firstTitle}<br/><em>{secondTitle}</em></h1>
            <p>{subtitle}</p>
            <div className="f6-hero-actions">
              <Link className="btn primary" to={banner?.primary_cta_url || "/customize"}>
                <ShoppingCart/>{text(banner?.primary_cta_label_en,banner?.primary_cta_label_ar,"Shop now","تسوق الآن")}
              </Link>
              <Link className="btn ghost" to={banner?.secondary_cta_url || "/customize"}>
                {text(banner?.secondary_cta_label_en,banner?.secondary_cta_label_ar,"Start designing","ابدأ التصميم")}
              </Link>
            </div>
          </div>
          <div className="f6-benefits">
            <div><Gem/><strong>{pick(locale,"Premium quality","جودة عالية")}</strong><small>{pick(locale,"Sharp DTF print","طباعة دقيقة")}</small></div>
            <div><Truck/><strong>{pick(locale,"Fast delivery","توصيل سريع")}</strong><small>{pick(locale,"Across Jordan","داخل الأردن")}</small></div>
            <div><ShieldCheck/><strong>{pick(locale,"Secure payment","دفع آمن")}</strong><small>{pick(locale,"Protected checkout","دفع محمي")}</small></div>
            <div><Headphones/><strong>{pick(locale,"24/7 support","دعم على مدار الساعة")}</strong><small>{pick(locale,"We are here","نحن معك")}</small></div>
          </div>
        </section>

        <section className="f6-catalog" data-home-visible="products">
          <div className="f6-section-head">
            <h2>{pick(locale,"Categories","الفئات")}</h2>
            <Link to="/customize">{pick(locale,"View all","عرض الكل")}</Link>
          </div>
          <div className="f6-categories" data-home-visible="categories">
            {categories.map((category,index) => {
              const product = products[index];
              return (
                <Link className="f6-category" to="/customize" key={category.id}>
                  {product?.image_1920
                    ? <img src={"/api/studio/products/"+product.id+"/image"} alt={ar ? (category.name_ar || category.name) : category.name}/>
                    : <div className="f6-category-art">{index+1}</div>}
                  <h3>{ar ? (category.name_ar || category.name) : category.name}</h3>
                  <span>{pick(locale,"Shop now","تسوق الآن")}</span>
                </Link>
              );
            })}
          </div>

          <div className="f6-section-head">
            <h2>{pick(locale,"Featured designs","تصاميم مميزة")}</h2>
            <Link to="/designs">{pick(locale,"View all","عرض الكل")}</Link>
          </div>
          <div className="f6-designs">
            {designs.map((design) => (
              <Link className="f6-design" to={"/customize?designId="+encodeURIComponent(design.id)} key={design.id}>
                <DesignArtwork design={design}/>
                <h3>{ar ? (design.titleAr || design.titleEn) : design.titleEn}</h3>
                <div><span>{design.designerName}</span><Heart/></div>
              </Link>
            ))}
          </div>
        </section>
        <section className="f6-process">
          <Link to="/customize"><Store/><div><strong>{pick(locale,"Choose a product","اختر منتجاً")}</strong><small>{pick(locale,"Start from the catalog","ابدأ من المتجر")}</small></div></Link>
          <Link to="/designs"><Palette/><div><strong>{pick(locale,"Choose a design","اختر تصميماً")}</strong><small>{pick(locale,"Browse designer artwork","تصفح أعمال المصممين")}</small></div></Link>
          <Link to="/customize"><ShoppingBag/><div><strong>{pick(locale,"Customize","خصص المنتج")}</strong><small>{pick(locale,"Build your print","أنشئ طباعتك")}</small></div></Link>
          <Link to="/cart"><Truck/><div><strong>{pick(locale,"Order & deliver","اطلب واستلم")}</strong><small>{pick(locale,"Track your order","تابع طلبك")}</small></div></Link>
        </section>
      </div>

      <nav className="f6-mobile-nav" aria-label={pick(locale,"Mobile navigation","تنقل الهاتف")}>
        <Link className="active" to="/"><HomeIcon/><span>{pick(locale,"Home","الرئيسية")}</span></Link>
        <Link to="/customize"><Store/><span>{pick(locale,"Shop","المتجر")}</span></Link>
        <Link to="/customize"><Headphones/><span>{pick(locale,"Customize","التصميم")}</span></Link>
        <Link to="/cart"><ShoppingCart/><span>{pick(locale,"Cart","السلة")}</span></Link>
        <Link to="/login"><UserRound/><span>{pick(locale,"My account","حسابي")}</span></Link>
      </nav>
    </main>
  );
}