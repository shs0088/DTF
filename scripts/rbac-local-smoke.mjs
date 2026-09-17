import assert from "node:assert/strict";

const baseUrl = "http://127.0.0.1:8787";
const bootstrapToken = process.env.DTF_RBAC_BOOTSTRAP_TOKEN;
assert.ok(bootstrapToken, "DTF_RBAC_BOOTSTRAP_TOKEN is required");

async function body(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : null; } catch { return { raw: text }; }
}

function cookieFrom(response) {
  const value = response.headers.get("set-cookie") || "";
  const match = value.match(/(?:^|,\s*)(dtf_admin_session=[^;]+)/);
  assert.ok(match?.[1], "dtf_admin_session cookie missing");
  return match[1];
}

async function request(path, options = {}) {
  const response = await fetch(baseUrl + path, { redirect: "manual", ...options });
  return { response, data: await body(response) };
}

function json(method, payload, cookie, headers = {}) {
  return { method, headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...headers }, body: JSON.stringify(payload) };
}

async function login(username, password) {
  const form = new URLSearchParams({ username, password });
  const result = await request("/admin", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form });
  assert.equal(result.response.status, 303, `login ${username} must return 303`);
  return cookieFrom(result.response);
}

async function scenario(name, fn) {
  try { await fn(); console.log(`PASS [REQUEST-LEVEL] ${name}`); return true; }
  catch (error) { console.error(`FAIL [REQUEST-LEVEL] ${name}`); throw error; }
}

async function run() {
  const health = await request("/api/studio/health");
  assert.equal(health.response.status, 200);
  assert.equal(health.data?.ok, true);
  console.log("PASS [REQUEST-LEVEL] health");

  const anonymous = await request("/api/admin/rbac/users");
  assert.equal(anonymous.response.status, 401);
  console.log("PASS [REQUEST-LEVEL] no session");

  const bootstrap = await request("/admin/bootstrap", json("POST", { username: "ci-main-admin", password: "CI-Rbac-Test-Password-2026!" }, null, { "x-admin-bootstrap-token": bootstrapToken }));
  assert.equal(bootstrap.response.status, 200);
  const mainCookie = await login("ci-main-admin", "CI-Rbac-Test-Password-2026!");
  const users0 = await request("/api/admin/rbac/users", { headers: { cookie: mainCookie } });
  assert.equal(users0.response.status, 200);
  const mainUser = users0.data.users.find((user) => user.username === "ci-main-admin");
  assert.ok(mainUser?.id);

  await scenario("tampered session", async () => {
    const tampered = mainCookie.slice(0, -1) + (mainCookie.endsWith("0") ? "1" : "0");
    const result = await request("/api/admin/rbac/users", { headers: { cookie: tampered } });
    assert.equal(result.response.status, 401);
  });

  await scenario("Main Administrator", async () => {
    const result = await request("/api/admin/rbac/users", { headers: { cookie: mainCookie } });
    assert.equal(result.response.status, 200);
    assert.equal(result.data?.ok, true);
  });

  const groupResult = await request("/api/admin/rbac/groups", json("POST", { name: "CI View Only Orders" }, mainCookie));
  assert.equal(groupResult.response.status, 200);
  const viewGroup = groupResult.data.group;
  assert.ok(viewGroup?.id);
  const permissions = [{ resource: "admin.orders", access: true, modify: false }];
  const setPerms = await request(`/api/admin/rbac/groups/${encodeURIComponent(viewGroup.id)}/permissions`, json("PUT", { permissions }, mainCookie));
  assert.equal(setPerms.response.status, 200);
  const viewUserResult = await request("/api/admin/rbac/users", json("POST", { username: "ci-view-orders", password: "CI-View-Password-2026!", groupId: viewGroup.id }, mainCookie));
  assert.equal(viewUserResult.response.status, 200);
  const viewUser = viewUserResult.data.user;
  assert.ok(viewUser?.id);
  const viewCookie = await login("ci-view-orders", "CI-View-Password-2026!");

  await scenario("view-only GET", async () => {
    const result = await request("/api/admin/orders", { headers: { cookie: viewCookie } });
    assert.equal(result.response.status, 200);
  });
  await scenario("view-only mutation denial", async () => {
    const result = await request("/api/admin/orders/test/status", json("PATCH", {}, viewCookie));
    assert.equal(result.response.status, 403);
  });
  await scenario("fake-header escalation", async () => {
    const result = await request("/api/admin/settings", { headers: { cookie: viewCookie, "x-role": "main_admin", "x-group": "Main Administrator", "x-permission": "modify" } });
    assert.equal(result.response.status, 403);
  });

  await scenario("current database permission authority", async () => {
    const revoke = await request(`/api/admin/rbac/groups/${encodeURIComponent(viewGroup.id)}/permissions`, json("PUT", { permissions: [] }, mainCookie));
    assert.equal(revoke.response.status, 200);
    const result = await request("/api/admin/orders", { headers: { cookie: viewCookie } });
    assert.equal(result.response.status, 403);
  });

  const restore = await request(`/api/admin/rbac/groups/${encodeURIComponent(viewGroup.id)}/permissions`, json("PUT", { permissions }, mainCookie));
  assert.equal(restore.response.status, 200);
  await scenario("disabled-user stale session", async () => {
    const result = await request(`/api/admin/rbac/users/${encodeURIComponent(viewUser.id)}`, json("PATCH", { enabled: false }, mainCookie));
    assert.equal(result.response.status, 200);
    const denied = await request("/api/admin/orders", { headers: { cookie: viewCookie } });
    assert.equal(denied.response.status, 401);
  });

  const operatorResult = await request("/api/admin/rbac/users", json("POST", { username: "ci-printing-operator", password: "CI-Operator-Password-2026!", groupId: "group-printing-operator" }, mainCookie));
  assert.equal(operatorResult.response.status, 200);
  const operatorCookie = await login("ci-printing-operator", "CI-Operator-Password-2026!");
  await scenario("Printing Operator", async () => {
    for (const path of ["/api/admin/dashboard", "/api/admin/orders", "/api/admin/production"]) { const result = await request(path, { headers: { cookie: operatorCookie } }); assert.equal(result.response.status, 200, path); }
    for (const path of ["/api/admin/rbac/users", "/api/admin/rbac/groups", "/api/admin/settings"]) { const result = await request(path, { headers: { cookie: operatorCookie } }); assert.equal(result.response.status, 403, path); }
  });

  const securityGroupResult = await request("/api/admin/rbac/groups", json("POST", { name: "CI User Managers" }, mainCookie));
  assert.equal(securityGroupResult.response.status, 200);
  const securityGroup = securityGroupResult.data.group;
  const securityPerms = await request(`/api/admin/rbac/groups/${encodeURIComponent(securityGroup.id)}/permissions`, json("PUT", { permissions: [{ resource: "admin.users", access: true, modify: true }, { resource: "admin.user_groups", access: true, modify: true }] }, mainCookie));
  assert.equal(securityPerms.response.status, 200);
  const securityUserResult = await request("/api/admin/rbac/users", json("POST", { username: "ci-security-user", password: "CI-Security-Password-2026!", groupId: securityGroup.id }, mainCookie));
  assert.equal(securityUserResult.response.status, 200);
  const securityUser = securityUserResult.data.user;
  const securityCookie = await login("ci-security-user", "CI-Security-Password-2026!");
  await scenario("self escalation", async () => {
    const result = await request(`/api/admin/rbac/users/${encodeURIComponent(securityUser.id)}/group`, json("PATCH", { groupId: "group-main-admin" }, securityCookie));
    assert.ok([400, 403].includes(result.response.status), `self escalation must be rejected, got ${result.response.status}`);
    const users = await request("/api/admin/rbac/users", { headers: { cookie: mainCookie } });
    const current = users.data.users.find((user) => user.id === securityUser.id);
    assert.equal(current?.group_id, securityGroup.id, "self-escalation must preserve the original Admin group");
  });

  await scenario("protected system groups", async () => {
    for (const id of ["group-main-admin", "group-printing-operator"]) {
      const patch = await request(`/api/admin/rbac/groups/${encodeURIComponent(id)}`, json("PATCH", { name: "Forbidden System Group" }, mainCookie));
      assert.ok([400, 403].includes(patch.response.status));
      const del = await request(`/api/admin/rbac/groups/${encodeURIComponent(id)}`, { method: "DELETE", headers: { cookie: mainCookie } });
      assert.ok([400, 403].includes(del.response.status));
    }
  });

  await scenario("last Main Administrator", async () => {
    const before = await request("/api/admin/rbac/users", { headers: { cookie: mainCookie } });
    assert.equal(before.response.status, 200);
    const activeMainAdmins = before.data.users.filter((user) => user.group_id === "group-main-admin" && Number(user.enabled) === 1);
    assert.equal(activeMainAdmins.length, 1, "last-main-admin test requires exactly one active Main Administrator");
    const onlyMain = activeMainAdmins[0];
    const disable = await request(`/api/admin/rbac/users/${encodeURIComponent(onlyMain.id)}`, json("PATCH", { enabled: false }, mainCookie));
    assert.ok([400, 403].includes(disable.response.status));
    const move = await request(`/api/admin/rbac/users/${encodeURIComponent(onlyMain.id)}/group`, json("PATCH", { groupId: viewGroup.id }, mainCookie));
    assert.ok([400, 403].includes(move.response.status));
    const stillWorks = await request("/api/admin/rbac/users", { headers: { cookie: mainCookie } });
    assert.equal(stillWorks.response.status, 200);
    const finalMain = stillWorks.data.users.find((user) => user.id === onlyMain.id);
    assert.equal(Number(finalMain?.enabled), 1, "last Main Administrator must remain enabled");
    assert.equal(finalMain?.group_id, "group-main-admin", "last Main Administrator must remain in protected group");
    const finalActiveMainAdmins = stillWorks.data.users.filter((user) => user.group_id === "group-main-admin" && Number(user.enabled) === 1);
    assert.equal(finalActiveMainAdmins.length, 1);
  });

  console.log("FULL RBAC LOCAL RUNTIME MATRIX: PASS");

  const anonymousDashboardApi = await request("/api/admin/dashboard");
  assert.equal(anonymousDashboardApi.response.status, 401);
  console.log("PASS [DASHBOARD-RUNTIME] unauthenticated API");

  const anonymousDashboardPage = await request("/admin/dashboard");
  assert.ok([200, 302, 303, 307, 308, 401, 403].includes(anonymousDashboardPage.response.status));
  const anonymousPageText = String(anonymousDashboardPage.data?.raw ?? "");
  assert.ok(!anonymousPageText.includes("Total Orders"), "anonymous page must not expose dashboard content");
  console.log(`PASS [DASHBOARD-RUNTIME] unauthenticated page status ${anonymousDashboardPage.response.status}`);

  await scenario("dashboard Main Administrator", async () => {
    const api = await request("/api/admin/dashboard", { headers: { cookie: mainCookie } });
    assert.equal(api.response.status, 200);
    assert.equal(api.data?.ok, true);
    assert.ok(api.data?.summary);
    for (const key of ["orders", "production", "reviews", "stock", "payouts"]) assert.ok(api.data.summary[key]);
    const page = await request("/admin/dashboard", { headers: { cookie: mainCookie } });
    assert.equal(page.response.status, 200);
  });

  await scenario("dashboard Printing Operator", async () => {
    const api = await request("/api/admin/dashboard", { headers: { cookie: operatorCookie } });
    assert.equal(api.response.status, 200);
    assert.equal(api.data?.ok, true);
    assert.equal(api.data?.access?.orders, true);
    assert.equal(api.data?.access?.production, true);
    const page = await request("/admin/dashboard", { headers: { cookie: operatorCookie } });
    assert.equal(page.response.status, 200);
    const html = String(page.data?.raw ?? "");
    for (const forbidden of ["/admin/users", "/admin/user-groups", "/admin/settings"]) assert.ok(!html.includes(forbidden), `operator navigation must hide ${forbidden}`);
  });

  await scenario("dashboard database-backed metrics", async () => {
    const api = await request("/api/admin/dashboard", { headers: { cookie: mainCookie } });
    assert.equal(api.response.status, 200);
    const s = api.data.summary;
    for (const value of [s.orders?.total, s.orders?.open, s.orders?.paymentPending, s.production?.open, s.reviews?.pending, s.stock?.outOfStock, s.stock?.lowStock, s.payouts?.requested]) assert.equal(typeof value, "number");
    assert.ok(Array.isArray(s.dailyOrders));
    assert.ok(Array.isArray(s.recentOrders));
    assert.ok(Array.isArray(s.recentActivity));
  });

  const dashboardGroupResult = await request("/api/admin/rbac/groups", json("POST", { name: "CI Dashboard Access" }, mainCookie));
  assert.equal(dashboardGroupResult.response.status, 200);
  const dashboardGroup = dashboardGroupResult.data.group;
  assert.ok(dashboardGroup?.id);
  const dashboardPerms = await request(`/api/admin/rbac/groups/${encodeURIComponent(dashboardGroup.id)}/permissions`, json("PUT", { permissions: [{ resource: "admin.dashboard", access: true, modify: false }] }, mainCookie));
  assert.equal(dashboardPerms.response.status, 200);
  const dashboardUserResult = await request("/api/admin/rbac/users", json("POST", { username: "ci-dashboard-user", password: "CI-Dashboard-Password-2026!", groupId: dashboardGroup.id }, mainCookie));
  assert.equal(dashboardUserResult.response.status, 200);
  const dashboardCookie = await login("ci-dashboard-user", "CI-Dashboard-Password-2026!");
  await scenario("dashboard custom access", async () => {
    const api = await request("/api/admin/dashboard", { headers: { cookie: dashboardCookie } });
    assert.equal(api.response.status, 200);
    const page = await request("/admin/dashboard", { headers: { cookie: dashboardCookie } });
    assert.equal(page.response.status, 200);
  });
  await scenario("dashboard unauthorized custom group", async () => {
    const revoke = await request(`/api/admin/rbac/groups/${encodeURIComponent(dashboardGroup.id)}/permissions`, json("PUT", { permissions: [] }, mainCookie));
    assert.equal(revoke.response.status, 200);
    const api = await request("/api/admin/dashboard", { headers: { cookie: dashboardCookie } });
    assert.equal(api.response.status, 403);
    const page = await request("/admin/dashboard", { headers: { cookie: dashboardCookie } });
    assert.ok([401, 403].includes(page.response.status));
  });
  console.log("PASS [DASHBOARD-RUNTIME] current database authority");
  console.log("ADMIN DASHBOARD LOCAL RUNTIME: PASS");
}

run().catch((error) => {
  console.error("FULL RBAC LOCAL RUNTIME MATRIX: FAIL");
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
