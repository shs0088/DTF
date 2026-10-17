# DTF Smart Prepress — Living Research Synthesis

Last updated: 2026-10-17 (Batch 506)  
Target: 10,000 materially distinct source pages individually opened/read.

## Status and confidence

Corrected provisional arithmetic is **5,675 / 10,000 (56.75%)**, with 4,325 remaining by arithmetic. This incorporates the committed Batch 495 checkpoint (5,575), 50 previously reported additions from Batches 496–500, reported B501–B504 additions (7, 9, 8, 8), corrected Batch 505 net additions (10, after one duplicate with B501), and eight Batch 506 additions. Conservative arithmetic excluding B496–B500 is 5,625. The globally certified unique-page count is **unknown**: several historical source indexes are missing or incomplete, and exact URL hashes cannot establish semantic uniqueness.

## Architecture principles

1. **Separate segmentation, alpha estimation and foreground-color estimation.** A mask/alpha matte does not by itself remove old-background RGB contamination. Keep original RGB, alpha matte, corrected foreground RGB and exported RGBA as separate artifacts.
2. **Treat edge decontamination as distinct from alpha changes.** Do not delete all semitransparent pixels to fix a halo; valid antialiasing and fine strokes may be lost. Test composites against white, black and saturated backgrounds.
3. **Use morphology only on an explicit mask and with feature-aware kernels.** Erosion/dilation/opening/closing alter topology. Record kernel geometry/size, test holes and connected components, and avoid silent removal of narrow details.
4. **Make denoising optional and adaptive.** Total variation and bilateral filters can posterize; wavelet approaches and self-supervised parameter calibration are candidates, not automatic proof of quality. Preserve intentional texture and small text.
5. **Control resampling deliberately.** Apply anti-alias filtering during downsampling. Compare resamplers at actual physical print size and retain the original. Upscaling cannot be assumed to reconstruct absent detail.
6. **Bound sharpening.** Unsharp masking enhances high-frequency residuals but can amplify JPEG ringing, noise and halos. Inspect high-contrast boundaries and thin features.
7. **Normalize file metadata early.** Apply EXIF orientation before segmentation, geometry and mockup mapping. Handle palette transparency and alpha representation explicitly.
8. **Keep color-management ownership unambiguous.** Record input profile, output profile, conversion owner and RIP/device profile context; avoid double conversion.
9. **Keep DTF white generation separate from RGB prepress.** White underbase, threshold, choke/spread, halftone, ink limit and layer order are RIP/device-specific. Inspect the white channel separately and physically validate print/transfer results.
10. **Use measurable acceptance gates.** Track edge displacement, components/holes, minimum feature widths at target size, alpha fringe behavior, resampling artifacts, noise/detail preservation and output metadata—not only subjective previews or generic PSNR.

## Research coverage in recent batches

- B501–B502: matting/segmentation, denoising, resampling, thresholding and open-source implementations.
- B503: morphology/distance maps, color-management ownership, edge decontamination and denoising research.
- B504: halftone/dither methods, RIP white-layer behavior, film workflow and physical printability guidance.
- B505: alpha/foreground estimation, trimap-guided matting, high-resolution refinement and vendor-specific white choke. A duplicate audit corrected its net addition from 11 to 10 because the PyMatting overview repeats B501-001.
- B506: denoising calibration, anti-aliased resampling, unsharp masking, EXIF orientation/alpha representation, Russian-language classical segmentation and Portuguese color-aware morphology.

## Production-validation boundary

Published papers, library documentation and vendor guides are evidence for algorithms or documented settings, not proof that a DTF setup is print-ready. No physical validation is claimed without a controlled test using the actual printer, RIP, ink, film, powder, curing and press conditions. Research updates must not deploy or merge production changes; protect the storefront and Ready-to-Print Master workflow.

## Corpus integrity work still required

Recover and reconcile missing/incomplete indexes (notably historical B486, B492, B493 and unsynchronized B496–B505 artifacts), canonicalize DOI/preprint/publisher URLs, deduplicate translated mirrors and alternate versions, and distinguish fully read pages from abstract/metadata-only records. Do not label the cumulative total globally verified until that work is complete.
