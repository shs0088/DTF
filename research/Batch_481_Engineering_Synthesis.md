# Batch 481 — Engineering Synthesis
Date: 2026-10-16

## Checkpoint
- Accepted: 10 individually opened/read source pages.
- Previous provisional upper bound: 5,432.
- Updated provisional upper bound: **5,442 / 10,000 (54.42%)**.
- Remaining by arithmetic: 4,558.
- Globally certified unique-page count: unknown; historical semantic deduplication remains incomplete.
- Physical DTF validation: not performed.

## Findings

1. **High-resolution matting is a memory/quality trade-off.** MEMatte routes informative tokens through global attention and others through a lightweight refinement module. Its claimed high-resolution benchmark gains justify testing memory, latency, alpha-boundary quality, and text/outline survival together; they are not independent DTF validation.

2. **Color conversion must have one owner.** Adobe's official print guide distinguishes Photoshop-managed conversion from printer-managed conversion. If Photoshop manages color, select a profile matching the actual device/media and disable driver-side conversion; otherwise let the driver manage it. With an unprofiled Epson L1800 DTF setup, a generic paper profile is not a substitute for a measured printer/ink/film/RIP profile.

3. **Spot-color separations are not automatically a DTF white channel.** Photoshop separation and duotone guides describe plates, spot channels, screen angles, and export modes for commercial print workflows. A DTF RIP may interpret channels differently. Verify white-channel semantics in the actual RIP before relying on a spot channel.

4. **Keep halftone settings downstream-specific.** Ink order and screen angles affect conventional separation output, but they are not universal DTF settings. Do not copy screen angles, ink percentages, or choke values into a DTF RIP without device-specific evidence.

5. **Thresholding should be chosen against a reference mask.** The Spanish article compares grayscale thresholding and Hough-boundary segmentation against a specialized reference. Thresholding performed better in that tested satellite domain. Smart Prepress should benchmark methods by artwork class using overlap, boundary displacement, and connected-component survival.

6. **Text segmentation needs glyph-preservation checks.** The Korean record describes character extraction problems with unusual glyph shapes and overlapping regions; the Russian U-Net paper addresses document blocks such as columns/headings. Layout detection can route text-heavy regions, but must not replace glyph-level masks or printability checks for dots, counters, diacritics, serifs, and narrow gaps.

7. **Upscaling metrics do not prove printability.** The Chinese BSTN page reports PSNR gains for 2×/3×/4× reconstruction. PSNR and perceived sharpness do not prove tiny lettering survives. Keep the original, compare stroke width/edge overshoot/glyph shape, and inspect at final physical size.

8. **Output is a pipeline, not a single filter.** Japanese articles index halftoning, color reproduction/conversion, color management, and capture-to-output optimization. Their records are abstract-level reads, so they provide framing rather than parameter-level evidence.

## Recommended actions
- Track source profile, output profile, conversion owner, rendering intent, and RIP color conversion separately.
- Preserve original pixels and alpha/spot-channel data; create distinct web/mockup and print-master derivatives.
- Treat spot-channel previews as provisional until the intended RIP confirms the separation.
- Benchmark matting with alpha error and boundary metrics, not only global similarity.
- Add physical-size checks for minimum stroke width, isolated dots, counters, and narrow gaps after resampling/choke.
- Evaluate segmentation against manually verified reference masks and record false positives/negatives.
- Keep all changes reversible and preserve the original upload.

## Exclusions
- RenderMatte — exact duplicate in Batch 471.
- Training Matting Models Without Alpha Labels — exact duplicate in Batch 460.
- Portuguese morphology paper — exact duplicate in Batches 438 and 450.
- Turkish multi-level thresholding paper — exact duplicate in Batch 475.

Historical semantic deduplication is incomplete. No physical DTF printer, ink, film, curing, press, or RIP test was performed.
