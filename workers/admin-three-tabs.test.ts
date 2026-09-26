import { describe, expect, test } from "bun:test";

describe("Admin three-tab classification contracts", () => {
  test("Categories has Ready-to-Sell and Mockup tabs with OpenCart list columns", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    const start=source.indexOf("const ADMIN_CATEGORIES_PAGE"); const end=source.indexOf("const ADMIN_PRODUCTS_PAGE",start); const page=source.slice(start,end);
    expect(page).toContain('/admin/catalog/categories?kind=ready');
    expect(page).toContain('/admin/catalog/categories?kind=mockup');
    for(const text of ["Image","Name","Sort Order","Action"]) expect(page).toContain(text);
    expect(page).toContain("categoryImage");
  });

  test("Products has Ready-to-Sell and Mockup tabs and sends kind to API", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    const start=source.indexOf("const ADMIN_PRODUCTS_PAGE"); const end=source.indexOf("const ADMIN_CUSTOMERS_PAGE",start); const page=source.slice(start,end);
    expect(page).toContain('/admin/products?kind=ready');
    expect(page).toContain('/admin/products?kind=mockup');
    expect(page).toContain("p.set('kind',kind)");
    for(const text of ["Image","Name","Model","Price","Quantity","Action"]) expect(page).toContain(text);
  });

  test("Customers and Designers remain separate lists but Designer retains customer purchase capability", async () => {
    const ui=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    const store=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(ui).toContain('<a class="active" href="/admin/customers">Customers</a><a href="/admin/designers">Designers</a>');
    expect(ui).toContain('<a href="/admin/customers">Customers</a><a class="active" href="/admin/designers">Designers</a>');
    expect(store).toContain("dr.name='designer'");
    expect(store).toContain("customerOrders");
  });
});
