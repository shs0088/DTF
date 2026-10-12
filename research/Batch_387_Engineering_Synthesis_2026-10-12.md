# DTF Smart Prepress — Batch 387 Engineering Synthesis (2026-10-12)

Research-only update. 20 individually opened/read and locally distinct technical pages; provisional cumulative upper bound 3,912 / 10,000 (39.12%). Global historical semantic deduplication is incomplete. Source URLs and full findings are preserved in the Batch 387 local research package.

## Findings

1. **Alpha edge contamination:** Fully transparent pixels may retain arbitrary RGB, which can produce colored fringes during straight-alpha interpolation. Use a linear-light premultiplied intermediate for resampling; inspect against black, white and saturated backgrounds.
2. **Export integrity:** A Japanese Photoshop workflow showed that grayscale working-space settings can change intended alpha values. Test alpha ramps and histograms after every export; do not assume format labels guarantee fractional-alpha preservation.
3. **Segmentation is not matting:** Keep foreground/background segmentation, trimap, fractional alpha, foreground RGB reconstruction and final RGBA as separate artifacts. Color-based background removal can destroy intentional white lettering and Arabic diacritics.
4. **Two-plate extraction:** Reconstruct alpha only when the same foreground is registered over two known backgrounds with consistent compositing assumptions; guard division by near-zero alpha and benchmark linear-light versus encoded-sRGB calculations.
5. **Morphology/topology:** Opening, closing, area opening and hole filling can delete small legitimate marks or fill enclosed glyphs. Measure connected components, holes, stroke widths and protected Arabic dots before and after each transform.
6. **Quality metrics:** MatAnyone 2's learned pixelwise matting-quality approach suggests a separate error detector, but human-video benchmarks cannot establish DTF printability. Build DTF-specific tests for thin typography, halftones, isolated marks and white artwork.
7. **RIP separation:** An alpha matte is not automatically a production white-underbase channel. Calculate proposed choke in physical units, preserve master artwork, and validate final ink settings on the actual printer/RIP/film/garment combination.
8. **Code review:** A reviewed Chinese sample saves RGB after grayscale filtering rather than an actual RGBA matte; third-party examples require channel-count, polarity, numerical and topology regression tests.

This batch ran 12 deterministic synthetic checks successfully. No physical DTF calibration, merge, deployment, protected storefront modification or Ready-to-Print Master modification was performed.
