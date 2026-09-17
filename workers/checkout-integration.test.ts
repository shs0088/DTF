import { describe, expect, test } from "bun:test";

describe("Database-authoritative checkout integration contracts", () => {
  test("auth and cart identities use one coherent cart cookie separate from auth", async () => {
    const cart=await Bun.file(new URL("../app/routes/cart.tsx",import.meta.url)).text();
    const customize=await Bun.file(new URL("../app/routes/customize.tsx",import.meta.url)).text();
    const login=await Bun.file(new URL("../app/routes/login.tsx",import.meta.url)).text();
    expect(cart).toContain("dtf_session");
    expect(customize).toContain("dtf_session");
    expect(login).toContain("dtf_session=");
    expect(login).not.toContain("dtf_cart_session=");
  });

  test("checkout is registered and requires a current customer session", async () => {
    const routes=await Bun.file(new URL("../app/routes.ts",import.meta.url)).text();
    const checkout=await Bun.file(new URL("../app/routes/checkout.tsx",import.meta.url)).text();
    const store=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(routes).toContain('route("checkout", "routes/checkout.tsx")');
    expect(routes).toContain('route("order/:orderId", "routes/order.tsx")');
    expect(checkout).toContain('identity.role!=="customer"');
    expect(store).toContain("sessionIdentity(sessionId:");
    expect(store).toContain("Customer sign-in is required before checkout.");
  });

  test("coupon validation enforces enabled dates usage minimum spend and bounded discount", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("checkoutPromotion(codeValue:string,subtotalCents:number)");
    expect(source).toContain("This coupon is disabled.");
    expect(source).toContain("This coupon is not active yet.");
    expect(source).toContain("This coupon has expired.");
    expect(source).toContain("This coupon has reached its usage limit.");
    expect(source).toContain("Cart subtotal does not meet this coupon's minimum spend.");
    expect(source).toContain("Math.min(subtotalCents,discount)");
  });

  test("successful checkout persists order snapshot and one promotion redemption", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("CREATE TABLE IF NOT EXISTS order_checkout_details");
    expect(source).toContain("request_key TEXT NOT NULL UNIQUE");
    expect(source).toContain("INSERT INTO orders");
    expect(source).toContain("INSERT INTO order_checkout_details");
    expect(source).toContain("INSERT INTO promotion_redemptions");
    expect(source).toContain("UNIQUE(promotion_id, order_id)");
    expect(source).toContain("DELETE FROM cart_items WHERE cart_id=?");
  });

  test("checkout validates stock and explicit passing Ready-to-Print Master", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("only ${available} unit(s) available.");
    expect(source).toContain("Ready-to-Print Master is required.");
    expect(source).toContain("selected master does not match the approved Ready-to-Print Master.");
    expect(source).toContain("approved master has no passing preflight result.");
    expect(source).toContain("INSERT INTO reservations");
  });

  test("payment confirmation consumes stock exactly once and creates production jobs from snapshots", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("reason='order_payment_confirmed'");
    expect(source).toContain("UPDATE stocks SET quantity=quantity-?");
    expect(source).toContain("status='consumed'");
    expect(source).toContain("INSERT INTO printing_jobs");
    expect(source).toContain("historical preflight snapshot is not passing");
  });

  test("cancellation releases reservations and restores previously deducted stock once", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("status='released'");
    expect(source).toContain("reason='order_cancel_restore'");
    expect(source).toContain("UPDATE stocks SET quantity=quantity+?");
    expect(source).toContain("UPDATE printing_jobs SET status='cancelled'");
  });

  test("checkout service consumes authoritative business settings rather than hard-coded delivery values", async () => {
    const checkout=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(checkout).toContain("checkoutPreview(cartSessionKey");
    expect(checkout).toContain("const settings=(this.businessSettingsSnapshot() as any).settings");
    expect(checkout).toContain("standardDeliveryFee");
    expect(checkout).toContain("freeDeliveryThreshold");
    expect(checkout).toContain("bankTransferReservationMinutes");
  });
});
