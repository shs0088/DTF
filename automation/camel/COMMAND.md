# COMMAND

TASK_ID: HEAD-SYNC-125-TEST-001
STATE: READY

This test fixes the stale-source problem found in the previous CAMEL test.

SOURCE OF TRUTH:
Repository: shs0088/DTF
Source branch: camel-current
Required exact source commit:
da347ffbf928bbd1c80f302c134cd8928255abf8

MANDATORY PRE-FLIGHT — DO THIS BEFORE ANY EDIT:
1. Fetch the latest GitHub refs.
2. Check out or create an isolated CAMEL working copy from EXACT commit:
   da347ffbf928bbd1c80f302c134cd8928255abf8
3. Verify the working source SHA equals exactly:
   da347ffbf928bbd1c80f302c134cd8928255abf8
4. Verify workers/static-app.ts contains the OpenCart-style numbered pagination marker:
   function renderPager()
5. If the SHA or marker does not match, STOP and report FAIL. Do not edit anything.

ONLY AFTER PRE-FLIGHT PASSES:
6. In the CAMEL workspace only, change Printify Admin catalog pagination from 100 products per page to exactly 125 products per page.
7. Keep OpenCart-style numbered pagination intact.
8. Make the implementation internally consistent:
   - API maximum/default effective page size: 125
   - frontend request: pageSize:'125'
   - displayed range must use the effective pageSize variable, not a hardcoded 125
9. Run the relevant tests/build available in the CAMEL workspace.

GITHUB SAFETY:
- Do NOT modify or push workers/static-app.ts to GitHub.
- Do NOT modify any DTF Studio application source in GitHub.
- Do NOT deploy.
- Push ONLY one report file to branch camel-loop-test:
  automation/camel/HEAD_SYNC_125_RESULT.md

The report must contain exactly these fields:

TASK_ID: HEAD-SYNC-125-TEST-001
RESULT: PASS or FAIL
SOURCE_SHA_EXPECTED: da347ffbf928bbd1c80f302c134cd8928255abf8
SOURCE_SHA_USED: <actual SHA>
NUMBERED_PAGINATION_FOUND: YES or NO
TARGET_PAGE_SIZE: 125
APPLICATION_SOURCE_PUSHED_TO_GITHUB: NO
TEST_RESULT: <short result>
CHANGED_LINES:
<plain text of only the exact changed code lines>

Do not modify COMMAND.md after reading it.
Do not modify any other GitHub file.

MONITOR_TRIGGER: 1
