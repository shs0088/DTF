# Batch 484 — Engineering Synthesis
Date: 2026-10-16
Checkpoint: 5,472 provisional upper-bound pages / 10,000 (54.72%). Global uniqueness remains uncertified.

## Findings
1. **Separate interior and boundary optimization.** POBEVM uses separate target-body and target-edge optimization plus an edge-specific L1 loss. For DTF, evaluate semantic masks and fine boundaries separately; protect narrow strokes, counters, dots and hairline details. The source is video matting, not DTF validation.
2. **Refine uncertain regions selectively.** Mask2Alpha uses mask-guided semantic features, iterative alpha refinement and confidence-guided sparse detail recovery. Benchmark ROI refinement against simpler local methods and ensure confidence thresholds do not omit small components.
3. **Alpha and foreground RGB are different outputs.** The TU Wien thesis treats alpha and foreground color as coupled estimates; the color-aware duplex study addresses color spill explicitly. Validate alpha boundaries and RGB contamination independently, compositing previews on light, dark and saturated backgrounds.
4. **Keep a manual trimap correction path.** Interactive matting research shows how limited user input can improve trimaps and support quantitative evaluation. Preserve originals and editable masks for uncertain edges.
5. **Evaluate segmentation by class.** The German DLR thesis reports class-specific F1 up to 0.93 on land-cover imagery; those values do not transfer to apparel art. Use independent DTF reference sets and class-specific metrics.
6. **Test non-salient and transparent content.** Deep Automatic Natural Image Matting addresses transparent/meticulous and non-salient objects and introduces AIM-500. Include similar-color backgrounds, translucent objects, distressed art, thin lines and small isolated details in the test set.
7. **Background color reveals spill.** The duplex-matting paper estimates foreground RGB and alpha and compensates color spill. Although its alternating-backdrop capture setup is not directly applicable to still uploads, the principle is to test cutouts on multiple backgrounds and correct foreground colors, not merely multiply RGB by alpha.
8. **Graph-based segmentation is a benchmark candidate.** An Arabic catalog record describes seed-guided graph segmentation with reported speed/accuracy improvements on Pascal images. The underlying thesis was not read, so treat it as a lead only.
9. **Noise filters have different failure modes.** The Russian paper discusses averaging, median filters, morphology, wavelets, anisotropic diffusion and Wiener filtering. It warns that smoothing creates edge halos and PSNR can improve while details disappear. Use noise-specific, conservative restoration.
10. **Validation design matters.** The Portuguese review covers thresholding, edge-based segmentation, region growing, intensity/texture/shape features and separate validation/test sets. For DTF, measure IoU, boundary displacement, component survival, minimum stroke width, color shift and runtime independently.

## Implementation priorities
- Preserve the original upload and source hash.
- Keep segmentation, alpha estimation, foreground RGB decontamination and morphology as reversible stages.
- Route by image class and confidence; avoid universal filters.
- Provide manual trimap/mask correction for uncertain boundaries.
- Test composite previews on light/dark/saturated backgrounds.
- Build DTF reference masks with Arabic diacritics, counters, distressed textures and narrow negative spaces.
- Evaluate at final physical size and verify white-underbase survival separately from generic image-quality metrics.
- Keep mockup backgrounds/shadows separate from the print master.

## Evidence limitations
Read depth varies; abstract/catalog-only sources are marked in the canonical index. Domains include video matting, natural-image matting, remote sensing, graph segmentation and medical-image analysis. No source validates a particular printer, ink, film, powder, curing/press process or RIP. No physical DTF test was performed.
