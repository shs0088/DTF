import assert from "node:assert/strict";

const baseUrl = "http://127.0.0.1:8787";
const bootstrapToken = process.env.DTF_RBAC_BOOTSTRAP_TOKEN;

assert.ok(bootstrapToken, "DTF_RBAC_BOOTSTRAP_TOKEN is required");

async function jsonResponse(response) {
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Expected JSON from ${response.url}, got: ${text.slice(0, 200)}`);
  }
  return body;
}

function extractSessionCookie(setCookie) {
  assert.ok(setCookie, "Login response did not include Set-Cookie");
  const match = setCookie.match(/(?:^|,\s*)(dtf_admin_session=[^;]+)/);
  assert.ok(match?.[1], "dtf_admin_session cookie was not found");
  return match[1];
}

async function run() {
  const health = await fetch(`${baseUrl}/api/studio/health`);
  assert.equal(health.status, 200, "Health endpoint must return 200");
  const healthBody = await jsonResponse(health);
  assert.equal(healthBody?.ok, true, "Health endpoint must return ok=true");

  const anonymous = await fetch(`${baseUrl}/api/admin/rbac/users`);
  assert.equal(anonymous.status, 401, "Protected Admin API without session must return 401");

  const bootstrap = await fetch(`${baseUrl}/admin/bootstrap`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-bootstrap-token": bootstrapToken,
    },
    body: JSON.stringify({
      username: "ci-main-admin",
      password: "CI-Rbac-Test-Password-2026!",
    }),
  });
  assert.equal(bootstrap.status, 200, `Bootstrap must return 200, got ${bootstrap.status}`);
  const bootstrapBody = await jsonResponse(bootstrap);
  assert.equal(bootstrapBody?.ok, true, "Bootstrap must return ok=true");

  const loginBody = new URLSearchParams({
    username: "ci-main-admin",
    password: "CI-Rbac-Test-Password-2026!",
  });
  const login = await fetch(`${baseUrl}/admin`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: loginBody,
    redirect: "manual",
  });
  assert.equal(login.status, 303, `Login must return 303, got ${login.status}`);
  const cookie = extractSessionCookie(login.headers.get("set-cookie"));

  const authenticated = await fetch(`${baseUrl}/api/admin/rbac/users`, {
    headers: { cookie },
  });
  assert.equal(authenticated.status, 200, `Authenticated RBAC request must return 200, got ${authenticated.status}`);
  const authenticatedBody = await jsonResponse(authenticated);
  assert.equal(authenticatedBody?.ok, true, "Authenticated RBAC request must return ok=true");

  console.log("LOCAL WORKER SMOKE: PASS");
}

run().catch((error) => {
  console.error("LOCAL WORKER SMOKE: FAIL");
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
