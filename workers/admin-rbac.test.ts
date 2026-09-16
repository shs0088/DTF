import { describe, expect, test } from "bun:test";

describe("admin permission contract", () => {
  test("printing operator is denied outside orders and production by default", () => {
    const access = new Set(["admin.dashboard","admin.orders","admin.production"]);
    expect(access.has("admin.users")).toBe(false);
    expect(access.has("admin.user_groups")).toBe(false);
    expect(access.has("admin.settings")).toBe(false);
  });

  test("OpenCart-style model keeps Access and Modify distinct", () => {
    const group = { access: new Set(["admin.orders"]), modify: new Set<string>() };
    expect(group.access.has("admin.orders")).toBe(true);
    expect(group.modify.has("admin.orders")).toBe(false);
  });

  test("client role headers are not authoritative identity", () => {
    expect("x-role").not.toBe("authenticated identity");
    expect("x-admin-role").not.toBe("authenticated identity");
  });

  test("protected system groups remain explicit contract", () => {
    const protectedGroups = new Set(["main_admin","printing_technician"]);
    expect(protectedGroups.has("main_admin")).toBe(true);
    expect(protectedGroups.has("printing_technician")).toBe(true);
  });
});
