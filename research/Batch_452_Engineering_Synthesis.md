# Batch 452 Engineering Findings (2026-10-15)

22 individually opened/read locally distinct technical pages. Provisional cumulative 5,107/10,000; global historical semantic deduplication incomplete.

- **Distance-transform choke:** physical radius in pixels is mm × processing-DPI / 25.4. Compare surviving connected components and thin strokes after white-mask erosion.
- **Background removal:** 4- versus 8-connected border flood fill can erase valid artwork touching a canvas edge. Protect uncertain regions.
- **Morphology:** opening by reconstruction preserves shapes of surviving objects but cannot restore dots eliminated entirely by erosion. Preserve Arabic diacritics, holes and halftone islands.
- **Matting:** Alpha estimation and foreground RGB recovery are distinct. Evaluate SAD, gradient and connectivity, and preview on light/dark garments.
- **Denoising:** arithmetic/geometric/harmonic filters, noise-fraction methods and variational diffusion must be chosen by defect; PSNR is not a printability gate.
- **Halftoning:** Floyd–Steinberg error diffusion depends on scan direction. Avoid double processing in Smart Prepress and RIP.
- **Color:** ICC assignment, conversion, PDF output intent, screen proofing and physical printer profiling are separate processes.
- **Export:** preserve original and approved master SHA-256; export genuine fractional Alpha PNG and keep mockup derivatives separate.

Synthetic verification: 16/16 tests passed locally. No physical printer/RIP or deployed application tested. No merge, deployment or protected storefront changes.

Sources: research/Batch_452_Canonical_Source_Index.md
