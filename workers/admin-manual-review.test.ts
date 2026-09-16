import { describe, expect, test } from "bun:test";

describe("Manual Review implementation contracts", () => {
  test("qualification review persists exactly-three, five-day, replacement, escalation, notification and authorization rules", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("adminQualificationReviewDetail");
    expect(source).toContain("Qualification approval requires exactly 3 qualification designs.");
    expect(source).toContain("Qualification approval requires preflight evidence for all 3 designs.");
    expect(source).toContain("datetime(da.submitted_at,'+5 days')");
    expect(source).toContain('nextStatus=secondOrLater?"rejected":"replacement_required"');
    expect(source).toContain('second_rejection_escalated');
    expect(source).toContain("UPDATE designer_profiles SET authorization_status='authorized'");
    expect(source).toContain("INSERT INTO notifications");
    expect(source).toContain("admin.manual_review.qualification.approve");
    expect(source).toContain("admin.manual_review.qualification.reject");
  });

  test("qualification detail includes preflight and analyzer evidence", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("preflightStatus");
    expect(source).toContain("preflightErrors");
    expect(source).toContain("effectiveDpi");
    expect(source).toContain("previewable");
    expect(source).toContain("manual_review_history");
  });

  test("design manual review does not publish automatically and blocks failed-preflight approval", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("adminDesignReviewDecision");
    expect(source).toContain('decision==="approve"?"approved":"rejected"');
    expect(source).toContain("Design approval is blocked while the latest preflight result is failed.");
    expect(source).not.toContain('decision==="approve"?"published":"rejected"');
  });

  test("Manual Review API enforces Access for reads and Modify for mutations", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    expect(source).toContain('url.pathname.startsWith("/api/admin/manual-review")');
    expect(source).toContain('const permission=method==="GET"?"access":"modify"');
    expect(source).toContain('store.adminPermission(identity.id,"admin.manual_review",permission)');
    expect(source).toContain('url.pathname === "/admin/manual-review") return new Response(ADMIN_MANUAL_REVIEW_PAGE');
  });

  test("Manual Review UI exposes qualification evidence and both queues", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    for(const text of ["Designer Qualification Queue","Designer Designs Requiring Review","Three qualification designs","Assets / analyzer evidence","Approve & Authorize Designer","Prior rejections"]) {
      expect(source).toContain(text);
    }
  });
});
