import { describe, expect, test } from "bun:test";
import { ADMIN_ORDER_STATUSES, allowedAdminOrderTransitions, isValidAdminOrderTransition } from "./admin-order-policy";

describe("Admin Orders workflow", () => {
  test("approved DTF Studio order statuses are present", () => {
    expect(ADMIN_ORDER_STATUSES.map(x => x.id)).toEqual([
      "new",
      "payment_pending",
      "payment_confirmed",
      "under_preparation",
      "ready_for_delivery",
      "given_to_delivery",
      "under_delivery",
      "ready_for_pickup",
      "completed",
      "cancelled"
    ]);
  });

  test("payment and preparation transitions are constrained", () => {
    expect(allowedAdminOrderTransitions("new")).toContain("payment_pending");
    expect(isValidAdminOrderTransition("payment_pending","payment_confirmed")).toBe(true);
    expect(isValidAdminOrderTransition("payment_confirmed","under_preparation")).toBe(true);
    expect(isValidAdminOrderTransition("new","completed")).toBe(false);
  });

  test("delivery and pickup paths terminate only through approved flow", () => {
    expect(isValidAdminOrderTransition("under_preparation","ready_for_delivery")).toBe(true);
    expect(isValidAdminOrderTransition("under_preparation","ready_for_pickup")).toBe(true);
    expect(isValidAdminOrderTransition("ready_for_delivery","given_to_delivery")).toBe(true);
    expect(isValidAdminOrderTransition("given_to_delivery","under_delivery")).toBe(true);
    expect(isValidAdminOrderTransition("under_delivery","completed")).toBe(true);
    expect(isValidAdminOrderTransition("ready_for_pickup","completed")).toBe(true);
    expect(allowedAdminOrderTransitions("completed")).toEqual([]);
    expect(allowedAdminOrderTransitions("cancelled")).toEqual([]);
  });

  test("database order management keeps exact master and production references", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("adminOrdersList(");
    expect(source).toContain("adminOrderDetail(");
    expect(source).toContain("master_asset_id AS masterAssetId");
    expect(source).toContain("printingJobId");
    expect(source).toContain("order_status_history");
    expect(source).toContain('adminPermission(actorId,"admin.orders","modify")');
  });

  test("active Worker exposes permission-protected order list/detail/status/note endpoints", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    expect(source).toContain("async function adminOrdersApi");
    expect(source).toContain('store.adminPermission(identity.id,"admin.orders",permission)');
    expect(source).toContain('url.pathname==="/api/admin/orders"');
    expect(source).toContain("/status");
    expect(source).toContain("/notes");
    expect(source).toContain("ADMIN_ORDERS_PAGE");
    expect(source).toContain("ADMIN_ORDER_DETAIL_PAGE");
  });
});
