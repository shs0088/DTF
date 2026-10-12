# DTF Smart Prepress — Batch 373 Engineering Synthesis

## Count and integrity

19 newly opened/read, locally distinct pages across Arabic, Chinese, Japanese, Korean, Russian, Spanish, Portuguese, German, French, Italian, Turkish and English. Provisional cumulative upper bound: 3,662 / 10,000 (36.62%). Historical semantic deduplication is incomplete, so a globally certified unique count cannot be stated.

## Technical findings

1. **Alpha and foreground RGB must be independently assessed.** Foreground color recovery is numerically unstable when alpha approaches zero. Some defringing tutorials erase edge alpha instead of correcting contaminated RGB, causing lost fine details. Avoid copying unsigned 8-bit image subtraction examples without converting to signed precision.
2. **Segmentation and matting are distinct.** Preserve fractional alpha and unknown trimap regions; binary masks and overall accuracy cannot certify delicate transparent edges. Evaluate compositing on light, dark and garment-specific backgrounds.
3. **Topology protection is mandatory.** Majority smoothing, global white-pixel tolerance, erosion and opening can erase Arabic dots, diacritics, white lettering and isolated art. Compare connected components, holes and stroke widths before and after processing.
4. **Hidden RGB matters.** Image editors can retain RGB behind alpha-zero pixels or discard it on export. Keep the original master immutable and produce separate mockup textures with safe edge-color extension.
5. **Denoising is image-dependent.** Russian local Otsu/ARC research and Turkish adaptive edge-preserving filtering provide candidates, not universal algorithms. Compare quality metrics and geometry on DTF-specific artwork.
6. **RIP parameters are equipment-specific.** Manufacturer white-choke, white density, ICC, total ink limits and screening figures are suggested settings, not universal DTF standards. Require actual printer/film/ink/RIP calibration and prevent duplicate choke.
7. **Secondary security controls.** Open-source upload processing illustrates separate artwork/object profiles, image-pixel and archive limits, and reusable model sessions. Validate files server-side and run long image jobs asynchronously.

## Verification

46 deterministic synthetic regression tests passed (40 prior tests plus 6 new tests for unsigned subtraction wraparound, RGB/alpha independence, morphology and white-only choke protection). No physical printer or RIP test was performed.

## Change boundaries

Research branch only. No merge, deployment, protected storefront change or original-master modification. Complete per-source canonical URLs, SHA-256 values and evidence references are retained in the local Batch 373 research package pending repository source-index synchronization.
