import { Link } from "react-router";
import { ArrowLeft, Heart, Search, SlidersHorizontal } from "lucide-react";
import { localeDir, pick, useAppLocale } from "../i18n";

const designs = [
  ["Neon Tiger", "النمر النيون", "tiger", "Creative Studio"],
  ["Cyber Skull", "الجمجمة الرقمية", "skull", "Shady Designs"],
  ["Good Vibes", "طاقة إيجابية", "vibes", "Good Vibes Co."],
  ["Palm Sunset", "غروب النخيل", "sunset", "Wadi Works"],
  ["Blue Dragon", "التنين الأزرق", "dragon", "North Star"],
  ["Wild Cat", "القط البري", "cat", "Amman Art Lab"],
];

function Artwork({ art }: { art: string }) { return <div className={`artwork artwork-${art} artwork-large`}><span>{art === "tiger" ? "◢" : art === "skull" ? "☠" : art === "sunset" ? "◉" : art === "dragon" ? "♢" : art === "cat" ? "◐" : "✦"}</span></div>; }

export default function Designs() {
  const lang = useAppLocale();
  const ar = lang === "ar";
  return <main className="studio-shell inner-page" dir={localeDir(lang)}><header className="site-header container"><Link className="back-link" to="/"><ArrowLeft size={17} /></Link><span className="page-title">{ar ? "معرض التصاميم" : "Design Gallery"}</span><div className="header-actions" /></header><section className="container gallery-head"><span className="eyebrow">{pick(lang,"DESIGN FIRST","التصميم أولاً")}</span><h1>{ar ? "فنّك، ثم منتجك." : "Your art. Then your product."}</h1><p>{ar ? "اختر العمل الفني أولاً، وسنساعدك في اختيار المنتج المناسب." : "Choose the artwork first, then we’ll help you find the right product for it."}</p><div className="gallery-tools"><label className="search-field"><Search size={16} /><input placeholder={ar ? "ابحث في التصاميم" : "Search designs"} /></label><button className="filter-button"><SlidersHorizontal size={16} /> {ar ? "تصفية" : "Filters"}</button></div><div className="filter-pills"><span className="active">{ar ? "الكل" : "All"}</span><span>{ar ? "الأحدث" : "New"}</span><span>{ar ? "الأكثر شعبية" : "Trending"}</span><span>{ar ? "عربي" : "Arabic"}</span></div></section><section className="container gallery-grid">{designs.map(([en, arTitle, art, designer]) => <Link className="gallery-card" to="/customize" key={en}><div className="gallery-media"><Artwork art={art} /><button className="heart" aria-label={pick(lang,`Save ${en}`,`حفظ ${arTitle}`)} onClick={(event) => event.preventDefault()}><Heart size={16} /></button></div><div className="gallery-card-copy"><div><h3>{ar ? arTitle : en}</h3><p>{designer}</p></div><span className="choose-pill">{ar ? "اختر" : "Choose"}</span></div></Link>)}</section></main>;
}
