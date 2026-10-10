# DTF Smart Prepress — Batch 340 Engineering Synthesis (2026-10-10)

## Research integrity
- Previous provisional upper bound: **3,102**.
- Newly individually opened/read, locally distinct technical pages: **15** in AR, ZH, JA, KO, RU, ES, PT, DE, FR, IT, TR, EN.
- Historical duplicate correction: **-1**. Batch 335 and Batch 338 both counted Habr article ID 834546 under different URL forms (company path vs generic article path). Treat as a single article.
- New provisional upper bound: **3,116 / 10,000 (31.16%)**; provisional remainder: **6,884**.
- Global historical semantic deduplication remains incomplete; this is **not** a certified globally unique count.
- Previously counted pages, simple translations and search snippets excluded. Full canonical URLs, hashes and reading references are in Batch 340 local manifest.

## Priority engineering decisions

1. **Never treat browser Canvas as an authoritative RGBA/ICC round-trip.** Japanese browser tests report that default sRGB Canvas can clip Display-P3 colors and that low-alpha premultiplication loses RGB precision. Preserve the original ICC-bearing upload and decoded pixels for prepress. Validate preview and export independently.
2. **Use premultiplied alpha during interpolation, then carefully unpremultiply only when needed.** Chinese graphics research shows that straight-RGB interpolation overweights near-transparent contamination; explicit RGBA representation must be maintained throughout.
3. **Protect thin structures with edge-aware and topology-aware validation.** Korean OpenCV tutorials and German mathematical morphology material demonstrate the effect of structuring element and boundary rules. A French university exercise contains a notation typo: its erosion equation has an opening/dilation symbol on the left; implement min/max against trusted references, not tutorial prose.
4. **Separate impulse-noise detection from reconstruction.** Arabic research proposes neighborhood-aware iterative correction; Portuguese edge-analysis material discusses anisotropic diffusion. Route filters by noise type and compare lost dots, glyph holes and stroke width.
5. **Evaluate quality at the physical print size.** Spanish optical-image morphology research explicitly removes small structures; this can be desirable in scientific segmentation but disastrous for tiny artwork. Preserve Arabic diacritics, white text and isolated fine lines.
6. **Separate DTF/RIP calibration from image preview dithering.** Italian SAi documentation describes ICC-driven settings and dither method selection with printer-dependent tradeoffs. The selected color profile, linearization and media settings should be captured as a reproducible calibration snapshot, never silently overridden.
7. **Treat denoise+sharpen as a measured tradeoff, not automatic improvement.** Turkish 2026 TVD+high-pass research reports improved SSIM/runtime on its dataset, while separate wavelet work reports speckle-specific metrics; neither proves universal DTF printability.
8. **Use border-aware QA and explicit alpha masks.** Distinguish the visible design's white regions from the separate technical white underbase. At 300 effective PPI, a 0.15 mm inward choke is about 1.77 pixels per side; a 0.20 mm isolated stroke can lose its entire underbase under that setting.

## Research constraints
Only research files modified. No merge, deployment, storefront code changes, printing-master changes or printer calibration. The cumulative figure remains provisional until the entire historical corpus is semantically deduplicated.
