# DTF Smart Prepress Batch 401 — Engineering Findings

Date: 2026-10-13.

Twenty distinct technical pages were individually opened and read. Provisional upper bound increases from 4,140 to 4,160 of 10,000. This is not a globally certified count because historical semantic deduplication is incomplete.

## Research findings

- Joint alpha, foreground and background estimation is preferable to using segmentation confidence directly as transparency when edge color spill is present.
- Trimap design and foreground/background sample confidence determine the stability of matte recovery.
- Inverse compositing for foreground reconstruction becomes numerically unstable as alpha approaches zero.
- Morphological thinning and pruning can destroy legitimate glyph endpoints. Preserve connected components, internal holes and Arabic dots/diacritics.
- Adding an alpha channel to a three-channel image with a conversion operation produces an opaque channel; it does not remove the background.
- PNG resizing requires separate validation of alpha preservation and interpolated edge quality.
- Image-quality metrics should include edge gradients and interior semantic errors, but cannot replace print-specific physical feature measurements.
- Model artifacts need checksum, version, licensing and backend provenance; image enhancement must preserve the original Ready-to-Print Master.
- DTF white-underbase choke belongs to a calibrated RIP or a controlled file separation, never both. Protect fine strokes and verify printed calibration charts.

## Verification

21 deterministic synthetic invariants passed locally. No printer or deployed application was tested.

No merge, deployment, protected storefront or printing-master modifications.
