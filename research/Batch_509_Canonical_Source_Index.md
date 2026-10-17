# DTF Smart Prepress — Batch 509 Canonical Source Index

Date: 2026-10-17  
Target branch: `chatgpt/dtf-smart-prepress-20260928`  
Accepted candidate pages: 10 individually opened/read. B509-010 is abstract-only; its full-text PDF fetch timed out.

## B509-001 — DTF RIP settings and color management (Chinese)
- Canonical URL: https://www.subli-star.com/zh/dtf-rip-setup-color-management-fix-color-shift-white-fringe-hot-press-issues/
- Read: full article, including RIP setup, white choke/coverage, linearization, ICC creation, total ink limits and troubleshooting.
- Finding: the vendor separates white-channel generation from ICC/color management and recommends measured linearization and separate C/M/Y/K/W channel handling. Numerical recommendations are vendor claims, not universal settings.

## B509-002 — What Are White Edges in DTF and Why Do They Happen? (English)
- Canonical URL: https://dtflouisville.com/blogs/news/what-are-white-edges-in-dtf-and-why-do-they-happen
- Read: article body including artwork edge, choke, alignment, ink circulation, powder and pressing causes.
- Finding: white halos can arise from alpha fringes, RIP choke, color/white misregistration, inconsistent white-ink delivery, powder or pressing. A one-sided fringe suggests registration should be checked.

## B509-003 — GIMP 3.0: Color to Alpha (Spanish)
- Canonical URL: https://docs.gimp.org/3.0/es/gimp-filter-color-to-alpha.html
- Read: operation semantics, color sampling, transparency/opacity thresholds and examples.
- Finding: color-to-alpha attempts to preserve antialiasing by converting weak background-color information into weak alpha. Raising transparency threshold can remove noisy background remnants but can prevent exact recomposition over the original background.

## B509-004 — OpenCV 4.11 Image Filtering API (English; official docs)
- Canonical URL: https://docs.opencv.org/4.11.0/d4/d86/group__imgproc__filter.html
- Read: bilateral-filter parameters, performance and caveats.
- Finding: bilateral filtering can suppress noise while retaining major edges, but is slow and high sigma values can create a cartoon-like appearance. Edge preservation does not guarantee retention of fine texture.

## B509-005 — OpenCV 4.12 Image Thresholding (English; official tutorial)
- Canonical URL: https://docs.opencv.org/4.12.0/d7/d4d/tutorial_py_thresholding.html
- Read: fixed, adaptive and Otsu thresholding with code and limitations.
- Finding: adaptive thresholding handles spatial illumination variation; Otsu selects a global threshold by minimizing within-class variance and is most appropriate when the histogram has useful class separation. Pre-filtering can help noise but can erase small features.

## B509-006 — Kun-Xiang/image_matting README (Chinese)
- Canonical URL: https://github.com/Kun-Xiang/image_matting
- Read: project requirements, pipeline and limitations.
- Finding: targets high-resolution white-background product photos and explicitly calls out shadows, dust, uneven backgrounds, transparent/tinted-transparent parts and resolution preservation. Its mask-first pipeline is a useful baseline but is not proven for arbitrary artwork.

## B509-007 — RGB-space cutout algorithm (Chinese)
- Canonical URL: https://github.com/Kun-Xiang/image_matting/blob/main/RGB%E7%A9%BA%E9%97%B4%E6%8A%A0%E5%9B%BE%E7%AE%97%E6%B3%95.md
- Read: RGB similarity heuristic, shadow mask, denoising comparison and thresholding.
- Finding: labels near-equal RGB pixels as background/shadow, tests several filters and morphology, and selects median filtering with 9/11 kernels before thresholding. The small white-background dataset makes these rules risky for gray/low-contrast subject details and transparent products.

## B509-008 — A Steganographic Method Based on Roberts Operator (English; Jordan Journal of Electrical Engineering)
- Canonical URL: https://doi.org/10.5455/jjee.204-1583873433
- Opened full PDF: https://jjee.ttu.edu.jo/docs/vol6no3/JJEE%20Vol%206%2C%20No.%203,%202020,%20pp.%20265-273.pdf
- Read: complete 9-page paper, including edge operator, threshold selection, experiments and conclusion.
- Finding: tests multiple Roberts-edge thresholds against perceptual distortion. The general lesson is to select thresholds against a task-specific quality criterion; this is not a DTF validation study.

## B509-009 — GIMP 3.0: Threshold Alpha (Spanish)
- Canonical URL: https://docs.gimp.org/3.0/es/gimp-filter-threshold-alpha.html
- Read: threshold semantics, alpha requirements and gradient examples.
- Finding: converts partial alpha to binary opaque/transparent values. It can destroy antialiasing and gradients, so should be opt-in, previewed and reversible.

## B509-010 — Statistical Local Difference Pattern for Background Modeling (Japanese publisher page; English abstract)
- Canonical URL: https://www.jstage.jst.go.jp/article/ipsjtcva/3/0/3_0_198/_article
- Read: publisher page and abstract only; full PDF fetch timed out.
- Finding: abstract describes illumination-invariant local features modeled with Gaussian mixture models for dynamic-scene background modeling. This is adjacent research, not direct evidence for static transparent PNG cutouts.

## Deduplication notes
- Excluded DTF Gears Digital Factory V12 underbase article because it was already listed as B485-010.
- GIMP Color to Alpha and Threshold Alpha are distinct commands/pages; only one locale of each was counted.
- The Chinese repository README and separate algorithm document are distinct canonical pages with materially different content.
- No search-result snippet alone was counted.
- URL hashes are in `research/Batch_509_Canonical_URL_Hashes.tsv`. Global semantic uniqueness remains uncertified because historical indexes are incomplete.
