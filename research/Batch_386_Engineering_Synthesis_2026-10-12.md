# DTF Smart Prepress — Batch 386 engineering synthesis
Date: 2026-10-12. Accepted 20 individually opened/read technical webpages in 11 languages. Previous provisional count 3,872; new provisional upper bound **3,892** (38.92% of 10,000). Complete historical semantic deduplication and globally certified count remain unresolved.

## Findings
1. **Alpha residuals invisible on checkerboard:** Chinese one-image experiment measured alpha 1–8 over 5.73% of pixels for one model, revealing residual background against solid colors. These figures are image-specific, not general model rankings. Implement alpha histograms plus white/black/magenta composites and foreground-preservation review.
2. **Matting vs segmentation:** Chinese survey distinguishes Bayesian, closed-form, KNN, and deep matting. Korean SAM walkthrough shows interactive semantic masks; mask confidence is not fractional transparency. Preserve mask, trimap, matte, foreground RGB, and composite as separate artifacts.
3. **Foreground decontamination:** Rust matting implementation couples closed-form Laplacian/CG solving with multiscale foreground RGB estimation. Verify mask polarity and foreground-color correction independently; never replace all semi-transparent pixels with binary alpha.
4. **Morphology and thin text:** Arabic morphology tutorial, Portuguese area opening/closing research, and French watershed/marker methods demonstrate that noise removal can delete isolated dots or connect separate letters. Add component, hole, skeleton, and minimum-stroke invariants; protect Arabic dots/diacritics and white-on-white subjects.
5. **Denoising:** Japanese bilateral and non-local means approaches preserve different edge properties. Turkish microscopy study finds morphology, filtering, and thresholding combinations are image-dependent. Use defect-specific enhancement rather than a universal filter.
6. **Resampling:** Russian experiments discuss interpolation fidelity and performance. DTF implementation should use aspect-preserving, footprint-aware downsampling, linear-light premultiplied RGBA filtering, and evaluate ringing and thin-line loss. Do not claim new resolution from metadata edits.
7. **Color-channel masks:** German tutorial demonstrates selecting high-contrast RGB/Lab channels and luminosity-based masks. Keep editable mask/adjustment stages separate from authoritative RGBA master.
8. **Mockup masks:** Italian GIMP depth-merge guide requires same-sized image and depth maps; use consistent pixel geometry for overlays, avoid destructive modification of the print master.
9. **DTF RIP:** Industry color guide distinguishes output ICC, ink limits, linearization, white density and choke. Never adopt generic total-ink or choke numbers as production standards; use printed/pressed measurement targets per printer, ink, film, cure, RIP and garment.
10. **Controlled-capture matting:** Dual-backdrop research estimates foreground RGB and alpha jointly; useful for dataset creation but requires controlled inputs, not a generic guarantee for user-uploaded JPEGs.

## Validation and next work
This batch was a literature audit only: no physical print/RIP measurements and no new regression suite executed. Next: canonical+semantic historical deduplication, golden-image edge tests, alpha-histogram diagnostics, component survival, color-managed resampling, per-device white-underbase calibration, and async/security review.

## Source audit
20 distinct pages were individually opened. Spanish was searched but its candidate article opens timed out; no Spanish additions. Already-indexed sources and inaccessible pages were excluded. The canonical URL list belongs in a separate Batch 386 source index; until that index is committed, the cumulative number remains a provisional checkpoint, not a fully synchronized ledger. No deployment, merge, or storefront edits.
