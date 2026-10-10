# DTF Smart Prepress — Batch 342 Engineering Synthesis

14 new individually read pages in 12 languages; provisional cumulative upper bound 3144, not globally certified.

1. **Correct source-over alpha:** A_out = A_src + A_dst*(1-A_src). For alpha 0.25 over 0.50, correct 0.625; naïve RGBA masked paste may produce 0.4375. Preserve destination alpha, test mockup compositing on opaque and transparent substrates.
2. **White foreground protection:** Global removal of RGB(255,255,255) also deletes enclosed white ink, lettering and highlights. Use connectivity-aware background selection and protected components.
3. **Morphology QA:** Korean teaching material reverses erosion/dilation effects in one passage; independently validate definitions. Opening can delete legitimate isolated dots and Arabic diacritics. Compare component counts, holes, and physical stroke widths.
4. **Segmentation QA:** Largest-component filtering and hard Alpha thresholding may remove separate logo pieces and antialiasing. Maintain immutable original, audit per-stage topology, and use secure idempotent image-processing jobs.
5. **Distinct processing stages:** Alpha mask, foreground RGB decontamination, white underbase, RIP screening and mockup preview must remain separate; never alter approved printing masters to fix mockup display.
6. **Printer-specific choke:** 0.15 mm at 300 effective PPI = 1.77165 px per side. A 0.20 mm stroke can lose its white support. Vendor choke advice is not a universal specification; calibrate physical prints.
7. **Thresholding:** Spanish, Portuguese, Italian and Turkish sources compare thresholding, morphological segmentation and feature measurements; require physical-size and typography-specific acceptance tests.

17 deterministic regression tests passed (mathematical/software only). No printer, ICC or physical transfer calibration was performed. No deployment or merge.
