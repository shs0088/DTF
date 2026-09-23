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
