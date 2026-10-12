# Batch 382 — Engineering Synthesis (2026-10-12)

19 locally distinct opened pages, provisional 3,822/10,000; globally certified unique count unknown. See Batch 382 source index.

1. Background normalization: anisotropic flat-field smoothing can suppress directional stripes in scans, but can also damage intentional texture. Do not apply universally to flat artwork.
2. Alpha/foreground color: compositing and alpha-mask intersection must be distinguished from actual foreground RGB reconstruction; assess edge contamination on light, dark and target garment backgrounds.
3. Typography: morphology, border flood fill and gap closing can delete dots/diacritics or alter enclosed letters. Require topology, component, holes and stroke-width QA.
4. Denoising: preserve text contours with masked/background-specific smoothing. Reproduce implementation bugs before attributing artifacts to an algorithm.
5. Segmentation: consider adaptive color+local thresholds, wavelet seeds, parametric optimization and Gabor texture features. Evaluate per-artwork class and measure boundary and component preservation.
6. Print color: RGB-to-CMYK conversion and palette reduction can alter colors. Preserve ICC metadata and calibrate the actual printer/ink/film combination.
7. DTF underbase: Digital Factory choke wizard prints a physical test chart and print modes preserve settings; NeoStampa guide first checks nozzles and tests fine-stroke choke. Never treat changing a 300-DPI tag to 1200 DPI as creating new image detail.
8. Preserve original Ready-to-Print Master and use separate preview/mockup/RIP derivatives with hashes and provenance.

No physical RIP or printer testing. Historical semantic deduplication incomplete. No deployment, merge or storefront changes.
