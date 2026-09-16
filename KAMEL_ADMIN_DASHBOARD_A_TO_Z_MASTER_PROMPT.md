# KAMEL — DTF STUDIO FULL ADMIN DASHBOARD A–Z MASTER IMPLEMENTATION PROMPT

## 0. MISSION

Continue the existing DTF Studio project. Do NOT rebuild the app and do NOT restart from an older baseline.

Your task has two phases:
1. Repair and finish the OpenCart-style Admin RBAC work from your last report.
2. Build the COMPLETE DTF Studio Admin Dashboard from A to Z, using OpenCart as the functional/interaction reference while preserving DTF Studio business rules, architecture, data, routes, theme, and existing working functionality.

This is an implementation task, not a design-only report.

## 1. REPOSITORY / SOURCE CONTROL

Repository: shs0088/DTF
Working branch: kamel/admin-rbac-foundation

IMPORTANT:
Your last reported implementation SHA was:
d542319113b00387565b0f5252f023b16fda785e

DO NOT assume that is the current branch HEAD.

Before editing:
- git fetch
- inspect the current remote branch HEAD
- verify the exact current SHA
- read the newest QC/task files from that HEAD
- continue from the current branch only

At the time this task was prepared, the branch HEAD was:
0cc0add7a177db53cbe3f55f5c79623b4ddca4cb

If the branch has advanced, use the newer HEAD and report it.

Do NOT modify main.
Do NOT modify camel-current.
Do NOT deploy.
Do NOT merge.

## 2. READ THESE FILES FIRST — MANDATORY

Read completely before coding:
- 01_To_Do.txt
- 02_Implemented.txt
- 03_Not_Implemented.txt
- 04_Rules.txt
- 05_Checking_List.txt
- 01_DTF_STUDIO_CHANGE_LOG.txt
- KAMEL_RBAC_CORRECTION_TASK.md
- KAMEL_ADMIN_DASHBOARD_A_TO_Z_MASTER_PROMPT.md

Also inspect the actual current code and database schema. Do not implement from memory or from your previous report.

## 3. CORRECTION TO YOUR LAST REPORT

Your last report stated final SHA:
d542319113b00387565b0f5252f023b16fda785e

Independent GitHub verification found that GitHub Actions DID run and DID NOT pass.

Failed run on d542319...:
35069801013

The current QC HEAD also produced failing run:
35070387669

Failure:
npm run typecheck failed in workers/item-store.ts around line 868 with TypeScript syntax errors including TS1005 / TS1011.

Therefore:
- your previous implementation is NOT accepted as PASS;
- build and RBAC tests did not run after the typecheck failure;
- do not continue feature expansion until the branch is green again.

FIRST ACTION:
Fix the TypeScript error and any related RBAC issues, then make CI pass:
- npm install
- npm run typecheck
- npm run build
- bun test workers/admin-rbac.test.ts

Do not claim completion while GitHub Actions is failing.

## 4. OPENCART REFERENCE — FUNCTIONAL, NOT VISUAL/CODE COPY

Use OpenCart 4 administration as the operating reference:
- hierarchical Admin navigation
- Dashboard
- list pages
- filters
- search
- sorting
- pagination
- row selection
- bulk actions
- add/edit forms
- breadcrumbs
- statuses
- clear success/error notices
- User Groups
- Access permissions
- Modify permissions
- permission-aware menus
- server-side authorization

For DTF Studio User Groups:
User → User Group → Resource → Access / Modify

Important OpenCart behavior to preserve functionally:
- Access controls whether a group can see/read a route/module.
- Modify controls mutations.
- If Modify is granted, ensure the resulting policy is usable and consistent with Access; do not create a state where a user can modify an invisible resource.
- groups can be custom;
- assigned groups cannot be unsafely deleted;
- protected system groups remain protected.

Do NOT copy OpenCart's PHP/Twig architecture.
Do NOT replace the DTF Studio visual identity with OpenCart styling.

## 5. DTF STUDIO ADMIN VISUAL SYSTEM

Preserve the approved:
- Black / very dark background
- Electric Blue accents
- DTF Studio branding
- responsive layout
- clean professional Admin UI

Use one coherent Admin shell:
- sidebar
- header/top bar
- breadcrumb
- content container
- page title/actions
- notification/success/error area
- responsive mobile/tablet sidebar behavior

Support Arabic/English and RTL/LTR where applicable to project/Admin content.

## 6. REQUIRED ADMIN NAVIGATION / MODULES

Build and wire these Admin areas end-to-end:

1. Dashboard
2. Orders
3. Manual Review
4. Production Queue
5. Products
6. Printify Catalog / Integration — Admin/internal only
7. Customers
8. Designers
9. Payouts
10. Reports
11. Promotions
12. Settings
13. Integrations
14. Audit Log
15. Users
16. User Groups

Use permission-aware navigation. A user must not see a module without Access permission, and direct URL/API access must still be blocked server-side.

## 7. DASHBOARD

Create a real operational dashboard.

Required:
- total/recent orders
- payment-pending orders
- orders requiring preparation/production
- production queue count
- designer review/qualification alerts
- products / low-stock or inventory attention
- payout/withdrawal attention
- recent Admin activity
- useful date-aware sales/order chart(s)
- recent orders table
- quick links to relevant Admin modules

RULE:
No hard-coded fake KPI values.
If real data is unavailable, show a truthful zero/empty state.

All cards/rows must link to the relevant filtered page when meaningful.

## 8. ORDERS

OpenCart-style order management adapted to DTF Studio.

List:
- Order ID
- customer
- phone/contact where allowed
- date
- total
- payment status
- order/production/fulfillment status
- delivery/pickup
- actions

Features:
- search
- date filter
- customer filter
- payment filter
- status filter
- delivery/pickup filter
- sorting
- pagination
- bulk actions only where safe

Order detail:
- customer/contact
- addresses or pickup selection
- order items
- product/variant/size/color/qty
- design relation
- exact Ready-to-Print Master relation
- print specification
- price snapshot
- payment information
- status/history
- notes
- production jobs
- audit trail where appropriate

Respect DTF Studio order status workflow already defined in project requirements.

Do not allow invalid status transitions.
Mutations require Modify permission and audit entries.

## 9. MANUAL REVIEW

Provide Admin review queues for:
- Designer qualification
- Designer designs requiring review/approval

Designer qualification:
- exactly 3 qualification designs
- system/preflight evidence
- fixed 5-day Admin review workflow
- approve
- reject with reason
- replacement flow
- second rejection/escalation behavior
- notifications
- Authorized status remains Admin-controlled per approved rules

Do not invent manual review where the requirement specifies automatic preflight only.

## 10. PRODUCTION QUEUE / PRINTING OPERATOR

Build the real production queue around order items / printing jobs.

Show:
- order
- customer/contact needed for work
- product/variant
- quantity
- print status
- approved Ready-to-Print Master
- preflight snapshot/result
- print spec
- download action for the correct production/master file
- allowed status updates

CRITICAL:
Never auto-select a Ready-to-Print Master.
Use the explicitly selected and validated master tied to the order item.

Printing Operator default permissions:
- Dashboard access
- Orders access and only required status actions
- Production access/status/download

No:
- Users
- User Groups
- Settings
- pricing edits
- unrelated Admin modules
unless Main Administrator explicitly grants Access/Modify later.

## 11. PRODUCTS / CATALOG

DTF Studio Products page must manage internal product records.

Include:
- site categories
- products/models
- variants
- size/color/options
- product media
- pricing
- stock/tracking
- enabled/disabled
- publish/unpublish
- Print Your Dream eligibility
- designer design compatibility where applicable
- search/filter/sort/pagination
- add/edit forms
- safe delete/disable behavior

Preserve the existing working Printify catalog architecture and current pagination/category behavior unless a correction is specifically required.

Printify remains behind the scenes and must not appear by name to customers.

Do not perform bulk imports or publish products without explicit task authorization.

## 12. CUSTOMERS

Add OpenCart-style customer administration adapted to DTF Studio:
- list/search/filter/pagination
- profile/detail
- status
- contact data
- addresses where stored
- registration date
- order history
- safe Admin actions
- no password exposure

Customer and Admin identities remain separate security domains.

## 13. DESIGNERS

Designer administration:
- list/filter/search
- profile
- qualification status
- Authorized status
- qualification submissions
- designs
- review/rejection reasons
- replacement/escalation state
- order/design activity where relevant
- earnings summary
- payout history

Do not bypass existing designer business rules.

## 14. PAYOUTS / DESIGNER EARNINGS

Build:
- earnings list
- withdrawal requests
- pending/approved/rejected/paid statuses as supported by data model
- filters/date/designer/status
- detail/history
- safe status changes
- audit records

Preserve ledger-like historical integrity.
Do not rewrite past financial history when profile/settings change.

## 15. REPORTS

Create operational reports using real database data:
- sales/orders
- products
- inventory/stock movement
- designers
- production
- payouts/earnings
- promotions where data exists

Use:
- date range
- status
- grouping/filtering where meaningful
- pagination
- totals based on real data
- export-ready architecture

Do not fabricate analytics.

## 16. PROMOTIONS

Implement/manage promotions/coupons if schema/business layer supports them.

At minimum:
- code/name
- type/value
- start/end date
- usage limits
- enabled/disabled
- validation
- audit
- safe create/edit/delete/disable

If existing schema is insufficient, add a minimal compatible schema without damaging unrelated data.

## 17. SETTINGS

Organize settings into clear sections, e.g.:
- Store / business
- Orders
- Payment methods
- Delivery / pickup
- Inventory / reservation
- DTF/preflight
- Designer workflow
- Notifications/content
- Integrations

Use current authoritative project values/rules.
Do not reintroduce obsolete settings from old versions.

Sensitive setting changes require Modify permission and audit logging.

## 18. INTEGRATIONS

Create an Admin integrations status page.

For Printify:
- connection/health state
- catalog snapshot status
- last generated/sync metadata where available
- safe refresh/status actions only if already supported

Never expose:
- API tokens
- secrets
- hashes
- session signing material

Architecture must remain extensible for future providers.

## 19. AUDIT LOG

Create searchable/filterable Admin audit UI backed by audit records.

Show:
- time
- actor
- action
- resource type
- resource ID
- result
- safe metadata

Filters:
- date
- actor
- action
- resource
- result

Do not allow ordinary deletion/editing of audit history.

## 20. USERS / USER GROUPS — MUST FINISH LAST REPORT CORRECTLY

Complete OpenCart-style Admin RBAC.

System groups:
- Main Administrator — protected, full permissions
- Printing Operator — protected, least privilege defaults

Custom groups:
- create
- rename
- enable/disable
- safe delete
- deny delete while assigned
- exactly one group per Admin user

Users:
- create
- enable/disable
- assign/reassign group
- password handled securely
- last Main Administrator protection

User Groups UI:
- resource rows
- Access checkbox
- Modify checkbox
- Access Select All
- Access Clear
- Modify Select All
- Modify Clear

Server authorization:
- current signed session identifies user ID
- current enabled Admin identity is re-read from database
- current group membership/permissions are read from database
- stale cookie role data is never authoritative
- client headers are never authoritative

Reconcile active Worker RBAC and React RBAC so there is one authoritative policy outcome.

## 21. SHARED ADMIN UX REQUIREMENTS

All list pages should use consistent interaction patterns:
- page heading + primary actions
- filter bar
- search
- sorting
- pagination
- empty state
- loading state
- error state
- checkbox selection where useful
- bulk actions only when safe
- confirmation before destructive operations
- success/error notification after mutation
- breadcrumbs
- permission-aware controls

Do not create separate inconsistent mini-sites for each module.

## 22. DATA / SECURITY / BUSINESS INTEGRITY

Mandatory:
- server-side authentication
- server-side authorization
- current DB user/group revalidation
- safe SQL / parameterized operations
- constraints/transactions where required
- no negative stock
- no destructive cascade of protected production/order assets
- immutable historical order snapshots
- protected Ready-to-Print Master references
- audit sensitive changes
- no secrets in client HTML/JS/API payloads/logs
- no privilege escalation via headers/query/body
- disabled Admin loses access
- permission changes take effect from current database state

## 23. PRESERVE EXISTING WORK

Do not intentionally change unrelated:
- storefront
- Home
- Design Gallery
- Print Your Dream customer flow
- cart
- checkout
- customer/designer login
- existing Printify snapshot/catalog behavior
- approved black/electric-blue theme
- bilingual behavior
unless necessary to connect the Admin module correctly.

Do not revert correct existing fixes.

## 24. TESTING

Before saying complete, run and pass GitHub CI:
- dependency install
- npm run typecheck
- npm run build
- bun test workers/admin-rbac.test.ts
- any new Admin tests you add

Add meaningful tests, not placeholder assertions.

Authorization matrix must cover:
- unauthenticated protected page
- unauthenticated protected API
- restricted direct URL
- restricted direct API
- fake role/group/permission header
- view-only user attempting mutation
- Printing Operator attempting Users/User Groups/Settings
- disabled Admin
- group reassignment takes effect
- permission update takes effect
- self-escalation attempt
- last Main Administrator disable attempt
- last Main Administrator reassignment/demotion attempt
- custom-group Access/Modify behavior

Also test critical business flows:
- order → master → production job
- production operator visibility/actions
- designer review/qualification
- product/variant/stock
- settings mutation
- payout status mutation
- audit log creation

## 25. WORK METHOD

Work in controlled commits.
After each meaningful group of changes:
- run typecheck/tests locally if possible
- push to kamel/admin-rbac-foundation
- inspect GitHub Actions
- if CI fails, fix before moving on

Do not accumulate dozens of unrelated failures and then report partial completion.

Keep QC files updated continuously:
- 01_To_Do.txt
- 02_Implemented.txt
- 03_Not_Implemented.txt
- 04_Rules.txt
- 05_Checking_List.txt
- 01_DTF_STUDIO_CHANGE_LOG.txt

Only mark something Implemented after code + validation evidence.

## 26. COMPLETION GATE

Do NOT deploy.
Do NOT merge.
Do NOT modify main/camel-current.

Stop only when:
- current branch code is green in GitHub Actions
- Admin modules are implemented to the available backend/schema
- RBAC Access/Modify is enforced server-side
- Admin navigation is permission-aware
- no fake dashboard operational data exists
- tests are meaningful and passing
- remaining runtime-only checks are explicitly listed

## 27. FINAL REPORT FORMAT

Return exactly these sections:

CURRENT START SHA
FINAL SHA
COMMITS CREATED
FILES CHANGED
DATABASE / SCHEMA CHANGES
ADMIN MODULES COMPLETED
OPENCART-STYLE BEHAVIOR COMPLETED
RBAC ACCESS/MODIFY STATUS
PRINTING OPERATOR STATUS
DASHBOARD DATA SOURCES
ORDERS / PRODUCTION STATUS
PRODUCTS / PRINTIFY STATUS
CUSTOMERS / DESIGNERS STATUS
PAYOUTS / REPORTS / PROMOTIONS STATUS
SETTINGS / INTEGRATIONS / AUDIT STATUS
SECURITY CHANGES
TESTS ADDED
GITHUB ACTIONS RUN ID
GITHUB ACTIONS RESULT
RUNTIME AUTHORIZATION MATRIX
REGRESSIONS FOUND / FIXED
QC FILES UPDATED
PARTIALLY COMPLETED
FAILED
NOT IMPLEMENTED
DEPLOYMENT: NO
MERGE: NO

Do not claim PASS without a successful GitHub Actions run ID and result.
