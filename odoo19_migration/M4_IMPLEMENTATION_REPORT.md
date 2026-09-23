# M4 Implementation Report — Preflight, Publishing, and Protected Assets

## Scope

This M4 change set is limited to the Odoo migration addons. It does not modify frontend source, Worker/old backend, protected branches, or deployment configuration.

## Implemented

- Added server-side dtf.preflight.engine inspection and rule evaluation.
- Captured extension, declared MIME, detected signature/type, size, pixel dimensions when available, effective DPI when physical dimensions are supplied, physical dimensions, readability, previewability, analyzability, aspect ratio, vector status, scaling risk, and explicit unavailable values.
- Supported formats are data-driven and include PNG, JPG/JPEG, WEBP, SVG, and PDF; no universal PNG-only rule was introduced.
- Extended versioned product-specific rules for T-Shirt, Mug, Cap, and all seven supported combinations.
- Added structured failure codes and immutable analyzer snapshots to preflight results.
- Preserved locked result history and prevented unauthorized mutation/deletion.
- Publishing requires bilingual metadata, an explicit Ready-to-Print Master, and a current accepted preflight result for the selected product combination. The master is never auto-selected.
- Asset deletion is blocked when locked preflight evidence exists; unprotected deletion clears design roles and removes the associated attachment.
- Added focused M4 tests for inspection, publishing gates, explicit master selection, immutable evidence, and protected deletion.

## Honest unavailable evidence

The lightweight inspector records None for embedded DPI, alpha/transparency, color mode/profile, orientation, and metadata when the installed inspection path cannot determine them. It does not fabricate those values.

## Verification status

Changes were committed through the connected GitHub repository API to odoo19/headless-backend-migration-prep. No deployment or merge was performed. CI/runtime verification is represented by the workflow changes and must complete on GitHub Actions.
