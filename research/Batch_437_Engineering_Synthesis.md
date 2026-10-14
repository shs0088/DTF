# DTF Smart Prepress — Batch 437 engineering synthesis

**2026-10-14.** 22 new individually opened/read locally distinct pages; 4,828 provisional cumulative upper bound, **not** a globally certified unique-page count. Historic semantic deduplication and earlier GitHub sync gaps remain.

## Findings and implementation requirements

1. **Alpha math:** Russian C++ research on AlphaBlend demonstrates that replacing division by 255 with a shift/divide-by-256 can systematically darken 8-bit edges. Track straight versus premultiplied RGB; use exact normalization, safe zero-alpha handling, and tests on black and white backgrounds (source #3).
2. **Matting versus segmentation:** Japanese OpenCV alphamat and rembg work shows that binary masks and trimap-based fractional alpha serve different roles. Separate segmentation, trimap, alpha estimation, foreground RGB decontamination and export; a visual cutout is not automatically a production master (#4–#7).
3. **Resampling:** Russian interpolation and supersampling discussions, plus Spanish rotation examples, expose pixel-grid, sampling and unassigned-border problems. Use inverse mapping, explicit transparent borders and alpha-safe resampling on **mockup derivatives**, never destructive master transforms (#1, #2, #10).
4. **Morphology and typography:** Turkish academic abstracts and original Arabic OpenCV examples show that kernel size, CLAHE, thresholding and noise characteristics change component survival. Protect Arabic dots, diacritics, punctuation, internal holes, thin strokes and halftone islands. Compare connected-component counts, holes and minimum physical stroke width before/after cleanup (#15–#19, #22).
5. **Per-pixel versus global alpha:** OpenCV addWeighted is global weighted blending, not automatically an RGBA per-pixel alpha composite. Keep separate operators and test mixed-alpha edge cases (#8).
6. **Quality metrics:** An Arabic technical image-analysis project separates Laplacian sharpness, Sobel edge strength, noise estimates and Arabic/English OCR. Use these as diagnostics, not as a substitute for final-size PPI, printability and RIP checks (#20).
7. **RIP-specific underbase:** Previously counted official Caldera docs were re-read but excluded from new-page count. Record whether the RIP or Smart Prepress generates white and choke, avoid duplicate choke, store physical units and inspect RIP separations. Idealized symmetric white support after choke is max(0, stroke width − 2 × choke); validate against real printer/film/ink.

## Proposed acceptance gates

- Immutable source/master with content hash; all enhancements saved as derived artifacts.
- Alpha distribution and foreground-color edge validation on contrasting garment colors.
- Alpha-safe geometry and exported PNG reopen/verification.
- Topology and typography regression tests before and after morphology.
- Effective PPI at final physical size and printability thresholds calibrated by printer/RIP.
- Processing provenance, explicit Ready-to-Print Master selection and human review for ambiguous regions.

## Evidence and scope limits

The accepted URLs were checked against the accessible central ledger and ten mounted recent batch manifests. Full historical semantic audit is incomplete; no global verified count is asserted. Four Turkish academic items are abstract/landing-page reads only, not full-paper reads. Portuguese Medium article bodies were inaccessible and excluded. No production code, deployment, merge, protected storefront or approved master was changed.
