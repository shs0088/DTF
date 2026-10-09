# DTF Smart Prepress — Batch 319 engineering synthesis

Provisional 2810 / 10000 after 14 newly opened, locally deduplicated sources. Historical semantic deduplication incomplete; certified global unique count unknown.

- Keep original RGBA, ICC and source hash immutable. Browser Canvas can clip P3 and quantize RGB at low alpha (Japanese study).
- Binary alpha thresholding can destroy edge gradients, dots and antialiasing. OpenCV default BGR loading and GrabCut/JPEG examples can silently discard transparency (Korean, Portuguese, English examples).
- AI super-resolution may change small glyphs and batch codes despite high apparent sharpness. Protect text with character- and topology-level review (Chinese controlled comparison).
- Filter premultiplied color and alpha together for mockup resampling; avoid straight-RGB interpolation halos (Russian/Italian analyses).
- Use localized denoising/sharpening with edge and stroke-width checks (Arabic, Turkish, German sources).
- Constrain foreground-color recovery to reliable boundaries to avoid color spill (French color diffusion).
- Calculate DTF white choke from actual final-size millimeters and RIP raster resolution; printer-specific physical validation remains necessary.

Synthetic checks: straight-RGBA interpolation midpoint (opaque red, transparent white) yields (128,64,64) on black, versus premultiplied (128,0,0). Alpha 128 snapped to 255 changes coverage by 127 levels. A 0.15 mm choke at 300 PPI equals 1.77 px per side; a 0.25 mm stroke risks losing underbase.

Research only: no merge, deployment, storefront edits or production master modifications.
