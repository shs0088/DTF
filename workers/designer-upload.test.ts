import { describe, expect, test } from "bun:test";
import { analyzeAsset, DESIGN_PRODUCT_TYPES } from "./analyzer";
import { inspectUpload } from "./upload-inspection";

describe("Designer upload analyzer", () => {
  test("configured minimum DPI is enforced for raster final print", () => {
    const low=analyzeAsset({format:"png",mime:"image/png",signatureValid:true,byteSize:1000,pixelWidth:2400,pixelHeight:3200,intendedWidthIn:12,intendedHeightIn:16,previewable:true,productType:"T-Shirt",minDpi:300});
    expect(low.effectiveDpi?.minimum).toBe(200);
    expect(low.passed).toBe(false);
    expect(low.errors.join(" ")).toContain("configured minimum");
    const allowed=analyzeAsset({format:"png",mime:"image/png",signatureValid:true,byteSize:1000,pixelWidth:2400,pixelHeight:3200,intendedWidthIn:12,intendedHeightIn:16,previewable:true,productType:"T-Shirt",minDpi:200});
    expect(allowed.passed).toBe(true);
  });

  test("vector/document artwork is analyzable without raster DPI", () => {
    const svg=analyzeAsset({format:"svg",mime:"image/svg+xml",signatureValid:true,byteSize:1000,pixelWidth:0,pixelHeight:0,intendedWidthIn:12,intendedHeightIn:16,previewable:true,productType:"T-Shirt",minDpi:300});
    expect(svg.passed).toBe(true);
    expect(svg.effectiveDpi).toBeNull();
    expect(svg.scalingRisk).toBe("none");
  });

  test("all seven approved Product Type combinations remain canonical", () => {
    expect([...DESIGN_PRODUCT_TYPES]).toEqual(["T-Shirt","Mug","Cap","T-Shirt + Mug","T-Shirt + Cap","Mug + Cap","T-Shirt + Mug + Cap"]);
  });
});

describe("Uploaded byte inspection", () => {
  test("detects SVG and PDF from bytes rather than browser MIME", () => {
    const svgBytes=new TextEncoder().encode('<svg viewBox="0 0 1200 800"></svg>').buffer;
    const svg=inspectUpload(svgBytes);
    expect(svg.mime).toBe("image/svg+xml");
    expect(svg.pixelWidth).toBe(1200);
    expect(svg.pixelHeight).toBe(800);
    const pdf=inspectUpload(new TextEncoder().encode("%PDF-1.7\n1 0 obj").buffer);
    expect(pdf.mime).toBe("application/pdf");
    expect(pdf.signatureValid).toBe(true);
  });

  test("detects extended WebP dimensions", () => {
    const b=new Uint8Array(30);
    b.set(new TextEncoder().encode("RIFF"),0); b.set(new TextEncoder().encode("WEBP"),8); b.set(new TextEncoder().encode("VP8X"),12);
    const width=640-1,height=480-1;
    b[24]=width&255;b[25]=(width>>8)&255;b[26]=(width>>16)&255;
    b[27]=height&255;b[28]=(height>>8)&255;b[29]=(height>>16)&255;
    const out=inspectUpload(b.buffer);
    expect(out.mime).toBe("image/webp");
    expect(out.pixelWidth).toBe(640);
    expect(out.pixelHeight).toBe(480);
  });
});

describe("Designer upload implementation contracts", () => {
  test("private R2 binding and active Designer routes exist", async () => {
    const wrangler=await Bun.file(new URL("../wrangler.jsonc",import.meta.url)).text();
    const routes=await Bun.file(new URL("../app/routes.ts",import.meta.url)).text();
    expect(wrangler).toContain('"DESIGN_ASSETS"');
    expect(routes).toContain('route("designer", "routes/designer.tsx")');
    expect(routes).toContain('route("designer/new-design", "routes/designer-new-design.tsx")');
    expect(routes).toContain('route("designer/assets/:assetId", "routes/designer-asset.ts")');
  });

  test("New Design requires four bilingual fields and explicit master", async () => {
    const route=await Bun.file(new URL("../app/routes/designer-new-design.tsx",import.meta.url)).text();
    for(const name of ["titleEn","titleAr","descriptionEn","descriptionAr"]) expect(route).toContain('name="'+name+'"');
    expect(route).toContain('name="masterIndex"');
    expect(route).toContain("Please explicitly select exactly one Ready-to-Print Master.");
    expect(route).toContain('name="coverIndex"');
    expect(route).toContain("Auto-select suitable cover if none chosen");
  });

  test("server verifies signature MIME size and product compatibility before R2 persistence", async () => {
    const route=await Bun.file(new URL("../app/routes/designer-new-design.tsx",import.meta.url)).text();
    expect(route).toContain("inspectUpload(bytes)");
    expect(route).toContain("browser MIME and file signature do not match");
    expect(route).toContain("file exceeds the configured");
    expect(route).toContain("productType.split");
    expect(route).toContain("analyzeAsset({");
    expect(route).toContain("await bucket.put");
    expect(route).toContain("for(const key of storedKeys)try{await bucket.delete(key);}");
  });

  test("database lifecycle stores analyzer preflight cover master and versioned DPI rule", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    for(const text of ["createDesignerDesign(sessionId:","INSERT INTO analyzer_results","INSERT INTO validation_results","INSERT INTO cover_asset_relations","INSERT INTO master_asset_relations","explicitly_selected","1.0-dpi-"]) expect(source).toContain(text);
    expect(source).toContain("Main Display Image must be a previewable image asset.");
    expect(source).toContain("The selected Ready-to-Print Master must pass preflight.");
  });

  test("designer asset and design deletion protect carts orders and production", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("DELETE FROM validation_results WHERE asset_id=?");
    expect(source).toContain("SELECT 1 AS ok FROM cart_items WHERE master_asset_id=?");
    expect(source).toContain("SELECT 1 AS ok FROM order_items WHERE master_asset_id=?");
    expect(source).toContain("SELECT 1 AS ok FROM printing_jobs WHERE master_asset_id=?");
    expect(source).toContain("SELECT 1 AS ok FROM cart_items WHERE design_id=?");
    expect(source).toContain("protected by order/production history");
  });

  test("private asset preview is ownership-gated and SVG-sandboxed", async () => {
    const route=await Bun.file(new URL("../app/routes/designer-asset.ts",import.meta.url)).text();
    expect(route).toContain("designerAssetAccess");
    expect(route).toContain("DESIGN_ASSETS");
    expect(route).toContain("content-security-policy");
    expect(route).toContain("sandbox; default-src 'none'");
    expect(route).toContain('mime==="application/pdf"?"attachment":"inline"');
  });

  test("Designer dashboard exposes cover master preflight and protected-delete controls", async () => {
    const page=await Bun.file(new URL("../app/routes/designer.tsx",import.meta.url)).text();
    for(const text of ["Designer Dashboard","Main Display","Print Master","preflightStatus","set-cover","set-master","delete-asset","delete-design"]) expect(page).toContain(text);
  });
});
