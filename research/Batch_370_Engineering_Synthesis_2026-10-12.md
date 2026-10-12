# Batch 370 — Engineering Findings (2026-10-12)

17 individually opened and locally distinct pages. Provisional cumulative upper bound: **3,611 / 10,000**; historical global deduplication incomplete.

1. A six-image product benchmark found high pixel accuracy can coexist with very low foreground recall. Evaluate foreground recall and IoU, not accuracy alone.
2. Otsu thresholding, Canny edges, connected components, and watershed solve different problems. Avoid treating an edge map as an alpha matte.
3. Morphology and contour simplification may remove Arabic dots, diacritics, thin strokes, and holes. Require before/after topology checks.
4. RGB fringe decontamination and fractional-alpha refinement are distinct; preserve immutable original masters.
5. Area-based resizing must be extended carefully to RGBA. Low-discrepancy preview dithering is not validated DTF RIP screening.
6. ICC, CMYK+white separation, ink limits and white choke depend on calibrated printer/RIP settings.
7. Clipping paths and continuous alpha masks are not interchangeable.

See Batch_370_Canonical_Source_Index_2026-10-12.md for 17 opened source URLs and evidence identifiers. 35 synthetic regression tests passed; no physical printer testing. No merge, deployment, or protected storefront modification.
