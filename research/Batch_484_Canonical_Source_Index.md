# DTF Smart Prepress — Batch 484 Canonical Source Index

Date: 2026-10-16

Accepted: 10 individually opened and read source pages. Previous provisional upper bound: 5,462. Updated provisional upper bound: **5,472 / 10,000 (54.72%)**. Remaining by arithmetic: **4,528**. Globally certified unique-page count remains **unknown**.

Reading depth varies by record; abstract-only and metadata-only sources are explicitly marked. Search snippets alone were not counted. Exact URL/title checks were performed against accessible source indexes and batch artifacts on the requested branch, but the historical corpus remains incomplete.

1. **POBEVM: Real-time Video Matting via Progressively Optimize the Target Body and Edge** — https://arxiv.org/abs/2402.09731
   - Language/read depth: English; arXiv abstract/metadata read; full PDF not read.
   - Technical relevance: Separates target-body and target-edge optimization; adds an edge-specific L1 loss.
   - Caveat: Video matting, not a DTF benchmark; authors' benchmark claims not independently reproduced.

2. **Enhancing Image Matting in Real-World Scenes with Mask-Guided Iterative Refinement (Mask2Alpha)** — https://arxiv.org/abs/2502.17093
   - Language/read depth: English; Full HTML opened; introduction, related work, method and visible experiment table read; not every section exhaustively reviewed.
   - Technical relevance: Mask-guided semantic refinement, iterative alpha prediction, confidence-guided sparse high-resolution detail recovery.
   - Caveat: Authors' benchmark claims not independently reproduced; no DTF validation.

3. **Interactive Image Matting** — https://www.ims.tuwien.ac.at/publications/tuw-189346
   - Language/read depth: English (institutional thesis record); Institutional abstract and thesis metadata read; thesis PDF not read.
   - Technical relevance: Interactive trimap generation, point-spread-function view of partial transparency, perceptually motivated evaluation.
   - Caveat: Abstract/metadata only; underlying thesis not read in full.

4. **A Survey on Digital Matting** — https://jcad.cn/en/article/doi/10.3321/j.issn:1003-9775.2007.04.013
   - Language/read depth: English abstract on Chinese journal platform; Publisher abstract and citation metadata read; full article body not available in the opened record.
   - Technical relevance: Survey of blue-screen, natural-image, environment, shadow and video matting.
   - Caveat: English abstract only; not a full-text read.

5. **Systematische Evaluierung geeigneter Verfahren der künstlichen Intelligenz für die semantische Segmentierung von Landbedeckung in fernerkundungsgestützten Bilddaten** — https://elib.dlr.de/190573/
   - Language/read depth: German; German abstract and thesis metadata read; 80-page PDF not read.
   - Technical relevance: Deep-learning semantic segmentation evaluation; class-specific F1 reported up to 0.93 in land-cover data.
   - Caveat: Remote-sensing domain; no transfer of its scores to DTF.

6. **Deep Automatic Natural Image Matting** — https://arxiv.org/abs/2107.07235
   - Language/read depth: English; arXiv abstract and opening technical context read; not all sections exhaustively reviewed.
   - Technical relevance: Trimap-free natural-image matting for transparent/meticulous and non-salient foregrounds; AIM-500 benchmark.
   - Caveat: Paper's results are not a DTF benchmark.

7. **Color-aware Deep Temporal Backdrop Duplex Matting System** — https://arxiv.org/abs/2306.02954
   - Language/read depth: English; Abstract and substantial method/background sections read; full paper not exhaustively reviewed.
   - Technical relevance: Joint alpha and foreground-color prediction; dual-backdrop input and color-spill compensation.
   - Caveat: Video capture uses alternating backdrops; hardware workflow is not directly transferable to still uploads.

8. **Efficient Graph-Based Image Segmentation for Natural Images (Arabic catalog record)** — https://search.mandumah.com/Record/857117
   - Language/read depth: Arabic catalog/abstract; thesis itself listed as English; Arabic catalog record and Arabic abstract read; underlying 76-page thesis not read.
   - Technical relevance: Graph-based segmentation seeded from homogeneous-region points; abstract reports a speed/accuracy tradeoff on Pascal images.
   - Caveat: This is an Arabic catalog record for an English-language thesis, not an Arabic-language thesis.

9. **Проблема шумоподавления при редактировании изображений** — https://cyberleninka.ru/article/n/problema-shumopodavleniya-pri-redaktirovanii-izobrazheniy.pdf
   - Language/read depth: Russian; Full 4-page Russian PDF read.
   - Technical relevance: Noise-type-specific filtering; edge blur/halo risks; PSNR may improve while details disappear; morphology and wavelets reviewed.
   - Caveat: 2009 method discussion; not a modern benchmark.

10. **Inteligência artificial, aprendizado de máquina, diagnóstico auxiliado por computador e radiômica: avanços da imagem rumo à medicina de precisão** — https://new.scielo.br/j/rb/a/9yX6w83KDDT33m6G9ddCqBn/?ilang=pt_BR&lang=pt
   - Language/read depth: Portuguese; Full visible Portuguese article read, including segmentation, feature extraction, model evaluation and conclusion sections.
   - Technical relevance: Segmentation principles, thresholding, region growing, intensity/texture/shape features and validation splits.
   - Caveat: Medical-imaging review; general segmentation/evaluation principles only.

## Exclusions
- PyMatting documentation was excluded as an exact duplicate already counted in Batches 395 and 409.
- The Portuguese ovitrampas image-processing article was excluded because the same work/title already appears in Batch 469 under an alternate SciELO URL.
- ACM article DOI 10.1145/3785468 was excluded because the page returned HTTP 403 on open.
- A CNKI image-deraining page failed to open and was not counted.
- An Arabic PDF candidate was excluded because the opened PDF title was unrelated chemistry despite contaminated extracted text mentioning image noise.
- A French/Algerian ASJP candidate failed to open and was not counted.
- The Wiley sampling-based matting survey was opened but not included in the accepted ten for this batch.

No physical DTF validation, deployment, merge, protected storefront change or Ready-to-Print Master modification occurred.
