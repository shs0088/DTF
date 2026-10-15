# DTF Smart Prepress — Batch 445 Engineering Synthesis

Date: 2026-10-15. Sixteen individually opened/read, locally distinct pages were accepted after URL and semantic checks. Previous provisional count 4,976; updated provisional count 4,992/10,000 (49.92%). Historical globally certified unique count remains unknown.

Key findings:
- BiRefNet ONNX Swin-Tiny was benchmarked in Japanese research at about 4.3 s per 1024x1024 inference on Apple M1 Max CPU, with remaining edge color contamination and no quantitative ground truth.
- Maintain the premultiplied RGB/Alpha invariant P=a*F. If changing Alpha but preserving foreground color, rescale premultiplied RGB by new_alpha/old_alpha, with a zero-alpha safeguard. Avoid double premultiplication and verify RGB <= Alpha.
- Directional morphological opening can erase Arabic diacritics and short or perpendicular strokes. Compare connected components and holes before/after cleanup.
- Separate original upload, segmentation, fractional Alpha, foreground RGB reconstruction, and preview/RIP derivatives. Alpha-only erasure may leave hidden RGB.
- Edge decontamination changes RGB. Preserve immutable original masters and inspect composites on contrasting garment colors.
- White choke and line-width limits are printer- and RIP-specific. Idealized remaining support is max(0, feature_width_mm - 2*choke_mm). Never choke twice.
- Sobel and Laplacian gradients are diagnostics, not printability approvals. Record effective PPI and final physical dimensions.
- Reproducible local synthetic regression checks passed 18/18; these do not establish printer or deployed-application validation.

No merge, deployment, protected storefront or Ready-to-Print Master changes.
