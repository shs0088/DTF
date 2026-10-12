# DTF Smart Prepress — Batch 379 engineering synthesis

17 individually opened and locally deduplicated sources. Provisional cumulative 3762/10000; global semantic certification pending.

Key findings:

1. Printer-Media-Mode calibration must distinguish white ink amount, underbase choke, LPI, white offset, linearization, total ink limit and measured garment gamut. Manufacturer numeric examples are not universal standards.
2. Binary segmentation is not fractional alpha matting. Good Dice/IoU may conceal loss of hair, dots and narrow strokes.
3. Morphological erosion and opening can destroy Arabic diacritics and connected components. Structuring-element geometry, mask polarity and image topology must be checked.
4. White and dark halos require separate RGB-edge and alpha-matte diagnostics against contrasting backgrounds. Alpha erosion is not a default color correction.
5. Watershed seeds and threshold constants are dataset-specific. Morphological reconstruction and region merging can preserve elongated regions.
6. Browser ONNX/WASM processing can provide optional previews but must never overwrite the original Ready-to-Print Master.
7. Denoising and GPU morphology require artwork-specific validation; PSNR and processing speed do not certify DTF printability.

Synthetic numerical regression suite: 32 tests passed. No physical RIP, printer, ICC, or transfer calibration performed.

No merge, deployment, protected storefront modification, or printing-master modification.
