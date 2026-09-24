# M6 Visual QA

Live-branch browser-QA harness for M6 production / Printing Operator closure.

The workflow starts the existing Odoo/PostgreSQL/Nginx stack in an isolated GitHub Actions runner, seeds synthetic QA-only data, verifies Admin and Printing Operator flows in Chromium, checks the exact Ready-to-Print Master download, exercises allowed status transitions, checks least-privilege visibility, captures desktop/tablet/mobile screenshots, records console/network diagnostics, and uploads evidence artifacts.

The root DTF Studio frontend cutover remains disabled; this harness validates the native Odoo backend/operator runtime only.
