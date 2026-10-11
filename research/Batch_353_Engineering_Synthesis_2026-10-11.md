# DTF Smart Prepress — Batch 353 Engineering Synthesis (2026-10-11)

Research covered 16 individually opened, locally distinct sources across Arabic, Chinese, Japanese, Korean, Russian, Spanish, Portuguese, German, French, Italian, Turkish, English and Indonesian. The provisional cumulative count is **3,303**; historical semantic deduplication remains incomplete.

## Findings

1. Alpha Matting, binary segmentation and foreground RGB reconstruction are distinct. Avoid treating GrabCut binary output as true fractional Alpha.
2. For RGBA resampling, convert to a consistent color space, premultiply RGB by Alpha before filtering, and safely unpremultiply for straight-Alpha export. Independent interpolation of RGB and Alpha can introduce colored fringes.
3. GPU mockup shaders require explicit straight/premultiplied Alpha blend factors; applying Alpha twice darkens semi-transparent edges.
4. Protect Arabic diacritics, punctuation, isolated details and enclosed counters during erosion, opening, closing and reconstruction. A removed isolated component cannot be recovered from a marker that no longer contains it.
5. A Korean tutorial contains a misspelled OpenCV API name: getStructuringElment instead of getStructuringElement. Validate tutorial code with reference APIs.
6. Calculate DTF white choke in physical units: 0.15 mm at 300 effective PPI equals about 1.77 pixels per side. Thin strokes can lose white support.
7. Keep ICC, ink/film lots, white density, RIP choke and registration as printer-specific calibrated parameters, recorded alongside physical samples.

**Validation:** 26 deterministic synthetic regression tests passed. No physical printer calibration. No deployment, merge, storefront modification or Ready-to-Print Master mutation.

Full source URLs, SHA-256 hashes, read notes and exclusions are in the Batch 353 local canonical ledger.