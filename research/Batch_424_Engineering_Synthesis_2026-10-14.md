# Batch 424 — DTF Smart Prepress engineering findings
Date: 2026-10-14. New opened/read locally distinct sources: 18. Provisional upper bound 4,568/10,000; globally certified unique count unknown.

## Findings
1. Alpha problems are not interchangeable: a premultiplied/straight-alpha import mismatch differs from foreground RGB contaminated by the original backdrop. Test each separately.
2. For resampling, filter premultiplied RGBA in an appropriate color space, then safely unpremultiply for straight-alpha PNG export. Avoid double premultiplication and unguarded division by low alpha.
3. Matting alpha and recovered foreground RGB are distinct outputs. OpenCV's infoFlow returns alpha from RGB plus trimap; confidence-aware foreground/background color sampling remains necessary.
4. RGB, Lab and HSV can yield different color-segmentation regions. Joint hue/saturation and luminance/saturation histograms can help separate chromatic from neutral artwork.
5. Preserve disconnected dots, Arabic diacritics, internal holes and narrow strokes; morphology and thresholding can destroy printable details.
6. Avoid global near-white deletion: white may be intentional foreground. Prefer edge-connected or seeded background detection with protected components.
7. Image resampling and mockup transformations must not overwrite immutable printing masters. Record transformations and export round-trip checks.
8. DTF white choke is physical: at 300 PPI, 0.1 mm is 1.181 pixels; thin strokes can lose white support. Prevent duplicate choke between preprocessing and RIP.

## Validation
16 deterministic synthetic regression tests passed. These are not deployed-application integration tests or physical printer/RIP calibration. Full source URL/read references and per-source notes are in the Batch 424 local manifest. No merge, deployment, storefront, or printing master changes.
