# DTF Smart Prepress — Engineering Synthesis Addendum 285

Evidence: `research/Batch_285_2026-10-08.md` (9 individually read distinct sources). This is an engineering research addendum, **not** deployed code.

## Alpha/edge handling
- Maintain explicit `color_space`, `alpha_association` and `alpha_bit_depth` metadata at each stage. Work in linear premultiplied float for interpolation/compositing, then encode according to the consumer's straight-alpha or associated-alpha contract.
- Treat halo diagnosis as three separate hypotheses: incorrect association/transfer-function, contaminated RGB from old background, and physically visible RIP white underbase. A clean checkerboard preview alone is insufficient.
- Regression: alpha=0,1,128,255; red logo over white/black/color; resized/rotated mockup; compare output RGB/alpha and double-multiplication; FFmpeg unpremultiply+overlay flags may conflict.

## Segmentation/matting
- High-resolution coarse-to-fine patch refinement is a candidate when uncertain edges are sparse. The referenced BackgroundMattingV2 requires a clean background plate, so do not advertise it as a one-image universal model.
- Segmentation mask != fractional matte != corrected foreground RGB. Preserve small detached islands (Arabic dots/diacritics), holes, fine strokes and semi-transparent glows. Record inference resolution and mapping to full-size coordinates.

## Color science and dithering
- Correct sRGB decoding is `c/12.92` when `c <= 0.04045`, not `c/12.02` as one Russian tutorial's code states. Above threshold use `((c+0.055)/1.055)^2.4`; encode via the corresponding piecewise inverse.
- Run JJN/Floyd–Steinberg known-answer tests in float or safely widened accumulators; record diffusion coefficients, row direction, quantization levels and boundary policy. Dithered screen pixels are not physical DTF print dots.
- Avoid assuming any universal white choke, spread, LPI or alpha threshold. Report minimum feature width and gap in mm at final size, and require printer/ink/film/transfer-specific test strips.

## Production API
- Portuguese local background-removal code offers useful routing and ZIP/decoded-pixel/concurrency limits, but `alpha[alpha <= cutoff] = 0` can destroy intended fades; keep as user-approved reversible candidate, not automatic master mutation.
- Protect approved Ready-to-Print Master; produce mockup/thumbnail derivatives separately. Enforce per-image and aggregate ZIP limits and memory budgets; serialized inference avoids concurrent model RAM spikes.

## Proposed tests
A285-PM01 association/gamma fixture; A285-EDGE02 multi-background halo; M285-HR03 coarse/refine alignment and disconnected islands; D285-SRGB04 low-end 12.92 known-answer; D285-JJN05 scan/edge diffusion; P285-WHITE06 print-calibration-gated white-owner conflict; U285-ALPHA07 cutoff destroys glow and must fail auto-publish.

No merge, deployment or storefront edits.
