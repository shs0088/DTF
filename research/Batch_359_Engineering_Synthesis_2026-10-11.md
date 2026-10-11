# DTF Smart Prepress — Batch 359 Engineering Synthesis (2026-10-11)

Research-only update: 17 individually opened/read and locally deduplicated sources. Provisional cumulative 3,410/10,000. Global semantic uniqueness is not certified.

## Engineering findings

1. A Korean OpenCV tutorial describes a binary GrabCut foreground mask as Alpha Matting, but its code creates no fractional Alpha and no RGBA export. Do not accept binary segmentation as evidence of soft-edge matting.
2. A Chinese image-matting walkthrough separates segmentation, Alpha estimation, edge refinement and foreground RGB decontamination. The inverse foreground formula divides by Alpha, making it unstable near zero; use confidence gating and regularization.
3. Japanese OpenCV work demonstrates floating-point Alpha compositing. Italian PNG documentation shows that single-color or palette transparency can discard fractional Alpha. Preserve actual decoded Alpha and an immutable original master.
4. French teaching material contains a mathematical typo in the closing idempotence identity. Independently test mathematical identities rather than copying tutorial equations.
5. MathWorks reconstruction guidance and Spanish academic work establish that reconstruction depends on surviving markers and connectivity. Eroded Arabic dots, diacritics and thin strokes may be irrecoverable. Protect components and holes.
6. Russian connected-component algorithms contrast recursive flood fill with union-find. High-resolution masks can exhaust recursive stacks; prefer iterative, tested labeling.
7. Arabic mean and bilateral filter research shows why denoising should be selective and parameterized. Avoid treating valid isolated ink marks as noise.
8. The ResNet50-Matting implementation provides Alpha SAD, MSE, gradient and connectivity metrics. Evaluate these alongside physical stroke width, effective PPI, and print-specific checks. Review model weight and dataset licensing separately from code.
9. Previously verified CADlink and Caldera documentation requires RIP-mode-specific white-underbase choke, ink density and ICC calibration. No physical printer test occurred.

## Acceptance gates

- Preserve original Ready-to-Print Master bytes; derive reversible previews.
- Verify segmentation, fractional Alpha, foreground RGB and RGBA export separately.
- Report lost connected components, changed holes, edge displacement and faint-pixel truncation.
- Use correct Alpha-mode contracts and linear-light premultiplied resampling where appropriate.
- Do not apply a universal DTF white-underbase choke or artistic halftone to the printing master.
- Log printer, RIP print mode, white density, ICC profile and physical calibration evidence.
- Validate third-party API and algorithm examples against deterministic tests.

Forty synthetic regression tests passed. Portuguese and Turkish candidates were searched but excluded as duplicates or non-opened snippets. Full 17-source URLs, normalized hashes, detailed synthesis, and tests remain in the local Batch 359 package. No merge, deployment or storefront changes.
