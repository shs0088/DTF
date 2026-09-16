# COMMAND

TASK_ID: ADMIN-OPENCART-RBAC-IMPLEMENTATION-001
STATE: READY

Repository:
shs0088/DTF

Work branch:
kamel/admin-rbac-foundation

Required starting SHA:
0f8e04a6dc0b2c0555c47510859326c05e18114c

First read and obey these updated QC/requirement files on the work branch:
- 01_To_Do.txt
- 02_Implemented.txt
- 03_Not_Implemented.txt
- 04_Rules.txt
- 05_Checking_List.txt
- 01_DTF_STUDIO_CHANGE_LOG.txt

PRIMARY REQUIREMENT:
Convert the current Admin RBAC foundation to OpenCart-style functional behavior:

User → User Group → Permissions

Each Admin User must belong to exactly one Admin User Group.

Each User Group must have two independent permission sets per Admin resource:
- Access
- Modify

Required behavior:
1. Preserve protected Main Administrator and Printing Operator system groups.
2. Main Administrator = full Access + Modify.
3. Last enabled Main Administrator cannot be disabled, demoted, moved out, or deleted.
4. Printing Operator default = least privilege: Dashboard, Orders, Production only.
5. Support custom User Group create/edit/enable-disable/safe delete.
6. Block deletion of protected system groups.
7. Block deletion of custom groups while users remain assigned unless safely reassigned.
8. Admin Users can be assigned/moved to exactly one User Group.
9. User Groups UI must provide OpenCart-style Access/Modify permission matrix.
10. Access controls navigation/page/direct URL/API read access.
11. Modify controls POST/PATCH/PUT/DELETE and all mutating actions.
12. Menu visibility follows Access permission, but server-side authorization is authoritative.
13. Permission checks must use current database identity/group state, not client headers or stale cookie role claims.
14. Reconcile duplicate Worker/React RBAC authorization so both use the same authoritative database-backed permission resolver.
15. Audit all user/group/permission changes.
16. Preserve existing Printify/customer/designer/cart/stock/order/checkout behavior.
17. Add runnable CI tests for RBAC and execute them.
18. Execute as much of the authorization matrix as the environment supports:
    - direct restricted API
    - direct protected URL
    - fake-header escalation
    - view-only mutation attempt
    - Printing Operator Users/User Groups attempt
    - disabled Admin
    - privilege/self-escalation
    - last Main Administrator protection
    - custom group Access/Modify behavior

IMPORTANT INDEPENDENCE RULE:
Do NOT cherry-pick or copy the implementation from branch:
github/admin-opencart-rbac

Implement independently from the updated requirements so the two implementations can later be compared/reconciled.

DO NOT:
- modify main
- deploy
- merge
- change unrelated business logic
- claim runtime PASS when not actually tested

When finished, push your implementation commits to:
kamel/admin-rbac-foundation

Then report:
- starting SHA
- final SHA
- files changed
- schema changes
- Access/Modify model
- custom groups status
- tests executed
- GitHub Actions run IDs/results
- runtime tests completed/pending
- regressions found/fixed
- anything still pending
