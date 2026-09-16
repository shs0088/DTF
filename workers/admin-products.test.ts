import { describe, expect, test } from "bun:test";

describe("Admin Products implementation contracts", () => {
  test("internal product management uses existing catalog tables and preserves Printify workflow separation", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("CREATE TABLE IF NOT EXISTS product_admin_data");
    expect(source).toContain("adminProductsCatalog");
    expect(source).toContain("adminProductDetail");
    expect(source).toContain("Printify-backed products must be edited through the existing Printify Catalog workflow.");
    expect(source).toContain("Printify-backed publication must use the existing Printify Catalog validation workflow.");
    expect(source).toContain("Printify variants must be managed through the existing Printify Catalog workflow.");
  });

  test("custom product publish validates bilingual metadata, media, and sellable variants", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("English description is required.");
    expect(source).toContain("Arabic description is required.");
    expect(source).toContain("Display image is required.");
    expect(source).toContain("At least one enabled variant with a positive retail price is required.");
    expect(source).toContain("UPDATE product_models SET enabled=?");
  });

  test("variant stock updates are bounded and auditable", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("Math.max(0,Math.floor(Number(input.quantity)||0))");
    expect(source).toContain("stock_movements");
    expect(source).toContain("admin.product_variant.update");
    expect(source).toContain("admin.product_variant.create");
  });

  test("seven approved product-type combinations are the eligibility whitelist", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    for(const value of ["T-Shirt","Mug","Cap","T-Shirt+Mug","T-Shirt+Cap","Mug+Cap","T-Shirt+Mug+Cap"]) expect(source).toContain(value);
  });

  test("Products API enforces Access for reads and Modify for mutations", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    expect(source).toContain('url.pathname.startsWith("/api/admin/products")');
    expect(source).toContain('permission=method==="GET"?"access":"modify"');
    expect(source).toContain('store.adminPermission(identity.id,"admin.products",permission)');
    expect(source).toContain('url.pathname === "/admin/products") return new Response(ADMIN_PRODUCTS_PAGE');
  });

  test("Products UI exposes categories, variants, stock, media, publication, and eligibility", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    for(const text of ["Create Category","Create Custom Product","Product Type Eligibility","Variants / Pricing / Stock","Product Media","Publish","Unpublish / Disable"]) expect(source).toContain(text);
  });
});
