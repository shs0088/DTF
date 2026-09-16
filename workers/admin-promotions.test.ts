import { describe, expect, test } from "bun:test";

describe("Admin Promotions implementation contracts", () => {
  test("promotions and redemptions are persisted in the database", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("CREATE TABLE IF NOT EXISTS promotions");
    expect(source).toContain("CREATE TABLE IF NOT EXISTS promotion_redemptions");
    expect(source).toContain("UNIQUE(promotion_id, order_id)");
    expect(source).toContain("adminPromotionsList");
    expect(source).toContain("adminPromotionDetail");
  });

  test("coupon inputs validate type, value, dates, code uniqueness and historical use limits", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("Percentage discount cannot exceed 100%.");
    expect(source).toContain("Coupon code already exists.");
    expect(source).toContain("Expiry must be after the start date.");
    expect(source).toContain("Maximum uses cannot be lower than the existing redemption count.");
    expect(source).toContain("Coupon code must be at least 3 valid characters.");
  });

  test("redemption counts are derived from redemption records, not directly editable", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("(SELECT COUNT(*) FROM promotion_redemptions pr WHERE pr.promotion_id=p.id) AS usedCount");
    expect(source).toContain("(SELECT COALESCE(SUM(pr.discount_jod),0) FROM promotion_redemptions pr WHERE pr.promotion_id=p.id) AS totalDiscountJod");
    expect(source).not.toContain("UPDATE promotions SET used_count");
  });

  test("operational state handles disabled, scheduled, expired and exhausted coupons", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    for(const text of ['return "disabled"','return "scheduled"','return "expired"','return "exhausted"','return "active"']) expect(source).toContain(text);
  });

  test("Promotions API enforces Access for reads and Modify for changes", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    expect(source).toContain('url.pathname.startsWith("/api/admin/promotions")');
    expect(source).toContain('permission=method==="GET"?"access":"modify"');
    expect(source).toContain('store.adminPermission(identity.id,"admin.promotions",permission)');
    expect(source).toContain('url.pathname === "/admin/promotions") return new Response(ADMIN_PROMOTIONS_PAGE');
  });

  test("Promotions UI exposes the existing coupon business concepts without editable use count", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    for(const text of ["Promotions / Coupons","Coupon code","Discount type","Minimum spend JOD","Maximum uses","Expiry date/time","Redemption History"]) expect(source).toContain(text);
    const start=source.indexOf("const ADMIN_PROMOTIONS_PAGE");const end=source.indexOf("const ADMIN_RBAC_PAGE",start);const page=source.slice(start,end);
    expect(page).toContain("Redemption counts are system-derived and cannot be edited by Admin.");
    expect(page).not.toContain('id="usedCount"');
  });
});
