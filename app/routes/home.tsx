import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/home";
import {
  ArrowRight,
  CheckCircle2,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { localeDir, pick, useAppLocale } from "../i18n";
import {
  fetchOdooJson,
  mapOdooDesigns,
  type LegacyStudioDesign,
} from "../lib/odoo-api.server";

type HomepageBanner = {
  id: number;
  sequence?: number;
  eyebrow_en?: string;
  eyebrow_ar?: string;
  title_en?: string;
  title_ar?: string;
  subtitle_en?: string;
  subtitle_ar?: string;
  image_url?: string | null;
  image_alt_en?: string;
  image_alt_ar?: string;
  primary_cta_label_en?: string;
  primary_cta_label_ar?: string;
  primary_cta_url?: string;
  secondary_cta_label_en?: string;
  secondary_cta_label_ar?: string;
  secondary_cta_url?: string;
};

type HomepagePayload = { banners?: HomepageBanner[] };
type CategoryRow = {
  id: number;
  name?: string;
  name_ar?: string;
  sequence?: number;
};
type ProductRow = {
  id: number;
  name?: string;
  name_ar?: string;
  price?: number;
  currency?: string;
  image_1920?: boolean;
  variants?: Array<{ id?: number; active?: boolean; stock_available?: number }>;
};

export async function loader({ request, context }: Route.LoaderArgs) {
  const [homepage, categories, products, designs] = await Promise.all([
    fetchOdooJson<HomepagePayload>(request, context, "/api/dtf/v1/homepage"),
    fetchOdooJson<{ items?: CategoryRow[] }>(request, context, "/api/dtf/v1/categories"),
    fetchOdooJson<{ items?: ProductRow[] }>(request, context, "/api/dtf/v1/products"),
    fetchOdooJson(request, context, "/api/dtf/v1/designs"),
  ]);

  return {
    banners: homepage.banners ?? [],
    categories: (categories.items ?? []).slice(0, 4),
    products: (products.items ?? []).slice(0, 4),
    designs: mapOdooDesigns(designs as any).slice(0, 5),
  };
}

function DesignArtwork({ design }: { design: LegacyStudioDesign }) {
  return design.imageUrl ? (
    <img className="home-design-image" src={design.imageUrl} alt={design.titleEn} />
  ) : (
    <div className="artwork artwork-vibes"><span>✦</span></div>
  );
}

export default function Home() {
  const { banners, categories, products, designs } = useLoaderData<typeof loader>();
  const locale = useAppLocale();
  const ar = locale === "ar";
  const banner = banners[0];

  const text = (en?: string, arText?: string, fallbackEn = "", fallbackAr = "") =>
    ar ? (arText || arText === "" ? arText : fallbackAr) : (en || en === "" ? en : fallbackEn);

  return (
    <main className="studio-shell home-page" dir={localeDir(locale)} data-home-source="odoo19">
      <header className="site-header container">
        <Link className="brand" to="/">
          <span className="brand-mark">DTF</span>
          <span>STUDIO<b>PRINT YOUR DREAM</b></span>
        </Link>
        <nav className="desktop-nav" aria-label={pick(locale, "Main navigation", "التنقل الرئيسي")}>
          <Link to="/customize">{pick(locale, "Products", "المنتجات")}</Link>
          <Link to="/designs">{pick(locale, "Design Gallery", "معرض التصاميم")}</Link>
          <Link to="/customize">{pick(locale, "Print Your Dream", "اطبع حلمك")}</Link>
        </nav>
        <div className="header-actions">
          <Link className="icon-button" to="/designs" aria-label={pick(locale, "Search designs", "ابحث في التصاميم")}><Search size={17}/></Link>
          <Link className="icon-button" to="/cart" aria-label={pick(locale, "Cart", "السلة")}><ShoppingBag size={17}/></Link>
          <Link className="button button-ghost home-login" to="/login">{pick(locale, "Sign in", "تسجيل الدخول")}</Link>
          <button className="menu-button" aria-label={pick(locale, "Menu", "القائمة")}><Menu size={18}/></button>
        </div>
      </header>

      <section className="hero container" data-home-visible="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            {banner
              ? text(banner.eyebrow_en, banner.eyebrow_ar)
              : pick(locale, "ODOO HOMEPAGE CONTENT", "محتوى الصفحة الرئيسية من أودو")}
          </span>
          <h1>
            {banner
              ? text(banner.title_en, banner.title_ar)
              : pick(locale, "Homepage content is managed in Odoo.", "محتوى الصفحة الرئيسية يُدار من أودو.")}
          </h1>
          <p>
            {banner
              ? text(banner.subtitle_en, banner.subtitle_ar)
              : pick(locale, "Add or enable a Homepage banner from the DTF Studio Admin dashboard.", "أضف أو فعّل بانر الصفحة الرئيسية من لوحة إدارة DTF Studio.")}
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to={banner?.primary_cta_url || "/customize"}>
              {banner
                ? text(banner.primary_cta_label_en, banner.primary_cta_label_ar, "Shop Products", "تسوق المنتجات")
                : pick(locale, "Shop Products", "تسوق المنتجات")}
              <ArrowRight size={15}/>
            </Link>
            <Link className="button button-ghost" to={banner?.secondary_cta_url || "/designs"}>
              {banner
                ? text(banner.secondary_cta_label_en, banner.secondary_cta_label_ar, "Design Gallery", "معرض التصاميم")
                : pick(locale, "Design Gallery", "معرض التصاميم")}
            </Link>
          </div>
          <div className="hero-proof">
            <span><CheckCircle2 size={15}/>{pick(locale, "Odoo-native catalog", "كتالوج أصلي من أودو")}</span>
            <span><Sparkles size={15}/>{pick(locale, "Designer marketplace", "سوق المصممين")}</span>
          </div>
        </div>
        <div className="hero-art">
          <div className="glow glow-one"/>
          <div className="glow glow-two"/>
          {banner?.image_url ? (
            <img
              className="hero-banner-image"
              src={"/api/studio/homepage-banners/" + banner.id + "/image"}
              alt={text(banner.image_alt_en, banner.image_alt_ar, banner.title_en, banner.title_ar)}
            />
          ) : (
            <div className="hero-product" aria-hidden="true"><div className="shirt-shape"><i>✦</i>DTF STUDIO</div></div>
          )}
          <div className="hero-badge"><span>●</span><b>{pick(locale, "LIVE FROM ODOO\nADMIN", "مباشر من\nإدارة أودو")}</b></div>
        </div>
      </section>

      <section className="section container" data-home-visible="categories">
        <div className="section-heading">
          <div><span className="eyebrow">{pick(locale, "SHOP", "تسوق")}</span><h2>{pick(locale, "Browse categories", "تصفح الفئات")}</h2></div>
          <Link className="text-link" to="/customize">{pick(locale, "View products", "عرض المنتجات")} <ArrowRight size={14}/></Link>
        </div>
        <div className="category-grid">
          {categories.map((category, index) => (
            <Link className={"category-card category-" + (["shirt","mug","cap","dream"][index] || "shirt")} to="/customize" key={category.id}>
              <span>{ar ? (category.name_ar || category.name) : category.name}</span>
              <span className="category-icon">{index + 1}</span>
              <ArrowRight size={15}/>
            </Link>
          ))}
        </div>
      </section>

      <section className="section container" data-home-visible="products">
        <div className="section-heading">
          <div><span className="eyebrow">{pick(locale, "PRODUCTS", "المنتجات")}</span><h2>{pick(locale, "Ready for your design", "جاهزة لتصميمك")}</h2></div>
          <span className="status-chip"><span className="status-dot"/>{pick(locale, "Managed in Odoo", "تدار من أودو")}</span>
        </div>
        <div className="product-grid">
          {products.map((product) => (
            <Link className="product-card" to={"/customize?variantId=" + encodeURIComponent(String(product.variants?.[0]?.id || ""))} key={product.id}>
              <div className="product-media">
                <span className="product-tag">{pick(locale, "ODOO", "أودو")}</span>
                {product.image_1920 ? (
                  <img className="home-product-image" src={"/api/studio/products/" + product.id + "/image"} alt={ar ? (product.name_ar || product.name) : product.name}/>
                ) : (
                  <div className="artwork"><span>DTF</span></div>
                )}
              </div>
              <div className="product-info">
                <div><h3>{ar ? (product.name_ar || product.name) : product.name}</h3><p>{pick(locale, "Choose size and color", "اختر المقاس واللون")}</p></div>
                <strong>{Number(product.price || 0).toFixed(2)} {product.currency || "JOD"}</strong>
              </div>
              <span className="card-link">{pick(locale, "Customize", "تخصيص")} <ArrowRight size={13}/></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section container" data-home-visible="designs">
        <div className="section-heading">
          <div><span className="eyebrow">{pick(locale, "DESIGNERS", "المصممون")}</span><h2>{pick(locale, "Fresh from our designers", "أحدث أعمال المصممين")}</h2></div>
          <Link className="text-link" to="/designs">{pick(locale, "Open gallery", "فتح المعرض")} <ArrowRight size={14}/></Link>
        </div>
        <div className="design-strip">
          {designs.map((design) => (
            <Link className="design-card" to={"/customize?designId=" + encodeURIComponent(design.id)} key={design.id}>
              <DesignArtwork design={design}/>
              <Heart className="design-heart" size={15}/>
              <div className="design-meta"><h3>{ar ? (design.titleAr || design.titleEn) : design.titleEn}</h3><p>{design.designerName}</p></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="dream-panel container">
        <div className="dream-grid">
          <div>
            <span className="eyebrow">{pick(locale, "PRINT YOUR DREAM", "اطبع حلمك")}</span>
            <h2>{pick(locale, "Your artwork. Your product.", "تصميمك. منتجك.")}</h2>
            <p>{pick(locale, "Start with a product or a published designer artwork, then build the print specification.", "ابدأ بمنتج أو تصميم مصمم منشور، ثم أنشئ مواصفات الطباعة.")}</p>
            <div className="dream-actions">
              <Link className="button button-primary" to="/customize">{pick(locale, "Start customizing", "ابدأ التخصيص")}</Link>
              <Link className="button button-ghost" to="/designs">{pick(locale, "Choose a design", "اختر تصميماً")}</Link>
            </div>
          </div>
          <div className="dream-visual" aria-hidden="true"><span>PRINT<br/><b>YOUR DREAM</b></span><i className="dream-ring ring-one"/><i className="dream-ring ring-two"/></div>
        </div>
      </section>

      <footer className="site-footer container">
        <strong>DTF STUDIO</strong>
        <p>{pick(locale, "Homepage content and catalog are sourced from Odoo 19.", "محتوى الصفحة الرئيسية والكتالوج مصدرهما أودو 19.")}</p>
        <div className="footer-links"><Link to="/designs">{pick(locale, "Designs", "التصاميم")}</Link><Link to="/customize">{pick(locale, "Products", "المنتجات")}</Link></div>
      </footer>
    </main>
  );
}
