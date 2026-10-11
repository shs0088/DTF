# DTF Smart Prepress — Batch 349 Engineering Synthesis
**Date:** 2026-10-11. **New individually read distinct pages:** 12. **Provisional cumulative upper bound:** 3,243 / 10,000 (32.43%). Globally certified unique count unknown pending historical semantic deduplication.

## Engineering findings
1. **Joint matte and color reconstruction:** Chinese research predicts foreground RGB, background RGB and alpha jointly to address color spill; Japanese texture-matting research shows the limitations of color-only selection. French level-set research shows trimap initialization matters. Separate segmentation, fractional alpha and RGB decontamination; never treat a binary mask as a finished cutout.
2. **Morphology destroys meaningful small details:** Korean C++ examples show a 3×3 opening removes 1×1 and 2×2 foreground islands. Chinese fuzzy-C-means research includes hole filling, which may erase intentional holes in lettering. Preserve Arabic dots/diacritics, small logos, transparent counters, thin strokes and halftone islands with topology QA.
3. **Interpolation is a print-quality decision:** Russian analysis notes bicubic ringing at edges and B-spline blurring. Avoid repeated resizing, preserve original resolution and evaluate halos, stroke width and effective PPI. Use transparency-aware resampling where appropriate.
4. **Color fringe versus alpha fringe:** German guidance distinguishes RGB color decontamination from mask shrinkage/feathering. Compare against black, white and target garment backgrounds; avoid blanket erosion.
5. **Noise and thresholds:** Arabic research contrasts global and local thresholding; Turkish work proposes adaptive anisotropic-diffusion threshold selection. Neither should be applied without checks for changed fine-line topology.
6. **Production RIP versus preview dithering:** Italian source distinguishes conventional AM screening and stochastic FM screening. RIP screening, choke, white density and ICC/linearization require printer-specific physical calibration.
7. **Chroma key is contextual:** Portuguese thesis describes alpha maps and background-keying for a controlled augmented-reality environment. The assumptions do not generalize to arbitrary multicolored artwork.

## Proposed acceptance gates
Immutable ICC-bearing original; independent segmentation/alpha/RGB/preview/master derivatives; topology and minimum-stroke tests; effective PPI from physical dimensions; choke measured in physical units and calibrated per printer; dark/light/garment-color halo previews; reversible operations and human review on uncertainty.

**Evidence limitations:** Spanish thesis abstract/metadata read, not the entire thesis PDF. All other accepted pages individually opened and reviewed. These are software and mathematical findings; no physical DTF printer tests. Historical semantic deduplication remains incomplete. No merge, deployment or protected storefront modification.
