# Batch 480 — Engineering Synthesis
Date: 2026-10-16

## Checkpoint
- Newly accepted: 10 individually opened/read pages.
- Previous provisional upper bound: 5,422.
- Updated provisional upper bound: 5,432/10,000 (54.32%).
- Remaining by arithmetic: 4,568.
- Globally certified unique-page count: unknown; historical semantic deduplication incomplete.
- Local integrity checks: 30/30 passed. Physical DTF validation not performed.

## Findings and engineering implications

1. **Separate alpha estimation from edge RGB decontamination.** Adobe's official help distinguishes Color Decontaminate, Defringe, and black/white matte removal. Keep alpha estimation, foreground-color recovery and edge cleanup as separate reversible operations. Excessive defringe can erase thin strokes.

2. **High-resolution matting needs cross-patch context.** The HDMatt paper identifies detail loss from downsampling and boundary inconsistency from independent tiles. For large artwork, test overlapping tiles, cross-patch context and weighted seam blending. Inspect seams, thin text, isolated dots and alpha continuity.

3. **Global sampling can recover colors missing from local neighborhoods.** The Global Sampling Method paper explains that local-only samples may omit true foreground/background colors. A larger candidate pool scored by color fit and spatial distance can help some difficult mattes. Compare it with current learned methods; do not assume universal superiority.

4. **Keep shadow matte separate from object alpha.** The J-STAGE record describes interactive fractional shadow-matte estimation using hierarchical graph cuts. Its PDF was inaccessible, so evidence is abstract-level. For mockups, retain object alpha and shadow as separate layers so a shadow is not accidentally removed with the background.

5. **Preserve editable alpha-channel data.** Adobe's current alpha-channel guide describes grayscale masks and iterative editing. Save masks at source resolution; distinguish mask values from display overlays. Review uncertain regions rather than destructively thresholding all semitransparent edges.

6. **Route matting by image class.** JMNet uses human-pose structure, trimap refinement and gradient loss. This supports class-aware handling: portraits may benefit from human priors, while logos and flat illustrations need different rules. One model should not be assumed optimal for all uploads.

7. **Denoising should protect edges and color structure.** Two Arabic bibliographic records describe impulse-noise filtering, neuro-fuzzy smoothing and HSV/HLS-space filtering. Both are abstract-only. Treat them as candidate methods, and measure edge retention, small-dot survival, hue drift and flat-color consistency alongside noise reduction.

8. **Texture-aware segmentation is a candidate, not a default.** The Turkish SOM/GLCM article combines self-organizing maps and co-occurrence texture features. Evidence is abstract-level; the reported rate is not a DTF accuracy claim. Compare texture methods with simpler threshold/color-space baselines using reference masks.

9. **Resampling has competing artifacts.** ImageMagick's detailed guide describes blocking, ringing, aliasing/Moiré and blur. Select filters by artwork class and scale factor; inspect at target physical size and measure line survival, overshoot and pattern artifacts.

## Priorities for Smart Prepress
- Preserve source, segmentation mask, alpha matte, foreground RGB, and print master as separate reversible artifacts.
- Validate cutouts against light, dark, and saturated backgrounds.
- Test tile overlap and seam consistency for high-resolution matting.
- Route portraits, logos, text-heavy artwork, and textured illustrations through distinct profiles.
- Add resampling checks for blocking, ringing, aliasing/Moiré, blur, and minimum-stroke survival.
- Keep mockup shadows separate from object transparency.
- Record algorithm, parameters, color profile, target physical size and fallback behavior.
- Mark abstract-only sources as lower evidence depth; do not extrapolate medical/rendering results to DTF.

No result here constitutes physical validation on an Epson L1800 or any specific ink/film/RIP setup. No merge, deployment, storefront edit, or Ready-to-Print Master change occurred.
