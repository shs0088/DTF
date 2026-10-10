# Batch 339 — DTF Smart Prepress engineering synthesis

15 newly opened/read and locally deduplicated sources across Russian, Japanese, Chinese, Turkish, Portuguese, French, German, English, Korean, Spanish and Italian. Previous provisional 3,087; new provisional 3,102 (31.02%). Globally certified unique count unknown.

## Verified findings

1. Japanese SpriteKit shader divides premultiplied RGB by alpha with no alpha-zero guard. At alpha=0, zero divided by zero can produce NaN. Use a zero-alpha guard and test mockups on light/dark garment backgrounds.
2. Korean hand-coded 3x3 erosion initializes output black and only computes interior; all border pixels disappear, unlike explicit replicated-border erosion. Require boundary-policy and edge coverage tests.
3. Italian 4-of-8-neighbor morphology is a thresholded vote, not classical full-kernel erosion/dilation. Preserve fine lettering, Arabic diacritics, and holes.
4. German Floyd–Steinberg code rounds and clips individual neighbor contributions, losing error conservation. For error +10, integer contributions 4+1+3+0=8. Accumulate in float until quantization.
5. French Pandore pblend accepts one global alpha scalar; do not substitute it for per-pixel Alpha matting.
6. Chinese Qt SVG rasterization: initialize ARGB32 transparent, distinguish actual pixels from DPI metadata and device pixel ratio.
7. Spanish color decontamination modifies RGB; create a derivative rather than overwriting the approved printing master.
8. Turkish textile research reinforces that fabric appearance is a separate mockup variable; printer-specific white-underbase and RIP settings still need physical calibration.
9. R rembg ONNX model weights are downloaded/cached by default; pin and pre-provision weights to honor offline-only processing.

14 deterministic mathematical/software regression tests passed. No physical DTF printer calibration. No merge, deployment, storefront or Ready-to-Print Master modifications.
