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
- M4 closure:
  - HEAD `105b9b5bece9625c4ce89d331384b674fc3c3eaa`
  - run `35932177544` — SUCCESS.
- M5 native reconciliation:
  - HEAD `be298dad8312120593065939aa3a3903559073fe`
  - run `35975667331` — SUCCESS.

## M6 Production / Printing Operator QC

Authoritative architecture:

- native `mrp.production` is used for DTF printing jobs
- no standalone `dtf.production.handoff` model
- a DTF production job references the exact native sale-order line, design, Ready-to-Print Master, attachment and accepted preflight
- M5 customer/product/preflight snapshots are preserved into production evidence
- one primary DTF printing job per sale-order line
- operator sees only DTF printing jobs through the DTF production rule
- operator may update only DTF production stage
- operator cannot create/delete jobs or alter protected evidence
- DTF Admin creation remains explicitly gated
- controlled elevation is limited to the native MRP creation chain instead of broadening DTF Admin to Manufacturing/User
- production-linked master/design/attachment/order-item evidence is protected against destructive deletion/change

### M6 failures/corrections

1. Run `35979563704` — FAILURE
   - native `mrp.production` creation reached internal `mrp.production.group` ACL
   - correction preserved least privilege and used controlled elevation after DTF-admin authorization

2. Run `35981402285` — FAILURE
   - native MRP creation was fixed
   - one operator test failed because immutable-evidence `ValidationError` fired before intended operator `AccessError`
   - correction moved operator authorization guard ahead of generic evidence immutability

### M6 successful code validation

Code-verified HEAD: `6e369702bc2454628ec4c4d6eba33976d418d126`

Run `35982089855` — **SUCCESS**

Verified:

- M1 static validation: PASS
- Docker Compose: PASS
- ARM64 manifest probe: PASS
- PostgreSQL: PASS
- all 13 DTF addons install: PASS
- M2: PASS
- M3: PASS
- M4: PASS
- M5: PASS
- M6 production/operator: PASS
- Odoo/Nginx `/web`: PASS

### M6 final visual-QA closure

Final functional/visual HEAD:
`4e1ef2fba65298ae5ea92551d911c972a09f9e7b`

Final evidence:
- M6 visual QA run `35996354715` — **SUCCESS**
- Full Odoo migration validation run `35996355139` — **SUCCESS**
- exact same HEAD for both runs
- DTF Administrator login/list/form/protected evidence: PASS
- Printing Operator login/list/form and DTF-only isolation: PASS
- New -> Under Preparation -> Ready for Delivery/Pickup -> Completed: PASS
- New -> Cancelled: PASS
- completed-state reversal protection: PASS
- explicit Ready-to-Print Master download: PASS for Admin and Operator
- downloaded filename: `m6-visual-master.png`
- downloaded size: 68 bytes for both actors
- SHA-256: `431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460`
- PNG signature: PASS
- desktop/tablet/mobile: PASS
- horizontal overflow: NONE
- actionable M6 console errors: NONE
- actionable M6 network errors: NONE
- page errors: NONE

Non-M6 QA-environment warnings:
- generic Odoo website-logo/filestore requests can emit 500 in the ephemeral test database
- realtime websocket can be unavailable in the single-process QA runtime
- neither warning affected the DTF Operations production/operator flow and neither was accepted as evidence for a DTF M6 failure

M6 status: **COMPLETE + CI VERIFIED + VISUAL QA VERIFIED**.

## Final acceptance report requirement

Any later milestone closure must include branch, start/final SHA, commits/files, schema changes, exact GitHub Actions IDs/results, failures fixed, remaining gaps, and explicit deployment/merge status.

M7 started: **NO**.  
Deployment: **NO**.  
Merge: **NO**.
