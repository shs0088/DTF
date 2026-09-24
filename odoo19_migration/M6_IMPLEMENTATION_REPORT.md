# M6 Implementation Report — Production + Printing Operator

## Start

START HEAD: `23b5aa611cfb0ea516229e618f10e82edd945c91`

M5 handoff workflow: `35976534734` — SUCCESS.

## M6 scope

M6 introduces only the production/operator layer. M7 finance, M8 final Admin theme, Fabric.js, frontend cutover, deployment, and merge were not started.

## Architecture

- Native Odoo `mrp.production` is the authoritative printing-job record.
- No parallel `dtf.production.handoff` table was restored.
- Each DTF printing job links one confirmed native `sale.order.line` to:
  - exact `dtf.design`
  - exact Ready-to-Print Master `dtf.design.asset`
  - exact master `ir.attachment`
  - exact accepted `dtf.preflight.result`
  - immutable M5 customer/product/preflight snapshots
- One primary DTF printing job is allowed per DTF sale-order line.
- Native MRP internals remain Odoo authority; DTF adds only print-production evidence and operator workflow.

## Printing Operator

- Existing `dtf_core.group_dtf_printing_operator` is reused.
- Dedicated menu: DTF Operations -> Orders / Printing Jobs.
- Operator may:
  - read DTF printing jobs
  - see order/customer/product/quantity
  - download the exact master file from the authorized job
  - update only the DTF printing status through allowed transitions
- Operator may not:
  - create/delete production jobs
  - alter product/customer/master/preflight/snapshot evidence
  - access non-DTF manufacturing orders through the DTF rule
- DTF Administrator may create production jobs from confirmed sale-order lines.
- Native MRP creation uses controlled elevation only after the explicit DTF-admin gate, avoiding broad Manufacturing/User permission on the DTF Administrator role.

## DTF production stages

- New
- Under Preparation
- Ready for Delivery/Pickup
- Completed
- Cancelled

Native `mrp.production` remains the manufacturing authority; these are DTF operator-facing workflow stages.

## Protected evidence

After a DTF production job exists:

- production job cannot be deleted
- production evidence fields are immutable
- linked sale-order line cannot change DTF design/master/snapshots/product/quantity
- referenced design cannot be deleted
- referenced Ready-to-Print Master cannot be deleted
- referenced master attachment cannot be deleted
- operator tampering is rejected as an authorization failure

## Failures found and corrected

### Failure 1 — native MRP internal group ACL

Run `35979563704` failed in M6 because creating native `mrp.production` also created an internal `mrp.production.group`, whose native ACL expects Manufacturing/User.

Correction:
- kept DTF Administrator least-privilege
- did not grant global Manufacturing/User
- retained explicit DTF-admin authorization
- used controlled elevation only for the native MRP creation chain

### Failure 2 — operator exception ordering

Run `35981402285` reached M6 and created native production jobs successfully, but one operator-security test errored because immutable-evidence validation fired before the intended operator `AccessError`.

Correction:
- operator-only write restrictions are checked first
- protected-evidence immutability still applies to admin/non-operator writes
- operator may update only `dtf_operator_stage`

## Verified code evidence

Code-verified HEAD: `6e369702bc2454628ec4c4d6eba33976d418d126`

GitHub Actions run: `35982089855` — **SUCCESS**

Verified on that exact HEAD:

- M1 Python/XML/manifest/security validation: PASS
- Docker Compose validation: PASS
- ARM64 manifest probe: PASS
- PostgreSQL startup: PASS
- all 13 DTF addons install: PASS
- M2 tests: PASS
- M3 Catalog + Printify tests: PASS
- M4 preflight/publishing/protected-asset tests: PASS
- M5 native sales/API reconciliation tests: PASS
- M6 production + Printing Operator tests: PASS
- Odoo/Nginx `/web`: PASS

## M6 visual-QA correction and closure

Visual QA was executed against the native Odoo 19 DTF Operations UI on the migration branch. It was not performed against the preserved V48 frontend.

Browser QA covered:
- DTF Administrator login
- Printing Operator login
- DTF printing-job list and form
- exact order/customer/phone/product/quantity display
- Ready-to-Print Master filename and explicit download control
- protected-evidence visibility for DTF Administrator
- protected-evidence hiding for Printing Operator
- Printing Operator isolation to DTF jobs only
- New -> Under Preparation -> Ready for Delivery/Pickup -> Completed
- New -> Cancelled
- completed-state reversal protection
- desktop 1440x900
- tablet 1024x768
- mobile 390x844
- horizontal-overflow checks
- browser console/network diagnostics
- exact downloaded master payload for both Admin and Operator

Visual QA exposed and corrected several issues before closure:
- native MRP work-order read access required by the operator form was granted read-only and only for work orders linked to DTF printing jobs; no broad Manufacturing/User role was granted
- an explicit protected master-download action was added
- native Odoo backend proxy routes required by the M6 UI were added without enabling the preserved frontend cutover
- the browser harness was corrected so it tests the explicit download control instead of navigating through a filename relation
- a zero-byte download false positive was rejected; QA was strengthened to require a non-empty PNG payload
- master download now uses an authenticated DTF production endpoint tied to the exact printing job and exact linked master attachment
- the synthetic QA master is stored in the ephemeral QA database so its bytes survive the CI container lifecycle without changing production attachment-storage policy

Final visual evidence:

- Final M6 visual-QA HEAD: `4e1ef2fba65298ae5ea92551d911c972a09f9e7b`
- Visual-QA run: `35996354715` — **SUCCESS**
- Full migration validation run on the same HEAD: `35996355139` — **SUCCESS**
- Admin downloaded master: `m6-visual-master.png`, 68 bytes
- Operator downloaded master: `m6-visual-master.png`, 68 bytes
- SHA-256 of both downloaded files: `431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460`
- PNG signature validation: PASS
- desktop/tablet/mobile overflow checks: PASS
- M6 actionable console errors: NONE
- M6 actionable network errors: NONE
- page errors: NONE

The ephemeral QA database still emitted generic Odoo website-logo/filestore and websocket warnings outside the M6 DTF Operations flow. They were not treated as M6 functional failures and do not change the M6 production/operator result. Final Admin theme/bilingual styling remains M8 scope.

## Final M6 status

M6 production/operator is **COMPLETE + CI VERIFIED + VISUAL QA VERIFIED**.

Final functional/visual source HEAD before this documentation closure:
`4e1ef2fba65298ae5ea92551d911c972a09f9e7b`

Final evidence:
- Visual QA: `35996354715` — SUCCESS
- Full Odoo migration validation: `35996355139` — SUCCESS

M7 was not started during M6 closure.

## Boundary / deferred work

- M7 finance: NOT STARTED
- M8 Admin/bilingual finalization: NOT STARTED
- frontend cutover: NOT STARTED
- deployment: NO
- merge: NO
- frontend files changed: NO
- old Worker/backend files changed: NO
- Odoo core modified: NO
