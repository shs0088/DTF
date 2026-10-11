# Batch 368 Engineering Synthesis

2026-10-12: 16 new individually opened/read technical pages; provisional cumulative upper bound **3,579/10,000**, not globally certified.

1. Gray working-space conversion can alter opacity derived from grayscale masks. Inspect decoded alpha separately from RGB profiles and PNG gamma metadata.
2. In WebGPU, match straight versus premultiplied texture storage to blend factors; double alpha multiplication creates dark fringes.
3. Decontaminate foreground RGB independently of alpha refinement; preserve soft edges and create reversible derivatives.
4. Preserve Arabic dots, diacritics, thin strokes, holes and disconnected components through topology checks. OCR extraction error rates are not DTF printability limits.
5. Evaluate denoising by downstream segmentation accuracy. Store matting trimap, seed, model version and parameters.
6. Validate actual BGRA/RGBA channel order and alpha after decoding. Keep original master bytes immutable.
7. White-underbase choke and halftone remain printer/RIP/media-specific; physical calibration required.

Thirty deterministic synthetic tests passed; no physical DTF printer validation. Canonical URLs stored in four Batch 368 source files. Historical semantic deduplication remains incomplete. No deployment or merge.
