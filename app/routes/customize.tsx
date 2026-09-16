import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/customize";
import type { ItemStore } from "../../workers/item-store";
import { ArrowLeft, Check, Copy, FlipHorizontal2, Layers3, Minus, Move, Plus, Redo2, RotateCw, Ruler, ShoppingBag, Trash2, Undo2, Upload, ZoomIn } from "lucide-react";

function cookieValue(request: Request, name: string): string {
  const cookie=request.headers.get("cookie")??"";
  const part=cookie.split(";").map((x)=>x.trim()).find((x)=>x.startsWith(name+"="));
  return (part?.slice(name.length+1)??"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,120);
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  if (form.get("intent") !== "add-to-cart") return null;
  const namespace = context.cloudflare.env.ITEMS as DurableObjectNamespace<ItemStore>;
  const store = namespace.get(namespace.idFromName("default"));
  const existingCart=cookieValue(request,"dtf_cart_session");
  const legacy=cookieValue(request,"dtf_session");
  const legacyIsAuth=legacy?Boolean(await store.sessionIdentity(legacy)):false;
  const sessionKey=existingCart||(!legacyIsAuth&&legacy?legacy:crypto.randomUUID().replaceAll("-",""));
  await store.addCartItem({ sessionKey, variantId: String(form.get("variantId") ?? "variant-tshirt-white-m"), printSpecJson: JSON.stringify({ position: "front", widthCm: 25, heightCm: 30, xCm: 5, yCm: 10, rotation: 0 }) });
  return redirect("/cart", { headers: { "Set-Cookie": `dtf_cart_session=${sessionKey}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000` } });
}

export default function Customize() {
  return <main className="studio-shell inner-page" dir="ltr"><header className="site-header container"><Link className="back-link" to="/"><ArrowLeft size={17} /></Link><span className="page-title">Print Your Dream</span><div className="header-actions"><Link className="icon-button" to="/cart"><ShoppingBag size={18} /></Link><span className="lang-switch">EN / عربي</span></div></header><div className="customizer-layout container"><section className="customizer-stage"><div className="stage-top"><div><span className="eyebrow">PRODUCT FIRST / DESIGN FIRST</span><h1>Build your print.</h1></div><span className="local-status"><span className="status-dot" /> Local preview</span></div><div className="canvas-wrap"><div className="canvas-grid" /><div className="canvas-shirt"><span>YOUR<br /><b>ART</b></span><div className="selection-box"><span className="handle h-tl" /><span className="handle h-tr" /><span className="handle h-bl" /><span className="handle h-br" /><div className="selected-art">◢</div></div></div><div className="print-boundary">SAFE PRINT AREA</div><button className="zoom-control"><Minus size={14} /><span>100%</span><Plus size={14} /><ZoomIn size={15} /></button></div><div className="stage-bottom"><button className="button button-ghost"><Upload size={16} /> Upload artwork</button><p><Check size={15} /> Your changes are saved to this print specification</p></div></section><aside className="tools-corner"><div className="tools-title"><div><span className="eyebrow">TOOLS CORNER</span><h2>Customize</h2></div><span className="tool-count">1 / 1</span></div><div className="tool-tabs"><button className="active">Front</button><button>Back</button><button>Left</button><button>Right</button></div><div className="tool-section"><span className="tool-label">Transform</span><div className="tool-grid"><button><Move size={16} />Move</button><button><Ruler size={16} />Scale</button><button><RotateCw size={16} />Rotate</button><button><FlipHorizontal2 size={16} />Flip</button></div></div><div className="tool-section"><span className="tool-label">Print size <small>cm</small></span><div className="field-row"><label>W <input defaultValue="25.0" /></label><label>H <input defaultValue="30.0" /></label></div><span className="tool-label position-label">Position <small>cm</small></span><div className="field-row"><label>X <input defaultValue="5.0" /></label><label>Y <input defaultValue="10.0" /></label></div></div><div className="quality-card"><div className="quality-icon"><Check size={17} /></div><div><b>Good print quality</b><p>Effective DPI 300 · no scaling risk</p></div></div><div className="tool-section layer-section"><span className="tool-label">Layers</span><div className="layer-row active"><span className="layer-thumb">◢</span><span>Artwork · Master</span><Layers3 size={15} /></div><button className="layer-action"><Copy size={15} /> Duplicate</button><button className="layer-action"><Trash2 size={15} /> Delete</button></div><div className="history-row"><button><Undo2 size={16} /> Undo</button><button><Redo2 size={16} /> Redo</button></div><Form method="post"><input type="hidden" name="intent" value="add-to-cart" /><input type="hidden" name="variantId" value="variant-tshirt-white-m" /><button type="submit" className="button button-primary full-button">Add to cart <ShoppingBag size={16} /></button></Form><p className="supplier-note">Local preview is separate from any official supplier mockup. Printify rendering becomes available after a mapped product is selected.</p></aside></div></main>;
}
