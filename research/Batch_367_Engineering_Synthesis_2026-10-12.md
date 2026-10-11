# DTF Smart Prepress — Batch 367 engineering synthesis

Date: 2026-10-12. Twenty-four individually opened and reviewed, locally distinct pages across twelve languages. Cumulative provisional upper bound: 3,563/10,000 (35.63%). Historical semantic deduplication is unfinished; this is not a globally certified count.

## Engineering findings

1. Border-seeded flood fill protects enclosed white artwork but can leak through gaps. Check connected components, holes and fine Arabic lettering before accepting background removal.
2. Binary segmentation, fractional-alpha matting and foreground RGB decontamination require independent validation. A mask alone cannot establish print readiness.
3. Indexed-color PNG can encode fractional alpha through its transparency table. Some export workflows quantize to binary alpha, so inspect decoded output instead of judging only by file type.
4. Rotation and resizing can introduce black fringes if alpha is mishandled. Preserve immutable original masters and create separate mockup derivatives.
5. German DTF service providers publish differing color-space and minimum-stroke requirements. Use actual provider and RIP print-mode rules, not universal CMYK or metadata-DPI gates.
6. White generation supports distinct Alpha, Shape, Under Color and named Spot methods. Preserve white-only strokes, track choke in physical units and avoid applying it twice.
7. AM/FM/hybrid screening and dot gain depend on the actual printing process. Offset and screen-print numerical examples are not DTF calibration standards.

Thirty synthetic regression tests passed; no physical DTF printer or RIP calibration was performed. Full source URLs, canonical SHA-256 hashes and detailed findings are retained in the local research package. No merge, deployment, protected storefront or Ready-to-Print Master modification.
