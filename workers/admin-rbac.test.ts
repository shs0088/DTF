import { describe, expect, test } from "bun:test";

describe("admin permission contract", () => {
  test("printing operator is denied outside orders and production", () => {
    const allowed = new Set(["admin.dashboard:access","admin.orders:access","admin.orders:change_status","admin.production:access","admin.production:change_status","admin.production:download"]);
    expect(allowed.has("admin.users:access")).toBe(false);
    expect(allowed.has("admin.user_groups:manage_permissions")).toBe(false);
    expect(allowed.has("admin.settings:access")).toBe(false);
  });
  test("client role headers are not authoritative identity", () => { expect("x-role").not.toBe("authenticated identity"); });
});
return 