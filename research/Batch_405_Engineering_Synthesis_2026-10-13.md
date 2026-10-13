# Batch 405 — DTF Smart Prepress Engineering Synthesis

Date: 2026-10-13. Sources: research/Batch_405_Canonical_Source_Index_2026-10-13.md

## 1. Preservation-first image preparation
- An RGBA file is not evidence of transparent pixels. Verify alpha histogram, corner/background connectivity, and composites against black, white and representative fabric colors.
- Generative RGBA editing can change colors, typography and geometry. Keep generative and pixel-faithful cutout modes distinct. Store immutable Ready-to-Print Master and provenance of every derivative.
- Per-pixel compositing requires explicit alpha convention, nonzero-alpha guard, and correct channel broadcasting; do not mistake global blending for compositing.

## 2. Matting and edge decontamination
- Maintain independent semantic segmentation, trimap/uncertainty, alpha matte, foreground RGB reconstruction and final RGBA.
- RVM and ZEGO material illustrate multi-scale refinement and separate foreground-color / spill suppression. Temporal GRU is relevant for video, not automatically needed for static DTF uploads.
- Test spill correction against white-only graphics, light colors and colored text; do not solve RGB contamination by indiscriminately eroding alpha.

## 3. Typography-safe morphology
- French research discusses h-minima, marker-controlled watershed, morphological gradients and alternating sequential filters. Markers and structural constraints can reduce over-segmentation; operations can still delete tiny glyphs.
- Compare connected components, holes, stroke widths and alpha occupancy before/after. Protect Arabic dots, diacritics, punctuation and intentionally separate graphic elements.
- Photoshop majority-neighborhood selection smoothing can remove isolated pixels; never apply without preflight and undo.

## 4. DTF white ink and screening
- Diagnose three distinct defects: residual opaque background, low-opacity fringe and white-separation misregistration. A vendor's 0.1–0.15 mm choke guidance is not a universal setting.
- Convert choke from physical mm to output pixels using output raster resolution (px = mm * PPI / 25.4), then assess minimum stroke widths. Do not confuse artwork effective PPI with RIP raster PPI.
- Preserve fractional alpha in the master; generate RIP-specific white mask/choke as derivative. Thresholding alpha to 0/255 can destroy soft art and should be an explicit choice, not a default.

## 5. API and licensing
- PixelBin API distinguishes general/ecommerce/human removal and optional refinement; a service's successful PNG response is not a print-quality pass.
- Qwen Image 2.1 official repository supports native RGBA creation/editing; its model license and faithful-reproduction suitability must be reviewed separately before any commercial deployment.

## Required next engineering experiments
1. 16-bit/8-bit alpha gradients with source-over and premultiplied resize reference tests.
2. White text, Arabic diacritics and enclosed transparent counters: pre/post topology comparison.
3. Foreground-color spill tests against black/white/fabric composite backgrounds.
4. Print-size and RIP-resolution-dependent choke and underbase separations, verified by physical print charts.

No printer/RIP calibration, deployment, merge, storefront modification or Ready-to-Print Master modification in this batch.
