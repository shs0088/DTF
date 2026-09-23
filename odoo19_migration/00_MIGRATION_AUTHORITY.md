# DTF Studio — Odoo 19 Migration Authority

This file is authoritative for the Odoo 19 migration branch and supersedes historical branch-selection instructions found in older project-control documents.

## Active migration branch

- Repository: `shs0088/DTF`
- Active migration branch: `odoo19/headless-backend-migration-prep`
- Do not switch to or modify `main`, `camel-current`, or `kamel/admin-rbac-foundation` during this migration unless the user explicitly authorizes it.

Historical references to those branches remain useful evidence/history, but they are not the active working-branch rule for this migration.

## Protected work

Keep all protected-PASS, regression-prevention, evidence, testing, security, no-deploy, and no-merge governance from `AGENTS.md`.
Do not redesign or discard verified working customer/designer behavior just because the backend is changing.

## Frontend authority

The existing DTF Studio customer/designer visual experience is preserved.

Important source distinction:
- `workers/app.ts` currently serves the V48 synchronized public HTML for non-API UI requests.
- React/React-Router source also exists and contains richer screen/component implementations.

Do not assume one tree is the live customer runtime merely from directory naming. Before any frontend cutover, prove which path is active in the target runtime and create a route-by-route mapping. Do not delete either representation until parity and rollback evidence exist.

## Backend target

Progressively replace the custom business/data backend with:
- Odoo 19 Community
- PostgreSQL
- custom DTF Studio Odoo addons
- versioned `/api/dtf/v1` compatibility API

Do not modify Odoo core.

## Ready-to-Print Master rule

The current authoritative rule is NOT PNG-only.

A Ready-to-Print Master:
- is selected explicitly by the designer;
- is never auto-selected;
- must be supported, readable, analyzable, and pass the applicable versioned product preflight;
- may be a supported non-PNG format where the rule engine permits it.

Do not port the legacy PNG-only logic in `src/utils/preflight.ts` as the authoritative Odoo rule.

## Reservation rule

The current repository rule records state that 15 minutes is stale and fails the authoritative requirement.
For this migration, use **30 minutes** unless a later explicit user-approved requirement supersedes it.

Do not silently copy an older 15-minute configuration.

## Runtime evidence rule

Camel may edit and validate source, but do not claim Odoo runtime success unless Odoo 19 + PostgreSQL actually start and the relevant modules/tests execute in a compatible runtime.

If the Camel project runtime cannot run Docker/Odoo/PostgreSQL:
- complete all source/static work that is possible;
- add GitHub CI checks that are possible;
- record the exact runtime blocker;
- do not fabricate runtime evidence;
- continue all other unblocked work.

## Deployment

No public deployment.
No production cutover.
No merge to main.
No deletion of the old backend.
No removal of rollback paths until acceptance is complete.
