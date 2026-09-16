# DTF Studio Protected Baseline Governance

Before any future source edit:

1. Read `/AGENTS.md`.
2. Read `/00_DTF_STUDIO_PROTECTED_PASS_BASELINE.txt`.
3. Read `/01_DTF_STUDIO_CHANGE_LOG.txt`.
4. Identify every file, selector, function, route, API, and component the request may affect.
5. Compare them against all PROTECTED PASS items.
6. PASS means DO NOT TOUCH.

A protected PASS item must not be redesigned, refactored, optimized, cleaned up, renamed, rewritten, replaced, moved, merged into another implementation, or indirectly changed through shared CSS unless the user explicitly approves changing that protected item.

A broad instruction such as “fix everything”, “update all”, “correct the complete page”, “improve UI”, “synchronize everything”, or “correct A-to-Z” does not authorize modification of a protected PASS item.

If a requested change may affect a protected PASS item, stop before modifying that item and return:

PROTECTED ITEM CONFLICT DETECTED

Protected item:
[exact item]

Requested change:
[exact request]

Affected file:
[file]

Affected selector/function:
[selector/function]

Why this may cause regression:
[reason]

Proposed modification:
[exact proposal]

USER CONFIRMATION REQUIRED.

Do not revert, restore, or deploy without explicit scope and validation. Append to the change log; never overwrite prior entries.

============================================================
KAMEL CONTINUE-UNTIL-COMPLETE EXECUTION DIRECTIVE — 2026-09-16
============================================================
THIS DIRECTIVE IS MANDATORY FOR KAMEL/CAMEL WORK ON THIS BRANCH.

1. Continue from the ACTUAL current GitHub HEAD. Never restart from an older local workspace.
2. Before every new implementation batch:
   - git fetch
   - verify branch = kamel/admin-rbac-foundation
   - record exact current HEAD SHA
   - stop only if the GitHub HEAD cannot be verified.
3. Do NOT stop after completing one subtask. Continue automatically to the next unresolved requirement.
4. Work through all items in 01_To_Do.txt, 03_Not_Implemented.txt and 05_Checking_List.txt in dependency order until every currently authorized, unblocked item is completed and verified.
5. After each implementation batch:
   - run npm install only when dependencies changed or are unavailable;
   - run npm run typecheck;
   - run npm run build;
   - run bun test workers/admin-rbac.test.ts;
   - inspect failures, fix them, and rerun until PASS.
6. If runtime/browser tests are possible in the environment, execute them. If a runtime test is genuinely blocked by unavailable deployment/secrets/user-only credentials, record the exact blocker and CONTINUE with every other unblocked item.
7. Never treat a source-code change or an AI statement as completion evidence. Completion requires code + relevant test/CI evidence.
8. Update QC/status records continuously after meaningful batches:
   - 01_To_Do.txt
   - 02_Implemented.txt
   - 03_Not_Implemented.txt
   - 04_Rules.txt when a rule is clarified
   - 05_Checking_List.txt
   - 01_DTF_STUDIO_CHANGE_LOG.txt
9. Preserve protected PASS items and unrelated storefront/customer/designer/Printify/cart/order/stock behavior.
10. Do NOT deploy, merge to main, or modify main unless explicitly authorized separately.
11. Do NOT ask the user for approval between ordinary implementation steps already covered by the requirements.
12. Ask the user only when a truly user-only action is required (for example a secret/account permission that cannot be supplied safely by code).
13. For the current Admin program, finish OpenCart-style RBAC first, then continue the Full Admin Dashboard A–Z target in 01_To_Do.txt, using the same continue-until-complete rule.
14. FINAL REPORT is allowed only when:
   - all authorized items are completed or explicitly blocked;
   - final branch SHA is reported;
   - CI result for that SHA is reported;
   - completed/corrected/tested/pending/blocked sections are accurate;
   - no known test failure is hidden.

DO NOT PAUSE MERELY TO ASK "SHOULD I CONTINUE?". CONTINUE UNTIL COMPLETE OR TRULY BLOCKED.

============================================================
DOCUMENTATION-ONLY CHANGE SAFETY — 2026-09-16
============================================================
1. A documentation/QC-only request may modify only documentation/status files (*.md, *.txt) explicitly in scope.
2. Documentation/QC-only work MUST NOT modify application source, schemas, workflows, package files, generated assets, or deployment configuration.
3. Documentation text is descriptive/authoritative project control data; editing it must never itself execute migrations, change runtime data, deploy, publish, import, or alter application behavior.
4. Keep documentation-only commits separate from source-code commits.
5. Before every documentation-only commit, record the branch HEAD and verify it again before push.
6. After the commit, compare changed paths. If any non-documentation application file changed unexpectedly, stop and treat the commit as FAILED; do not deploy or merge it.
7. Documentation-only commits may trigger validation CI, but they do not authorize deployment.
8. When implementation is required by a documentation update, create a separate implementation commit/batch after reading the updated requirements; never mix the paper change with the code change.
