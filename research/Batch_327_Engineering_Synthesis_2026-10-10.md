# Batch 327 engineering synthesis

## Research status

11 new individually opened and reviewed technical pages. Provisional cumulative 2915/10000 (29.15%). Globally certified unique count unknown because historical semantic deduplication is unfinished. Ten language groups represented; Arabic and Korean candidates were not countable due to failed opens.

## Findings and implementation gates

1. Indexed PNG palette export can silently turn fractional alpha into binary alpha. Audit the actual exported file, not UI promises: count alpha levels and partial-alpha pixels, and composite against white, black and saturated backgrounds.
2. Mockup derivatives require correct straight/premultiplied Alpha interpretation and transparency-aware resizing. Keep approved printing masters immutable.
3. Morphological opening and closing can remove isolated details or fill holes. Compare topology and protect Arabic dots, diacritics, and thin strokes.
4. Use region-aware denoising to preserve edges; PSNR improvements in an academic study do not establish DTF printability.
5. FM and AM screening and Floyd-Steinberg preview dithering must not replace the selected RIP's calibrated halftone or ink limits.
6. Preserve source ICC and perform physical proofing for color-critical artwork. White-underbase choke is a printer/RIP-specific physical setting, not a universal pixel constant.

Seven deterministic regression tests passed. No physical printer tests, merge, deployment, storefront edits or Ready-to-Print Master edits were performed.
