# DTF Smart Prepress — Batch 393 Engineering Synthesis
Date: 2026-10-13 | 15 individually opened, locally distinct sources | provisional cumulative upper bound **4,018/10,000** | certified global count **unknown**.

## Engineering decisions (image processing first)

1. **Low-alpha RGB and color-managed decoding.** Japanese Canvas experiments document severe RGB quantization when premultiplied 8-bit pixels with very low alpha are converted back to straight RGB, and engine-specific Display-P3-to-sRGB clipping. The production analyzer should inspect decoded source bytes in a controlled ICC-aware image library; Canvas previews are not authoritative for edge-color diagnostics. Test alpha 0..255 with non-primary RGB and embedded ICC profiles. Sources: https://qiita.com/xyue41464/items/13cc3e5bc9eb28021303 ; https://zenn.dev/yoya/articles/d874880e1820a5

2. **Color key is not matting/decontamination.** Two-threshold RGB-distance chroma keying produces a soft alpha transition but can delete white-on-white foreground or pale artwork. Keep semantic mask, alpha matte and foreground-RGB reconstruction separate. Never silently change alpha to hide contaminated RGB fringes. Source: https://zenn.dev/sktt_panda/articles/image-color-remove-chroma-key-browser

3. **Dithering: verify numeric units, kernels and scan order.** Portuguese university teaching distinguishes enlarged halftone cells, Bayer dithering and Floyd–Steinberg diffusion. German programming material gives actual Bayer matrices and per-neighbor integer rounding. Italian experimental research uses serpentine diffusion and optical feedback calibration. Validate 0..1 vs 0..255 intensity scales, signed quantization errors, deterministic seeds, precision, final physical dot size, and whether the RIP will screen again. Artistic halftones are not calibrated RIP screening. Sources: https://www.inf.pucrs.br/pinho/CG/Aulas/Img/IMG.htm ; https://beltoforion.de/de/dithering/ ; https://amslaurea.unibo.it/id/eprint/16951/1/Luca%20Cavicchioli%20-%20Tesi.pdf

4. **Morphology changes topology.** German university lecture shows that opening can remove small connected components and closing can fill holes. Preserve Arabic dots, diacritics, punctuation and negative-space counters; compare connected components, holes and physical stroke width before/after processing. No universal 3x3 opening. Source: https://lmb.informatik.uni-freiburg.de/people/haasdonk/DBV_FHO/DBV_FHO_WS0708_E09_handout.pdf

5. **Denoise by defect class, not automatically.** Arabic research separates impulse-noise detection from estimation to preserve image details; Italian research describes nonlinear diffusion variants (Perona–Malik, total variation, curvature). Avoid median filtering on legitimate isolated text dots. Sources: https://direct.ksu.edu.sa/entities/journalarticle/610d6785-a029-4896-8670-4a2205a92448 ; https://amslaurea.unibo.it/id/eprint/3539/

6. **Transparent mockup composition must be mathematically explicit.** A Korean GLSL tutorial blends RGB using foreground alpha but writes alpha=1. This is valid only for an intentionally opaque final background; do not reuse for a transparent intermediate. Use Porter–Duff source-over with known straight/premultiplied contracts; never flatten or overwrite the Ready-to-Print Master. Source: https://velog.io/@ryoong1125/Fragment-Shader를-여러-레이어로-합성하는-방법

7. **Model training-loss claims need primary-code review.** A Chinese BiRefNet analysis discusses contour and structure losses, but it is secondary commentary; inspect original loss definitions and enabled weights before drawing conclusions. Evaluate fine-line and Arabic typography datasets, not only photographic benchmarks. Source: https://blog.csdn.net/gitblog_07735/article/details/148888517

8. **Upload workflow (secondary).** Korean S3 presigned URL tutorial supports direct browser-to-object-store uploads; still require server-owned keys, file signatures, pixel/decompression limits, antivirus screening, asynchronous idempotency and role access controls. Source: https://velog.io/@yongmin_lee/AWS-S3로-이미지-업로드조회-하기Presigned-URL

## Proposed DTF acceptance gates
- Preserve immutable original master and record SHA-256, source ICC, dimensions, Alpha mode and decoder.
- Separate segmentation, trimap, fractional Alpha, foreground RGB, and RGBA export.
- Evaluate Alpha histograms and foreground topology on black, white and bright fabric backgrounds.
- Convert feature sizes/choke to physical units at the actual print dimensions; rescue qualifying fine white-only strokes.
- Inspect generated white plane separately from artwork and RIP; avoid duplicate white-generation/choke settings.
- Record dithering algorithm, kernel, scan order, gamma, precision and seed; detect existing halftones.
- Use a production-specific printer/RIP/ink/film calibration rather than universal pass/fail thresholds.

## Validation
28 independent deterministic synthetic invariant tests passed in the accompanying local Batch 393 package (alpha compositing, premultiplied interpolation, sRGB transfer, chroma-key thresholds, morphology, connected components, effective PPI, physical choke, white-only artwork, dithering kernels and master integrity). These tests do **not** prove deployed-app or physical printer/RIP correctness.

## Counting and safety
15 accepted pages individually opened and read, checked against accessible central ledger and mounted Batches 383–392 manifests; translation mirrors, duplicates, snippets and failed opens excluded. Previous 4,003 was provisional, therefore **4,018 is a provisional upper bound**, not globally certified. No deployment, merge, protected storefront change or master modification.