# GitHub QC Plan

## Baseline
Repository: `shs0088/DTF`
Migration preparation base: `camel-current`
Base SHA: `329e046e4391c560ae98a3ffc16737cbfad98d8b`

Never modify `main` or `camel-current` during migration preparation.

## Required checks
1. Existing frontend dependency install/typecheck/build/tests.
2. Python syntax/static checks.
3. XML well-formedness.
4. Odoo manifest/module dependency validation.
5. PostgreSQL/Odoo service startup.
6. Install/update every `dtf_*` addon in dependency order.
7. Odoo module tests.
8. API contract tests against preserved frontend expectations.
9. Security/RBAC matrix.
10. Core flow: product/design/master -> cart -> checkout -> order -> production -> earning.
11. Printify tests with mocked/non-secret fixtures.
12. ARM64/aarch64 deployment evidence.
13. Secret scan.
14. Backup + restore drill where environment permits.

## Final acceptance report
Must include branch, start/final SHA, commits/files, schema changes, tests and exact GitHub Actions IDs/results, failures fixed, runtime-only gaps, and explicit deployment/merge status.


## Verified milestone evidence — 2026-09-23

M1 final verified runtime workflow:
- Run 35917170754 — SUCCESS.

M2 verified workflow before documentation-only status commit:
- Run 35919531989 — SUCCESS.
- All 13 DTF addons installed on Odoo 19.
- M2 Odoo tests executed with 0 failed / 0 errors.
- PostgreSQL + Odoo + Nginx runtime validation passed.

A documentation-only final-head workflow must also remain green before the branch is treated as the closed M2 handoff.


M3 verified implementation workflow:
- Run 35923917690 — SUCCESS.
- M1 static + Compose + ARM64 manifest checks passed.
- PostgreSQL startup and all 13 addon installation passed.
- M2 tests passed.
- M3 catalog/Printify tests passed.
- Odoo/Nginx runtime /web verification passed.


## M4 validation correction record — 2026-09-23

Failed run: **35925594079** at HEAD `282c3c233a92c2df78a32b4924b0a1562a615bf0`. M1 static validation, PostgreSQL startup, and installation of all 13 addons passed. M2 failed; M3, M4, and runtime were skipped.

Exact corrections on the continuation head:
- Replaced the zero-argument JSON default lambda with an Odoo-compatible callable accepting the recordset argument.
- Made latest preflight selection a deterministic database query ordered by `evaluated_at desc, id desc`; invalidated the computed field cache after create/write/unlink and immediately before publishing. A newer rejected result therefore overrides an older accepted result.
- Added native `dtf.product.printable.area` links to versioned rules and evaluation against active area dimensions.
- Replaced deprecated `imghdr` detection with explicit PNG/JPEG/WEBP/PDF signatures plus SVG detection.
- Added honest analyzer capability/status fields for values unavailable without a metadata parser.
- Extended focused M4 tests for result ordering and printable-area rejection.

Final successful Actions run ID, final HEAD, and exact M4 counts/results will be added only after the complete final-head workflow succeeds. M5 and M6 remain intentionally deferred.
