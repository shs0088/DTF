# M2 — Core Models & Security Implementation Report

## Scope

M2 uses the native Odoo 19 PostgreSQL database as the single target database.
No parallel standalone DTF database was introduced.

Implemented on branch:
`odoo19/headless-backend-migration-prep`

M2 start HEAD:
`49f31823d4119e73be9d45ce17c0ac0045e8e4ef`

## Native Odoo reused

- `res.partner` for customer/contact identity.
- `res.users` for login identity.
- `res.groups`, `res.groups.privilege`, ACLs and record rules for authorization.
- `ir.attachment` / Odoo filestore for design asset binary storage.
- PostgreSQL as the single source-of-truth database.

## Custom DTF models added

### dtf_designer

- `dtf.designer.profile`
- Odoo contact/user linkage.
- Unique partner and user constraints.
- Qualification state foundation.
- Five-day review deadline fields.
- Rejection count/reason/replacement deadline.
- Admin-only authorization action.

### dtf_design

- `dtf.design`
- `dtf.design.asset`
- Mandatory publishing checks for:
  - Arabic Title
  - English Title
  - Arabic Description
  - English Description
- Exactly seven product combinations.
- Main Display Image relationship.
- Explicit Ready-to-Print Master relationship.
- Ready-to-Print Master is never auto-selected.
- Main Display Image may auto-select a suitable recent previewable image.
- Qualification samples cannot use Main Display Image or Ready-to-Print Master and cannot publish.
- Exactly three qualification designs required on qualification submission.
- Assets use Odoo `ir.attachment` instead of a separate database/storage system.

### dtf_preflight

- `dtf.preflight.rule.version`
- `dtf.preflight.result`
- Version/product-type rule identity.
- Preflight result history.
- Accepted/pending/rejected state.
- Locked historical result immutability.
- Designer read-only ownership-scoped preflight access.
- Admin management access.
- Full analyzer/business criteria remain M4 work.

## Security implemented

Odoo 19-native group privileges:

- DTF Designer
- DTF Printing Operator
- DTF Administrator

Record rules:

- Designer can access only own designer profile.
- Designer can access only own designs/assets.
- Designer can read only own preflight results.
- DTF Administrator can access all M2 DTF records.
- Printing Operator receives no M2 designer/design management access; production access is intentionally deferred to M6.

## Odoo 19 compatibility correction

During CI, Odoo 19 rejected the historical `res.groups.category_id` field.
M2 was corrected to use Odoo 19 `res.groups.privilege` + `privilege_id`, which is the current native group hierarchy.

## CI evidence

GitHub Actions run:
`35919531989`

Result:
`SUCCESS`

Verified in the successful run:

- Static Python/manifests/XML/security validation: PASS.
- PostgreSQL startup: PASS.
- Installation of all 13 DTF addons in Odoo 19: PASS.
- M2 Odoo test suite: PASS.
- Odoo test result: 0 failed, 0 errors.
- Odoo/Nginx /web runtime verification: PASS.

M2 tests covered:

- Designer ownership record rule.
- Exactly three qualification designs.
- Qualification designs cannot publish/use master.
- Ready-to-Print Master is never auto-selected.
- Master must belong to the same design.
- Publishing blocked until master preflight is accepted.
- Locked preflight evidence is immutable.
- Exact seven product combinations.

## Not part of M2

Deferred to later milestones:

- Full file analyzer and product-specific preflight engine: M4.
- Protected order/production deletion rules: M4/M6.
- Catalog/Printify mapping: M3.
- Cart/checkout/order/stock migration: M5.
- Printing operator production permissions: M6.
- Finance: M7.
- Full Admin UI/theme/bilingual backend: M8.
- Frontend API cutover: M9.

## Deployment status

- Production deployment: NO.
- Merge to main: NO.
- Frontend files changed: NO.
- Old backend removed: NO.
