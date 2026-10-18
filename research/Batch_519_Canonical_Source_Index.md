# Batch 519 — Canonical Source Index

Research date: 2026-10-18. Seven pages individually opened/read. Reading depth is recorded below. Historical global uniqueness remains unverified.

## B519-001 — DTF White Ink Checker
- Canonical URL: https://dtfwiz.com/tools/white-ink-checker
- Language: English; full technical tool page.
- Finding: underbase choke is an inward mask shrink; fine features can lose white support at final physical size. The site's LPI/choke numbers are vendor guidance, not universal standards.
- URL SHA-256: 33d4b06e7d341316b774f4f3bfe45a6c80e8243319f27f224d1dd628ad83702d

## B519-002 — rembg implementation README
- Canonical URL: https://github.com/danielgatis/rembg
- Language: English; usage, edge modes, decontamination, model, and cloud/API sections read.
- Finding: distinguishes alpha coverage from foreground RGB decontamination; binary thresholding destroys partial alpha; model-weight licensing and cloud transmission need separate review.
- URL SHA-256: 501a8b8f944cd3792ce6e4b42a8f0999ed672e53de90e330b2e68aadf67cdc36

## B519-003 — UFF Visual-Lab binary morphology
- Canonical URL: https://visual.ic.uff.br/morphology/binary.html
- Language: Portuguese; full page.
- Finding: erosion/dilation/opening/closing alter topology according to structuring-element geometry and scale.
- URL SHA-256: e8188c8305aff0975206eda1c5639825274af95d9e598594fdac7fc130b98973

## B519-004 — UFF Visual-Lab granulometry
- Canonical URL: https://visual.ic.uff.br/morphology/granulometry.html
- Language: Portuguese; full page.
- Finding: successive openings at increasing scales characterize feature-size distributions and can diagnose specks/fragile mask components.
- URL SHA-256: f54191ffe9e18c91226ea4ce90e4e79e9bd615ea2d2a9b8790dedd0ecd2b6fd6

## B519-005 — Habr supersampling article
- Canonical URL: https://habr.com/ru/articles/521124/
- Language: Russian; full technical article.
- Finding: area-coverage supersampling for scaling/rotation/subpixel translation; interpolation cannot restore absent source detail, and repeated transforms can amplify artifacts.
- URL SHA-256: 05bf2580a5d68eb0a2f0100c3aff2ae43ea76e469aecd8b6567f2dac88a8fcb9

## B519-006 — OpenCV distance-transform/watershed tutorial
- Canonical URL: https://docs.opencv.org/4.13.0/d2/dbd/tutorial_distance_transform.html
- Language: English; theory/code sections read.
- Finding: signed floating-point Laplacian, Otsu thresholding, distance-transform peaks, morphology, and watershed markers form a candidate segmentation pipeline; negative filter values must not be clipped prematurely.
- URL SHA-256: 52222604ca7b2016d21034051d3b4aba3fbf64b453e8755fd89067f0035a74c5

## B519-007 — Apple MPSImageLanczosScale
- Canonical URL: https://developer.apple.com/documentation/metalperformanceshaders/mpsimagelanczosscale
- Language: English; official API overview and resampling notes read.
- Finding: Lanczos can ring near sharp/vector-like edges; benchmark separately for photographs and flat-color artwork.
- URL SHA-256: f7003ca6882889b676f0af4ef3f451e5dae5ef99e2eaf82f42dc19ea433c3409

## Deduplication/evidence boundary
The previous batch report records sampled-index exclusions, including PyMatting (B409), BorderCut (B440), MEMatte (B481), PixelCleaner choke (B478), Aero Print (B470/B478), and the Russian Habr ARC-filter tutorial (B421). Current branch history is incomplete; URL hashes establish string integrity, not semantic uniqueness. No physical DTF validation was performed.
