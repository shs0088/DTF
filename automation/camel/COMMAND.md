# COMMAND

TASK_ID: LOOP-TEST-003
STATE: READY

Do one small read-only inspection.

1. Stay on branch `camel-loop-test`.
2. Read `workers/static-app.ts`.
3. Create `automation/camel/INSPECTION_RESULT.md`.
4. Write exactly these four lines, using the actual code you inspect:

TASK_ID: LOOP-TEST-003
ADMIN_PRINTIFY_ROUTE: YES or NO
PAGE_SIZE_100: YES or NO
CATEGORY_FILTERING: YES or NO

5. Commit and push only `automation/camel/INSPECTION_RESULT.md` back to `camel-loop-test`.

Do not modify application source.
Do not deploy anything.
Do not modify any other branch.
