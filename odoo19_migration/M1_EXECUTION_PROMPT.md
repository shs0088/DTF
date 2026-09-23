# CAMEL — M1 ODOO 19 PORTABLE FOUNDATION EXECUTION

Work directly on the existing GitHub project. Do not create another Camel project and do not start Investigation/Research mode.

Repository:
https://github.com/shs0088/DTF

Required branch:
odoo19/headless-backend-migration-prep

Before editing:
1. Fetch the current remote branch.
2. Verify the exact current HEAD.
3. Read `odoo19_migration/00_MIGRATION_AUTHORITY.md` completely.
4. Read the migration requirements/milestones/QC files.
5. Read `AGENTS.md` for protected-PASS/regression rules, but follow `00_MIGRATION_AUTHORITY.md` for migration branch selection and migration-specific conflicts.

Do not modify:
- main
- camel-current
- kamel/admin-rbac-foundation

Do not deploy.
Do not merge.
Do not redesign the DTF customer/designer frontend.
Do not remove the old backend.

## M1 mission

Implement the portable Odoo 19 Community foundation only, so later milestones can build DTF-specific models safely.

Create/complete a portable structure under `odoo19_migration/` for:

- Odoo 19 Community
- PostgreSQL 16
- Nginx reverse proxy
- custom addons path
- persistent Odoo filestore
- persistent PostgreSQL data
- Ubuntu 24.04 ARM64/aarch64 target
- Oracle OCI Ampere A1 compatible but not Oracle-locked
- no public PostgreSQL port
- environment example with no real secrets
- backup script
- restore procedure/script
- health-check script
- install/start/stop/update documentation
- addon dependency/install-order documentation
- Git ignore rules for generated secrets/backups where needed

## Required addon skeletons

Create clean installable skeletons, without inventing business logic yet, for:

- dtf_core
- dtf_designer
- dtf_design
- dtf_preflight
- dtf_customizer
- dtf_sale
- dtf_production
- dtf_finance
- dtf_printify
- dtf_notifications
- dtf_admin
- dtf_backend_theme
- dtf_api

Each addon skeleton must have correct Odoo 19 module structure and manifest/dependency direction. Keep `dtf_api` existing starter functionality but normalize it into the dependency plan instead of deleting/replacing it.

## CI / validation

Add a dedicated GitHub workflow for Odoo migration source validation that can run without production secrets.

At minimum validate:
- Python syntax
- XML well-formedness
- manifest parsing
- duplicate addon technical names
- declared local addon dependencies exist
- forbidden secret patterns / committed .env detection
- Docker Compose syntax if available in CI
- no PostgreSQL host port exposure
- no Odoo core source modification inside this migration package
- expected 13 addon directories exist

If a real Odoo runtime can be started safely in the available environment, also validate module discovery/installability. If it cannot, state that clearly and do not claim runtime PASS.

## ARM64

Validate/document that every selected container image/dependency is intended to support ARM64/aarch64. Do not claim runtime ARM64 PASS without actual runtime evidence.

## Git workflow

Make controlled commits to:
`odoo19/headless-backend-migration-prep`

After each meaningful batch:
- verify changed paths;
- ensure no existing frontend/Worker source outside the migration scope changed unintentionally;
- run available validation;
- fix failures before continuing.

Push commits to the same migration branch.

## Completion report

Return:

START HEAD
FINAL HEAD
COMMITS CREATED
FILES ADDED
FILES MODIFIED
ADDON SKELETONS CREATED
DOCKER/POSTGRES/NGINX STATUS
BACKUP/RESTORE STATUS
CI WORKFLOW ADDED
VALIDATION COMMANDS
VALIDATION RESULTS
ARM64 STATUS
ODOO RUNTIME TEST STATUS
BLOCKERS
REGRESSIONS FOUND
FRONTEND FILES CHANGED: YES/NO
OLD BACKEND FILES CHANGED: YES/NO
DEPLOYED: NO
MERGED: NO
INVESTIGATION MODE USED: NO

Do not proceed into M2 business models in this task.
Stop after M1 is complete and pushed so GitHub can be independently inspected.
