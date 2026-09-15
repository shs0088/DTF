# COMMAND

TASK_ID: LOOP-TEST-001
STATE: READY
SCOPE: NON-DESTRUCTIVE AUTOMATION TEST

## Objective
Prove that camelAI can receive a task from GitHub, execute it autonomously, and return the result to GitHub.

## Required actions
1. Confirm you are operating on branch `camel-loop-test`.
2. Read `automation/camel/PROTOCOL.md`.
3. Do not modify any DTF Studio application source code.
4. Create or update `automation/camel/RESULT.md` with:
   - TASK_ID: LOOP-TEST-001
   - RESULT: PASS
   - branch name
   - Git commit SHA you started from
   - statement that no application files were changed
   - a short message: `GitHub → camelAI → GitHub loop verified.`
5. Update `automation/camel/STATUS.md` to `STATUS: COMPLETE` with the resulting commit SHA.
6. Change this file from `STATE: READY` to `STATE: DONE`.
7. Commit and push the three automation files back to branch `camel-loop-test`.

## Forbidden
- No deployment
- No database changes
- No application source changes
- No changes to other branches
- No secrets in files
