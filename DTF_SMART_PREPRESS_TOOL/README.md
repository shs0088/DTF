# DTF Smart Prepress Tool — standalone build v0.7

Research-driven, offline-first prepress/preflight engine. It is deliberately isolated from the protected OpenCart storefront.

## What works now

### Analysis / preflight
- PNG/JPEG/TIFF/WebP parsing and upload validation.
- Encoded-size, decoded-megapixel and decompression-bomb safeguards.
- True source-alpha detection.
- Embedded DPI recorded as metadata only; final-size effective DPI is calculated separately.
- Aspect-ratio distortion checks.
- Transparent / semi-transparent / low-alpha statistics.
- Content bounds, connected components, islands, holes/counters and topology checks.
- Physical printability checks driven by an Output Profile instead of invented universal limits.
- Edge RGB contamination-risk metrics and multi-background composite QA.
- Conservative background-mode classifier: existing alpha vs border-connected color-key candidate vs semantic/matting candidate.
- ICC inspection plus explicit profile-conversion derivative.
- Explainable recommendations; destructive actions are never automatic.

### Candidate processing
Every appearance-changing operation creates a derivative and never silently overwrites the source/master:
- border-connected color-key background candidate
- offline-first rembg matting candidate
- hidden-RGB edge bleed
- known-background RGB unmatting/decontamination
- linear-light premultiplied-alpha resize
- median denoise
- unsharp-mask sharpening
- Wiener deblur with explicit PSF
- alpha morphology: erode/dilate/open/close
- fixed/Otsu alpha threshold candidate
- local Real-ESRGAN NCNN adapter when a local executable is explicitly configured
- Bayer, Floyd–Steinberg and Atkinson diagnostic screening

Each candidate can be registered with:
- parent SHA-256
- operation + parameters
- fidelity QA
- topology comparison when alpha changes
- JSON manifest
- SQLite lineage registry

### White underbase
- continuous or explicit binary white-support policy
- alpha cutoff/gamma/density floor
- choke/spread in physical millimeters, converted only after final size is known
- topology-survival comparison
- spread-canvas clipping risk
- diagnostic white-channel preview only; never claimed as authoritative RIP output

### Calibration
- printable calibration chart for stroke widths, islands, holes/counters and choke references
- calibration observation schema
- calibrated Output Profile builder
- printer / ink / film / RIP / print-mode fingerprint
- no universal 300-DPI, choke, stroke, halftone or ICC rule is hard-coded

### Service / workflow
- bilingual local Web UI
- FastAPI service
- optional X-API-Key protection
- bounded upload streaming
- SQLite persistent jobs
- candidate download + lineage API
- explicit Master acceptance after re-analysis
- generated masters cannot overwrite an existing master
- diagnostic prepress handoff ZIP without embedding the customer master
- Windows launcher, Linux launcher and Dockerfile
- GitHub Actions unit + HTTP integration tests

## Run on Windows

Double-click:

    run_windows.bat

Then open:

    http://127.0.0.1:8000

Optional environment settings are documented in `.env.example`.

## Manual run

    python -m pip install -r requirements.txt
    python -m uvicorn api:app --host 127.0.0.1 --port 8000

Tests:

    pip install -r requirements-dev.txt
    python -m unittest discover -v

Optional local AI matting dependencies:

    pip install -r requirements-ai.txt

Model files are not downloaded by the application at runtime. See `models/README.md`.


## Added in the current build

- bounded feature-width analysis using a scaled alpha mask when artwork is very large
- bounded topology analysis with explicit analysis_scale
- alpha-structure diagnostics and white gradient-tail support QA
- product print-area compatibility and transparent canvas-margin checks
- validated/fingerprinted Output Profiles
- no-reference raster quality diagnostics (edge energy, noise/texture proxy, 8x8 block-boundary ratio)
- bounded multi-file Batch Analysis
- downloadable HTML preflight reports
- local Self-Check for runtime directories, SQLite, packages and offline AI availability
- read-only OpenCart order-item eligibility contract/API
- structural Mockup Inspector:
  - raster images stay 2D
  - GLB/GLTF require validated mesh data before actual_3d=true
  - OBJ requires vertices + faces
  - animation capability is reported only when present in the 3D asset
- DTF print-area placement metadata in millimeters; generic UV mapping is not used for print placement

## Non-negotiable rules
1. Embedded 300 DPI alone never proves DTF readiness.
2. No universal choke/spread/minimum-stroke/halftone/ICC/effective-DPI threshold is invented.
3. Printer/RIP/ink/film/mode limits come from a calibrated Output Profile.
4. Ready-to-Print Master is not silently modified.
5. Candidate processing is reversible and lineage-tracked.
6. Soft alpha is preserved by default.
7. Background removal, alpha geometry, RGB edge contamination and topology are separate checks.
8. Mockup derivatives are not print masters.
9. A 2D file is never called 3D without an actual supported 3D asset.
10. Runtime AI processing is offline-first; customer artwork is not sent to a remote AI service by this tool.

## Storefront protection

OpenCart integration remains a separate later step. This build does not merge, deploy, or change the protected storefront.
