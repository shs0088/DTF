# DTF Smart Prepress — Batch 402 Engineering Synthesis

Date: 2026-10-13. 22 new individually opened and locally distinct pages; provisional upper bound 4,182/10,000 (NOT globally certified; historical semantic audit pending).

## Critical findings

1. A Chinese Python tutorial contradicts itself: prose says alpha 255 is transparent, while the code correctly writes alpha 0. In 8-bit RGBA, alpha 0 is fully transparent, 255 opaque. A global near-white threshold also deletes legitimate white lettering.
2. Korean OpenCV research distinguishes global `cv2.addWeighted` from true per-pixel alpha compositing. Load PNG with `IMREAD_UNCHANGED`; do not flatten Alpha during thresholding.
3. Japanese FFmpeg experiments find `unpremultiply` reduces some fringes, but residual same-color errors remain. Use explicit straight/premultiplied contracts and contrasting mockup-background checks.
4. Spanish, Portuguese and Korean morphology material shows erosion/opening remove small islands; preserve Arabic dots, diacritics, punctuation, interior holes, and fine disconnected art. Compare topology before and after processing.
5. French segmentation material distinguishes region labels, watershed boundaries and fractional alpha; segmentation confidence is not an alpha matte. Reconstruct foreground RGB independently.
6. German subpixel contour research shows that pixel-scale edge accuracy should be measured against geometry; report final-size displacement in millimeters.
7. Spanish color thresholding and French Otsu examples demonstrate global grayscale thresholds fail when foreground/background intensities overlap. Add color-aware and user-guided alternatives.
8. A Russian color quantization article distinguishes sampling, thresholding and dithering. Keep artistic dithering separate from calibrated RIP screening.
9. Physical choke example: 0.2 mm at 300 PPI = 2.362 pixels; idealized 0.4 mm strokes can lose all white support after a 0.2 mm choke from each side. Printer-specific testing is required; this is not a universal setting.
10. Official GIMP `Image.select_color` API exposes threshold, antialias and feather options, but a color selection is not alpha matting. Pin API versions and test processing branches.
11. Iraqi wavelet reflection-removal research uses reflection/background edge priors, not a generic one-click artwork-background remover.

## Pipeline contracts

Ingest and hash original master → decode/ICC validation → background segmentation → trimap → fractional Alpha → foreground RGB decontamination → mockup-safe derivative → physical printability checks → RIP-calibrated underbase and screening. Never silently overwrite the original Ready-to-Print Master or apply choke twice.

## Verification

28 deterministic synthetic mathematical/geometry tests passed locally. No deployed application, RIP, printer, film, ink or wash-durability test was performed. No merge, deployment, protected storefront or printing-master modification.
