import { describe, expect, test } from "bun:test";
import { analyzeAsset, effectiveDpi } from "./analyzer";

describe("DTF analyzer", () => {
  test("calculates effective DPI from actual pixels and physical size", () => {
    expect(effectiveDpi(4500, 3000, 15, 10)).toEqual({ x: 300, y: 300, minimum: 300 });
  });

  test("embedded DPI does not override a low effective DPI", () => {
    const result = analyzeAsset({ format: "png", mime: "image/png", signatureValid: true, byteSize: 1000, pixelWidth: 1500, pixelHeight: 1800, intendedWidthIn: 15, intendedHeightIn: 18, embeddedDpi: 600, previewable: true, productType: "T-Shirt" });
    expect(result.effectiveDpi?.minimum).toBe(100);
    expect(result.passed).toBe(false);
    expect(result.scalingRisk).toBe("critical");
    expect(result.warnings[0]).toContain("Effective DPI is 100");
  });

  test("rejects a bad signature and unsupported product type", () => {
    const result = analyzeAsset({ format: "exe", mime: "application/octet-stream", signatureValid: false, byteSize: 1000, pixelWidth: 100, pixelHeight: 100, intendedWidthIn: 1, intendedHeightIn: 1, previewable: false, productType: "Hoodie" });
    expect(result.passed).toBe(false);
    expect(result.errors.join(" ")).toContain("signature");
    expect(result.productTypeValid).toBe(false);
  });

  test("adds Printify placeholder quality as an additional warning", () => {
    const result = analyzeAsset({ format: "png", mime: "image/png", signatureValid: true, byteSize: 1000, pixelWidth: 1500, pixelHeight: 1800, intendedWidthIn: 5, intendedHeightIn: 6, previewable: true, placeholderWidthPx: 3000, placeholderHeightPx: 3600 });
    expect(result.placeholderCheck.status).toBe("warning");
    expect(result.passed).toBe(true);
  });
});
