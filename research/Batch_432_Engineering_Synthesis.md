# DTF Smart Prepress — Batch 432 Engineering Synthesis (2026-10-14)

## Verification
Previous provisional upper bound: 4,700. New individually opened/read and locally deduplicated source URLs: 20. New provisional upper bound: **4,720 / 10,000 (47.20%)**. Global unique-page certification remains **unknown** because the full historical semantic-deduplication audit has not been completed. Twelve languages searched, eleven contributed; Arabic candidates were translated/previously covered and not counted. Canonical URLs: research/Batch_432_Canonical_Source_Index.md.

## Engineering findings
1. **Alpha geometry != foreground RGB != compositing representation.** Correct RGB contamination separately from alpha masks, and track straight vs premultiplied alpha through mockup resampling and PNG export. Russian compositing research and German technical references demonstrate different failure modes. Sources: https://habr.com/ru/articles/98743/ ; https://www.lazi-akademie.de/wiki/animation-vfx/compositing/alpha-kanal/ ; https://piick.cc/blog/why-your-transparent-png-has-white-halo.mdx .
2. **Protect morphology topology.** Opening/erosion can erase small valid components (Arabic dots, punctuation, detached artwork, halftone islands). Compare connected components, internal holes, and physical stroke widths before/after. Sources: https://lp-tech.net/articles/EDi2m ; https://kjy1ho.tistory.com/408 ; https://visual.ic.uff.br/morphology/index.html ; https://cours.pythoniaformation.com/exercices/cv-15-erosion-dilatation/ .
3. **Segmentation is not alpha matting.** Hard masks are appropriate for certain logos, but hair, smoke, glass and antialiased edges may need continuous alpha and foreground-color reconstruction. Source: https://www.cnblogs.com/huaweiyun/p/14764416.html .
4. **Marker-controlled watershed prevents uncontrolled oversegmentation.** Use markers and compare topology; do not erase enclosed design islands. Source: https://www.cmm.minesparis.psl.eu/~serra/cours/pdf/sp/ch10sp.pdf .
5. **Halftone and white support are physical.** Define halftone LPI at final print dimensions; use w_remaining=max(0,w-2c) as an idealized choke screening rule and confirm with actual RIP white-generation strategy and a printed calibration wedge. 0.10 mm is 1.181 px at 300 PPI. Source: https://makerfern.com/halftone-generator .
6. **Check exported transparency numerically.** Seven cutout examples in one Portuguese analysis showed fractional-alpha concentrated at edges, but this small sample is not a universal benchmark and may conceal failed interior translucency. Source: https://www.atlascloud.ai/pt/blog/tips/what-is-an-alpha-channel .
7. **Implementation separation.** OpenCvSharp masks are CV_8UC1 and require the appropriate threshold strategy; alpha erosion and threshold should be separate controls. Source: https://github.com/shimat/opencvsharp/blob/main/docs/docfx/articles/opencv-examples/thresholding-masks-morphology.md ; https://pypi.org/project/AmericoDraws/ .

## Limitations
No production DTF Studio integration test or printer/RIP calibration. Vendor claims are not independently validated. PDFs were read as one source URL each, not counted by internal pages. Historical semantic deduplication remains incomplete. Do not apply unreviewed automatic destructive transformations to the Ready-to-Print Master.

## Safety
Research-only changes on branch chatgpt/dtf-smart-prepress-20260928. No merge, deployment, storefront, customer data, or printing-master changes.
