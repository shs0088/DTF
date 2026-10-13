# DTF Smart Prepress — Batch 412 engineering synthesis

2026-10-13. 14 new individually opened/read locally distinct pages. Updated provisional 4,363/10,000; historical semantic uniqueness not certified.

## Engineering findings

1. Premultiplied-alpha working coordinates are important for filtering. Japanese Go/OpenGL derivation shows straight-RGBA interpolation with transparent black darkens edge colors. Use explicit straight/premultiplied conventions, linear-light working math where applicable, guarded unpremultiplication and straight-alpha PNG export.
2. Separate alpha geometry from foreground RGB edge decontamination. French, Spanish, Portuguese and English studies distinguish color spill, feather, edge shrink, and repainting. If the mask is correct, prefer RGB-only correction over destructive mask contraction; avoid a global binary-alpha threshold.
3. Protect disconnected white/Arabic glyph components. Japanese color-key transparency erases white clothing. Never remove all near-white pixels globally; prefer background-connected or user-guided segmentation and topology checks.
4. Chinese OpenCV tests demonstrate uint8 wraparound (200+100 becomes 44), ROI aliasing, uninitialized masked destinations and missing CJK glyphs in Hershey putText. Use float/saturating operations, clone ROIs, initialize outputs, and a Unicode/BiDi-capable label renderer.
5. Use region-specific processing. Portuguese fine-hair workflow preserves soft alpha around hairs while keeping solid body edges; for DTF, separate photograph, typography, halftone and mockup derivative handling.
6. Turkish comparison of Sobel, Prewitt, Laplace and Canny confirms edge extraction is a segmentation aid, not fractional-alpha matting or foreground RGB recovery.
7. Russian OpenCV and Spanish GIMP references reinforce the need to track BGRA/RGBA channel order, 0..1 vs 0..255 alpha scale and selection-mask polarity. Korean tutorial emphasizes reopening final PNG and checking alpha histogram and multiple backgrounds.

## Proposed QA gates

Immutable upload hash; mask/component/hole topology diffs; alpha histogram and edge-band RGB deltas; black/white/garment previews; minimum stroke width in mm; printer/RIP-specific white-underbase/choke and screening simulation; no double choke; mockup transform only on derivatives; source and export ICC metadata; explicit Ready-to-Print Master approval.

Evidence limitations: These are third-party source findings, not deployed DTF Studio tests or printer calibration. Historical global deduplication remains incomplete. No merge, deployment, protected storefront or Master changes.
