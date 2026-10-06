# DTF Smart Prepress Tool — Phase 1

Research-driven preflight engine. This directory is intentionally isolated from the protected OpenCart storefront.

## Phase 1 implemented
- Image metadata model
- Effective DPI from final physical print size
- Alpha-state classification
- Low-alpha/ghost-pixel risk flags
- Edge QA fields for halo/decontamination
- White-underbase policy model
- Physical choke/spread converted to pixels only after final size is known
- Feature-survival checks
- Structured PASS/WARN/FAIL report

## Safety
No storefront integration, deployment, RIP output, or automatic destructive image modification in Phase 1.
