# DTF Smart Prepress — Batch 329 engineering notes

Date: 2026-10-10. New locally distinct opened documents: 14. Provisional cumulative upper bound: 2,945 / 10,000 (29.45%). Globally certified unique count unknown; historical semantic deduplication incomplete.

Findings: (1) Keep alpha matting and foreground RGB estimation separate. (2) Check topology, Arabic dots, holes and thin strokes before accepting morphology. (3) Use alpha-aware interpolation and independent mockup derivatives. (4) Record convolution border policies and test corner pixels. (5) Compare bilateral and variational denoising against edge displacement. (6) Validate third-party tutorial code before integration. (7) Printer/RIP-specific white choke must be physically calibrated; 0.15 mm at 300 PPI equals 1.77 pixels per side.

Synthetic regressions passed: morphology dot removal, hole closing, 4/8-connectivity, border padding, bilateral edge preservation, premultiplied alpha, choke geometry, 32-bit component labels and API naming.

No storefront modifications, merge or deployment.
