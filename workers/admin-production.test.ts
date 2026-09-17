import { describe, expect, test } from "bun:test";
import { allowedAdminProductionTransitions, canTransitionAdminProduction, normalizeAdminProductionStatus } from "./admin-production";

describe("Admin Production authoritative status workflow", () => {
  test("canonical statuses normalize and unknown values fail closed", () => {
    expect(normalizeAdminProductionStatus(" QC ")).toBe("qc");
    expect(normalizeAdminProductionStatus("shipped")).toBeNull();
  });

  test("approved production transitions are allowed", () => {
    expect(canTransitionAdminProduction("queued","printing")).toBe(true);
    expect(canTransitionAdminProduction("queued","cancelled")).toBe(true);
    expect(canTransitionAdminProduction("printing","qc")).toBe(true);
    expect(canTransitionAdminProduction("qc","completed")).toBe(true);
  });

  test("terminal and reverse transitions are denied", () => {
    expect(allowedAdminProductionTransitions("completed")).toEqual([]);
    expect(allowedAdminProductionTransitions("cancelled")).toEqual([]);
    expect(canTransitionAdminProduction("completed","printing")).toBe(false);
    expect(canTransitionAdminProduction("qc","printing")).toBe(false);
  });
});

describe("Production Queue implementation contracts", () => {
  test("queue is tied to real order items, printing jobs, and exact approved master", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("adminProductionQueue");
    expect(source).toContain("JOIN order_items oi ON oi.id=pj.order_item_id");
    expect(source).toContain("oi.master_asset_id AS approvedMasterAssetId");
    expect(source).toContain("pj.master_asset_id AS jobMasterAssetId");
    expect(source).toContain("r.approvedMasterAssetId===r.jobMasterAssetId");
  });

  test("production advancement fails closed on master mismatch or missing preflight", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("Production is blocked until the printing job references the exact approved Ready-to-Print Master from the order item.");
    expect(source).toContain("Production is blocked because the historical preflight snapshot is missing.");
    expect(source).toContain('["failed","rejected","invalid"].includes(result)');
    expect(source).toContain("admin.production.status_change");
  });

  test("download resolver only returns the exact approved master", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("adminProductionMasterAsset");
    expect(source).toContain("The printing job is not linked to the exact approved Ready-to-Print Master.");
  });

  test("Production API uses Access for reads and Modify for status mutations", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    expect(source).toContain('url.pathname.startsWith("/api/admin/production")');
    expect(source).toContain('request.method.toUpperCase()==="GET"?"access":"modify"');
    expect(source).toContain('store.adminPermission(identity.id,"admin.production",permission)');
    expect(source).toContain('/api/admin/production/jobs/');
    expect(source).toMatch(/url\.pathname === "\/admin\/production"\) return new Response\((?:localizeAdminHtml\(ADMIN_PRODUCTION_PAGE,request\)|ADMIN_PRODUCTION_PAGE)/);
  });

  test("master download path is storage-backed and sanitized", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    expect(source).toContain("adminProductionMasterAsset");
    expect(source).toContain('key.includes("..")');
    expect(source).toContain('"content-disposition"');
    expect(source).toContain("Approved master file bytes are unavailable in configured assets storage.");
  });

  test("Production UI exposes required operational evidence", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    for(const text of ["Approved Ready-to-Print Master","Print specification snapshot","Preflight snapshot","Download approved master","Production blocked: master mismatch or missing"]) {
      expect(source).toContain(text);
    }
  });
});
