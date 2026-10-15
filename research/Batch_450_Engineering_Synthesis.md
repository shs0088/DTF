# DTF Smart Prepress — Batch 450 Engineering Synthesis

17 distinct individually opened/read sources, 11 languages; 2026-10-15. Provisional cumulative 5,072/10,000, globally certified count unknown.

## Engineering findings

1. Alpha matting: shared sampling estimates foreground/background candidates before alpha refinement; segmentation confidence is not fractional alpha. Guard near-zero-alpha foreground-color recovery.
2. Transparency: preserve BGRA and original master; never flatten a print master to white or JPEG. Preview compositing and print exports are independent.
3. Morphology: a 5x3 erosion can erase thin lines; largest-component filtering can destroy disconnected lettering, punctuation and halftone islands. Record topology and preserve small intended features.
4. Segmentation: Canny edge maps are not alpha masks. Shape-aware region merging should consider color, compactness, rectangularity and class-specific metrics.
5. RIP halftoning: Roland VersaWorks distinguishes faster dithering from potentially finer but slower error diffusion. Pre-halftoning must not duplicate downstream RIP screening.
6. DTF prototype: alpha-only halftone, black knockout and dot gain controls are research candidates, not certified printer settings.
7. Denoising/deblurring: frequency-domain notch filtering is for periodic noise; FFT deconvolution can ring at boundaries. Selective sharpening should limit noise amplification and halos.
8. Model evaluation: French teacher-student segmentation consistency offers a future augmentation-robustness evaluation method, not a current quality guarantee.

## Priority

P0: original master immutable, masks and recovered RGB separate, topology-preserving cleanup, one owner for white-underbase choke/halftone.
P1: defect-specific denoise, alpha/RGB edge QA on black and white previews, physical-size printability limits per calibrated printer.
P2: evaluate segmentation models on thin Arabic/English typography, transparency, texture and mockup derivatives.

No physical printer/RIP test, deployment, merge or storefront change. The count is a provisional upper bound pending historical semantic deduplication. Canonical sources are preserved in the batch research package.