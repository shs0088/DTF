import { describe, expect, test } from "bun:test";
import worker from "./static-app";
import { createAdminSession } from "./admin-auth";

type State = { identity: any; permissions: Record<string, boolean>; lastMainAdminProtected: boolean };
function makeEnv(state: State) {
  const store: any = {
    adminIdentity: async (id: string) => state.identity && state.identity.id === id ? state.identity : null,
    adminPermission: async (_id: string, resource: string, permission: string) => Boolean(state.permissions[resource+":"+permission]),
    adminDashboardSummary: async () => ({ orders: 0, openOrders: 0, paymentPending: 0, production: 0, designerReviews: 0, inventoryAttention: 0, withdrawalRequests: 0, series: [], recentOrders: [], recentAudit: [] }),
    businessSettingsSnapshot: async () => ({ settings: {}, canModify: false }),
    adminUsersDetailed: async () => [],
    adminGroups: async () => [],
    setAdminUserGroup: async () => { if (state.lastMainAdminProtected) throw new Error("The last enabled Main Administrator cannot be moved."); return {}; },
    setAdminUserEnabled: async () => { if (state.lastMainAdminProtected) throw new Error("The last enabled Main Administrator cannot be disabled."); return {}; },
    getOrCreateAdminSessionKey: async () => "unused",
  };
  const ns: any = { idFromName: () => "default", get: () => store };
  return { ADMIN_WEB_KEY: "runtime-test-secret", ITEMS: ns, ASSETS: { fetch: async () => new Response("asset") } };
}
async function sessionCookie(env: any, identity: any) { return "dtf_admin_session=" + await createAdminSession(env, identity); }
async function request(path: string, env: any, init: RequestInit = {}) { return worker.fetch(new Request("https://test.local"+path, init), env); }

describe("Admin RBAC request-level runtime authorization", () => {
  test("no session and tampered session return 401; fake escalation headers have no authority", async () => {
    const state: State = { identity: null, permissions: {}, lastMainAdminProtected: false }; const env = makeEnv(state);
    expect((await request("/api/admin/dashboard", env)).status).toBe(401);
    expect((await request("/api/admin/dashboard", env, { headers: { cookie: "dtf_admin_session=bad", "x-role": "main_admin", "x-group": "Main Administrator", "x-permission": "modify" } })).status).toBe(401);
  });

  test("view-only access permits GET and denies mutation", async () => {
    const state: State = { identity: { id: "view-1", group_id: "group-view" }, permissions: { "admin.dashboard:access": true }, lastMainAdminProtected: false }; const env = makeEnv(state);
    const cookie = await sessionCookie(env, { id: "view-1", role: "printing_technician" });
    expect((await request("/api/admin/dashboard", env, { headers: { cookie } })).status).toBe(200);
    expect((await request("/api/admin/dashboard", env, { method: "POST", headers: { cookie } })).status).toBe(403);
  });

  test("Printing Operator is denied Users, User Groups, and Settings", async () => {
    const state: State = { identity: { id: "op-1", group_id: "group-printing-operator" }, permissions: { "admin.dashboard:access": true, "admin.orders:access": true, "admin.production:access": true }, lastMainAdminProtected: false }; const env = makeEnv(state); const cookie = await sessionCookie(env, { id: "op-1", role: "printing_technician" });
    for (const path of ["/api/admin/rbac/users", "/api/admin/rbac/groups", "/api/admin/settings"]) expect((await request(path, env, { headers: { cookie } })).status).toBe(403);
  });

  test("current database authority and permission revocation apply to the same session", async () => {
    const state: State = { identity: { id: "admin-1", group_id: "group-custom" }, permissions: { "admin.dashboard:access": true }, lastMainAdminProtected: false }; const env = makeEnv(state); const cookie = await sessionCookie(env, { id: "admin-1", role: "main_admin" });
    expect((await request("/api/admin/dashboard", env, { headers: { cookie, "x-role": "main_admin" } })).status).toBe(200);
    state.permissions["admin.dashboard:access"] = false;
    expect((await request("/api/admin/dashboard", env, { headers: { cookie } })).status).toBe(403);
    state.identity = null;
    expect((await request("/api/admin/dashboard", env, { headers: { cookie } })).status).toBe(401);
  });

  test("self-escalation is denied by current permission state", async () => {
    const state: State = { identity: { id: "op-2", group_id: "group-printing-operator" }, permissions: {}, lastMainAdminProtected: false }; const env = makeEnv(state); const cookie = await sessionCookie(env, { id: "op-2", role: "printing_technician" });
    expect((await request("/api/admin/rbac/users/op-2/group", env, { method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ groupId: "group-main-admin" }) })).status).toBe(403);
  });

  test("last Main Administrator safeguard is service-level and request-visible", async () => {
    const state: State = { identity: { id: "main-1", group_id: "group-main-admin" }, permissions: { "admin.users:modify": true }, lastMainAdminProtected: true }; const env = makeEnv(state); const cookie = await sessionCookie(env, { id: "main-1", role: "main_admin" });
    const response = await request("/api/admin/rbac/users/main-1", env, { method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ enabled: false }) });
    expect(response.status).toBe(400);
  });
});
