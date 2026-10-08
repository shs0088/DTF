# DTF Smart Prepress — Engineering synthesis addendum 277

Sources and counting: `research/Batch_277_2026-10-08.md`. 9 individually opened/read new pages in Japanese, Chinese, Turkish, French and German.

## New or sharpened decisions
1. **Border connectivity precedes narrow dilation:** for near-uniform backgrounds, find border-connected color regions first, then optionally expand mask by a small calibrated amount to remove edge antialiasing residue. Reverse ordering can connect into enclosed foreground details. Fail-safe for open contours and preserve white/black details in logos.
2. **Canvas is not an RGBA master transport:** Japanese experiments show that premultiply/quantize/unpremultiply yields alpha-dependent RGB precision loss (alpha=1 recovers only 0 or 255 per channel in 8-bit example). Prefer decoder-preserved source pixels for canonical processing; Canvas may be used for disposable preview. Regression-test low-alpha RGBA.
3. **Alpha and color are separate artifacts:** matte/alpha refinement changes coverage; RGB decontamination changes the foreground estimate. Perform independent QA on black, white and garment-colored backgrounds. Avoid over-aggressive defringe that removes fine strokes.
4. **Premultiplied-linear intermediate:** explicitly record buffer alpha association and color transfer function. Convert to straight-alpha export only once. A renderer may produce premultiplied passes; interpreting them as straight produces a dark fringe.
5. **Guided filter and morphology are scale/context aware:** guided alpha refinement uses source RGB edges; it does not increase effective PPI. Morphology kernels must be expressed in physical millimetres at final print size, and compared before/after for islands, holes and thin-feature survival.
6. **White support and choke are RIP calibration, not matte cleanup:** manufacturer PrintFactory documentation (Portuguese localized edition, **not counted** as an original page) distinguishes registration offset in X/Y, underbase choke, measured white ink limits, LPI test charts and transfer survival. Do not import suggested numeric values as universal DTF thresholds.
7. **Mockup derivative isolation:** optional hidden RGB extension for texture filtering should never alter print-master alpha, ICC or white eligibility. Record derivative provenance.

## Proposed tests
- Alpha values [0,1,2,10,128,255] and bright edge RGB after one vs repeated Canvas round-trips.
- Enclosed white letters, highlights, broken outlines, distressed dots; flood-fill before/after dilation.
- A soft hair/glass matte, an opaque logo, and a transparent smoke effect; measure edge-band errors.
- Mipmapped preview on black/white/dark-garment and original master hash invariant.
- A 0.3 mm feature at two print sizes and different calibrated choke/PrintMode settings; assert white/adhesive survival is separately reported.

No production changes, deployment or merge.
