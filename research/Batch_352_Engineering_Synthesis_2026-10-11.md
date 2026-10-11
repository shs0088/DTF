# DTF Smart Prepress — Batch 352 Engineering Synthesis

Date: 2026-10-11 | 16 new individually opened/read locally distinct pages across AR, ZH, JA, KO, RU, ES, PT, DE, FR, IT, TR and EN. Provisional cumulative upper bound: **3,287 / 10,000 (32.87%)**. Globally certified unique count: not established; historical semantic deduplication remains incomplete. Canonical URLs and SHA-256 hashes: research/Batch_352_Canonical_Source_Ledger_2026-10-11.md.

## Engineering findings

1. **Alpha mode, color space and browser previews.** Japanese Canvas experiments show browser-specific Display-P3 gamut clipping and low-Alpha RGB quantization; Chinese graphics notes show why premultiplied filtering prevents transparent-pixel color bleed. Declare color profile and straight/premultiplied Alpha at every stage. Preserve full-resolution ICC-tagged originals; browser Canvas is preview-only.
2. **Independent verification catches numeric errors.** Korean original GitHub note explains that premultiplied RGB still requires a separate Alpha channel, but incorrectly asserts (100,200,255)×0.1=(10,20,30); correct blue=25.5. The note is marked unpublished and AI-conversation-derived; treat as low-confidence material and verify math.
3. **Connectivity-safe background removal.** Japanese ImageMagick floodfill with a single (1,1) seed can fail when that seed is foreground or background regions are disconnected. Portuguese largest-contour extraction can discard legitimate separate glyph marks; bitwise RGB masking is not fractional Alpha. Preserve enclosed white artwork, dots, diacritics and intentional components.
4. **Matting and edge refinement.** Russian StyleMatte engineering work discusses subpixel matting and guided-filter Alpha upsampling; Arabic wavelet thesis abstract discusses 2-D wavelet coefficients near intensity edges. Retain full-resolution edge cues and uncertainty; the Arabic thesis full PDF was not read in this batch.
5. **Morphological reconstruction is conditional.** German Freiburg and French Talbot materials describe marker-based reconstruction. Erosion can eliminate isolated foreground components irreversibly. Turkish morphology descriptions require formula-based cross-checking. Track topology, holes, minimum stroke widths and foreground polarity.
6. **Code compatibility.** A Spanish OpenCV example unpacks 3 values from findContours, but OpenCV 4.13 returns 2. Pin tested APIs and use regression fixtures before importing third-party snippets.
7. **Denoising vs destruction.** Portuguese hair-removal example uses morphology and Telea inpainting. Inpainting can erase valid DTF typography or textures; require manual approval and immutable masters.
8. **Halo diagnosis.** French defringing tutorial shows white matte residues against dark backdrops; separate RGB edge decontamination from Alpha erosion and RIP white-underbase choke.
9. **Parallel reproducibility.** Italian Bologna thesis compares serial, OpenMP and CUDA morphology. Enforce equivalent kernels, border handling, color/Alpha semantics and deterministic output.
10. **Observable model fallback.** CRAN rembg R port documents ONNX session reuse, trimap thresholds and closed-form matting with plain-cutout fallback. Record fallback as a quality event rather than silently passing preflight.

## Required processing contract

- Immutable original bytes, SHA-256, dimensions, ICC and original Alpha.
- Distinct segmentation, trimap, fractional Alpha, foreground RGB decontamination, transparency-safe resampling and straight-Alpha PNG export stages.
- Structural QA: component count, holes, Arabic dots/diacritics, fine strokes, edge displacement, halo composites against white/black/garment colors.
- Physical printability: effective PPI = pixels / printed inches; choke pixels = choke_mm × effective_PPI / 25.4. A stroke narrower than twice inward choke is at risk of losing underbase; validate against actual RIP/printer.
- White underbase, screening, density, registration and ICC remain device/material-specific. Do not equate visual dithering with calibrated RIP halftoning.
- No preview, mockup or processing derivative may overwrite the Ready-to-Print Master.

## Verification and integrity

**26 deterministic synthetic regression tests passed**, including premultiplication, sRGB conversion, numerical overflow, morphological reconstruction, flood-fill connectivity, effective PPI, physical choke and OpenCV API shape. These are NOT physical printer tests. Batch 350 corrected to 16 additions / 3,259 provisional; Batch 351 to 12 additions / 3,271; Batch 352 to 16 additions / 3,287. Historical semantic deduplication remains incomplete, so the 3,287 count is a provisional upper bound only. No merge, deployment, protected storefront change or Ready-to-Print Master modification.
