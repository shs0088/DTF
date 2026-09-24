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

## Verified milestone status

- M0 — migration preparation evidence freeze: COMPLETE.
- M1 — portable Odoo foundation: COMPLETE + CI VERIFIED.
- M2 — core models/security: COMPLETE + CI VERIFIED.
- M3 — native catalog + Printify: COMPLETE + CI VERIFIED.
- M4 — preflight + publishing/protected assets: COMPLETE + CI VERIFIED.
  - Final M4 closure HEAD: `105b9b5bece9625c4ce89d331384b674fc3c3eaa`
  - Run: `35932177544` — SUCCESS.
- M5 — native sales/cart/API reconciliation correction: COMPLETE + CI VERIFIED.
  - The former custom 30-minute reservation implementation is cancelled and removed.
  - Native Odoo website cart/sale/product/publication/category behavior is authoritative.
  - DTF-specific native sale-line design/master/preflight/customer/product snapshots remain.
  - Premature production handoff was removed and deferred to M6.
  - Code-verified HEAD: `be298dad8312120593065939aa3a3903559073fe`
  - Run: `35975667331` — SUCCESS.
- M6 — production/operator: NOT STARTED.

## M5 remaining operational work

The native-reconciliation correction is closed, but operational configuration/coverage still includes later M5 work where required by the project plan:

- payment-provider setup
- delivery/store-pickup operational configuration
- broader API security/concurrency coverage
- deployment-data migration handling for any previously created obsolete reservation schema

No deployment or merge has been performed.
