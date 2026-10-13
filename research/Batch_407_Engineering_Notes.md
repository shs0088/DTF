# Batch 407 — Engineering Notes

- Validate input alpha range and trimap labels before morphology. Excessive erosion can erase thin strokes.
- Separate alpha estimation from foreground RGB recovery and image compositing.
- Choose cutout strategy based on flat logos, gradient backgrounds or photographic content.
- Keep screen separations and printer-specific white layers as derivatives, never modify the original master.
- Assess output dimensions, connected components and edge quality at actual print size.

18 local synthetic regression tests passed. No printer calibration, merge, deployment or storefront changes.
