# Batch 365 — Engineering Synthesis (2026-10-11)

18 new individually opened, locally distinct technical sources across Arabic, Chinese, Japanese, Korean, Spanish, German, French, Italian, Turkish and English. Portuguese and Russian searches yielded no new accepted source. Previous provisional cumulative 3,498; updated provisional 3,516 / 10,000 (35.16%). Globally certified unique-page count remains unestablished because historical semantic deduplication is incomplete.

## Findings

1. PrintFactory documents a content-aware **No choke on White** option that avoids shrinking white-only details. Bind white generation, screening and choke to a printer-media-mode (PMM), not a universal image-wide erosion. Store calibration evidence and protect fine white text.
2. PrintFactory states white-registration offsets are applied at output and cannot be seen in the RIP preview. Validate physical white test charts, LPI, white density, adhesion and alignment on the actual transferred garment.
3. Bayesian and shared-sampling matting require trimaps and reliable foreground/background samples. Some unknown pixels lack valid sample pairs; propagate uncertainty and fall back rather than generating arbitrary edge colors. One third-party article has a likely sign typo in its compositing equation.
4. Morphological reconstruction retains connected components that have surviving markers; it cannot recover details erased before reconstruction. Protect Arabic dots, diacritics, holes, disconnected ornaments and fine strokes using topology gates.
5. GIMP semi-flatten is optimized for a chosen target background and is unsafe as a universal transparent printing master. Edge decontamination, matte choking and fractional Alpha estimation are distinct stages. Validate artwork on white, black and garment backgrounds.
6. Japanese PNG documentation distinguishes lossless compression from palette reduction. Quantization can alter soft gradients. A Korean blending tutorial states 122 for a half-blend of black and white, but its own arithmetic yields 127.5; code and formulas need independent tests.
7. Clinical-image segmentation and FPGA morphology results are useful method references but do not validate DTF printability; require physical size, edge, white-coverage and transfer tests.

## Engineering gates

Keep immutable Ready-to-Print Master; classify artwork type; process Alpha and foreground RGB separately; measure before/after component and hole counts; protect thin typography; use mockup-only derivatives for target-background flattening; bind underbase to calibrated RIP mode; inspect final exported white separation and physical test prints.

24 synthetic regression tests passed. No physical printer calibration, merge, deployment or protected storefront change.
