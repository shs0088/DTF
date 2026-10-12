# Batch 372 — Engineering Synthesis (2026-10-12)

15 newly opened, locally distinct technical pages. Previous provisional upper bound 3,628; new provisional upper bound **3,643 / 10,000 (36.43%)**; remaining provisionally 6,357. Globally certified unique count remains unknown pending historical semantic deduplication.

## Engineering decisions
1. **Topology-aware cleanup:** Korean morphology explanation and Turkish denoising research show that erosion/opening and sharpening can destroy tiny disconnected artwork, Arabic dots and diacritics. Compare connected components, holes and minimum physical stroke width before accepting cleanup.
2. **Illumination-aware segmentation:** Portuguese morphological reconstruction research reports sensitivity to nonuniform illumination. Estimate uneven background first; do not globally delete matching white/black pixels.
3. **Alpha matting defaults are not printability limits:** Official R rembg API documentation specifies optional opening+Gaussian blur+threshold, matting foreground/background thresholds 240/10, and trimap erosion size 10. Do not apply these defaults uncritically to thin DTF designs.
4. **Masks are not interchangeable:** Italian SVG documentation distinguishes alpha and luminance masks; mockup display masks and color transforms must not modify the original print master.
5. **Printer-specific DTF:** PrintFactory documentation distinguishes white underbase from adhesive powder and identifies PMM, RIP white generation, and black knock-out. Keep white/choke/screening configuration tied to the printer and verify with physical test prints.
6. **Metric separation:** Arabic thresholding, Spanish image segmentation, Turkish segmentation comparisons and fuzzy denoising research show that pixel accuracy, PSNR or MSE alone do not establish Alpha edge quality or typography preservation.
7. **Cutout QA:** German original tutorials recommend evaluating cutouts against black and white, and using paths for hard logos rather than universal feathering.

## Validation and scope
40 synthetic deterministic regression tests passed (36 reused baseline + 4 new). No physical DTF/RIP calibration. All 12 requested languages searched; accepted material came from Arabic, German, English, Spanish, Italian, Korean, Portuguese and Turkish. No merge, deployment, protected storefront edit or Ready-to-Print Master change.

Canonical URL index: research/Batch_372_Canonical_Source_Index_2026-10-12.md.
