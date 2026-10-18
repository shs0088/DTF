# DTF Smart Prepress — Living Research Synthesis

Last updated: 2026-10-18 (Batch 520)  
Target: 10,000 materially distinct source pages individually opened/read.

## Status and confidence

Updated provisional arithmetic through Batch 520 is **5,793 / 10,000 (57.93%)**, with 4,207 remaining by arithmetic. This includes the previously reported Batch 519 (+7) and Batch 520 (+7) on top of Batch 518 arithmetic (5,779). Conservative arithmetic excluding reported B496–B500 additions is 5,743. The globally certified unique-page count is **unknown**: historical source indexes are missing or incomplete, and URL hashes cannot establish semantic uniqueness.

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



## Batch 519–520 findings — 2026-10-18

### Batch 519
- Assess white-underbase choke against the actual physical print size; small strokes/dots can lose white support while remaining in the RGB art.
- Keep alpha coverage separate from foreground RGB correction. Binary thresholding destroys partial alpha and can make soft-edge color recovery ineffective.
- Granulometry can characterize mask feature sizes; small components may be intentional, so do not auto-delete them solely by size.
- Prefer one resampling pass from the original and inspect Lanczos ringing on sharp artwork. Treat sharpening as a validated segmentation aid rather than a universal preset.

### Batch 520
- OpenCV Information Flow matting estimates alpha in the unknown region of an RGB image guided by a trimap. The API reference and build/test tutorial are distinct pages from the same implementation family.
- A Chinese implementation demonstrates compositing inversion for a known, approximately uniform background. Guard very small alpha values because division amplifies noise; do not assume the original background is known for arbitrary images.
- Browser-local Transformers.js matting with a locally hosted model can reduce image-upload exposure and avoid external model fetches, but model distribution and licensing still need review.
- Prefer immutable original assets and versioned derived images. Cloud background-removal docs distinguish on-the-fly derivatives from asynchronous upload/update workflows that may replace stored originals.
- Preserve existing partial alpha unless the job explicitly calls for a binary mask. Thresholding is destructive; make it an explicit, reviewable option.
- Async APIs should expose job state, retryable queue/rate-limit errors, and optional webhook completion. Validate remote URL fetching before accepting user-supplied URLs.
- No physical DTF/RIP validation was performed.

## Latest corpus status
Provisional arithmetic: **5,793 / 10,000 (57.93%)**. Globally certified unique-page count remains UNKNOWN pending full historical index and semantic-duplicate reconciliation.


## Production-validation boundary

Published papers, library documentation and vendor guides are evidence for algorithms or documented settings, not proof that a DTF setup is print-ready. No physical validation is claimed without a controlled test using the actual printer, RIP, ink, film, powder, curing and press conditions. Research updates must not deploy or merge production changes; protect the storefront and Ready-to-Print Master workflow.

## Corpus integrity work still required

Recover and reconcile missing/incomplete indexes (notably historical B486, B492, B493 and unsynchronized B496–B505 artifacts), canonicalize DOI/preprint/publisher URLs, deduplicate translated mirrors and alternate versions, and distinguish fully read pages from abstract/metadata-only records. Do not label the cumulative total globally verified until that work is complete.
