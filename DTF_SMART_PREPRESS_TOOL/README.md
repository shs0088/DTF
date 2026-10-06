# DTF Smart Prepress Tool — active standalone build

Research-driven prepress/preflight engine. It is deliberately isolated from the protected OpenCart storefront.

## Current capabilities
- Real PNG/JPEG/TIFF/WebP parsing and upload validation
- Encoded-size + decoded-megapixel limits and decompression-bomb handling
- Source alpha detection (JPEG is no longer falsely reported as alpha)
- Embedded DPI recorded as metadata only
- Effective DPI calculated from final physical size
- Aspect-ratio distortion detection
- Transparent / semi-transparent / low-alpha statistics
- Content bounds, preliminary edge-RGB risk signals
- Connected components and holes/counters topology analysis
- Physical printability checks driven by output-profile thresholds
- Multi-background composite QA statistics
- ICC inspection and explicit profile conversion derivative
- Border-connected color-key background-removal candidate
- Optional rembg AI matte candidate backend
- Trimap/unknown-region inspection
- Known-background RGB unmatting/decontamination
- Hidden-RGB edge bleed without changing alpha
- Linear-light premultiplied-alpha resizing
- Median denoise derivative
- Unsharp-mask derivative
- Wiener deblur derivative with explicit PSF
- Alpha morphology: erode/dilate/open/close
- Otsu/fixed threshold candidates
- White-underbase diagnostic preview with continuous/binary gradient policy
- Choke/spread in physical units only after final size is known
- White topology-survival comparison and spread-canvas clipping risk
- Ordered Bayer halftone diagnostic preview
- Mockup-safe derivative that cannot overwrite Ready-to-Print Master
- JSON PASS/WARN/FAIL report
- CLI, local web UI, FastAPI service, bounded in-memory async job queue
- Windows launcher, Linux launcher and Dockerfile
- GitHub Actions unit-test workflow

## Run on Windows
Double-click `run_windows.bat`, then open:
`http://127.0.0.1:8000`

## Manual run
```
python -m pip install -r requirements.txt
python cli.py artwork.png --width-in 16 --height-in 18 --report report.json
python -m uvicorn api:app --host 127.0.0.1 --port 8000
python -m unittest discover -v
```

For optional AI background-removal candidate support:
```
pip install -r requirements-ai.txt
```

## Non-negotiable design rules
- Embedded 300 DPI alone never proves DTF readiness.
- No universal choke, spread, minimum stroke, halftone, ICC, or effective-DPI threshold is invented.
- Printer/RIP/ink/film/mode thresholds belong to a calibrated Output Profile.
- Analysis does not silently modify the Ready-to-Print Master.
- Every destructive or appearance-changing operation creates a derivative candidate.
- Soft alpha is preserved by default; binary thresholding must be explicit.
- White preview and halftone preview are diagnostic, not authoritative RIP output.
- Background removal, alpha quality, RGB edge contamination and topology are evaluated separately.
- Mockup derivative is not the Ready-to-Print Master.
- 2D assets are never labeled as 3D without an actual supported 3D asset.

## Storefront protection
No deployment or merge is performed from this build. OpenCart integration remains a separate later step after the engine is validated.
