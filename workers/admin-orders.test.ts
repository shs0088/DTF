import { describe, expect, test } from "bun:test";
import { allowedAdminOrderTransitions, canTransitionAdminOrder, normalizeAdminOrderStatus } from "./admin-orders";

describe("Admin Orders authoritative status workflow", () => {
  test("canonical statuses normalize and unknown values fail closed", () => {
    expect(normalizeAdminOrderStatus(" PAYMENT_CONFIRMED ")).toBe("payment_confirmed");
    expect(normalizeAdminOrderStatus("refunded")).toBeNull();
  });

  test("approved forward transitions are allowed", () => {
    expect(canTransitionAdminOrder("new","payment_pending")).toBe(true);
    expect(canTransitionAdminOrder("new","payment_confirmed")).toBe(true);
    expect(canTransitionAdminOrder("payment_pending","payment_confirmed")).toBe(true);
    expect(canTransitionAdminOrder("payment_confirmed","under_preparation")).toBe(true);
    expect(canTransitionAdminOrder("under_preparation","ready_for_delivery")).toBe(true);
    expect(canTransitionAdminOrder("under_preparation","ready_for_pickup")).toBe(true);
    expect(canTransitionAdminOrder("ready_for_delivery","given_to_delivery")).toBe(true);
    expect(canTransitionAdminOrder("given_to_delivery","under_delivery")).toBe(true);
    expect(canTransitionAdminOrder("under_delivery","completed")).toBe(true);
    expect(canTransitionAdminOrder("ready_for_pickup","completed")).toBe(true);
  });

  test("terminal and reverse transitions are denied", () => {
    expect(allowedAdminOrderTransitions("completed")).toEqual([]);
    expect(allowedAdminOrderTransitions("cancelled")).toEqual([]);
    expect(canTransitionAdminOrder("completed","under_preparation")).toBe(false);
    expect(canTransitionAdminOrder("under_delivery","payment_confirmed")).toBe(false);
  });
});

describe("Admin Orders implementation contracts", () => {
  test("database layer uses existing order/master/printing relationships and persists history", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("CREATE TABLE IF NOT EXISTS order_admin_history");
    expect(source).toContain("oi.master_asset_id AS masterAssetId");
    expect(source).toContain("FROM printing_jobs pj WHERE pj.order_item_id=oi.id");
    expect(source).toContain("adminOrderUpdateStatus");
    expect(source).toContain("adminOrderAddNote");
    expect(source).toContain("UPDATE orders SET status=?,payment_status=?");
    expect(source).toContain("admin.order.status_change");
    expect(source).toContain("admin.order.note");
  });

  test("Orders API enforces Access for reads and Modify for mutations", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    expect(source).toContain('url.pathname.startsWith("/api/admin/orders")');
    expect(source).toContain('request.method.toUpperCase()==="GET"?"access":"modify"');
    expect(source).toContain('store.adminPermission(identity.id,"admin.orders",permission)');
    expect(source).toContain('url.pathname === "/admin/orders") return new Response(localizeAdminHtml(ADMIN_ORDERS_PAGE,request)');
  });

  test("Orders UI exposes required operational controls", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    for(const text of ["Order ID, customer, email, phone","Ready-to-Print Master","Printing Job","Status workflow","Internal note","Number(o.totalJod||0)/100"]) {
      expect(source).toContain(text);
    }
  });
});
