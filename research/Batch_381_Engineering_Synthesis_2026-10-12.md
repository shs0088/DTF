# Batch 381 — Engineering Synthesis (2026-10-12)

18 individually opened/read, locally distinct sources; provisional cumulative 3,803/10,000 (38.03%), globally certified unique count unknown.

1. **PNG-8 export quality:** A specific Japanese test showed alpha collapsed to binary under one exporter. Require decoded alpha-histogram checks; not a universal PNG-8 limitation.
2. **Mockup RGB edge bleed:** Krita's Propagate Colors supports filling hidden RGB into transparent pixels without modifying alpha. Apply to mockup derivatives only; retain master SHA.
3. **Topology-safe cleanup:** Marker-based geodesic reconstruction preserves selected shapes but cannot restore isolated Arabic dots absent from markers. Compare components, holes, and stroke widths.
4. **Resampling:** Bicubic may ring, undersampled warps alias thin text; benchmark footprint-aware downsampling and alpha-correct filtering.
5. **Denoising:** Anisotropic diffusion, total variation and rank filters require noise-specific, geometry-preserving choices; do not auto-sharpen typography.
6. **Segmentation vs matting:** Instance masks and trimaps are intermediate; preserve fractional alpha and foreground RGB reconstruction as independent QA stages.
7. **DTF production:** RIP queue wizards separately calibrate max white, white-under-black, black removal, choke, color boost and rendering intent using physical test charts; no universal preset.
8. **Arabic document cleanup:** Global color thresholding can delete legitimate same-color foreground; protect white art and diacritics.

Sources in research/Batch_381_Canonical_Source_Index_2026-10-12.md. Historical semantic dedup incomplete; no physical RIP validation. No merge, deployment, protected storefront or master modifications.
