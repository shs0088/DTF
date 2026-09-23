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


## Failed validation and correction record

Run 35925594079 failed at the prior M4 HEAD 282c3c233a92c2df78a32b4924b0a1562a615bf0. M1 static validation, PostgreSQL startup, and all 13-addon installation passed; M2 failed, so M3/M4/runtime were skipped. The exact failures were the zero-argument JSON default callable and a newly-created accepted result not being seen by the publishing cache.

Corrections: the JSON default callable now accepts Odoo's recordset argument; latest-result selection uses an ordered database query with cache invalidation after result mutations and before publishing; active native printable areas are evaluated; deprecated imghdr was removed; analyzer capability fields distinguish unavailable/unsupported analysis from measured values.

Analyzer fields intentionally unavailable in the lightweight inspector: embedded DPI, alpha/transparency, color mode/profile, orientation, and general metadata. These are recorded as unavailable or unsupported rather than fabricated.

M5/M6 are intentionally deferred. Final successful Actions run ID, final HEAD, and actual test counts/results remain pending until the final full workflow completes successfully.
