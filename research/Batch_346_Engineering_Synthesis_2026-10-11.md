# DTF Smart Prepress — Batch 346 Engineering Synthesis (2026-10-11)

Provisional corpus upper bound: **3,200/10,000** (previous 3,189; 11 individually opened/read and locally deduplicated additions). Global historical semantic deduplication is incomplete, so 3,200 is **not a certified globally unique count**. Searched AR/ZH/JA/KO/RU/ES/PT/DE/FR/IT/TR/EN; accepted 9 language groups; 19/19 deterministic numerical tests passed. No physical printer calibration.

## Findings
1. **Japanese OpenCV Alpha bug**: bitwise AND is not fractional Alpha multiplication. At 127 & 128, the result is 0, whereas 127*(128/255) is about 64. Use normalized float Alpha and correct compositing.
2. **Chinese tiled-matting caution**: a cosine/Hann weighting window can have zero endpoints. If such a window is used unchanged on the outside image border, normalization may incorrectly return Alpha=0. This is conditional because the source does not define its window helper. Assert positive accumulated weights everywhere.
3. **Morphology is destructive**: Arabic, Spanish and French university lectures demonstrate shape-dependent erosion/dilation/opening. Protect Arabic dots, diacritics, fine strokes, holes and isolated design components with topology and physical-size checks.
4. **Invisible RGB is not irrelevant**: Russian texture-filtering research shows that RGB under Alpha=0 can cause fringes during interpolation. Validate mockup derivatives on black, white and garment backgrounds; preserve the immutable printing master.
5. **Global near-white replacement is unsafe**: Portuguese Pillow/NumPy example changes all matching white pixels, including intentional white typography, and RGB conversion can discard Alpha.
6. **Parallel kernels need reference tests**: Turkish FPGA Sobel/morphology research reinforces explicit border, anchor and full-coverage tests.
7. **Open-source matting reference**: np-csu Shared Sampling for Real-Time Alpha Matting implements image+trimap matting; evaluate OpenCV2 compatibility, license and domain suitability.
8. **Blend-model distinction**: weighted order-independent color averages are not a drop-in replacement for source-over compositing.

## DTF acceptance gates
- Preserve uploaded original, ICC information and explicitly selected Ready-to-Print Master.
- Separate segmentation, fractional Alpha, foreground RGB decontamination, transparent RGB extension and mockup-only derivatives.
- Compare component counts, holes, edges, thin strokes, effective PPI and physical white-underbase support.
- Calibrate RIP screening, white density, choke/spread and color management on actual printer/film/ink/garment; no universal default qualifies a file as print-ready.
- 19/19 deterministic tests passed; no physical printing was performed.

No merge, deployment, storefront, or production master modification.