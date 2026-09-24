# M6 Visual QA

Temporary, isolated browser-QA harness for verified M6 source HEAD:

`bf19feae521be6273ddab35df259261fa6b10292`

This branch does not change DTF Studio application logic. It starts the existing Odoo/PostgreSQL/Nginx stack in GitHub Actions, seeds synthetic QA-only data, runs Chromium visual checks, and uploads screenshots/logs as workflow artifacts.

Do not merge this QA harness into the migration branch unless explicitly requested.
