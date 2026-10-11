# DTF Smart Prepress Batch 358 — Technical Findings

17 individually opened/read, locally distinct pages. Provisional cumulative upper bound: 3,393/10,000. Global semantic deduplication remains unfinished.

- Real transparency requires decoded alpha inspection, not a PNG extension or checkerboard preview. Large thumbnail downscaling can reveal dark-edge artifacts.
- Border-connected white removal is safer than deleting every white pixel, but still needs protection for lettering, internal holes and partial alpha.
- Marker/mask morphological reconstruction can preserve surviving branches but cannot restore an isolated mark already erased by the marker. Preserve Arabic dots and diacritics.
- Distinguish binary segmentation, alpha matting, and foreground RGB recovery. Known-background matting needs an actual clean-background frame.
- Restrict edge-color decontamination and compare results against black, white and garment backgrounds.
- White-underbase choke shrinks white relative to color. At 300 PPI, 0.15 mm is 1.77 px per side; very thin strokes may lose their underbase. Calibrate by RIP print mode.
- Preserve immutable original printing master and separate all previews/crops/mockups. Verify code snippets against actual APIs.

30 synthetic regression tests passed. No physical printer calibration, deployment, merge or protected storefront changes.
