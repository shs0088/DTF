# DTF Smart Prepress — Batch 474 Canonical Source Index

Date: 2026-10-16

- Accepted pages individually opened/read: 10
- Previous provisional upper bound: 5,362
- Updated provisional upper bound: **5,372 / 10,000 (53.72%)**
- Remaining by arithmetic: 4,628
- Globally certified unique-page count: **unknown**.

## B474-001 — Set the White Layer Choke in PrintFactory
- Canonical URL: https://www.dtflinko.com/technical-services/printer-technical-operation-repair/set-the-white-layer-choke/
- SHA-256: `b5cefb8ef332253bb55c1eee1b7593b7c9f2e559e01c59a1e1055c55f28ef02b`
- Language: English
- Read depth: Full visible guide opened/read; operational and troubleshooting sections reviewed.
- Finding: Vendor-specific guide: test choke in small increments; protect thin lines and small text; suggested millimeter values are not universal constants.

## B474-002 — Set the White Undercoat Method in PrintFactory
- Canonical URL: https://www.dtflinko.com/technical-services/printer-technical-operation-repair/set-the-white-undercoat-method/
- SHA-256: `c7bc7aa03820ce99338da052111a0aec8d6cd368e85b3cd5f192062637a74dd2`
- Language: English
- Read depth: Full visible guide opened/read; method options and related workflow reviewed.
- Finding: Shape, Flood, Under Color, Under White, Transparency, Density, inverse density and Fill-up produce different white-channel semantics. Verify the raw white channel before choke adjustment.

## B474-003 — Image Thresholding Based on Within-Class Standard Deviation
- Canonical URL: https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART001789698
- SHA-256: `178cf7812b7bfc6a17616e9fec4cb3f618642cf5fdc544ea16a0586248921357`
- Language: Korean with English abstract
- Read depth: Metadata and bilingual abstracts read; linked nine-page paper not read.
- Finding: Proposes within-class standard deviation instead of variance in threshold selection to reduce bias toward a higher-variance class; independently unreplicated here.

## B474-004 — Otsu Based Optimal Multilevel Image Thresholding Using Coronavirus Herd Immunity Optimizer
- Canonical URL: https://dergipark.org.tr/tr/pub/gazibtd/article/1172909
- SHA-256: `c0539c611235120f3cb8828de1c45698e579f0ab97aafacc95b3e2ce7bc1c0f4`
- Language: Turkish with English abstract
- Read depth: Journal page and bilingual abstracts read; PDF not read.
- Finding: Uses a swarm optimizer for multilevel Otsu thresholds; only six test images are reported, so the evidence is preliminary.

## B474-005 — Bölütleme Tabanlı Yeni Görüntü İyileştirme Yöntemi
- Canonical URL: https://dergipark.org.tr/en/pub/ejosat/article/1041197
- SHA-256: `04d825ae2a968c9ab8e056b29dd05a9901f17024aa56f7e86e68644ec19abb28`
- Language: Turkish
- Read depth: Metadata and abstract read; PDF not read.
- Finding: Applies histogram equalization inside active-contour segmented object regions and recomposites them; evaluates entropy, AMBE and PSNR.

## B474-006 — Automatic Color Edge Detection with Similarity Transformation
- Canonical URL: https://dergipark.org.tr/en/pub/gujs/article/431223
- SHA-256: `a91403b72d3519593ed394ef95373edf7190dc165c4c4c1fb5d34418c76f3fec`
- Language: English abstract on Turkish journal page
- Read depth: Metadata, abstract and visible references read; PDF not read.
- Finding: Automatically estimates a similarity-transform normalization coefficient before thresholding a homogeneity image; reports F-score on 200 BSDS training images.

## B474-007 — Background Replacement based on the Method for Deciding Illuminant Color by Using Saturation
- Canonical URL: https://www.jstage.jst.go.jp/article/ieejeiss/137/2/137_387/_article/-char/en
- SHA-256: `a4c6e183f8a09bdef19f5e92e5f5f0a0c208dd579dd031f964fa1655532a4ac0`
- Language: Japanese journal page with English abstract
- Read depth: Metadata and abstract read; linked two-page PDF not read.
- Finding: Uses saturation to improve chromatic adaptation between subject and replacement background; relevant to mockup compositing but not a DTF print-master operation.

## B474-008 — Improving Color Modeling for Alpha Matting
- Canonical URL: https://www.microsoft.com/en-us/research/publication/improving-color-modeling-for-alpha-matting/
- SHA-256: `31a6641cdab3caadc3bfb076583ee81f44d65f835317444afec5089cedb52b2e`
- Language: English
- Read depth: Microsoft Research page and abstract read; PDF not opened.
- Finding: Uses candidate foreground/background colors, confidence selection and a sparsity prior to suppress blurry matte artifacts.

## B474-009 — DeepOtsu: Document Enhancement and Binarization using Iterative Deep Learning
- Canonical URL: https://arxiv.org/abs/1901.06081
- SHA-256: `ff7bb721cb0f9621809291ce3271bc294ca81ea25d8542f658f300facad5e7ff`
- Language: English
- Read depth: ArXiv HTML introduction and iterative-refinement method sections read; full paper/appendix not claimed.
- Finding: Learns a cleaned image first, then binarizes it; iterative refinement can remove background degradation but risks erasing weak strokes if transferred without print-artwork tests.

## B474-010 — Threshold Matters in WSSS: Manipulating the Activation for the Robust and Accurate Segmentation Model Against Thresholds
- Canonical URL: https://arxiv.org/abs/2203.16045
- SHA-256: `44a73c718220a1eb2d8c564fe13d36619fc21aa69979ae876b8f79100112d3fc`
- Language: English
- Read depth: ArXiv HTML abstract, introduction, related work and selected method/results sections read; full appendix not claimed.
- Finding: Identifies global thresholding of class-activation maps as a weakly supervised segmentation bottleneck; uses activation manipulation and reports mIoU on PASCAL VOC/MS COCO.

## Exclusions
- Chinese/English Coarse Semantic Guided Alpha Matting pages were excluded because the same DOI/work was counted in Batch 471.
- The DTF Gears V12 article was excluded because its canonical URL is already in the central ledger.
- The Korean hand-segmentation PDF and ACM interactive-matting article could not be opened; search results alone were not counted.
- The LINKO white-ink-amount page returned HTTP 403 and was not counted.

## Limitations
Local deduplication is not global uniqueness certification. Some academic sources were read at abstract/metadata level only. No physical printer/RIP validation was performed.
