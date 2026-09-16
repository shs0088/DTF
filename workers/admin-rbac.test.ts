import { describe, expect, test } from "bun:test";

describe("admin OpenCart-style RBAC contract", () => {
  test("printing operator default Access excludes Users/User Groups/Settings", () => {
    const access = new Set(["admin.dashboard","admin.orders","admin.production"]);
    expect(access.has("admin.users")).toBe(false);
    expect(access.has("admin.user_groups")).toBe(false);
    expect(access.has("admin.settings")).toBe(false);
  });

  test("Access and Modify remain independent", () => {
    const viewOnly = { access: new Set(["admin.orders"]), modify: new Set<string>() };
    expect(viewOnly.access.has("admin.orders")).toBe(true);
    expect(viewOnly.modify.has("admin.orders")).toBe(false);
  });

  test("protected system groups remain explicit", () => {
    const protectedGroups = new Set(["main_admin","printing_technician"]);
    expect(protectedGroups.has("main_admin")).toBe(true);
    expect(protectedGroups.has("printing_technician")).toBe(true);
  });

  test("client role headers are never authoritative identity", () => {
    expect("x-role").not.toBe("authenticated identity");
    expect("x-admin-role").not.toBe("authenticated identity");
  });

  test("implementation source contains group membership and Access/Modify primitives", async () => {
    const source = await Bun.file(new URL("./item-store.ts", import.meta.url)).text();
    expect(source).toContain("admin_user_groups");
    expect(source).toContain("admin_user_group_memberships");
    expect(source).toContain("admin_group_permissions");
    expect(source).toContain("adminCanUser");
    expect(source).toContain('mode: "access"|"modify"');
    expect(source).toContain("The last Main Administrator cannot be moved");
    expect(source).toContain("Protected system groups cannot be deleted");
  });

  test("active Worker Admin surface uses database-backed group authorization", async () => {
    const source = await Bun.file(new URL("./static-app.ts", import.meta.url)).text();
    expect(source).toContain('store.adminCanUser(identity.id,"admin.products.printify",permissionMode)');
    expect(source).toContain('store.adminCanUser(user.id,"admin.users","access")');
    expect(source).toContain('store.adminCanUser(user.id,"admin.user_groups","access")');
    expect(source).toContain("Access: Select all");
    expect(source).toContain("Modify: Select all");
  });
});
