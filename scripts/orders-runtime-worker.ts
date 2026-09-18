import staticHandler from "../workers/static-app";
import { ItemStore } from "../workers/item-store";
export { ItemStore };

interface Env {
  ITEMS: DurableObjectNamespace;
  ASSETS?: { fetch(request: Request): Promise<Response> | Response };
  ORDERS_FIXTURE_TOKEN?: string;
}
function json(value: unknown, status = 200): Response { return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json; charset=utf-8" } }); }
function clean(value: unknown): string { return String(value ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60); }

export class OrdersFixtureStore extends ItemStore {
  async ciCreateFixtures(input: { actorId: string; runId: string }): Promise<any> {
    const runId = clean(input.runId) || crypto.randomUUID().replace(/-/g, "");
    const variants = { a: "ci-orders-a-" + runId, r: "ci-orders-r-" + runId, b: "ci-orders-b-" + runId };
    for (const [key, variantId] of Object.entries(variants)) await this.adminUpsertProductVariant(input.actorId, "model-tshirt", { variantId, sku: "CI-" + key.toUpperCase() + "-" + runId, color: key === "a" ? "White" : key === "r" ? "Black" : "Blue", size: "M", retailPriceJod: 1900, enabled: true, tracked: true, quantity: 10 });
    const designer = await this.registerUser({ displayName: "CI Printable Designer", email: "ci-printable-" + runId + "@example.test", password: "CI-Designer-Password-2026!", role: "designer" });
    this.ctx.storage.sql.exec("UPDATE designer_profiles SET authorization_status='authorized' WHERE user_id=?", designer.userId);
    const designId = "ci-design-" + runId, assetId = "ci-master-" + runId;
    await this.createDesignerDesign(designer.sessionId, { designId, titleEn: "CI Printable Design", titleAr: "تصميم CI قابل للطباعة", descriptionEn: "CI printable fixture", descriptionAr: "مثبت CI قابل للطباعة", productType: "T-Shirt", minDpi: 300, assets: [{ assetId, filename: "ci-master.png", mime: "image/png", byteSize: 1000, storageKey: "designer/" + designer.userId + "/" + designId + "/" + assetId + ".png", isMaster: true, isCover: true, analysis: { format: "png", mime: "image/png", signatureValid: true, pixelWidth: 3600, pixelHeight: 4800, embeddedDpi: 300, hasAlpha: true, previewable: true }, preflight: { passed: true, errors: [], warnings: [], readable: true, analyzable: true, previewable: true, effectiveDpi: { minimum: 300 }, physicalSizeIn: { width: 12, height: 16 }, scalingRisk: "none", placeholderCheck: { status: "not_available" }, productChecks: [{ productType: "T-Shirt", passed: true, effectiveDpi: { minimum: 300 }, errors: [], warnings: [] }] } }] });
    const customer = await this.registerUser({ displayName: "CI Orders Customer", email: "ci-orders-" + runId + "@example.test", password: "CI-Customer-Order-Password-2026!", role: "customer" });
    const makeOrder = async (key: string, variantId: string, design = false) => { const cartSessionKey = "ci-cart-" + key + "-" + runId; await this.addCartItem({ sessionKey: cartSessionKey, variantId, quantity: 1, ...(design ? { designId, masterAssetId: assetId, printSpecJson: JSON.stringify({ productType: "T-Shirt", widthIn: 12, heightIn: 16 }) } : {}) }); return this.createCheckoutOrder({ sessionId: customer.sessionId, cartSessionKey, requestKey: "ci-order-" + key + "-" + runId, fulfillmentMode: "delivery", paymentMethod: "bank_transfer", customerName: "CI Orders Customer", customerPhone: "+962790000000", city: "Amman", address: "CI local order address", notes: "" }) as any; };
    const orders = { a: await makeOrder("a", variants.a), r: await makeOrder("r", variants.r), b: await makeOrder("b", variants.b, true) };
    return { runId, orderId: orders.a.id, orderAId: orders.a.id, orderRId: orders.r.id, orderBId: orders.b.id, variantAId: variants.a, variantRId: variants.r, variantBId: variants.b, orderedQuantityA: 1, orderedQuantityR: 1, orderedQuantityB: 1, designId, approvedMasterId: assetId, orderItemBId: orders.b.items?.[0]?.id };
  }
  ciInspect(input: { orderIds: string[]; variantIds: string[] }): any { const q = (sql: string, ...args: any[]) => this.ctx.storage.sql.exec<any>(sql, ...args).toArray(); return { stocks: input.variantIds.map(variantId => ({ variantId, ...(q("SELECT quantity,tracked FROM stocks WHERE variant_id=?", variantId)[0] ?? {}) })), reservations: input.orderIds.flatMap(orderId => q("SELECT r.id,r.variant_id AS variantId,r.quantity,r.status,r.cart_id AS cartId,r.expires_at AS expiresAt FROM reservations r JOIN order_checkout_details c ON c.source_cart_id=r.cart_id WHERE c.order_id=? ORDER BY r.created_at", orderId)), movements: input.orderIds.flatMap(orderId => q("SELECT sm.variant_id AS variantId,sm.quantity_delta AS quantityDelta,sm.reason,sm.reference_id AS referenceId FROM stock_movements sm WHERE sm.reference_id=? ORDER BY sm.created_at", orderId)), jobs: input.orderIds.flatMap(orderId => q("SELECT pj.id AS jobId,pj.order_item_id AS orderItemId,pj.order_id AS orderId,pj.master_asset_id AS jobMasterAssetId,oi.master_asset_id AS approvedMasterAssetId FROM printing_jobs pj JOIN order_items oi ON oi.id=pj.order_item_id WHERE pj.order_id=?", orderId)) }; }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/__ci/orders") && request.headers.get("x-orders-fixture-token") !== env.ORDERS_FIXTURE_TOKEN) return json({ ok: false, error: "Not found" }, 404);
    if (url.pathname === "/__ci/orders-fixture" && request.method === "POST") { try { const input = await request.json() as any; const store = env.ITEMS.get(env.ITEMS.idFromName("default")) as any; return json({ ok: true, ...(await store.ciCreateFixtures({ actorId: input.actorId, runId: input.runId })) }); } catch (error) { return json({ ok: false, error: error instanceof Error ? error.message : "Fixture setup failed" }, 400); } }
    if (url.pathname === "/__ci/orders-inspect" && request.method === "POST") { try { const input = await request.json() as any; const store = env.ITEMS.get(env.ITEMS.idFromName("default")) as any; return json({ ok: true, ...(await store.ciInspect(input)) }); } catch (error) { return json({ ok: false, error: error instanceof Error ? error.message : "Inspection failed" }, 400); } }
    return staticHandler.fetch(request, env as any, ctx);
  },
} satisfies ExportedHandler<Env>;
