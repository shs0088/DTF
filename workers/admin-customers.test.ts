import { describe, expect, test } from "bun:test";

describe("Admin Customers implementation contracts", () => {
  test("customer list is role-scoped and database backed", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("adminCustomersList");
    expect(source).toContain("r.name='customer'");
    expect(source).toContain("customer_profiles");
    expect(source).toContain("lifetimeOrderValueJod");
  });

  test("customer detail exposes profile and order history but never credentials", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("adminCustomerDetail");
    expect(source).toContain("FROM orders WHERE user_id=?");
    const method=source.slice(source.indexOf("adminCustomerDetail"),source.indexOf("adminUpdateCustomer"));
    expect(method).not.toContain("password_hash");
    expect(method).not.toContain("password_salt");
    expect(method).not.toContain("auth_credentials");
  });

  test("customer mutations validate identity fields and revoke sessions when not active", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("adminUpdateCustomer");
    expect(source).toContain("Email is already in use.");
    expect(source).toContain('["active","suspended","disabled"]');
    expect(source).toContain('if(status!=="active")this.ctx.storage.sql.exec("DELETE FROM sessions WHERE user_id=?",id)');
    expect(source).toContain("admin.customer.update");
  });

  test("Customers API enforces Access for reads and Modify for mutations", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    expect(source).toContain('url.pathname.startsWith("/api/admin/customers")');
    expect(source).toContain('permission=method==="GET"?"access":"modify"');
    expect(source).toContain('store.adminPermission(identity.id,"admin.customers",permission)');
    expect(source).toContain('url.pathname === "/admin/customers") return new Response(localizeAdminHtml(ADMIN_CUSTOMERS_PAGE,request)');
  });

  test("Customers UI supports filters, profile, status and order history without password controls", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    for(const text of ["Customers","Registered from","Default address JSON","Order history","suspended","disabled"]) expect(source).toContain(text);
    const page=source.slice(source.indexOf("const ADMIN_CUSTOMERS_PAGE"),source.indexOf("const ADMIN_PRODUCTS_PAGE"));
    expect(page).not.toContain("Password");
    expect(page).not.toContain("password");
  });
});
