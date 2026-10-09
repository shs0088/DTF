# DTF Smart Prepress — Batch 304 synthesis A
Date: 2026-10-09. Sources: docs/DTF_SMART_PREPRESS_LEDGER_304_A.md and docs/DTF_SMART_PREPRESS_LEDGER_304_B.md.

1. **Matting:** Compositing I=alpha*F+(1-alpha)*B is ill-conditioned when foreground/background colors nearly match. Flag uncertainty, independently verify alpha and recovered RGB, and test code for sampling-loop and denominator errors.
2. **Topology:** Before/after processing, compare components, holes, Euler characteristic and stroke widths. Specify 4/8 connectivity; 3x3 binary LUT has 512 configurations. Preserve Arabic dots, diacritics, counters and border-touching artwork.
3. **Noise:** JPEG color-speckle reduction based on RGB channel range must be optional, reversible and protected against removal of intentional saturated ink.
4. **Transparency:** Anti-aliased grayscale alpha masks preserve fine edges. Color-to-alpha and repeated defringe may remove pale subject colors; inspect on contrasting backgrounds.
