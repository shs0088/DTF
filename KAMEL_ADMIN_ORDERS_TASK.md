# KAMEL — ADMIN ORDERS IMPLEMENTATION TASK

TASK STATUS: READY
BRANCH: kamel/admin-rbac-foundation
REQUIRED STARTING HEAD: 6476c54204f3168a55d76e450e6d431ac20ff1db

## Mandatory pre-flight

Before any source edit:

1. Fetch GitHub.
2. Verify branch is exactly `kamel/admin-rbac-foundation`.
3. Verify current GitHub HEAD is exactly the REQUIRED STARTING HEAD above, or a later verified descendant created by KAMEL from this task.
4. Read:
   - AGENTS.md
   - 00_DTF_STUDIO_PROTECTED_PASS_BASELINE.txt
   - 01_To_Do.txt
   - 03_Not_Implemented.txt
   - 04_Rules.txt
   - 05_Checking_List.txt
5. Preserve all protected PASS items and unrelated storefront/customer/designer/Printify/cart/stock flows.
6. Do not deploy, merge, or modify main.

## Functional reference

Implement the DTF Studio Orders Admin using the current OpenCart Administration operating pattern as the functional reference, adapted to DTF Studio business rules and Black + Electric Blue Admin UI.

The required operating pattern includes:

- database-backed order list;
- search/filter;
- sortable columns;
- numbered pagination;
- order detail;
- status/history;
- clear view action;
- permission-aware Access and Modify behavior.

Do not copy OpenCart technology or visual theme.

## DTF Studio Orders requirements

Implement:

1. Orders list using real database records only.
2. Search by:
   - order ID
   - customer name
   - email
   - phone
3. Filters:
   - order status
   - payment status
   - fulfillment mode
   - date from
   - date to
4. Sort:
   - date
   - order ID
   - customer
   - status
   - payment
   - total
5. Numbered pagination.
6. Order detail must show:
   - customer/contact;
   - payment;
   - fulfillment;
   - items;
   - quantities;
   - product/variant;
   - design;
   - exact Ready-to-Print Master reference;
   - printing-job reference/status when present;
   - status/history;
   - internal Admin notes.
7. Server-side authorization:
   - GET/list/detail requires `admin.orders` Access.
   - mutations require `admin.orders` Modify.
8. Never rely on hidden UI for security.
9. Printing Operator retains the approved least-privilege Orders capability.
10. Every status change and internal note must be audit logged.

## Authoritative DTF Studio status workflow

Canonical statuses:

- new
- payment_pending
- payment_confirmed
- under_preparation
- ready_for_delivery
- given_to_delivery
- under_delivery
- ready_for_pickup
- completed
- cancelled

Allowed transitions:

- new → payment_pending | payment_confirmed | cancelled
- payment_pending → payment_confirmed | cancelled
- payment_confirmed → under_preparation | cancelled
- under_preparation → ready_for_delivery | ready_for_pickup | cancelled
- ready_for_delivery → given_to_delivery | cancelled
- given_to_delivery → under_delivery
- under_delivery → completed
- ready_for_pickup → completed
- completed → no forward transition
- cancelled → no forward transition

When moving to `payment_confirmed`, synchronize the order payment status to confirmed.

Reject invalid transitions server-side.

## History

Persist order status/note history with:

- order
- event type
- from status
- to status
- payment status
- internal comment
- Admin actor
- timestamp

Orders are historical business records. Do not add bulk-delete behavior.

## Validation

After implementation:

1. npm run typecheck
2. npm run build
3. bun test workers/admin-rbac.test.ts
4. Add/run Orders-specific tests.
5. Fix failures and rerun until PASS.
6. Update QC records in a separate documentation-only commit.
7. Report:
   - starting SHA
   - final source SHA
   - final QC SHA
   - GitHub Actions run ID/result
   - files changed
   - tests
   - pending runtime blockers

## Runtime verification still required

Do not claim final acceptance without later runtime evidence for:

- direct Access-only API/page behavior;
- Modify denial;
- status mutation;
- note persistence;
- audit persistence;
- exact Ready-to-Print Master relationship;
- printing-job relationship.

Continue to Production Queue after Orders source + CI completes, according to AGENTS.md continue-until-complete directive.
