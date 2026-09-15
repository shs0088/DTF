import { describe, expect, test } from "bun:test";
import { normalizePrintifyVariant, validatePrintifyPublishState } from "../workers/printify-utils";

describe("normalizePrintifyVariant", () => {
  test("normalizes a live Printify-style variant", () => {
    const value = normalizePrintifyVariant("5", "99", {
      id: 123,
      title: "Black / M",
      options: { color: "Black", size: "M" },
      is_enabled: true,
      cost: 1450
    });
    expect(value).not.toBeNull();
    expect(value?.variantId).toBe("123");
    expect(value?.color).toBe("Black");
    expect(value?.size).toBe("M");
    expect(value?.sourceAvailable).toBe(true);
    expect(value?.sourceCostInternal).toBe(1450);
  });

  test("preserves an already normalized variant during local import", () => {
    const once = normalizePrintifyVariant("5", "99", {
      id: 123,
      title: "Black / M",
      options: { color: "Black", size: "M" },
      available: false,
      cost: 1450
    });
    const twice = normalizePrintifyVariant("5", "99", once);
    expect(twice?.variantId).toBe("123");
    expect(twice?.sourceTitle).toBe("Black / M");
    expect(twice?.sourceAvailable).toBe(false);
    expect(twice?.sourceCostInternal).toBe(1450);
  });

  test("rejects malformed variant ids", () => {
    expect(normalizePrintifyVariant("5", "99", { id: "bad-id" })).toBeNull();
  });
});

describe("validatePrintifyPublishState", () => {
  test("accepts a complete publishable product", () => {
    expect(validatePrintifyPublishState({
      titleEn: "T-Shirt",
      titleAr: "تيشيرت",
      descriptionEn: "English description",
      descriptionAr: "وصف عربي",
      customerPriceMinor: 1500,
      displayImage: "https://example.com/a.png",
      selectedProviderId: "99",
      sourceAvailable: true,
      validEnabledVariantCount: 2
    })).toEqual([]);
  });

  test("blocks missing required fields and unavailable variants", () => {
    const errors = validatePrintifyPublishState({
      titleEn: "",
      titleAr: "",
      descriptionEn: "",
      descriptionAr: "",
      customerPriceMinor: 0,
      displayImage: "",
      selectedProviderId: "",
      sourceAvailable: false,
      validEnabledVariantCount: 0
    });
    expect(errors).toContain("English title is required.");
    expect(errors).toContain("Arabic title is required.");
    expect(errors).toContain("A valid customer price is required.");
    expect(errors).toContain("Source product is unavailable.");
    expect(errors).toContain("At least one valid enabled variant must be selected.");
  });
});
