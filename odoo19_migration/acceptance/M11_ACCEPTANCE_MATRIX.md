# M11 Acceptance Matrix

Status: **ACTIVE — source acceptance gate implemented; external production evidence still required for Production Ready / Go-Live Accepted.**

M11 is the final acceptance milestone. It aggregates the already-verified M1–M10 evidence and adds a strict production-evidence gate. It does not permit missing live deployment evidence to be converted into a PASS by documentation wording.

## Source/CI acceptance

The following are required and already represented by repository evidence:

- M1 portable Odoo foundation and addon graph.
- M2 core models/security and role isolation.
- M3 native catalog + Printify.
- M4 preflight/publishing/protected assets.
- M5 native sales/cart/checkout/API authority.
- M6 production/operator + browser regression.
- M7 finance.
- M8 Admin + bilingual + responsive visual QA.
- M9 preserved frontend cutover + browser/mobile QA.
- M10 deployment package, ARM64 proof, runbook, backup/restore tooling, monitoring/timers and production smoke contract.
- Protected external `dtf-studio-v48-safe-frontend` remains untouched.

The canonical immutable evidence IDs are stored in `m11-source-evidence.json`.

## External production acceptance evidence

Production Ready / Go-Live Accepted requires a real separate NEW production environment and a redacted evidence file validating all of the following:

1. Ubuntu ARM64/aarch64 host preflight PASS.
2. New backend DNS resolves to the intended host.
3. Real HTTPS/TLS issuance PASS.
4. TLS renewal path PASS.
5. All 13 DTF addons installed on the production database.
6. Isolated Odoo-backed frontend is live against the NEW Odoo HTTPS origin.
7. Protected V48 deployment remains untouched.
8. Live production backup PASS with checksum evidence.
9. Isolated live restore drill PASS.
10. Monitoring/logging PASS.
11. Host timers PASS.
12. Production smoke tests PASS, including health/products/categories/backend/database-manager/WebSocket checks.

The runtime collector from M10 should be used and secrets must never be committed.

## Machine gates

- Source gate: `python3 odoo19_migration/validation/validate_m11.py`
  - PASS means the M11 matrix/source evidence is structurally complete.
  - If live evidence is absent, it reports `EXTERNAL_EVIDENCE_REQUIRED` and still exits successfully so ordinary repository CI stays green.
- Strict production gate: `python3 odoo19_migration/validation/validate_m11.py --require-live`
  - Must fail until a valid redacted live evidence JSON is supplied.
  - This strict gate is the requirement for Production Ready / Go-Live Accepted.

## Current acceptance decision

**NOT YET PRODUCTION READY.**

Reason: M10 was formally closed at the repository/deployment-package boundary, but no authorized production host was connected in the closing session and no real VPS/DNS/TLS/live-backup/live-restore/live-monitoring/live-smoke evidence has been supplied.

M11 remains active until the strict production gate passes.
