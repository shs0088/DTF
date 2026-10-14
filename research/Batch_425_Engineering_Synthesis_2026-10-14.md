# DTF Smart Prepress — Batch 425 Engineering Synthesis (2026-10-14)

**20** newly opened/read, locally deduplicated sources; **4,588** provisional cumulative upper bound, **not globally certified**. Searched AR, ZH, JA, KO, RU, ES, PT, DE, FR, IT, TR, EN; accepted JA, TR, PT, IT, EN, KO, DE, ES, ZH, FR. 14/14 synthetic regression tests passed; no printer tests.

## Findings

1. **Transparency-safe filtering:** convert color appropriately to linear-light for mathematically linear operations, premultiply RGB once, filter/resample, unpremultiply with low-Alpha guard, and export straight-Alpha PNG. Keep color-management and Alpha conventions explicit. Zero-Alpha RGB padding helps mipmap halos but cannot correct contaminated partially visible foreground RGB.
2. **Segmentation versus matting:** border-connected floodfill protects enclosed white artwork better than global white thresholds. Neural semantic segmentation, trimap-based fractional Alpha, and foreground RGB reconstruction require independent validation. Subpixel/multiview matting is not a universal single-image solution.
3. **Morphology and typography:** erosion, dilation, and watershed can alter connected components. Protect Arabic dots, diacritics, holes, thin text and halftone islands. Reject destructive automatic cleanup using topology and physical stroke-width checks.
4. **White underbase and dithering:** at 300 PPI, 0.10 mm choke = 1.181 px; 0.15 mm = 1.772 px. A 0.20 mm stroke is erased by idealized 0.15 mm choke from both sides. RIP-specific settings require physical calibration. Artistic dithering is distinct from calibrated RIP screening.
5. **Denoising and printability:** total variation plus high-pass sharpening may improve SSIM while damaging tiny typography; check final-size effective PPI and edges.
6. **Mockup safety:** web RGB+Alpha split and lossy JPEG can be preview derivatives only. Preserve immutable original Ready-to-Print Master, ICC metadata and hash.

## Verification

Pages opened individually, checked against accessible central ledger and local Batches 415–424. Historical semantic audit incomplete. All tests synthetic, not deployed app or physical printer. No merge, deployment, storefront or printing-master change.
