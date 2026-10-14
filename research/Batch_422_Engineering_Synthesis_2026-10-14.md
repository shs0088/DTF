# DTF Smart Prepress — Batch 422 engineering synthesis

Date: 2026-10-14. New pages: 18. Provisional upper bound: 4,531 / 10,000. No globally certified unique total.

## Priority findings

1. **Foreground RGB decontamination is not alpha-matte repair.** Japanese `distance_transform_edt` example replaces only RGB at semi-transparent pixels using nearest nearly-opaque seeds, leaving alpha intact. This can remove color fringes, but may replace gradients or leak color between disconnected components. Add per-component trusted-seed checks, gradient-aware confidence and before/after compositing on dark/light/color garment backgrounds.
2. **Trimap matting should be hierarchical and uncertainty-aware.** Chinese affinity-matting paper combines KNN-like opaque-pixel classification with adaptive Matting Laplacian for remaining mixed pixels; Microsoft CVPR work separates interactive trimap extraction from high-resolution matting. Preserve a manual correction path, alpha uncertainty map and immutable source.
3. **Local threshold maps are an option, not a universal replacement.** Russian original article approximates a Niblack-like map using local blurred intensity and difference, then normalizes before thresholding. Compare against Otsu/adaptive methods using topology, false foreground and Arabic diacritic survival, not only visual contrast.
4. **Resampling filters can alter alpha at canvas edges.** Japanese bilinear-versus-bicubic experiment shows an edge-touching graphic acquiring partial-transparent pixels in one Photoshop configuration. Test each resize implementation, filter, half-pixel alignment, and alpha convention. Protect source ICC and measure effective PPI at final physical size.
5. **Morphology and watershed need topology guards.** Korean alpha-channel signature exercise and Japanese watershed example show erosion/closing/marker sensitivity; Portuguese research demonstrates topology-sensitive segmentation. Record component count, holes, thin strokes and disconnected punctuation before/after; reject destructive automatic operations.
6. **White underbase must be calibrated independently.** Screen-printing underbase guidance reinforces preserving highlight white, fine text and isolated halftone dots. DTF requires actual RIP/printer/film/ink validation. Convert choke mm to pixels at output PPI, never double-apply choke, and keep white-support derivatives separate from transparent master.
7. **Distance transforms support scalable geometric analysis.** French chamfer distance research describes block overlaps for large image mosaics. Evaluate tiled distance transforms with sufficient halo to avoid seams, and compare against exact Euclidean distance on regression shapes.
8. **Originals and mockups must remain separate.** Segmentation, resampling, denoising and foreground RGB repair operate on derivatives with provenance. Mockup composites must not overwrite or redefine Ready-to-Print Master.

## Recommended next tests

- Synthetic black/white/colored artwork with intentional white letters and isolated Arabic dots; compare alpha preservation and RGB decontamination on three backgrounds.
- Distinct connected components with near but different colors; verify nearest-opaque RGB does not bleed across components.
- Subpixel strokes at multiple print widths and RIP choke settings; verify surviving white support.
- Alpha-aware resize of edge-touching shapes, ICC round-trip, profile assignment vs conversion, and effective PPI.
- Tiled versus whole-image distance transforms with overlap, watershed marker stability, local-threshold maps versus Otsu.

## Evidence and limitations

Source index: `research/Batch_422_Canonical_Source_Index_2026-10-14.md`. Research findings are not deployed-app tests, physical print calibration or proof of generalization. Global deduplication and central ledger backfill are outstanding. No merge, deployment, storefront changes or master changes.
