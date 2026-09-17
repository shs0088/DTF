import staticHandler from "../workers/static-app";
export { ItemStore } from "../workers/item-store";

interface Env {
  ITEMS: DurableObjectNamespace;
  ASSETS?: { fetch(request: Request): Promise<Response> | Response };
  ADMIN_WEB_KEY?: string;
  ADMIN_BOOTSTRAP_TOKEN_SHA256?: string;
  ORDERS_FIXTURE_TOKEN?: string;
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/__ci/orders-fixture" && request.method === "POST") {
      if (!env.ORDERS_FIXTURE_TOKEN || request.headers.get("x-orders-fixture-token") !== env.ORDERS_FIXTURE_TOKEN) return json({ ok: false, error: "Not found" }, 404);
      try {
        const input = await request.json() as { actorId?: string; runId?: string };
        if (!input.actorId) return json({ ok: false, error: "actorId is required" }, 400);
        const store = env.ITEMS.get(env.ITEMS.idFromName("default")) as any;
        const runId = String(input.runId || crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60);
        const variantId = "ci-orders-variant-" + runId;
        await store.adminUpsertProductVariant(input.actorId, "model-tshirt", { variantId, sku: "CI-ORDERS-" + runId, color: "White", size: "M", retailPriceJod: 1900, enabled: true, tracked: true, quantity: 10 });
        const customer = await store.registerUser({ displayName: "CI Orders Customer", email: "ci-orders-" + runId + "@example.test", password: "CI-Customer-Order-Password-2026!", role: "customer" });
        const cartSessionKey = "ci-cart-" + runId;
        const cart = await store.addCartItem({ sessionKey: cartSessionKey, variantId, quantity: 1 });
        const order = await store.createCheckoutOrder({ sessionId: customer.sessionId, cartSessionKey, requestKey: "ci-order-" + runId, fulfillmentMode: "delivery", paymentMethod: "bank_transfer", customerName: "CI Orders Customer", customerPhone: "+962790000000", city: "Amman", address: "CI local order address", notes: "" });
        return json({ ok: true, runId, variantId, customerId: customer.userId, customerSessionId: customer.sessionId, orderId: order.id, quantity: 1, initialStock: 10, cartItemCount: cart.itemCount });
      } catch (error) { return json({ ok: false, error: error instanceof Error ? error.message : "Fixture setup failed" }, 400); }
    }
    return staticHandler.fetch(request, env as any, ctx);
  },
} satisfies ExportedHandler<Env>;
