import { describe, expect, test } from "bun:test";
import {
  mapOdooCategories,
  mapOdooProducts,
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
});
