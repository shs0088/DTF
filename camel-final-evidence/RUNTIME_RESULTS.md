# Runtime Results

Checked read-only at 2026-09-19T00:54:17.000Z.

- https://dtf-studio-v48-safe-frontend-zk9t5j.camelai.app/: 200 — <!doctype html> <!-- VERSION 47: customer-clean DTF Studio prototype with live product catalog + real mockup tools. --> <html lang="en" dir="ltr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-wi
- https://dtf-studio-v48-safe-frontend-zk9t5j.camelai.app/api/studio/health: 200 — {"ok":true,"health":{"schemaVersion":"phase-1.3","tables":["admin_group_permissions","admin_permission_assignments","admin_user_groups","admin_users","analyzer_results","assets","audit_logs","auth_credentials","business_
- https://dtf-studio-v48-safe-frontend-zk9t5j.camelai.app/admin/products/printify: 200 — <!doctype html><html lang="en" dir="ltr"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>DTF STUDIO — Administration</title><style>body{margin:0;min-height:100vh;display:grid;place-items:c
- https://dtf-studio-v48-safe-frontend-zk9t5j.camelai.app/api/admin/printify/catalog: 401 — {"ok":false,"error":"Unauthorized"}

## Classification
- VERIFIED: public URL responded; admin path reached an HTTP response.
- PARTIAL: admin page/API behavior was observed without an authorized session.
- BLOCKED BY MISSING AUTHORIZATION: authenticated admin matrix, Printify data/filter/image/title/pagination semantics, dashboard routes, and protected data flows.
- NOT TESTED: responsive, RTL/LTR, screenshots, real admin dashboard, orders, designer/customer dashboards, database row counts.
- No writes, imports, publishes, orders, payments, or deployment were performed.
