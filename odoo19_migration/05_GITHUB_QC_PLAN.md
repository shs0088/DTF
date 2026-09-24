# GitHub QC Plan

## Baseline
Repository: `shs0088/DTF`  
Migration preparation base: `camel-current`  
Base SHA: `329e046e4391c560ae98a3ffc16737cbfad98d8b`

Never modify `main` or `camel-current` during migration preparation.

## Required checks

1. Existing frontend dependency install/typecheck/build/tests where frontend scope is changed.
2. Python syntax/static checks.
3. XML well-formedness.
4. Odoo manifest/module dependency validation.
5. PostgreSQL/Odoo service startup.
6. Install/update every `dtf_*` addon in dependency order.
7. Odoo module tests.
8. API contract tests against preserved frontend expectations.
9. Security/RBAC matrix.
10. Core flow coverage appropriate to the active milestone.
11. Printify tests with mocked/non-secret fixtures.
12. ARM64/aarch64 image/deployment evidence.
13. Secret scan where applicable.
14. Backup + restore drill where environment permits.

## Verified milestone evidence

- M1 runtime: run `35917170754` — SUCCESS.
- M2 runtime: run `35919531989` — SUCCESS.
- M3 implementation: run `35923917690` — SUCCESS.
- M4 final closure:
  - HEAD `105b9b5bece9625c4ce89d331384b674fc3c3eaa`
  - run `35932177544` — SUCCESS.

## M5 native-reconciliation QC

Authoritative rules:

- no custom timed reservation object remains
- native Odoo `request.cart` / `website._create_cart()` is used
- cart mutations delegate to native sale-order cart methods
- native sale states and computed prices/taxes/totals remain authoritative
- native `product.public.category`, translations, `public_categ_ids`, `is_published`, and website sale domain remain authoritative
- DTF sale-line evidence/snapshots remain intact
- premature production/MRP handoff is deferred to M6
- routes that need website context use `website=True`
- JSON-RPC cart/checkout behavior is tested through real authenticated HTTP requests

### Failure/correction evidence

During the correction pass, intermediate runs exposed and corrected:

- stale test/import references after removing deferred production code
- invalid top-level stale test content
- duplicate/inactive-language translation handling issues
- brittle decorator-metadata route assertions
- missing website request context on custom product/cart/checkout routes

The last concrete runtime failure before closure was run `35970327139`, where M1–M4 passed and M5 failed because `request.website` was unavailable on routes not declared with `website=True`.

### Successful correction evidence

Code-verified HEAD: `be298dad8312120593065939aa3a3903559073fe`.

GitHub Actions run `35975667331` — **SUCCESS**.

Verified:

- M1 static validation: PASS
- Docker Compose: PASS
- ARM64 manifest probe: PASS
- PostgreSQL: PASS
- all 13 DTF addons: PASS
- M2: PASS
- M3: PASS
- M4: PASS
- M5 native sales/API tests: PASS
- authenticated JSON-RPC cart/checkout runtime: PASS
- website-aware product API test: PASS
- Odoo/Nginx `/web`: PASS

## Final acceptance report requirement

Any later final milestone closure must include branch, start/final SHA, commits/files, schema changes, exact GitHub Actions IDs/results, failures fixed, remaining gaps, and explicit deployment/merge status.

M6 started: **NO**.  
Deployment: **NO**.  
Merge: **NO**.
