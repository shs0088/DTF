# Batch 457 — Engineering Synthesis (2026-10-15)

**Provisional corpus 5,201 / 10,000; globally certified unique count unknown.** 11 individually opened/read new pages after central-ledger and recent-manifest dedup. 16/16 synthetic regression tests passed locally, not physical DTF/RIP certification.

1. **Alpha-association contract.** FFmpeg overlay and unpremultiply modes must match. Track straight/premultiplied Alpha and linear/encoded RGB explicitly; double transforms create halos (JA source 1).
2. **Edge RGB is not Alpha.** Test compositing on black, white and garment backgrounds; fringe heuristics must not automatically erase legitimate translucent artwork (EN source 2).
3. **Morphology topology gate.** Korean OpenCV tutorials demonstrate that opening removes isolated components and closing fills holes. Preserve Arabic dots, diacritics, thin strokes and isolated halftone dots; measure connected components and physical feature widths before cleanup (KO sources 3,8).
4. **ICC preservation is an explicit export requirement.** Pillow/FFmpeg/sips comparison shows tool/format-specific profile loss. Capture input ICC, intended output profile and verified output ICC, with colorimetric swatches (JA source 7).
5. **Preserve hidden RGB where editing requires it.** GIMP/babl fixed loss of fully transparent pixel RGB during premultiplied transforms; test channel round trips, not just flattened appearance (FR source 5).
6. **Diagnose white halos by root cause.** Separate opaque backgrounds, contaminated semi-transparent edges, mechanical registration and RIP white choke. Do not apply blanket binary Alpha thresholds or vendor choke values (IT source 4).
7. **Physical DTF preflight.** Require effective PPI at final print size, transparent PNG edge checks, white layer ownership (RIP or prepress), and calibrated printer/film/ink/powder/garment trials (IT source 10).
8. **Restoration versus segmentation.** Denoising/deconvolution and edge detection are distinct from segmentation; a higher sharpness score does not prove design fidelity (FR source 6).
9. **Non-destructive masks and derivatives.** Editable channels/masks and immutable Ready-to-Print Master; separate mockup/cleanup/RIP derivatives (IT source 9).
10. **File format capabilities require round-trip tests.** AVIF/JPEG XL may carry Alpha/ICC but decoder, encoder and RIP support vary (FR source 11).

**Next:** historical semantic deduplication, central-ledger reconciliation, Alpha/RGB recovery tests, topology-safe Arabic typography preservation, physical RIP halftone and white-underbase calibration. No merge/deployment/storefront changes.
