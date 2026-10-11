# Batch 364 — DTF Smart Prepress Engineering Synthesis

14 opened and locally distinct sources; provisional upper bound 3,498/10,000. Not globally certified.

1. **Alpha and RGB are separate concerns.** Tree-cutout color fringing and API despill show that changing alpha cannot necessarily remove contaminated RGB. Keep confidence-aware foreground color reconstruction and compositing checks on white, black and garment colors.
2. **Alpha bleed is specialized.** Two distinct open-source implementations extend RGB into transparent texels for bilinear/mipmap cutout textures. This is useful for mockup textures but does not replace correct premultiplied-alpha resampling of soft-alpha artwork. Preserve original master bytes.
3. **Printer-media-mode calibration must be physical.** PrintFactory documents white limits, white-offset registration, test charts for transfer dot retention, linearization, total ink limits and measured gamut. White offset may only be applied at output, not in RIP preview. Do not convert vendor-specific LPI/choke/ink settings into universal standards.
4. **Small-detail protection is mandatory.** Arabic impulse-noise research distinguishes detection from estimation; Turkish research shows image-dependent morphology and thresholding. Check disconnected components, holes, Arabic dots/diacritics and minimum physical stroke widths before/after changes.
5. **Trimap matting differs from binary segmentation.** OpenCV contrib and Japanese tutorials estimate fractional alpha with sure-FG/sure-BG/unknown regions. Korean mask-threshold examples discard partial transparency; validate imported API names and code independently.
6. **Crop only derivatives.** Background-difference crop may change canvas bounds and mockup alignment. Retain original canvas and offset metadata.

Validation: 30 deterministic local software regression tests passed. No physical printer/RIP calibration performed. No merge, deployment, storefront or Ready-to-Print Master changes.
