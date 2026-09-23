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


## Final closure evidence

Final implementation HEAD before closure tests: `e5f1686c9b3f2f53780b7b6f570a7062ba558092`. Successful prior workflow: **35927001430 — SUCCESS**. It passed M1, Docker Compose, ARM64 manifest, PostgreSQL, all 13-addon installation, M2, M3, M4, and Odoo/Nginx `/web` runtime. The prior M4 result was 5 test methods, 0 failed, 0 errors.

Closure tests added on the continuation head cover the previously missing regression categories below. The complete workflow must be rerun on the new final HEAD before M4 is considered closed.

### M4 coverage matrix

| Requirement | Test | Evidence |
|---|---|---|
| Unsupported, unreadable, signature mismatch | `test_analyzer_rejection_matrix` | Explicit rejection codes: unsupported_format, unreadable, signature_mismatch |
| Effective DPI/scaling and transparency gate | `test_effective_dpi_and_scaling...`; prior `test_effective_dpi_and_rejection_are_structured` | Different physical sizes produce different effective DPI; transparency rule rejects unavailable transparency |
| Unreadable/unanalyzable master | `test_master_readable_and_analyzable_gates` | Master selection raises validation errors |
| Same asset as display and master; exact missing-master message | `test_same_asset_roles_and_exact_missing_master_message` | Exact publishing message asserted |
| Four bilingual fields | `test_each_bilingual_field_is_required` | Each field independently asserted |
| Qualification sample denial | `test_qualification_sample_cannot_publish`; M2 `test_qualification_design_cannot_have_master_or_publish` | Publish denial |
| Seven product combinations | `test_all_seven_product_combinations_accept_current_preflight`; M2 `test_seven_product_combinations_are_exact` | Current accepted result publishes each combination |
| Stale accepted vs newer rejected | `test_newer_rejected_result_overrides_accepted` | Newest database result blocks publishing |
| Printable area | `test_printable_area_rejects_oversized_physical_asset` | Active native printable area emits printable_area failure |
| Designer ownership and locked evidence | M2 `test_designer_record_rule_is_owner_scoped`, `test_locked_preflight_result_is_immutable`; M4 security tests | Owner isolation and immutable history |
| Normal deletion and role recovery | `test_unprotected_deletion_and_role_recovery`; M2 master/display role tests | Asset and attachment cleanup; roles cleared |

Analyzer fields still unavailable in the lightweight inspector: embedded DPI, alpha/transparency, color mode/profile, orientation, and general metadata. They are explicitly marked unavailable/unsupported and are not fabricated.

M5 and M6 remain intentionally deferred.


## Expanded-coverage validation correction

Run **35928809712** failed before M3/M4 because the M2 test command exited 255. Inspection showed the newly added security/deletion test attempted to delete an asset that intentionally carried locked preflight evidence. The test was corrected to assert that locked deletion raises `ValidationError`, then use a separate clean asset to verify normal attachment cleanup and role recovery. Existing working behavior was not weakened.


Run **35929191145** also stopped in the unchanged M2 stage before M3/M4. The added closure test had two real fixture defects: the effective-DPI fixture lacked PNG IHDR dimensions, and the exact missing-master regex was over-escaped. The fixture now contains dimensions and the assertion uses the correct regex.
