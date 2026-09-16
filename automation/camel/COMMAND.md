# COMMAND

TASK_ID: CAMEL-INDEPENDENT-125-TEST
STATE: READY

This is an isolated execution test.

Authoritative GitHub source remains unchanged. Do NOT modify or commit any DTF Studio application source file to GitHub.

Your task in the CAMEL workspace only:

- Use the current DTF Studio project.
- Change the Printify Admin catalog from 100 products per page to exactly 125 products per page.
- Make every code change required for the 125-products-per-page behavior to be internally consistent.
- Do not change any unrelated behavior.
- Do not deploy unless your own environment requires a preview to validate the change.
- Do not push the modified application file to GitHub.

After you finish:
1. Verify the CAMEL-side code is internally consistent for 125 products per page.
2. Write ONLY a small execution report back to GitHub at:
   automation/camel/EXECUTION_125_RESULT.md
3. The report must contain:
   TASK_ID: CAMEL-INDEPENDENT-125-TEST
   RESULT: PASS or FAIL
   CHANGED_FILE: workers/static-app.ts
   TARGET_PAGE_SIZE: 125
   APPLICATION_SOURCE_PUSHED_TO_GITHUB: NO
   and the exact changed code lines as plain text.
4. Commit and push ONLY that report file to branch:
   camel-loop-test

Do not modify COMMAND.md after reading it.
Do not modify any other GitHub file.
