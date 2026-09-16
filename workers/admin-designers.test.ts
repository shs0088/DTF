import { describe, expect, test } from "bun:test";

describe("Admin Designers implementation contracts", () => {
  test("designer list is role-scoped and exposes qualification/design/financial summaries", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("adminDesignersList");
    expect(source).toContain("r.name='designer'");
    expect(source).toContain("authorizationStatus");
    expect(source).toContain("publishedDesignCount");
    expect(source).toContain("totalEarningsJod");
    expect(source).toContain("paidWithdrawalsJod");
  });

  test("designer detail includes qualification, designs, orders, earnings, ledger and withdrawals", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("adminDesignerDetail");
    for(const text of ["designer_applications","qualificationDesignCount","latestPreflightStatus","designer_earnings","ledger_entries","withdrawals","orderActivity"]) expect(source).toContain(text);
  });

  test("Designers page cannot bypass qualification authorization", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    const page=source.slice(source.indexOf("const ADMIN_DESIGNERS_PAGE"),source.indexOf("const ADMIN_CUSTOMERS_PAGE"));
    expect(page).toContain("Qualification authorization is displayed here but decisions remain in Manual Review.");
    expect(page).toContain("Authorized status cannot be edited here.");
    expect(page).toContain('href="/admin/manual-review"');
    expect(page).not.toContain("Authorize Designer");
  });

  test("designer account suspension is safe and auditable", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("adminUpdateDesignerAccount");
    expect(source).toContain('["active","suspended","disabled"]');
    expect(source).toContain('if(accountStatus!=="active")this.ctx.storage.sql.exec("DELETE FROM sessions WHERE user_id=?",id)');
    expect(source).toContain("admin.designer.account.update");
  });

  test("Designers API enforces Access for reads and Modify for account mutations", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    expect(source).toContain('url.pathname.startsWith("/api/admin/designers")');
    expect(source).toContain('permission=method==="GET"?"access":"modify"');
    expect(source).toContain('store.adminPermission(identity.id,"admin.designers",permission)');
    expect(source).toContain('url.pathname === "/admin/designers") return new Response(ADMIN_DESIGNERS_PAGE');
  });
});
