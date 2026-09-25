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
- M8 — Admin + bilingual: COMPLETE + CI VERIFIED + VISUAL QA VERIFIED.
  - Final implementation HEAD: `7054bfa6bb03d434d0b20e209c9a168f9e72ca3a`
  - Odoo 19 migration validation run: `36058203854` — SUCCESS.
  - M8 visual-QA run: `36058203840` — SUCCESS.
  - Native Odoo 19 Admin shell uses existing Odoo/DTF authority models; no parallel Admin business-data authority was introduced.
  - Black + Electric Blue backend theme is delivered through native Odoo backend assets.
  - Operational Dashboard uses live Odoo/DTF data for orders, payment attention, production, qualification review, products, inventory attention and payouts.
  - Native qualification/design review workflows, rejection reasons, notifications/activities and escalation are implemented.
  - Native Catalog/Products/Categories, Orders, Customers, Production, Finance/Withdrawals, Promotions, Reports, Settings, Integrations, History, Users and User Groups are exposed through the DTF Admin shell with DTF role boundaries.
  - Native Odoo Users/User Groups are used; protected DTF Administrator and Printing Operator system groups cannot be deleted/renamed, and at least one active DTF Administrator must remain.
  - Arabic uses native Odoo `i18n/ar.po` translation files and native Odoo RTL assets/behavior; no custom Arabic/RTL engine exists.
  - Admin locale direction is independent from bilingual content-field direction: English Admin remains LTR with Arabic content containers RTL; Arabic Admin remains RTL with English content containers LTR.
  - Desktop 1440x900, tablet 1024x768 and mobile 390x844 browser checks: PASS with no horizontal overflow in tested Dashboard/design-review surfaces.
  - The only ignored browser 500 in visual QA is the generic website-logo fixture outside the M8 Admin UI; actionable M8 page/network errors: NONE.
  - Protected M6 visual regression remained green during M8 implementation.

- M9 — frontend cutover: COMPLETE + CI VERIFIED + VISUAL QA VERIFIED.
  - Final M9 closure HEAD: `53654e6647ec71aeba973c86b451d66934e42a94`
  - Odoo 19 migration validation run: `36109746971` — SUCCESS.
  - M9 frontend visual-QA run: `36109746976` — SUCCESS.
  - Protected M6 visual regression run: `36109747163` — SUCCESS.
  - Preserved frontend customer URLs and visual design remain intact; the V48 home remains the customer-facing home surface.
  - Odoo compatibility APIs now provide the authoritative backend for public Products/Categories/Designs, native Odoo authentication/session handling, guest cart, checkout/order, Designer workspace/assets, and New Design upload.
  - Frontend compatibility adapters preserve the existing customer-facing payload/UI contracts without reintroducing a parallel business-data authority.
  - Frontend typecheck, production build, and M9 compatibility-adapter tests: PASS.
  - Native M9 auth/session, guest-cart, checkout/owned-order, Design Gallery, Designer workspace, and Designer upload tests: PASS.
  - Browser QA passed preserved V48 home, English/Arabic Gallery, guest cart, login-required checkout, post-login checkout, order creation, Designer Dashboard/New Design, and mobile Arabic RTL.
  - Tested M9 surfaces have no horizontal overflow; actionable console/page/network errors: NONE.
  - M2-M8 regression chain and final Odoo/Nginx `/web` runtime remained green.
  - No production deployment, no merge to main, and no modification/deployment of the protected external `dtf-studio-v48-safe-frontend` project.


## M5 operational items still deferred where applicable

- payment-provider setup
- delivery/store-pickup operational configuration
- broader API security/concurrency coverage
- deployed-database migration handling for any obsolete reservation schema

## M7 closure boundary

M7 includes designer finance/withdrawals and is complete + CI verified. It does not include the final Admin theme/bilingual M8 work, Fabric.js, frontend cutover, Oracle deployment, or merge.

No deployment or merge has been performed.

## M8 closure boundary

M8 closes the Odoo 19 Admin + bilingual milestone only. It does not perform M9 frontend cutover, M10 production deployment/domain/TLS/backup operations, M11 final production acceptance, merge to main, or modification/deployment of the protected `dtf-studio-v48-safe-frontend` project.

No deployment or merge has been performed.


## M9 closure boundary

M9 closes the preserved-frontend to Odoo compatibility-API cutover and its source/runtime/browser verification. It does not perform M10 production VPS/Oracle deployment, domain/TLS, scheduled backups, restore drill, monitoring/logging, M11 final production acceptance, merge to main, or modification/deployment of the protected external `dtf-studio-v48-safe-frontend` project.

No production deployment or merge has been performed.


## M10 preparation status — source/CI verified, live deployment pending

- M10 production deployment package source HEAD: `2b8d21c139e7abeded95e0f6b36873231280a07c`.
- Odoo 19 migration validation run: `36116480105` — SUCCESS.
- Source/CI verified:
  - separate production PostgreSQL/Odoo/Nginx/Certbot Compose stack
  - isolated new Odoo-backed frontend Worker; protected V48 project/Worker remains untouched
  - native Odoo initialization and verification of all 13 DTF addons
  - Ubuntu ARM64/aarch64 host preflight
  - production Nginx HTTPS, API, backend and WebSocket routing contracts
  - blocked external Odoo database manager
  - backup with compressed PostgreSQL dump, Odoo filestore archive and SHA-256 checksums
  - fully isolated non-destructive restore drill
  - monitoring, log rotation and host timers
  - production smoke-test contract
  - linux/arm64 image manifest proof for Odoo, PostgreSQL, Nginx and Certbot
  - M9 frontend contract/typecheck/build regression and M2-M8 native Odoo regressions remain green
  - final Odoo/Nginx `/web` runtime check remains green

M10 is **not yet closed** because the following require the separate NEW production host:
- real Ubuntu ARM64 VPS/Oracle provisioning
- real NEW backend domain DNS
- real TLS issuance/renewal
- live isolated frontend Worker deployment against the NEW Odoo HTTPS origin
- live production backup and restore drill
- live monitoring/logging/timer acceptance
- live production smoke tests

No live production deployment or merge has been performed, and the protected external `dtf-studio-v48-safe-frontend` project/deployment remains untouched.


## M10 source/CI baseline refresh — live deployment still pending

- Refreshed M10 go-live preparation HEAD: `dcf7ae2bd7fbc550559cf02bac43cb38d6c0913d`.
- Exact-head Odoo 19 migration validation run: `36129713530` — SUCCESS.
- Added deterministic `M10_GO_LIVE_RUNBOOK.md`.
- Added redacted `collect-production-evidence.sh` runtime evidence collector.
- Added Git exclusion for production evidence output.
- M10 static deployment contracts, production Compose, shell syntax and all ARM64 image proofs: PASS.
- Preserved frontend typecheck/build/M9 compatibility tests and isolated new Worker build/dry-run: PASS.
- M2-M9 native Odoo regressions and final Odoo/Nginx `/web` runtime: PASS.
- Protected external `dtf-studio-v48-safe-frontend` project/folder/Worker/URL remains untouched.

M10 remains **OPEN** until live execution succeeds on the separate NEW Ubuntu ARM64 VPS/new domain, including real TLS, isolated frontend deployment, backup/restore drill, monitoring/timers, production smoke tests and redacted runtime evidence collection.

M11 remains pending. No merge to main is authorized by this source/CI refresh.
