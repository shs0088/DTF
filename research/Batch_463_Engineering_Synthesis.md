# Batch 463 Engineering Synthesis

Date: 2026-10-16

## Progress
Previous provisional upper bound: 5,259. Six new canonical source pages accepted. Updated provisional upper bound: 5,265 / 10,000 (52.65%); 4,735 remain by arithmetic. Globally certified unique count remains unknown because historical semantic deduplication is incomplete.

## Findings
1. **Joint foreground RGBA validation:** New matting research explores predicting foreground RGB and Alpha together. For Smart Prepress, compare recovered foreground color with the source and protect lettering/logo geometry; learned priors must not silently invent print details.
2. **Separate edge operations:** Distinguish matte geometry changes (shrink/grow), foreground RGB decontamination at fractional-Alpha pixels, and removal of a pre-existing black/white matte. Preview edges over white, black, and saturated backgrounds.
3. **Confidence-aware trimap matting:** A full 10-page paper uses candidate foreground/background color pairs, geodesic sample collection, confidence weighting, and a sparsity prior. Keep confidence maps and route ambiguous edges to review.
4. **Layered key cleanup:** Production keying documentation separates edge cleaning, holdout/restoration masks, spill suppression, edge-only color correction, and matte refinement. A single erosion cannot safely solve every halo.
5. **Boundary-focused metrics:** A Russian engineering article describes border Dice derived from dilation and erosion alongside IoU, precision, recall, and Dice. Add contour-focused metrics plus thin-stroke and connected-component survival checks.
6. **Mockup blur halos:** Exclude foreground pixels from the blur support or blur a background plate before compositing. Never blur the approved print master.
7. **Capture-based ground truth:** Polarization-based matting may help produce evaluation mattes for translucent details, but is not a general software-only remover for arbitrary uploads.

## Limitations
The official DRIP proceedings page and PolarMatte publication page were read at abstract/landing-page depth; their full papers were not opened. The Microsoft color-modeling paper was read in full. No physical DTF printer or production RIP was tested. No deployment, merge, storefront change, or approved printing-master modification occurred.

Full canonical URL index and read-depth records are in the local Batch 463 research package.