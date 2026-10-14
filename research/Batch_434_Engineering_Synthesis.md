# Batch 434 engineering synthesis

Date: 2026-10-14. Eighteen new locally distinct sources were opened and read. Provisional cumulative upper bound: 4,756. Global historical semantic uniqueness remains unverified.

## Key conclusions

- Foreground RGB edge contamination is distinct from alpha-mask geometry. Preserve separate reconstruction and masking stages; verify against contrasting garment colors.
- Morphological opening, erosion and watershed can remove small typography components. Preserve Arabic diacritics, punctuation, holes, and isolated halftone islands through topology checks.
- A GrabCut binary mask does not estimate fractional alpha or uncontaminated foreground color. It requires separate edge quality assessment.
- White underbase should be assessed at final physical print size with printer-specific choke. Avoid duplicate white-layer processing between prepress and RIP.
- Preserve immutable source and printing masters; produce independent mockup and analysis derivatives.
- Conventional PSNR, SSIM and MSE are not sufficient for printability decisions; add physical stroke-width and topology tests.

No production calibration, merge, deployment, or storefront changes. Sources: research/Batch_434_Canonical_Source_Index.md.
