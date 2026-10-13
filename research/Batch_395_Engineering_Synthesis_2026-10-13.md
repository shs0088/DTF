# DTF Smart Prepress — Batch 395 Engineering Synthesis
Date: 2026-10-13

## Research count and scope
18 individually opened/read and locally distinct pages; provisional cumulative upper bound **4,056 / 10,000 (40.56%)**. Global historical semantic deduplication and prior unsynchronized source records remain incomplete. Accepted content languages: Japanese 2, Korean 1, Spanish 1, Portuguese 1, German 1, Turkish 4, English 8 (two from French and Italian institutions).

## Engineering findings
1. **Separate segmentation, matting and RGB reconstruction.** Official PyMatting documentation warns that alpha-only compositing leaves halos; MIT derives the underdetermined matting equation. Keep segmentation mask, trimap, fractional alpha, foreground RGB and RGBA separately. Preserve the immutable Ready-to-Print Master.
2. **Transparent RGB bleeding differs from alpha geometry.** Japanese OPTPiX documents filling RGB into fully transparent texels to prevent dark edges in scaled texture previews. Apply RGB padding to a mockup derivative, not the master. Premultiply for interpolation; avoid repeated alpha multiplication and unstable low-alpha unpremultiplication.
3. **Differentiate mockup seam causes.** Japanese sprite research identifies fractional pixel/camera alignment as a source of seams even with valid image data. Diagnose UV/filtering, camera alignment and DTF physical registration independently.
4. **Protect topology during cleanup.** Spanish thresholding/morphology research and Turkish edge/text-region studies support tracking components, holes, thin strokes and isolated marks. Protect Arabic dots, diacritics, punctuation and enclosed white art; flag topology changes for review.
5. **Use defect-specific restoration.** Turkish gradient-switched Gaussian and TVD/high-pass research, and Bologna adaptive regularization, motivate impulse-noise detection and edge-aware restoration. Do not automatically denoise and sharpen every artwork; test for ringing and lost small glyphs.
6. **Avoid double RIP screening.** Stanford halftone examples and UT Austin adaptive error-diffusion research distinguish threshold cells from error diffusion and its directional artifacts. Store printer/RIP screening, channel, seed and calibration metadata. No universal DTF LPI or choke setting is established here.
7. **Typed production contracts.** Require explicit alpha convention, color space, physical units, immutable original hash, and per-stage QC (effective PPI, white-only coverage, connected components, alpha histogram, halos on contrasting backgrounds, and reproducibility).

## Verification and limits
25 independent deterministic synthetic tests passed, covering compositing, low-alpha issues, white-only support, physical choke, connected components, sRGB, PNG and halftone kernels. No deployed-app, physical DTF printer or RIP calibration test. Some papers were reviewed at abstract level only, and the Portuguese course page is syllabus-level evidence. No merge, deployment or protected storefront change.