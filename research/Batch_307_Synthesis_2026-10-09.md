# DTF Smart Prepress — Batch 307 Engineering Synthesis

Date: 2026-10-09. 15 individually opened/read locally distinct technical sources. Previous provisional cumulative upper bound 2,608; updated provisional upper bound **2,623** (26.23%). Globally certified unique count remains **unknown** because the historical corpus has not undergone full semantic deduplication.

## Engineering findings

1. Browser Canvas color/alpha: Japanese P3 experiments demonstrate gamut clipping on default sRGB canvases and severe RGB round-trip quantization at very low alpha. Preserve original decoded RGBA and ICC metadata; browser preview must not be the printing master.
2. Alpha conventions: keep straight-alpha PNG interchange distinct from premultiplied-alpha filtering/compositing. Avoid double premultiplication and low-alpha integer unpremultiplication. Test interpolation over black, white and contrasting backgrounds.
3. Morphology: Portuguese studies and French lecture notes support marker-constrained reconstruction, hit-or-miss, granulometry and connected-component analysis, but unseeded Arabic dots/diacritics and small details can still disappear. Use topology-delta tests and reversible edits.
4. Physical printability: pixel-to-millimeter conversion is 25.4 / actual pixels-per-inch. One-pixel choke is about 0.0847 mm at 300 ppi and 0.0423 mm at 600 ppi. These are conversions, not universal DTF tolerances.
5. RIP-specific white layer: source documentation describes TIFF spot-channel naming differences (e.g. Spot_1 versus White), pixel contraction, and round-trip validation. A PNG with transparency is not automatically a valid RIP white-underbase input.
6. Dithering: Japanese comparison distinguishes Floyd–Steinberg (7/16, 3/16, 5/16, 1/16) from Atkinson (six neighbors at 1/8). Do not equate creative halftone preview with physical RIP screening; preserve continuous-alpha masters.
7. Matting mathematics: one bilingual Unmult-node guide claims a unique foreground RGB and alpha solution with a known background. This is generally false: three observed RGB values still leave four unknowns (foreground RGB plus alpha). A prior or additional measurement is required.
8. Mockup safety: preserve the immutable Ready-to-Print Master; perform texture filtering, edge bleed, and display resampling only on derived assets.

## Acceptance tests

- RGBA with alpha=0, 1/255, 128/255, 255/255, plus hidden-color poison pixels; P3/sRGB and ICC cases.
- Rectangular artwork and edge-touching features; 1–3 pixel strokes, Arabic dots, holes and disconnected components.
- Physical white-choke test charts at actual size; verify chosen RIP spot channel and printed samples.
- Halftone benchmark with gradients, fine text, transparency and printer-specific dot survival.
- Content-family fingerprints and canonical URL reconciliation before globally certifying any cumulative page count.

Research only. No merge, deployment, storefront or printing-master modifications.
