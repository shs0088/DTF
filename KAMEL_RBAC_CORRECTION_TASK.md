# KAMEL — OPENCART RBAC CORRECTION TASK

SOURCE BRANCH: kamel/admin-rbac-foundation
EXPECTED START SHA: d542319113b00387565b0f5252f023b16fda785e

Read the updated QC records first:
- 01_To_Do.txt
- 02_Implemented.txt
- 03_Not_Implemented.txt
- 04_Rules.txt
- 05_Checking_List.txt
- 01_DTF_STUDIO_CHANGE_LOG.txt

## Mandatory corrections

1. Fix the TypeScript syntax error around `adminGroupPermissions` / `setAdminGroupPermissions` in `workers/item-store.ts`.
2. Preserve the OpenCart-style functional model:
   User → User Group → Resource → Access / Modify.
3. Complete active Worker enforcement. Reads/pages require Access; mutations require Modify.
4. Replace ordinary hard-coded `identity.role === "main_admin"` resource gates with current database-backed group permission checks, except where the requirement intentionally reserves a management operation to the protected Main Administrator.
5. Complete Users UI for exactly-one-group assignment/reassignment.
6. Complete User Groups UI with:
   - custom group create/rename/enable-disable/delete
   - resource permission rows
   - Access checkbox
   - Modify checkbox
   - Access Select All / Clear
   - Modify Select All / Clear
7. Reconcile Worker and React RBAC paths so both resolve current enabled Admin identity and current database User Group permissions.
8. Keep Main Administrator and Printing Operator as protected system groups.
9. Preserve last-enabled-Main-Administrator protections.
10. Preserve all unrelated application behavior. No deploy, no merge to main.

## Required validation

Run GitHub CI and do not stop until all of these pass:
- npm install
- npm run typecheck
- npm run build
- bun test workers/admin-rbac.test.ts

Then report:
- starting SHA
- final SHA
- exact files changed
- CI run ID
- CI result
- Access/Modify enforcement summary
- UI completion summary
- remaining live-runtime matrix items

Do not claim PASS if GitHub Actions is failing or unavailable.
