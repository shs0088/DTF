# Migration Milestones

## M0 — Evidence freeze
Inspect current branch, all five requirement records, change log, theme spec, routes/APIs/data model and current visual references.

## M1 — Portable Odoo foundation
Odoo 19 Community + PostgreSQL + Nginx; custom addons path; Ubuntu 24.04 ARM64 target; backup/restore; no paid Odoo Online dependency.

## M2 — Core models/security
Customers/users mapping, designers/qualification, designs/assets/master, product combinations, ACLs/record rules.

## M3 — Catalog + Printify
Products/variants/categories/images, Printify connector, snapshot/import mapping, hidden customer-facing branding.

## M4 — Preflight + publishing
Analyzer/rules/results, explicit master, publish gate, protected deletion.

## M5 — Sales/cart/checkout/inventory
Frontend API compatibility, stock/reservation rule, order snapshots, payment/delivery/pickup.

## M6 — Production/operator
Order item -> exact master -> printing job, MRP bridge, operator least privilege.

## M7 — Finance
Earning snapshots, balances/ledger, withdrawals and admin management.

## M8 — Admin + bilingual
DTF Odoo backend theme, dashboard/reviews/reports/settings/integrations/audit, Arabic/English RTL/LTR.

## M9 — Frontend cutover
Existing frontend switches to Odoo compatibility API with customer URLs and visual design preserved.

## M10 — Deployment
Oracle/VPS deployment, domain/TLS, scheduled backups, restore drill, monitoring/logging.

## M11 — Acceptance
No production-ready claim until module installs/tests, API contracts, core business flows, browser/mobile regression, security matrix, ARM64 deployment, backup/restore and GitHub QC pass.


## Current migration status — 2026-09-23

- M0 — Evidence freeze: COMPLETE for migration preparation.
- M1 — Portable Odoo foundation: COMPLETE + CI VERIFIED.
- M2 — Core models/security: COMPLETE + CI VERIFIED.
  - Native Odoo PostgreSQL remains the single target database.
  - Odoo contacts/users/groups/attachments are reused.
  - DTF designer/design/asset/preflight foundation is implemented as Odoo addons.
  - M2 test evidence is recorded in `M2_IMPLEMENTATION_REPORT.md`.
- Next milestone: M3 — Catalog + Printify.


## M3 completion update — 2026-09-23

- M3 — Catalog + Printify: COMPLETE + CI VERIFIED.
- Verified implementation run: 35923917690 — SUCCESS.
- M4 — Preflight + publishing: IN VALIDATION on the current branch head.
  - Failed validation run 35925594079 identified an Odoo JSON default callable regression and a latest-result cache/query issue.
  - Corrections were committed on the M4 branch; final workflow verification is required before marking M4 complete.
- M5/M6 remain intentionally deferred: sales/checkout/inventory and production/operator workflows have not been started.


## M4 final closure coverage

The closure suite extends the original M4 evidence with analyzer rejection codes, scaling/DPI behavior, transparency-required rejection, master readability/analyzability gates, exact bilingual publishing gates and missing-master messaging, all seven current-preflight product combinations, stale-result precedence, printable-area validation, security/deletion regression coverage, and role/attachment cleanup. Existing M2 tests are explicitly reused for owner-scoped design access, locked-result immutability, qualification publishing denial, master ownership, explicit master selection, and the seven-value product selection.

Final closure remains M4-only. M5 and M6 are deferred.


## Final M4 closure evidence

Final HEAD: `105b9b5bece9625c4ce89d331384b674fc3c3eaa`. GitHub Actions run `35932177544` completed SUCCESS. Verified: M1 static validation PASS; Docker Compose validation PASS; ARM64 manifest probe PASS; PostgreSQL startup PASS; installation of all 13 DTF addons PASS; M2 tests PASS; M3 tests PASS; expanded M4 tests PASS; Odoo/Nginx `/web` runtime PASS. The workflow completed without failed steps or errors. M4 remains limited to preflight, publishing, protected assets, and associated regression coverage. M5/M6 remain intentionally deferred.


## M5 implementation start

M4 remains COMPLETE and unchanged. M5 has started from verified HEAD `5f5ff8399e2931c91f941b9700f047a4effe8fd1`. First M5 batch adds native Odoo sale-order DTF design/master/preflight/customer/product snapshots, a 30-minute checkout reservation model, checkout state/payment guards, and payment-confirmed production handoff snapshots. Existing frontend, Worker/old backend, and prior milestone behavior remain untouched. Deployment and merge are not performed. M6 and later milestones are not started.


## Native reconciliation update

The former custom 30-minute checkout stock hold is cancelled/superseded. The duplicate reservation model, timed fields, hold accounting, lock logic, ACLs, and tests were removed. M5 cart compatibility delegates to native website-sale methods and native computed totals. DTF sale-line snapshots and production evidence remain extensions. M6 is not started. See ODOO_NATIVE_RECONCILIATION_M1_M5.md.


## Native correction pass

Native Odoo 19 website cart APIs (`request.cart` / `website._create_cart`) and `jsonrpc` routes are now required. Native `product.public.category`, translated product content, `public_categ_ids`, `is_published`, and `website.sale_product_domain()` are authoritative. The duplicate site category/product publication layer and premature production handoff workflow were removed/deferred. CI includes the DTF API controller test tag. M6 remains not started.
