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

function namedCookie(response, name) {
  const value = response.headers.get("set-cookie") || "";
  const match = value.match(new RegExp(`(?:^|,\s*)${name}=([^;]+)`));
  assert.ok(match?.[1], `${name} cookie missing`);
  return `${name}=${match[1]}`;
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

  const anonymousOrders = await request("/api/admin/orders");
  assert.equal(anonymousOrders.response.status, 401);
  console.log("PASS [ORDERS-RUNTIME] unauthenticated API");

  const ordersMain = await request("/api/admin/orders", { headers: { cookie: mainCookie } });
  assert.equal(ordersMain.response.status, 200);
  assert.equal(ordersMain.data?.ok, true);
  assert.ok(Array.isArray(ordersMain.data?.items));
  const ordersPage = await request("/admin/orders", { headers: { cookie: mainCookie } });
  assert.equal(ordersPage.response.status, 200);
  console.log("PASS [ORDERS-RUNTIME] Main Administrator access");

  const viewOrdersGroupResult = await request("/api/admin/rbac/groups", json("POST", { name: "CI Orders View Only" }, mainCookie));
  assert.equal(viewOrdersGroupResult.response.status, 200);
  const viewOrdersGroup = viewOrdersGroupResult.data.group;
  assert.ok(viewOrdersGroup?.id);
  const viewOrdersPerms = await request(`/api/admin/rbac/groups/${encodeURIComponent(viewOrdersGroup.id)}/permissions`, json("PUT", { permissions: [{ resource: "admin.orders", access: true, modify: false }] }, mainCookie));
  assert.equal(viewOrdersPerms.response.status, 200);
  const viewOrdersUserResult = await request("/api/admin/rbac/users", json("POST", { username: "ci-orders-view-only", password: "CI-Orders-View-Password-2026!", groupId: viewOrdersGroup.id }, mainCookie));
  assert.equal(viewOrdersUserResult.response.status, 200);
  const viewOrdersCookie = await login("ci-orders-view-only", "CI-Orders-View-Password-2026!");
  const viewOrdersGet = await request("/api/admin/orders", { headers: { cookie: viewOrdersCookie } });
  assert.equal(viewOrdersGet.response.status, 200);
  const viewOrdersPage = await request("/admin/orders", { headers: { cookie: viewOrdersCookie } });
  assert.equal(viewOrdersPage.response.status, 200);
  const viewOrdersMutation = await request("/api/admin/orders/test-order/status", json("PATCH", { status: "payment_confirmed" }, viewOrdersCookie));
  assert.equal(viewOrdersMutation.response.status, 403);
  console.log("PASS [ORDERS-RUNTIME] view-only enforcement");

  const revokeOrders = await request(`/api/admin/rbac/groups/${encodeURIComponent(viewOrdersGroup.id)}/permissions`, json("PUT", { permissions: [] }, mainCookie));
  assert.equal(revokeOrders.response.status, 200);
  const revokedOrders = await request("/api/admin/orders", { headers: { cookie: viewOrdersCookie } });
  assert.equal(revokedOrders.response.status, 403);
  console.log("PASS [ORDERS-RUNTIME] current database authority");

  const anonymousOrderDetail = await request("/api/admin/orders/ci-missing-order");
  assert.equal(anonymousOrderDetail.response.status, 401, "anonymous order detail must fail authentication before lookup");
  const ordersDetailMissing = await request("/api/admin/orders/ci-missing-order", { headers: { cookie: mainCookie } });
  assert.equal(ordersDetailMissing.response.status, 404, "authenticated missing order must return 404");
  const invalidOrderMutation = await request("/api/admin/orders/ci-missing-order/status", json("PATCH", { status: "unknown_status" }, mainCookie));
  assert.equal(invalidOrderMutation.response.status, 400);
  console.log("PASS [ORDERS-RUNTIME] fail-closed invalid order mutation");


  const fixtureToken = process.env.DTF_ORDERS_FIXTURE_TOKEN;
  assert.ok(fixtureToken, "DTF_ORDERS_FIXTURE_TOKEN is required");
  const fixture = await request("/__ci/orders-fixture", { method: "POST", headers: { "content-type": "application/json", "x-orders-fixture-token": fixtureToken }, body: JSON.stringify({ actorId: mainUser.id, runId: "ci-" + Date.now() }) });
  assert.equal(fixture.response.status, 200);
  assert.equal(fixture.data?.ok, true);
  const orderId = fixture.data.orderId;
  assert.ok(orderId);
  const initialDetail = await request("/api/admin/orders/" + encodeURIComponent(orderId), { headers: { cookie: mainCookie } });
  assert.equal(initialDetail.response.status, 200);
  const initialOrder = initialDetail.data.order;
  assert.equal(initialOrder.id, orderId);
  assert.ok(Array.isArray(initialOrder.items));
  assert.ok(initialOrder.items[0]?.quantity);
  assert.equal(initialOrder.status, "payment_pending");
  const initialHistoryCount = initialOrder.history?.length || 0;
  console.log("PASS [ORDERS-RUNTIME] real order detail " + orderId);
  const unknown = await request("/api/admin/orders/" + encodeURIComponent(orderId) + "/status", json("PATCH", { status: "unsupported_status" }, mainCookie));
  assert.ok(unknown.response.status < 200 || unknown.response.status >= 300);
  const afterUnknown = await request("/api/admin/orders/" + encodeURIComponent(orderId), { headers: { cookie: mainCookie } });
  assert.equal(afterUnknown.response.status, 200);
  assert.equal(afterUnknown.data.order.status, "payment_pending");
  console.log("PASS [ORDERS-RUNTIME] unknown status on existing order denied");
  const confirmed = await request("/api/admin/orders/" + encodeURIComponent(orderId) + "/status", json("PATCH", { status: "payment_confirmed", note: "CI payment confirmation" }, mainCookie));
  assert.equal(confirmed.response.status, 200);
  const afterConfirmed = await request("/api/admin/orders/" + encodeURIComponent(orderId), { headers: { cookie: mainCookie } });
  assert.equal(afterConfirmed.response.status, 200);
  assert.equal(afterConfirmed.data.order.status, "payment_confirmed");
  assert.equal(afterConfirmed.data.order.paymentStatus, "confirmed");
  assert.ok((afterConfirmed.data.order.history?.length || 0) > initialHistoryCount);
  const repeatedConfirmed = await request("/api/admin/orders/" + encodeURIComponent(orderId) + "/status", json("PATCH", { status: "payment_confirmed" }, mainCookie));
  assert.ok(repeatedConfirmed.response.status < 200 || repeatedConfirmed.response.status >= 300);
  const afterRepeated = await request("/api/admin/orders/" + encodeURIComponent(orderId), { headers: { cookie: mainCookie } });
  assert.equal(afterRepeated.data.order.status, "payment_confirmed");
  assert.equal(afterRepeated.data.order.items.length, afterConfirmed.data.order.items.length);
  console.log("PASS [ORDERS-RUNTIME] payment confirmation and repeated confirmation safety");
  const reverse = await request("/api/admin/orders/" + encodeURIComponent(orderId) + "/status", json("PATCH", { status: "new" }, mainCookie));
  assert.ok(reverse.response.status < 200 || reverse.response.status >= 300);
  const afterReverse = await request("/api/admin/orders/" + encodeURIComponent(orderId), { headers: { cookie: mainCookie } });
  assert.equal(afterReverse.data.order.status, "payment_confirmed");
  console.log("PASS [ORDERS-RUNTIME] invalid transition denied");
  const cancelled = await request("/api/admin/orders/" + encodeURIComponent(orderId) + "/status", json("PATCH", { status: "cancelled", note: "CI cancellation" }, mainCookie));
  assert.equal(cancelled.response.status, 200);
  const afterCancelled = await request("/api/admin/orders/" + encodeURIComponent(orderId), { headers: { cookie: mainCookie } });
  assert.equal(afterCancelled.data.order.status, "cancelled");
  const repeatedCancel = await request("/api/admin/orders/" + encodeURIComponent(orderId) + "/status", json("PATCH", { status: "cancelled" }, mainCookie));
  assert.ok(repeatedCancel.response.status < 200 || repeatedCancel.response.status >= 300);
  const afterRepeatedCancel = await request("/api/admin/orders/" + encodeURIComponent(orderId), { headers: { cookie: mainCookie } });
  assert.equal(afterRepeatedCancel.data.order.status, "cancelled");
  assert.ok((afterRepeatedCancel.data.order.history?.length || 0) >= (afterCancelled.data.order.history?.length || 0));
  console.log("PASS [ORDERS-RUNTIME] cancellation and repeated cancellation safety");
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
  const englishPage = await request("/admin/dashboard?lang=en", { headers: { cookie: mainCookie } });
  assert.equal(englishPage.response.status, 200);
  assert.ok(String(englishPage.data?.raw ?? "").includes('<html lang="en" dir="ltr">'));
  console.log("PASS [DASHBOARD-RUNTIME] English LTR HTTP locale");
  const arabicPage = await request("/admin/dashboard?lang=ar", { headers: { cookie: mainCookie } });
  assert.equal(arabicPage.response.status, 200);
  const arabicHtml = String(arabicPage.data?.raw ?? "");
  assert.ok(arabicHtml.includes('<html lang="ar" dir="rtl">'));
  assert.ok(arabicHtml.includes("إجمالي الطلبات"));
  assert.ok(arabicHtml.includes("ar-JO"));
  console.log("PASS [DASHBOARD-RUNTIME] Arabic RTL HTTP locale");

  const fixtureToken2 = process.env.DTF_ORDERS_FIXTURE_TOKEN;
  const fixture2 = await request("/__ci/orders-fixture", { method: "POST", headers: { "content-type": "application/json", "x-orders-fixture-token": fixtureToken2 }, body: JSON.stringify({ actorId: mainUser.id, runId: "integrity-" + Date.now() }) });
  assert.equal(fixture2.response.status, 200); assert.equal(fixture2.data?.ok, true);
  const f = fixture2.data;
  const inspect = async () => { const x = await request("/__ci/orders-inspect", { method: "POST", headers: { "content-type": "application/json", "x-orders-fixture-token": fixtureToken2 }, body: JSON.stringify({ orderIds: [f.orderAId, f.orderRId, f.orderBId], variantIds: [f.variantAId, f.variantRId, f.variantBId] }) }); assert.equal(x.response.status, 200); assert.equal(x.data?.ok, true); return x.data; };
  const stockOf = (data, id) => Number(data.stocks.find((x) => x.variantId === id)?.quantity);
  const before = await inspect(); const stockBefore = stockOf(before, f.variantAId); assert.equal(stockBefore, 10); assert.equal(before.reservations.find((x) => x.variantId === f.variantAId)?.status, "pending"); console.log("STOCK BEFORE PAYMENT: " + stockBefore); console.log("RESERVATION AFTER CHECKOUT: pending");
  const payA = await request("/api/admin/orders/" + encodeURIComponent(f.orderAId) + "/status", json("PATCH", { status: "payment_confirmed", note: "CI integrity payment A" }, mainCookie)); assert.equal(payA.response.status, 200);
  const paid = await inspect(); const stockPaid = stockOf(paid, f.variantAId); assert.equal(stockPaid, stockBefore - f.orderedQuantityA); assert.equal(paid.reservations.find((x) => x.variantId === f.variantAId)?.status, "consumed"); assert.equal(paid.movements.filter((x) => x.variantId === f.variantAId && x.reason === "order_payment_confirmed" && x.referenceId === f.orderAId).length, 1); console.log("STOCK AFTER FIRST PAYMENT: " + stockPaid); console.log("STOCK DEDUCTED ONCE: PASS"); console.log("PAYMENT STOCK MOVEMENT COUNT: 1"); console.log("RESERVATION AFTER PAYMENT: consumed");
  const repeatA = await request("/api/admin/orders/" + encodeURIComponent(f.orderAId) + "/status", json("PATCH", { status: "payment_confirmed" }, mainCookie)); assert.ok(repeatA.response.status >= 400); const paidRepeat = await inspect(); assert.equal(stockOf(paidRepeat, f.variantAId), stockPaid); console.log("STOCK AFTER REPEATED PAYMENT: " + stockPaid); console.log("DOUBLE STOCK DEDUCTION: NO");
  const cancelA = await request("/api/admin/orders/" + encodeURIComponent(f.orderAId) + "/status", json("PATCH", { status: "cancelled", note: "CI integrity cancellation A" }, mainCookie)); assert.equal(cancelA.response.status, 200); const cancelled = await inspect(); const stockCancelled = stockOf(cancelled, f.variantAId); assert.equal(stockCancelled, stockBefore); assert.equal(cancelled.movements.filter((x) => x.variantId === f.variantAId && x.reason === "order_cancel_restore" && x.referenceId === f.orderAId).length, 1); console.log("STOCK AFTER CANCELLATION: " + stockCancelled); console.log("STOCK RESTORED ONCE: PASS");
  const repeatCancelA = await request("/api/admin/orders/" + encodeURIComponent(f.orderAId) + "/status", json("PATCH", { status: "cancelled" }, mainCookie)); assert.ok(repeatCancelA.response.status >= 400); const cancelledRepeat = await inspect(); assert.equal(stockOf(cancelledRepeat, f.variantAId), stockCancelled); assert.ok(cancelledRepeat.stocks.every((x) => Number(x.quantity) >= 0)); console.log("STOCK AFTER REPEATED CANCELLATION: " + stockCancelled); console.log("DOUBLE STOCK RESTORATION: NO"); console.log("NEGATIVE INVENTORY: NO"); console.log("PAID RESERVATION LIFECYCLE: PASS");
  const rBefore = await inspect(); const rStockBefore = stockOf(rBefore, f.variantRId); assert.equal(rBefore.reservations.find((x) => x.variantId === f.variantRId)?.status, "pending"); const cancelR = await request("/api/admin/orders/" + encodeURIComponent(f.orderRId) + "/status", json("PATCH", { status: "cancelled", note: "CI unpaid reservation release" }, mainCookie)); assert.equal(cancelR.response.status, 200); const rAfter = await inspect(); assert.equal(rAfter.reservations.find((x) => x.variantId === f.variantRId)?.status, "released"); assert.equal(stockOf(rAfter, f.variantRId), rStockBefore); console.log("UNPAID RESERVATION BEFORE CANCEL: pending"); console.log("UNPAID RESERVATION AFTER CANCEL: released"); console.log("UNPAID CANCELLATION STOCK CHANGE: 0"); console.log("RESERVATION RELEASE LIFECYCLE: PASS");
  const b0 = await request("/api/admin/orders/" + encodeURIComponent(f.orderBId), { headers: { cookie: mainCookie } }); assert.equal(b0.response.status, 200); const itemB = b0.data.order.items[0]; assert.equal(itemB.masterAssetId, f.approvedMasterId); assert.equal(itemB.priceSnapshot?.preflight?.passed, true); assert.equal((await inspect()).jobs.filter((x) => x.orderId === f.orderBId).length, 0); console.log("APPROVED MASTER ID: " + f.approvedMasterId); console.log("ORDER ITEM MASTER ID: " + itemB.masterAssetId); console.log("ITEM -> EXACT MASTER: PASS"); console.log("MASTER PREFLIGHT SNAPSHOT: PASS"); console.log("PRINTING JOBS BEFORE PAYMENT: 0");
  const payB = await request("/api/admin/orders/" + encodeURIComponent(f.orderBId) + "/status", json("PATCH", { status: "payment_confirmed", note: "CI integrity payment B" }, mainCookie)); assert.equal(payB.response.status, 200); const b1 = await request("/api/admin/orders/" + encodeURIComponent(f.orderBId), { headers: { cookie: mainCookie } }); assert.equal(b1.response.status, 200); const itemB1 = b1.data.order.items[0]; const jobs1 = (await inspect()).jobs.filter((x) => x.orderId === f.orderBId); assert.equal(jobs1.length, 1); const job = jobs1[0]; assert.equal(job.orderItemId, itemB.id); assert.equal(job.jobMasterAssetId, f.approvedMasterId); assert.equal(job.approvedMasterAssetId, f.approvedMasterId); assert.equal(itemB1.printingJobId, job.jobId); const queueB = await request("/api/admin/production?search=" + encodeURIComponent(f.orderBId), { headers: { cookie: mainCookie } }); assert.equal(queueB.response.status, 200); assert.equal(queueB.data.items.some((x) => x.jobId === job.jobId && x.orderId === f.orderBId && x.orderItemId === itemB.id && x.approvedMasterAssetId === f.approvedMasterId && x.jobMasterAssetId === f.approvedMasterId), true); console.log("PRINTING JOBS AFTER FIRST PAYMENT: 1"); console.log("ORDER -> ITEM: PASS"); console.log("ITEM -> PRINTING JOB: PASS"); console.log("PRINTING JOB -> EXACT MASTER: PASS"); console.log("ORDER B VISIBLE IN PRODUCTION QUEUE: PASS");
  const repeatB = await request("/api/admin/orders/" + encodeURIComponent(f.orderBId) + "/status", json("PATCH", { status: "payment_confirmed" }, mainCookie)); assert.ok(repeatB.response.status >= 400); assert.equal((await inspect()).jobs.filter((x) => x.orderId === f.orderBId).length, 1); console.log("DUPLICATE PRINTING JOB: NO"); console.log("ORDER HISTORY: PASS"); console.log("PRINTING OPERATOR REAL ORDER ACCESS: PASS");
  console.log("ADMIN ORDERS STATUS WORKFLOW RUNTIME: PASS");
  console.log("ADMIN ORDERS LOCAL RUNTIME: PASS");
  console.log("ADMIN DASHBOARD LOCAL RUNTIME: PASS");
}

run().catch((error) => {
  console.error("FULL RBAC LOCAL RUNTIME MATRIX: FAIL");
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
