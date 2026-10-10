# DTF Smart Prepress — Batch 345 Engineering Synthesis
Date: 2026-10-11

## Progress and verification
16 individually opened/read, locally deduplicated technical sources across 12 languages. Previous provisional upper bound: 3,173; new provisional upper bound: **3,189/10,000 (31.89%)**. Historical semantic deduplication remains incomplete; the globally certified unique count is unknown. 19 deterministic regression tests passed; no physical printer tests.

## Findings and implementation decisions
1. **Preview downscaling is not print-master enhancement.** A Japanese border-seeded Canvas BFS example intentionally caps input at 1,500px. At 16 inches, that is only 93.75 effective PPI, far below 300 effective PPI (4,800 pixels required). Restrict such caps to previews; preserve full-resolution masters.
2. **Alpha-only background removal leaves RGB edge contamination.** The Japanese BFS example updates transparency using color distance without independently reconstructing the foreground RGB. Inspect RGB and Alpha separately against black, white and garment backgrounds; avoid blanket erosion.
3. **Resampling behavior depends on kernels, LUT precision and boundary policy.** Japanese comparison of nearest, bilinear, Mitchell/bicubic and Lanczos notes edge-repeat versus clipping. Test alpha-aware resampling at final print size.
4. **Matting, semantic segmentation and foreground reconstruction are different outputs.** Chinese matting analysis, Russian DGF discussion and Portuguese ONNX/U2-Net workflow support separate gates for classification, fractional Alpha and reconstructed RGB.
5. **Thresholding and morphology may erase legitimate small components.** Turkish textile studies note defects lost in binarization; Italian university image-analysis material covers connectivity and chain codes. Protect Arabic dots, diacritics, punctuation, internal holes and minimum strokes. Compare topology before/after cleanup.
6. **Edge halos have multiple causes.** Korean and French edge guides distinguish white fringes on dark backgrounds from dark fringes on light backgrounds; a German photo example highlights chromatic-aberration color fringes as a distinct mechanism. Diagnose before correcting.
7. **Filter choice and transform order are measurable.** Arabic fuzzy/standard denoising paper evaluates PSNR, MSE and MAE for Gaussian and impulse noise. Spanish 2026 university lab compares smoothing and Sobel and demonstrates that rotation and translation do not commute.
8. **DTF white ink density and choke are independent calibrated variables.** A DTF Station white wizard prints density test charts and saves print modes; an Amaya Digital Factory guide varies underbase and mirroring by substrate. Do not use universal percentages across printers, films and garments.
9. **Error diffusion is not RIP screening.** Error propagation is sequential and can create directional texture; retain high-precision calculations and separate preview dithering from production screening.

## Quality gates
Keep immutable original masters; process preview/mockup copies separately; validate actual effective PPI, topology, edge RGB/Alpha, print dimensions, color profiles, and RIP profile metadata. At 300 PPI, 0.15 mm choke is 1.77 pixels per side, potentially eliminating a 0.20 mm white-underbase stroke. Printer-specific physical validation remains required.

## Repository safety
Research-only documentation; no merge, deployment, storefront modification, or Ready-to-Print Master modification. Complete 16-source canonical URLs and SHA-256 index preserved in the Batch 345 local research package because a repository ledger write was blocked by connector safety checks.
