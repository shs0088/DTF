# DTF Smart Prepress — Batch 378 Engineering Synthesis (2026-10-12)

13 individually opened/read, locally distinct pages (JA1 KO2 TR2 EN2 IT1 RU4 ES1). Searched AR ZH JA KO RU ES PT DE FR IT TR EN. Cumulative provisional upper bound 3745; globally certified unique count unknown.

## Priority findings

1. **Transparent-safe resampling:** Japanese bicubic kernel derivation shows Catmull-Rom equivalence at a=-0.5; Russian Pillow-SIMD papers explain convolution support, downscale widening, fixed-point accumulation, rounding and clipping. Interpolate premultiplied RGBA consistently, protect zero-alpha, use sufficient precision and validate color-managed conversions. RGB-only speed results are not RGBA fidelity evidence.
2. **Segmentation confidence is not fractional alpha:** Korean MediaPipe implementation uses foreground category ID zero and a separate float confidence mask. Validate label polarity per model; estimate alpha separately for ambiguous edges.
3. **Despill is not alpha erosion:** Korean keying research distinguishes color-difference matte, background difference matte, spill suppression and edge color correction. Keep alpha and RGB correction independently reversible.
4. **Distance-transform choke:** Official GEGL documentation exposes distance metrics, edge handling, thresholds and normalization. Convert choke mm to pixels at actual processing DPI; detect thin components lost to erosion and protect white-only strokes. Production limits require real RIP/printer calibration.
5. **Topology and metric discipline:** Italian/Portuguese watershed study separates segmentation from classification. Turkish retina and U-Net papers report dataset-specific outcomes; PSNR and pixel accuracy do not certify DTF text, diacritics, holes or minimum stroke widths.
6. **Color fidelity:** Russian histogram-equalization and color-space articles warn against naive RGB per-channel equalization and nonlinear sRGB arithmetic. Preserve ICC interpretation and avoid global enhancements on branded colors.
7. **Pipeline gates:** Spanish hybrid-segmentation study separates enhancement, segmentation, correction and validation. Iraqi Otsu/SIFT work measures feature extraction, not print-ready mask quality. Evaluate each DTF stage independently.

## Engineering regression proposals

- Test opaque red next to transparent blue under resizing; premultiplication must prevent purple fringe.
- Test category mask where 0=foreground and confidence mask distinct from alpha.
- Convert 0.2 mm at 300 DPI to 2.362 px; preserve dots/strokes that naive erosion would erase.
- Verify color-only decontamination does not change alpha.
- Validate cubic-kernel coefficient sums, fixed-point rounding and accumulator overflow.
- Preserve original uploaded master byte-for-byte and use separate mockup-safe derivative.

## Limitations

No physical DTF printer/RIP/ink/film/powder/garment calibration. Global historical semantic deduplication remains incomplete; 3745 is a provisional upper bound, not a globally certified unique count. No deployment, merge, storefront modification or Ready-to-Print Master modification.
