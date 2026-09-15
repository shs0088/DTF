# DTF Studio — GitHub ↔ camelAI Automation Protocol

Purpose: provide a safe command/result loop between GitHub and the existing camelAI workspace.

## Branch
Work only on `camel-loop-test` during this test.

## Files
- `automation/camel/COMMAND.md` — current instruction from the controller.
- `automation/camel/STATUS.md` — camelAI execution state and evidence.
- `automation/camel/RESULT.md` — final result for the current command.

## Agent rules
1. Read `COMMAND.md` on every scheduled run.
2. Act only when `STATE: READY`.
3. Never restart completed work. Read `STATUS.md` first and continue from the last verified point.
4. During this test, do not modify application source, database, deployment, secrets, or production.
5. Write progress/evidence to `STATUS.md`.
6. When the command is complete, write `RESULT.md`, then change `STATE: READY` in `COMMAND.md` to `STATE: DONE`.
7. Commit and push all result/status changes to `camel-loop-test`.
8. If blocked, set `STATUS: BLOCKED` and record the exact blocker. Do not guess.
9. Never expose credentials, API keys, tokens, or secrets in GitHub.
10. Do not touch `main`, `camel-current`, or `kamel-catalog-only` during this test.

The GitHub files are the source of truth for task state.
