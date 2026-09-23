# CAMEL MASTER PROMPT — DTF STUDIO BACKEND MIGRATION TO ODOO 19 COMMUNITY

Continue the existing DTF Studio project. DO NOT rebuild the customer frontend and DO NOT replace it with a generic Odoo website.

## Mandatory inspection first
Read completely:
- 01_To_Do.txt
- 02_Implemented.txt
- 03_Not_Implemented.txt
- 04_Rules.txt
- 05_Checking_List.txt
- 01_DTF_STUDIO_CHANGE_LOG.txt
- 06_Theme_Design_Specification_UPDATED.txt
- odoo19_migration/ARCHITECTURE.md
- odoo19_migration/REQUIREMENTS_A_TO_Z.md
Inspect actual current code, routes, APIs and data layer.

## Source control
Work only on a dedicated Odoo migration branch. Do not modify main or camel-current. Do not deploy publicly. Do not merge without explicit approval.

## Architecture
- Preserve the existing DTF React frontend and public URLs.
- Odoo 19 Community + PostgreSQL become the backend/ERP/source of truth.
- Implement DTF-specific behavior only in custom addons; never modify Odoo core.
- Build a versioned `dtf_api` controller layer under `/api/dtf/v1` so existing frontend pages can migrate without a visual rewrite.
- Reuse native Odoo contacts, products/variants, sales/orders, stock, invoicing, delivery and MRP wherever appropriate.
- Odoo admin/backend should be customized to DTF Studio Black + Electric Blue and bilingual requirements; public customer frontend remains the existing frontend.

## Required custom modules
dtf_core, dtf_designer, dtf_design, dtf_preflight, dtf_customizer, dtf_sale, dtf_production, dtf_finance, dtf_printify, dtf_notifications, dtf_admin, dtf_backend_theme, dtf_api.

## Implement A-to-Z
Implement all requirements in REQUIREMENTS_A_TO_Z.md, including:
- designer qualification
- bilingual design fields
- exactly seven product combinations
- upload/preview/delete and protected delete
- Main Display Image rules
- explicit Ready-to-Print Master only
- analyzer/preflight and versioned rules
- publishing gate
- customer paths
- cart/checkout/stock/reservation
- orders and production
- Printing Operator least privilege
- designer finance
- Printify hidden/internal integration
- admin/RBAC/audit
- Arabic/English RTL/LTR
- backup/restore and portable deployment

## Frontend compatibility
Create an inventory and mapping table for every current public route/API. Preserve customer routes. Replace backend calls behind the pages. Do not redesign Home, Products, Gallery, Print Your Dream, Cart, Checkout, Designer pages or other working frontend solely for migration.

## Printify
Server-side only. Keep secret credentials out of Git/client/logs. Implement catalog snapshot/import mapping, health/status, idempotency and controlled refresh. Do not expose Printify branding to customers.

## Deployment target
Ubuntu 24.04 ARM64/aarch64, Oracle OCI Ampere A1 compatible but portable to other Linux clouds. Provide Docker Compose and documented native deployment. Nginx reverse proxy. PostgreSQL 5432 must not be publicly exposed.

## Testing
Before claiming complete:
- existing frontend dependency install/typecheck/build/tests
- Python syntax and XML checks
- all Odoo custom addons install/update cleanly
- Odoo tests
- API contract tests
- RBAC/security matrix
- core flow: product/design/master -> cart -> checkout -> order -> production -> earning
- Printify tests with mocked/non-secret fixtures
- ARM64 deployment validation
- secret scan
- backup/restore evidence where environment permits
- GitHub Actions green

A failed test becomes the next task. Never claim PASS without evidence.

## Final report
CURRENT START SHA
FINAL SHA
COMMITS CREATED
FILES CHANGED
ODOO MODULES CREATED
NATIVE ODOO FEATURES REUSED
FRONTEND ROUTES PRESERVED
API ENDPOINT MAPPING
DATA MIGRATION STATUS
PRINTIFY STATUS
PREFLIGHT / MASTER STATUS
ORDERS / STOCK / CHECKOUT STATUS
PRODUCTION / OPERATOR STATUS
FINANCE STATUS
ADMIN / RBAC STATUS
ARABIC / ENGLISH / RTL STATUS
SECURITY STATUS
DEPLOYMENT / ARM64 STATUS
BACKUP / RESTORE STATUS
TESTS RUN
GITHUB ACTIONS RUN IDS / RESULTS
REGRESSIONS FOUND / FIXED
QC RECORDS UPDATED
PARTIALLY COMPLETED
FAILED
NOT IMPLEMENTED
DEPLOYMENT: NO
MERGE: NO
