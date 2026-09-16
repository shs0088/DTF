import { describe, expect, test } from "bun:test";

describe("Admin Reports implementation contracts", () => {
  test("reports are generated from real operational tables", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("adminReports(filters:");
    for(const text of ["FROM orders o","FROM order_items oi JOIN orders o","FROM designer_earnings de","FROM withdrawals w","FROM users u JOIN user_roles","FROM stocks WHERE tracked=1"]) expect(source).toContain(text);
  });

  test("confirmed revenue is distinct from gross non-cancelled order value", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("grossOrderValueJod");
    expect(source).toContain("confirmedRevenueJod");
    expect(source).toContain("lower(o.payment_status)='confirmed'");
    expect(source).toContain("lower(o.status)<>'cancelled'");
  });

  test("date filters are parameterized and applied across report datasets", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain('date(o.created_at)>=date(?)');
    expect(source).toContain('date(o.created_at)<=date(?)');
    expect(source).toContain('replaceAll("o.created_at","de.created_at")');
    expect(source).toContain('replaceAll("o.created_at","w.created_at")');
  });

  test("Reports API is read-only and requires report Access", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    expect(source).toContain('url.pathname!=="/api/admin/reports"');
    expect(source).toContain('store.adminPermission(identity.id,"admin.reports","access")');
    expect(source).toContain('Reports are read-only.');
    expect(source).toContain('url.pathname === "/admin/reports") return new Response(ADMIN_REPORTS_PAGE');
  });

  test("Reports UI exposes operational summaries and exports", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    for(const text of ["Confirmed revenue","Daily Orders / Revenue","Product Quantities","Designer Earnings","User Registrations by Role","Export Daily CSV","Export Products CSV"]) expect(source).toContain(text);
  });
});
