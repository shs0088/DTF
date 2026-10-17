# DTF Smart Prepress — Batch 506 Engineering Synthesis

Date: 2026-10-17

## Main findings

### 1. Denoising must be tuned against feature preservation
scikit-image's comparison shows that total-variation and bilateral methods can flatten gradients into posterized regions; wavelet denoising thresholds small coefficients, and the example demonstrates YCbCr processing for color images. Adobe's current guidance separates luminance noise, chroma noise and JPEG artifacts, and supports per-channel correction. Keep denoising optional, estimate the noise type, and test at 100% and at intended print size. Avoid smoothing transparent edges indiscriminately.

### 2. Parameter calibration can be self-supervised, but it is not automatic proof of print quality
The J-invariance example adapts denoiser parameters from a noisy image without a clean reference. This may reduce hand-tuning for photographic uploads, but its noise assumptions must be checked. The loss function does not know whether a one-pixel outline, small text counter or distressed speck is intentional. Maintain a feature-preservation test set and validate after calibration.

### 3. Resampling policy is part of prepress correctness
The scikit-image example demonstrates aliasing when downsampling without anti-aliasing and recommends Gaussian smoothing. Pillow documents tradeoffs among nearest, bilinear, bicubic, Lanczos and newer Magic Kernel Sharp filters. Compare candidates at final physical print size; inspect counters, diagonals and thin strokes. Keep alpha handling explicit and do not claim that enlargement restores source detail.

### 4. Sharpening can restore perceived edge contrast but also amplify artifacts
Unsharp masking adds a scaled high-frequency residual: original + amount × (original − blurred). Radius controls spatial scale and amount controls strength. Bound sharpening after noise/JPEG cleanup and inspect halos/ringing around black outlines and high-contrast edges.

### 5. Classical segmentation should fuse color and boundary evidence
The Russian tutorial demonstrates color-space selection, per-channel thresholds, Sobel gradients, seeded region growing and morphology. Raw RGB color distance is not perceptually uniform. Use color-key/flood-fill for uniform backgrounds, but do not confuse a binary mask with an alpha matte. Closing can repair small gaps and area opening can remove isolated islands, yet both can erase counters or merge nearby components.

### 6. Color-aware morphology is a research lead
The Portuguese Eurographics record proposes color-sensitive dilation and erosion for segmented images, including color assignment for pixels changed by morphology. Its linked PDF could not be read in this run, so this finding is abstract-level only.

### 7. Decode and metadata normalization are preflight requirements
Pillow documents EXIF orientation (including rotation/mirroring), palette transparency and resampling semantics. Normalize orientation before dimension checks, segmentation, mockup mapping or physical-size calculations. Test that palette transparency is converted to correct RGBA on export.

## Recommended Smart Prepress pipeline changes
1. Preserve immutable upload bytes and a decoded source snapshot.
2. Normalize EXIF orientation and record original metadata.
3. Classify input (logo/flat graphic/photo/transparent asset/mockup) before choosing filters.
4. Keep denoising, sharpening, resampling and morphology as separate, logged operations with explicit parameters.
5. For downsampling, use anti-aliasing; compare at target physical size and retain the original for rollback.
6. For masks, record kernel shape/size in pixels and equivalent physical units; test components, holes/counters and minimum feature width before/after operations.
7. Composite previews against white, black and saturated backgrounds to detect RGB contamination and alpha defects.
8. Keep white-underbase generation, choke/spread and halftoning in a separately configured RIP-aware stage; this batch does not validate physical DTF transfer behavior.

## Confidence and limitations
- Official library/application documentation is strong evidence for documented API semantics, not for best DTF settings.
- Russian tutorial findings are authored examples, not universal thresholds.
- The Portuguese source is read only at repository-record/abstract depth.
- No physical DTF transfer, printer, ink, film, powder, curing or press test was performed.
- Corpus cumulative count remains provisional until historical batch indexes are synchronized and semantically reconciled.
