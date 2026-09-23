# DTF Studio — Odoo 19 Community Migration Pack

This branch is a preparation branch only. It starts from `camel-current` at `329e046e4391c560ae98a3ffc16737cbfad98d8b`.

## Decision
Preserve the approved DTF Studio customer-facing frontend and public URLs. Replace the custom commerce/business backend progressively with self-hosted Odoo 19 Community + PostgreSQL and DTF-specific custom addons.

Do not rebuild the customer site from a generic Odoo website. Do not modify Odoo core. Do not deploy or merge from this preparation branch without explicit approval.

## Target topology
- Existing React/React-Router frontend: visual/customer contract.
- Odoo 19 Community: source of truth for customers, products, variants, sales/orders, stock, invoicing and MRP where appropriate.
- Custom Odoo addons: designers, qualification, designs/assets, preflight, Ready-to-Print Master, production/operator, finance, Printify, DTF admin/theme/API.
- Custom versioned Odoo JSON controllers: compatibility layer for the preserved frontend.
- PostgreSQL: private, not exposed publicly.
- Nginx: single-domain reverse proxy.
- Ubuntu 24.04 ARM64/aarch64 target, portable to Oracle OCI Ampere A1 or another Linux cloud.

Read:
1. ARCHITECTURE.md
2. REQUIREMENTS_A_TO_Z.md
3. CAMEL_MASTER_PROMPT.md
4. deployment/
5. odoo/custom_addons/dtf_api/
