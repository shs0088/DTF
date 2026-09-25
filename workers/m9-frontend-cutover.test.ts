import { describe, expect, test } from "bun:test";
import {
  mapOdooCart,
  mapOdooCategories,
  mapOdooProducts,
  appendOdooSessionCookies,
  resolveOdooOrigin,
} from "../app/lib/odoo-api.server";

describe("M9 frontend Odoo compatibility adapter", () => {
  test("maps native Odoo categories to the preserved frontend contract", () => {
    expect(mapOdooCategories({
      items: [{
        id: 7,
        name: "T-Shirts",
        name_ar: "تي شيرت",
        sequence: 12,
      }],
    })).toEqual([{
      id: "7",
      nameAr: "تي شيرت",
      nameEn: "T-Shirts",
      enabled: 1,
      homeFeatured: 0,
      homeOrder: 12,
    }]);
  });

  test("flattens native Odoo variants without exposing supplier metadata", () => {
    const rows = mapOdooProducts({
      items: [{
        id: 22,
        name: "Classic Tee",
        name_ar: "تي شيرت كلاسيكي",
        price: 8,
        currency: "JOD",
        category_ids: [7],
        catalog_type: "customizable",
        variants: [{
          id: 91,
          sku: "TEE-BLK-L",
          price: 11.5,
          attributes: [
            { attribute: "Color", value: "Black" },
            { attribute: "Size", value: "L" },
          ],
        }],
      }],
    });

    expect(rows).toEqual([{
      modelId: "22",
      categoryId: "7",
      nameAr: "تي شيرت كلاسيكي",
      nameEn: "Classic Tee",
      variantId: "91",
      sku: "TEE-BLK-L",
      color: "Black",
      size: "L",
      retailPriceJod: 11.5,
      source: "custom",
    }]);
    expect(JSON.stringify(rows).toLowerCase()).not.toContain("printify");
    expect(JSON.stringify(rows).toLowerCase()).not.toContain("supplier");
  });

  test("uses explicit Odoo origin when supplied", () => {
    const request = new Request("https://frontend.example/api/studio/products");
    const origin = resolveOdooOrigin(request, {
      cloudflare: { env: { DTF_ODOO_ORIGIN: "http://odoo:8069/" } },
    });
    expect(origin).toBe("http://odoo:8069");
  });

  test("public catalog routes no longer use ItemStore", async () => {
    const products = await Bun.file("app/routes/api.studio.products.ts").text();
    const categories = await Bun.file("app/routes/api.studio.categories.ts").text();
    for (const source of [products, categories]) {
      expect(source).not.toContain("ItemStore");
      expect(source).not.toContain("ITEMS");
      expect(source).toContain("fetchOdooJson");
    }
  });
  test("auth routes use Odoo session authority instead of ItemStore", async () => {
    const files = ["app/routes/login.tsx","app/routes/register.tsx","app/routes/api.studio.auth.login.ts","app/routes/api.studio.auth.register.ts"];
    for (const file of files) {
      const source = await Bun.file(file).text();
      expect(source).not.toContain("ItemStore");
      expect(source).not.toContain("loginUser(");
      expect(source).not.toContain("registerUser(");
      expect(source).toContain("fetchOdooResponse");
    }
  });

  test("forwards Odoo session cookie and expires legacy dtf_session", () => {
    const upstream = new Response("{}", { headers: { "Set-Cookie": "session_id=abc; Path=/; HttpOnly" } });
    const headers = new Headers();
    appendOdooSessionCookies(headers, upstream);
    const cookies = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [headers.get("set-cookie") || ""];
    expect(cookies.join("\n")).toContain("session_id=abc");
    expect(cookies.join("\n")).toContain("dtf_session=");
    expect(cookies.join("\n")).toContain("Max-Age=0");
  });
  test("maps native Odoo cart to the preserved Cart contract", () => {
    expect(mapOdooCart({
      id: 17,
      subtotal: 28,
      lines: [{
        id: 9,
        product_id: 91,
        sku: "TEE-BLK-L",
        product_name: "Classic Tee",
        color: "Black",
        size: "L",
        quantity: 2,
        unit_price: 14,
        subtotal: 28,
        design_id: null,
        master_asset_id: null,
      }],
    })).toEqual({
      cartId: "17",
      itemCount: 2,
      subtotalJod: 28,
      lines: [{
        id: "9",
        variantId: "91",
        sku: "TEE-BLK-L",
        productName: "Classic Tee",
        color: "Black",
        size: "L",
        quantity: 2,
        unitPriceJod: 14,
        lineTotalJod: 28,
        designId: null,
        masterAssetId: null,
      }],
    });
  });

  test("Customizer and Cart no longer use ItemStore cart/session authority", async () => {
    for (const file of ["app/routes/customize.tsx", "app/routes/cart.tsx"]) {
      const source = await Bun.file(file).text();
      expect(source).not.toContain("ItemStore");
      expect(source).not.toContain("ITEMS");
      expect(source).not.toContain("dtf_cart_session");
      expect(source).toContain("Odoo");
    }
    const cartSource = await Bun.file("app/routes/cart.tsx").text();
    expect(cartSource).not.toContain("bankTransferReservationMinutes");
    expect(cartSource).toContain("Odoo stock and pricing revalidated at checkout");
  });
});