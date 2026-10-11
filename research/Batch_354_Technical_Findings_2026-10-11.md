# Batch 354 — Technical Findings

Newly read and locally distinct sources: 15. Provisional cumulative upper bound: 3,318; globally certified count unavailable.

Matting: keep trimap, fractional alpha, foreground RGB, and solver diagnostics separate.

Morphology: preserve Arabic dots, diacritics, holes, and isolated strokes.

Resampling: test transparency-safe RGBA and edge geometry independently from throughput.

Dithering: use floating-point error diffusion and correct serpentine direction. RIP screening is a separate calibrated process.

DTF: white-underbase choke and ICC settings must be calibrated for the actual printer and RIP.

24 deterministic synthetic tests passed; no physical printer tests. No merge or deployment.