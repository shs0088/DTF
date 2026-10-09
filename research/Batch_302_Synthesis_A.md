# Batch 302 Synthesis A — Alpha and Background
2026-10-09. Research only.

Japanese product-preservation experiment (Ledger 302 source 1) uses trimap, closed-form alpha matting and separate foreground RGB estimation. Synthetic testing shows foreground over-selection and damage to fine details from JPEG/blur. These are not DTF print measurements.

Japanese connected flood-fill tutorials (sources 2 and 3) show why edge-connected background removal can preserve internal white lettering better than deleting every white pixel. A single border seed is unreliable for variable backgrounds or artwork touching the canvas boundary.

PaddleSeg PPM benchmark discussion (source 5) distinguishes alpha SAD, MSE, gradient and connectivity. Add foreground RGB and Arabic stroke/diacritic integrity tests to the DTF synthetic benchmark.
