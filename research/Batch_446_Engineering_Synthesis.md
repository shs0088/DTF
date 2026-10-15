# DTF Smart Prepress — Batch 446 Engineering Synthesis

Date 2026-10-15. Individually opened/read and locally distinct: **18**. Previous provisional 4,992; updated **5,010/10,000 (50.10%)**. Global semantic uniqueness is not certified because older batches and unsynchronized records remain incompletely reconciled. Source evidence: `research/Batch_446_Canonical_Source_Index.md`.

## Findings and engineering requirements

1. **Trimap and foreground-color estimation:** Japanese original hybrid CV work uses three-state foreground/unknown/background brushes, closed-form matting, and independent foreground RGB estimation. Its synthetic 104-case x4 benchmark finds 1–2 px structures vulnerable to JPEG and blur; absolute synthetic Dice is not a real-world quality claim. DTF: preserve Arabic diacritics, dots, distressed text, and halftone islands; allow manual FG/unknown/BG corrections; do not downsample before thin-detail recovery.
2. **Topology-aware morphology:** Distinct Portuguese university materials describe opening, closing, connected-component and hole changes, and 4/8/m-connectivity. Italian granulometry defines a pattern spectrum from areas after successive openings. DTF: compute physical-scale feature-size distribution and component/hole deltas before accepting any cleanup. A small disconnected dot may be intentional, not noise.
3. **Alpha vs foreground RGB:** Russian premultiplied-alpha discussion, Chinese anti-aliasing research, and Rust closed-form matting implementation separate fractional Alpha from edge-color reconstruction. DTF: do not treat blurred binary masks as true matting; retain transparent PNG interchange, use premultiplied filtering, inspect hidden RGB, and test composites on contrasting garments.
4. **Gamma and resampling:** `fast_image_resize` explicitly does not linearize sRGB automatically. Its documented RGBA pipeline is multiply-alpha -> resize -> divide-alpha. DTF: independently test gamma-correct linear-light interpolation and Alpha correctness; high-quality kernels alone do not prevent halos. Its docs note some toolchain-specific WASM SIMD Alpha division issues.
5. **Color-to-alpha/chroma-key limits:** German GIMP color-to-alpha and Korean HSV keying tutorials can erase intentional foreground colors that match the selected background. Chinese erosion/blur troubleshooting can erase thin strokes. Gate these methods by artwork class and protect approved Master RGB/Alpha.
6. **Halftone research vs calibrated printability:** Independent Go/Python and MATLAB/Python libraries cover ordered screens, error diffusion, dot diffusion, and direct binary search. None establishes a universal physical DTF dot limit, white choke or ICC profile. Printer-specific patch tests and RIP separation previews remain required; choke must have one owner.
7. **Arabic/Persian workflows:** Distinct rembg GUI/batch tutorials support automation and PNG output, but require separate print-size, color-spill, fine-detail and Alpha checks.

## Recommended deterministic prepress pipeline

Immutable original/hash -> decode and inspect ICC/Alpha -> artwork classification/protected components -> segmentation -> editable trimap -> fractional Alpha -> foreground RGB estimation -> conditional edge decontamination -> linear-light, premultiplied resampling for derivatives -> topology/halo/physical feature gates -> explicit RIP profile (white generation/choke/halftone ownership) -> human review of uncertain regions -> publish.

## Regression checks

**21/21 deterministic synthetic tests passed**: fractional PNG Alpha, premultiplied compositing, morphology opening/closing and granulometry, 4/8-connectivity, trimap degeneracy, gamma-correct midpoint, physical choke/effective PPI, and immutable source hash. This does **not** validate deployed application, RIP or physical printer.

## Exclusions

Previously counted Habr and Japanese articles, localized DTF.pro mirrors, OpenCV matting translation/version mirrors, and pages already present in Batches 436/439/441 were excluded. Arabic Hsoub page returned 403; French and Italian PDF candidates failed to open. Search snippets never counted.

No merge, deployment, protected storefront or Ready-to-Print Master modification.
