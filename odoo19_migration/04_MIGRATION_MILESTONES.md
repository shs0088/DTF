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
