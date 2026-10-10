# DTF Smart Prepress — Batch 331 Engineering Synthesis (2026-10-10)

Progress: 10 individually opened, newly accepted sources; previous provisional 2,957; updated provisional **2,967/10,000 (29.67%)**. Globally certified unique count remains unavailable until historical semantic deduplication is complete.

## Findings
1. A Korean OpenCV morphology lesson exports its processed binary mask as JPEG. Lossy JPEG introduces gray pixels into binary masks; require PNG or lossless arrays for alpha, trimaps, connected-component labels and white-underbase masks. Verified by deterministic PNG/JPEG roundtrip.
2. Exact-white deletion can erase intentional white foreground artwork. Use border-connected candidates, foreground keep regions, topology checks and explicit review of ambiguous holes. Do not assume flood fill handles enclosed backgrounds.
3. German university morphology material and official MathWorks reconstruction documentation show marker/mask propagation. Reconstruction retains only seeded components; a two-component regression retained 25 of 50 foreground pixels when only one component was seeded. Preserve Arabic dots and diacritics by seeding all protected components.
4. Spanish original research on adaptive morphological neighborhoods uses local HSV-based similarity and tolerance. A global structuring element can remove fine strokes; test local orientation and minimum stroke width before any erosion.
5. DTF Station's print-setting wizard documents separate physical calibration charts for maximum white ink, black removal, white under black, white choke, color boost and photo merge. Store settings per printer/ink/film/garment and RIP print mode.
6. Italian laser-engraving dithering guidance distinguishes Atkinson, Floyd–Steinberg and Jarvis–Judice–Ninke. These choices are not interchangeable with calibrated DTF RIP halftoning.
7. French morphology course covers geodesic reconstruction, watershed, thinning and distance transforms. Russian constrained-compute binarization and Turkish filtering materials inform diagnostics, not universal DTF thresholds.

## Validation
Eight synthetic regression tests passed: enclosed-white protection; JPEG binary-mask corruption; seeded reconstruction; 1-pixel stroke erosion; structuring-element orientation; physical choke conversion; fractional-alpha preservation; and bitwise-mask versus alpha multiplication.

No physical printer tests were performed. The original Ready-to-Print Master and protected storefront remain untouched. No deployment or merge.

## Deduplication
Compared against the full accessible central repository ledger and available Batch 321–330 manifests. Four already-counted central sources and two recent-manifest duplicates (Portuguese and Japanese) were excluded. Failed opens and localized mirrors were not counted. Source URL SHA-256 keys are not semantic content fingerprints.
