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
