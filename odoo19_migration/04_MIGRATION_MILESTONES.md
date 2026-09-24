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
Frontend API compatibility, native Odoo website cart/sales authority, DTF order-line snapshots, payment/delivery/pickup integration.

## M6 — Production/operator
Order item -> exact master -> native MRP printing job, protected production evidence, Printing Operator least privilege.

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

## Verified milestone status

- M0 — migration preparation evidence freeze: COMPLETE.
- M1 — portable Odoo foundation: COMPLETE + CI VERIFIED.
- M2 — core models/security: COMPLETE + CI VERIFIED.
- M3 — native catalog + Printify: COMPLETE + CI VERIFIED.
- M4 — preflight + publishing/protected assets: COMPLETE + CI VERIFIED.
  - Final M4 closure HEAD: `105b9b5bece9625c4ce89d331384b674fc3c3eaa`
  - Run: `35932177544` — SUCCESS.
- M5 — native sales/cart/API reconciliation correction: COMPLETE + CI VERIFIED.
  - Code-verified HEAD: `be298dad8312120593065939aa3a3903559073fe`
  - Run: `35975667331` — SUCCESS.
- M6 — production/operator: COMPLETE + CI VERIFIED + VISUAL QA VERIFIED.
  - Native `mrp.production` is the printing-job authority.
  - Exact sale line/design/master/attachment/preflight references are preserved.
  - Printing Operator is restricted to DTF jobs and stage updates only.
  - Protected production evidence cannot be destructively changed/deleted.
  - Master download is authorized through the exact DTF printing job and exact linked attachment.
  - Final functional/visual HEAD: `4e1ef2fba65298ae5ea92551d911c972a09f9e7b`
  - Visual-QA run: `35996354715` — SUCCESS.
  - Full migration validation run on the same HEAD: `35996355139` — SUCCESS.
  - Admin and Operator downloaded the same non-empty 68-byte PNG; SHA-256 `431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460`.
  - Desktop 1440x900, tablet 1024x768 and mobile 390x844 browser checks: PASS.
  - M6 actionable console/network/page errors: NONE.
- M7 — finance: COMPLETE + CI VERIFIED.
  - Designer earning snapshots, finance accounts/balances, immutable ledger, withdrawals, company defaults, per-designer overrides, administrator transitions, and native paid-invoice triggering are implemented in `dtf_finance`.
  - Final M7 closure HEAD: `95fb9c1069bd2ac1d46821f090bb7eba15d62256`
  - Odoo 19 migration validation run: `36014812563` — SUCCESS.
  - The workflow explicitly runs `/dtf_finance:TestDTFM7Finance`.
- M8 — Admin + bilingual: NOT STARTED.

## M5 operational items still deferred where applicable

- payment-provider setup
- delivery/store-pickup operational configuration
- broader API security/concurrency coverage
- deployed-database migration handling for any obsolete reservation schema

## M7 closure boundary

M7 includes designer finance/withdrawals and is complete + CI verified. It does not include the final Admin theme/bilingual M8 work, Fabric.js, frontend cutover, Oracle deployment, or merge.

No deployment or merge has been performed.
