# Batch 487 Engineering Synthesis

Date: 2026-10-17. Ten new source pages were opened and read; cumulative arithmetic upper bound is 5,502/10,000 (55.02%). Global uniqueness remains uncertified.

## Key findings

1. **Matting and edge color:** The Chinese matting abstract describes joint prediction of foreground RGB, background RGB and alpha to reduce color spill. A binary mask or alpha matte alone does not repair contaminated edge colors. Keep matte geometry and RGB decontamination as separate stages; inspect on white, black and saturated backgrounds.
2. **Multilevel halftoning:** Japanese inkjet research shows that independently quantizing light/dark or large/small dots can create poor combined dot distribution. Use this as a RIP/halftoner research lead, not as a DTF underbase preset.
3. **Dot position:** A separate error-diffusion study reports improved perceived dot distribution with finer dot-position control, but computation grows steeply and ordinary printers may not expose such control.
4. **Luma-guided interpolation:** A Japanese paper uses luma-gradient direction to select nearby RGB pixels, reducing false colors before bilevel halftoning. It is a specialized method, not a universal transparent-PNG upscaler.
5. **Textile color management:** A Russian article stresses profiling on the actual textile and selecting rendering intent according to gamut and viewing conditions. DTF profiles must be characterized for the real printer, ink, film, white ink and RIP; do not transplant generic textile or offset profiles.
6. **Adaptive thresholding:** A Spanish inspection paper reports local adaptive thresholding as an efficient baseline for high-resolution micro-feature detection. It is not a replacement for soft alpha matting.
7. **Minimum printable detail:** A Spanish screen-printing patent proposes a gradient/control-mark chart and empirical measurement of the smallest clear dot. Transfer the calibration principle to DTF, not its screen-printing settings.
8. **Alpha-aware resizing:** ImageMagick and libvips docs distinguish alpha operations and resize kernels. libvips resize does not premultiply alpha automatically and does not update DPI metadata.

## Recommended tests

- Compare foreground edges over white, black and saturated backgrounds.
- Resize alpha-bearing PNGs with hidden RGB in transparent pixels, comparing premultiplied and non-premultiplied paths.
- Measure smallest dots, line widths, text counters and negative gaps at target print size.
- Record source/output profiles, rendering intent and which component owns color conversion.
- Print a test chart through the actual RIP and evaluate after curing/pressing.

Limitations: two sources were abstract-level reads; the halftoning work is older general-inkjet research; the color article is general textile printing; the patent concerns screen printing. No physical DTF validation was performed. Global historical deduplication remains incomplete.
