# DTF Smart Prepress — Engineering Synthesis Addendum 292 (2026-10-08)

## Alpha/foreground RGB
Chinese original empirical testing (https://blog.csdn.net/lank_M/article/details/167032883) reports that its tested fringe-removal option mostly reduced alpha, not RGB contamination, and removed pale leaves/transparent glass. Preserve original RGB, estimated alpha, and foreground RGB as separate intermediates. Compare black, white, colored backgrounds and topology before approval.

## Masks and segmentation
Korean OpenCV examples show constant image-wide addWeighted blending, not spatially varying PNG alpha. Japanese GrabCut gives discrete foreground classes; it does not directly recover true soft alpha. French university morphology lab demonstrates marker-constrained reconstruction; Spanish Canny example with external contours loses interior counters. Add component, hole, and minimum-stroke checks, especially Arabic diacritics.

## Restoration and physical printability
Portuguese inpainting can fill holes with synthetic content, unsuitable for automatic brand/logo/text restoration. White underbase is a separately derived mask: if a line width is w pixels and per-side choke is c, white support may disappear when w <= 2c. At 300 effective PPI, 1 px=0.0847 mm, a geometric conversion, NOT a validated printable threshold. Calibrate actual RIP, ink, film, adhesive, garment and printer.

## Tests to implement later
1. White-on-white lettering, Arabic dots, 1–3 px strokes and inner holes. 2. Semitransparent foreground and alpha edge RGB contamination. 3. Original PNG/ICC immutable through mockup preview. 4. Boundary F1, component/hole changes, alpha MAE and ΔE. 5. RIP white mask after variable choke at final print size. No implementation, deployment or merge in this research batch.
