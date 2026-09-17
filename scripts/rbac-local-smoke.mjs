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
    assert.equal(result.response.status, 403);
    const users = await request("/api/admin/rbac/users", { headers: { cookie: mainCookie } });
    const current = users.data.users.find((user) => user.id === securityUser.id);
    assert.notEqual(current?.groupId, "group-main-admin");
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
    const disable = await request(`/api/admin/rbac/users/${encodeURIComponent(mainUser.id)}`, json("PATCH", { enabled: false }, mainCookie));
    assert.ok([400, 403].includes(disable.response.status));
    const move = await request(`/api/admin/rbac/users/${encodeURIComponent(mainUser.id)}/group`, json("PATCH", { groupId: viewGroup.id }, mainCookie));
    assert.ok([400, 403].includes(move.response.status));
    const stillWorks = await request("/api/admin/rbac/users", { headers: { cookie: mainCookie } });
    assert.equal(stillWorks.response.status, 200);
  });

  console.log("FULL RBAC LOCAL RUNTIME MATRIX: PASS");
}

run().catch((error) => {
  console.error("FULL RBAC LOCAL RUNTIME MATRIX: FAIL");
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
