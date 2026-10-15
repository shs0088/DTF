# Batch 456 — Engineering Synthesis (2026-10-15)

**Scope:** 24 individually opened/read, locally distinct pages across AR, ZH, JA, KO, RU, PT, IT, FR, ES, TR, DE, EN. Provisional cumulative upper bound **5,190 / 10,000**; historical semantic deduplication unfinished. Six academic landing pages contained abstracts/metadata rather than full papers.

## Findings
1. **Alpha Matting:** Chinese review compares Bayesian sampling, closed-form Laplacian propagation, KNN and CNN approaches. Separate initial binary segmentation, trimap, fractional alpha, and recovered foreground RGB; a binary mask alone cannot describe mixed edge pixels. Korean MediaPipe point-guided segmentation is an editable-mask tool, not full alpha matting.
2. **Compositing:** Japanese technical derivations show additive/glow blending is not equivalent to Porter-Duff source-over. Define premultiplied versus straight alpha and linear-light versus encoded RGB explicitly. OpenCV defaults to BGR/BGRA and may discard alpha unless requested. Protect the Ready-to-Print Master from mockup compositing.
3. **Morphology:** The original Portuguese paper describes geodesic reconstruction and hmax/hmin. Reconstruction better preserves shapes surviving marker erosion than basic opening, but cannot recover completely erased dots. Measure components, holes, thin-stroke widths and border displacement before accepting automated cleanup, especially Arabic diacritics.
4. **Halftoning/DTF:** German prepress explains AM/FM screening and moire; paper/screen-print screen rulings cannot be transferred as DTF defaults. The independent DTF vendor guide offers choke starting points, not a universal specification. Compute physical choke using actual final PPI: px = mm * PPI / 25.4. Avoid double choking when RIP owns white underbase. Require printer/film/ink/garment test charts.
5. **Restoration:** Russian JPEG analysis separates chroma banding from ringing. Choose denoising/deblocking/sharpening by defect and measure text fidelity. AI upscaling cannot retroactively certify a low-resolution logo. Use effective PPI at actual placement, not embedded DPI metadata.
6. **Security:** FastAPI/rembg examples illustrate integration but require production safeguards: decoded MIME validation, pixel/frame/CPU/memory limits, immutable masters, pinned model hashes, isolated workers, idempotent jobs and SSRF defenses for remote URLs. Keep all preview and RIP derivatives distinct from approved artwork.

**Quality evidence:** 20/20 deterministic synthetic checks passed in local Batch 456 package. No physical printer, RIP, storefront or deployment testing. Global certified unique-page count remains unknown.

**Next experiments:** component-aware matting and foreground RGB repair, Arabic dot preservation under reconstruction, premultiplied alpha resizing invariance, white choke feature survival at final print size, and calibrated DTF halftone/white-ink tests.

No merge, deployment, protected storefront change, or Ready-to-Print Master modification.
