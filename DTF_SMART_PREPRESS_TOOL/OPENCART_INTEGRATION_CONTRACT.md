# OpenCart integration contract (not deployed)

The prepress service remains separate from the storefront.

## Rules
1. OpenCart sends a copy/reference of the uploaded artwork to the prepress API.
2. The authoritative Ready-to-Print Master is immutable unless the user explicitly accepts a generated derivative as a new master.
3. Analysis never silently replaces the master.
4. Mockup derivatives, white previews, threshold candidates, background-removal candidates and enhancement candidates are separate assets.
5. Publishing may consume PASS/WARN/FAIL plus detailed findings, but output-profile thresholds must be configured from the actual printer/RIP/ink/film calibration.
6. No API response may claim that embedded 300 DPI alone proves print readiness.
7. A 3D mockup is only 3D when an actual supported 3D asset exists; 2D preview generation does not convert it into 3D.

## Current API
- GET /health
- POST /analyze
- POST /jobs/analyze
- GET /jobs/{job_id}
- DELETE /jobs/{job_id}

No OpenCart code is changed by this contract.
