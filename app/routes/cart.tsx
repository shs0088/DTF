import { Form, Link, useLoaderData } from "react-router";
import type { Route } from "./+types/cart";
import type { CartSnapshot, ItemStore } from "../../workers/item-store";
import { ArrowLeft, Check, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

type CartLoaderData = { cart: CartSnapshot; sessionKey: string; settings: any };

function cookieValue(request: Request, name: string): string {
  const cookie=request.headers.get("cookie")??"";
  const part=cookie.split(";").map((x)=>x.trim()).find((x)=>x.startsWith(name+"="));
  return (part?.slice(name.length+1)??"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,120);
}
function store(context: Route.LoaderArgs["context"] | Route.ActionArgs["context"]) {
  const namespace = context.cloudflare.env.ITEMS as DurableObjectNamespace<ItemStore>;
  return namespace.get(namespace.idFromName("default"));
}
async function readCartSession(request:Request,s:ReturnType<typeof store>):Promise<{key:string;isNew:boolean}>{
  const cartCookie=cookieValue(request,"dtf_cart_session");
  if(cartCookie)return {key:cartCookie,isNew:false};
  const querySession=new URL(request.url).searchParams.get("session")?.replace(/[^a-zA-Z0-9_-]/g,"").slice(0,80);
  if(querySession)return {key:querySession,isNew:true};
  const legacy=cookieValue(request,"dtf_session");
  if(legacy&&!(await s.sessionIdentity(legacy)))return {key:legacy,isNew:true};
  return {key:crypto.randomUUID().replaceAll("-",""),isNew:true};
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const s=store(context),session=await readCartSession(request,s);
  const settings=(await s.businessSettingsSnapshot() as any).settings;
  const result = { cart: await s.getCart(session.key), sessionKey: session.key, settings } satisfies CartLoaderData;
  return Response.json(result, session.isNew ? { headers: { "Set-Cookie": `dtf_cart_session=${session.key}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000` } } : undefined);
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData(),s=store(context);
  const session=await readCartSession(request,s);
  const sessionKey = String(form.get("sessionKey") ?? session.key).replace(/[^a-zA-Z0-9_-]/g,"").slice(0,80);
  const intent = String(form.get("intent") ?? "");
  if (intent === "remove") {
    const lineId = String(form.get("lineId") ?? "");
    return Response.json({ cart: await s.removeCartItem(sessionKey, lineId) });
  }
  return Response.json({ cart: await s.getCart(sessionKey) });
}

function formatJod(value: number) { return `JOD ${value.toFixed(2)}`; }

export default function Cart() {
  const data = useLoaderData<typeof loader>() as CartLoaderData;
  const { cart, sessionKey, settings } = data;
  const delivery=cart.lines.length?(cart.subtotalJod>=Number(settings.freeDeliveryThreshold||0)?0:Number(settings.standardDeliveryFee||0)):0;
  return <main className="studio-shell inner-page" dir="ltr"><header className="site-header container"><Link className="back-link" to="/"><ArrowLeft size={17} /></Link><span className="page-title">Cart</span><div className="header-actions"><span className="cart-count">{cart.itemCount} items</span></div></header><section className="container cart-page"><div className="cart-heading"><div><span className="eyebrow">YOUR SELECTION</span><h1>Ready when you are.</h1></div><span className="reservation-chip"><span className="status-dot" /> {Number(settings.bankTransferReservationMinutes||30)}-min reservation on checkout</span></div><div className="cart-grid"><section className="cart-items">{cart.lines.length === 0 ? <div className="empty-cart"><ShoppingBag size={28} /><h2>Your cart is empty.</h2><p>Choose a design or start with a product to build your first print.</p><Link className="button button-primary" to="/customize">Start designing</Link></div> : <>{cart.lines.map((item) => <article className="cart-item" key={item.id}><div className={`mini-art art-${item.productName.includes("Mug") ? "vibes" : "tiger"}`}>{item.productName.includes("Mug") ? "✦" : "◢"}</div><div className="cart-item-copy"><h3>{item.productName}</h3><p>{item.color ?? ""}{item.size ? ` / ${item.size}` : ""} · configuration saved</p><div className="quantity"><button aria-label="Decrease" disabled><Minus size={13} /></button><span>{item.quantity}</span><button aria-label="Increase" disabled><Plus size={13} /></button></div></div><strong>{formatJod(item.lineTotalJod)}</strong><Form method="post"><input type="hidden" name="intent" value="remove" /><input type="hidden" name="lineId" value={item.id} /><input type="hidden" name="sessionKey" value={sessionKey} /><button className="remove-button" aria-label={`Remove ${item.productName}`}><Trash2 size={16} /></button></Form></article>)}<div className="gift-row"><span className="gift-icon">✦</span><div><b>Add gift wrapping</b><p>Item-level gift wrapping can be enabled at checkout.</p></div><button className="toggle" aria-label="Add gift wrapping" /></div></>}</section><aside className="summary-card"><h2>Order summary</h2><div className="summary-row"><span>Subtotal</span><b>{formatJod(cart.subtotalJod)}</b></div><div className="summary-row"><span>Delivery</span><b>{formatJod(delivery)}</b></div><div className="summary-row total"><span>Total before coupon</span><b>{formatJod(cart.subtotalJod + delivery)}</b></div><Form method="get" action="/checkout" className="coupon"><input name="coupon" placeholder="Promo code" /><button disabled={cart.lines.length===0}>Apply</button></Form><Link className={`button button-primary full-button ${cart.lines.length === 0 ? "disabled-link" : ""}`} to={cart.lines.length ? "/checkout" : "/customize"}>Checkout <Check size={16} /></Link><p className="summary-note"><ShoppingBag size={14} /> Sign-in, coupon validity, stock and payment state are enforced server-side at checkout.</p></aside></div></section></main>;
}
