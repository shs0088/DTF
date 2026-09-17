import { describe, expect, test } from "bun:test";

describe("Admin Audit Log implementation contracts", () => {
  test("audit list is database-backed with filters and pagination", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("adminAuditLogs(filters:");
    expect(source).toContain("FROM audit_logs a LEFT JOIN admin_users au");
    expect(source).toContain("date(a.created_at)>=date(?)");
    expect(source).toContain("date(a.created_at)<=date(?)");
    expect(source).toContain("pageSize");
    expect(source).toContain("actionOptions");
    expect(source).toContain("resourceTypes");
  });

  test("metadata is parsed and sanitized before returning to browser", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("sanitizeAuditMetadataValue");
    expect(source).toContain("[redacted]");
    expect(source).toContain("metadata:safe");
    expect(source).not.toContain("metadata:row.metadataJson");
  });

  test("Audit Log API is read-only and protected by Access permission", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    expect(source).toContain('url.pathname!=="/api/admin/audit-log"');
    expect(source).toContain('store.adminPermission(identity.id,"admin.audit_log","access")');
    expect(source).toContain('Audit Log is read-only.');
    expect(source).toContain('url.pathname === "/admin/audit-log") return new Response(localizeAdminHtml(ADMIN_AUDIT_LOG_PAGE,request)');
  });

  test("Audit Log UI exposes actor, action, resource, result and sanitized metadata", async () => {
    const source=await Bun.file(new URL("./static-app.ts",import.meta.url)).text();
    for(const text of ["Audit Log","Stored metadata is sanitized","Actor ID","All actions","All resources","Sanitized metadata","read-only"]) expect(source).toContain(text);
  });

  test("legacy adminAuditList remains compatible through the new safe list path", async () => {
    const source=await Bun.file(new URL("./item-store.ts",import.meta.url)).text();
    expect(source).toContain("adminAuditList(limit=100)");
    expect(source).toContain("this.adminAuditLogs({page:1,pageSize:");
  });
});
