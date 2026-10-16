# DTF Smart Prepress — Batch 469 Canonical Source Index

Date: 2026-10-16  
Accepted source pages: 8  
Provisional cumulative upper bound: 5,323/10,000 (53.23%)  
Globally certified unique-page count: unknown.

## Accepted sources

### B469-001 — On the apparent transparency of a motion-blurred object: Extracting information from blurred smears
- Canonical URL: https://hdl.handle.net/11311/577312
- SHA-256 canonical URL: bf7673d7c297e2f59894c25893d89949d7c44c56a6b5465fec9ea812d4a45b5b
- Language: Italian repository page; English abstract
- Read depth: Repository page and abstract read; linked preprint is access-restricted.
- Findings:
  - Motion-blurred smears can be modeled as apparent translucent objects and assigned alpha mattes.
  - Alpha can represent the fraction of exposure time the moving object projected onto a pixel.

### B469-002 — Detección y medición semiautomática de fisuras en elementos de hormigón en fotos digitales usando procesamiento de imágenes
- Canonical URL: https://doi.org/10.33586/hya.2019.2079
- SHA-256 canonical URL: 5bd47ab98f0df146e4737a9e0cfab267d0ae0906e02d438f5c93630c3116789b
- Language: Spanish
- Read depth: Repository page and all seven PDF pages read; one work counted.
- Findings:
  - ROI selection, Prewitt gradients, local thresholds, 8-connected components and orientation-specific kernels form a scale-aware line detector.
  - The paper reports about 7% mean error (13.5% standard deviation) against optical crack-gauge measurements on its concrete-crack task.

### B469-003 — Sistema de aquisição e processamento de imagens de ovitrampas para o combate a dengue
- Canonical URL: https://doi.org/10.4322/rbeb.2012.043
- SHA-256 canonical URL: 30ba3a092534a95e247682c9fba7adcc80b70e3d5c61146236555d2a8f14d543
- Language: Portuguese
- Read depth: Full visible open-access article read through methods, results and conclusion.
- Findings:
  - Combines a global RGB mask with a local histogram-threshold mask using logical AND.
  - Uses a 3x3 mode filter and disk-shaped morphological opening (radius 2 px) to suppress isolated errors and split connected regions.
  - Reports 2.67% aggregate error but 16.26% mean per-image error, showing the need for both metrics.

### B469-004 — Ускоряем процесс разметки с помощью интерактивной сегментации
- Canonical URL: https://habr.com/ru/companies/sberdevices/articles/739352/
- SHA-256 canonical URL: cc72ac25db13882663542846101bd1688ba709974106b49ebacbb23ab9827ec3
- Language: Russian
- Read depth: Full visible article read; click encoding, RITM, SimpleClick and evaluation sections inspected.
- Findings:
  - Positive and negative clicks refine foreground masks interactively.
  - NoC@target-IoU is a useful measure of human effort; click simulation should not only sample error-region centers.
  - A mask is still a segmentation proposal, not a fractional-alpha matte.

### B469-005 — Удаление фона с помощью глубокого обучения
- Canonical URL: https://habr.com/ru/companies/nix/articles/350576/
- SHA-256 canonical URL: 30b8456870ccad8f504f3e14a73a72c95e9f371c380dea9f8d6f06ccc53b3262
- Language: Russian translation of an English engineering article
- Read depth: Full visible Russian page read through model selection, data preparation, architecture and deployment; no mirror counted separately.
- Findings:
  - Narrowing a general background-removal problem to portraits/selfies made data and viewpoint assumptions more tractable.
  - FCN/U-Net/Tiramisu comparisons emphasize skip connections, upsampling, edge detail, model size and deployment location.
  - Simple bilinear upsampling can leave segmentation outputs visibly blurry.

### B469-006 — Matte Anything: Interactive Natural Image Matting with Segment Anything Models
- Canonical URL: https://arxiv.org/abs/2306.04121
- SHA-256 canonical URL: 6f601b083b950681389fa0886c0d4dd2c9bf25c9161a7756b2315e697ae602e3
- Language: English
- Read depth: arXiv landing page and full HTML opened; introduction, pseudo-trimap construction, architecture and substantial evaluation sections read.
- Findings:
  - Combines SAM instance masks, open-vocabulary detection and pseudo-trimap generation.
  - Uses erosion/dilation and transparency correction to derive a matting guide from a coarse mask.
  - Reported benchmark improvements are author-reported and not independently reproduced.

### B469-007 — Matting Anything
- Canonical URL: https://arxiv.org/abs/2306.05399
- SHA-256 canonical URL: d2df88c0ab58c3265ffa7667c0ae06fbdac23ee1d121029efe0d651344294f5e
- Language: English; Korean-language abstract mirror used for discovery but excluded
- Read depth: arXiv landing page and full HTML opened; architecture, multiscale refinement, benchmarks, training and metrics read.
- Findings:
  - MAM combines SAM masks/features with a lightweight 2.7M-parameter trainable Mask-to-Matte module.
  - Multi-scale alpha predictions are merged iteratively, with dedicated emphasis on transition regions.
  - The paper evaluates SAD, MAD, MSE, gradient, connectivity and instance-matting quality; prompt type affects performance.

### B469-008 — VideoMaMa: Mask-Guided Video Matting via Generative Prior
- Canonical URL: https://arxiv.org/abs/2601.14255
- SHA-256 canonical URL: 358495447909f14732ca194375a7a998fdc1cddbd61eb102fb18cd3da956f35d
- Language: English; Korean-language abstract used for discovery only
- Read depth: arXiv landing page and full HTML opened; abstract, introduction, architecture/training outline and dataset description read; not every appendix was read.
- Findings:
  - Uses pretrained video-diffusion priors to turn coarse masks into continuous alpha mattes.
  - Separates spatial and temporal optimization and reports zero-shot generalization from synthetic training to real video.
  - Builds MA-V pseudo-labels for more than 50,000 real-world videos; useful for temporal consistency but not a requirement for static print PNGs.

## Excluded candidates

- https://ipsj.ixsq.nii.ac.jp/records/229957 — Repeated direct opens returned HTTP 429; search metadata alone does not count.
- https://ipsj.ixsq.nii.ac.jp/records/207569 — Repeated direct opens returned HTTP 429; search metadata alone does not count.
- https://ipsj.ixsq.nii.ac.jp/records/37992 — Direct open timed out; no readable page.
- https://ipsj.ixsq.nii.ac.jp/records/39156 — Repeated direct opens returned HTTP 429; search metadata alone does not count.
- https://repositorio.utfpr.edu.br/jspui/bitstream/1/31242/1/softwareavaliacaoferidas.pdf — Direct PDF open disabled; search excerpt alone does not count.
- https://habr.com/ru/articles/353890/ — Exact duplicate in central ledger.
- https://habr.com/ru/companies/sberdevices/articles/742528/ — Exact duplicate in central ledger.
- https://habr.com/ru/companies/sberdevices/articles/731794/ — Exact duplicate in central ledger.
- https://habr.com/ru/companies/jugru/articles/834546/ — Already counted in Batch 463.
- https://docs.opencv.org/doc/doxygen/html/d3/dbe/tutorial_opening_closing_hats.html — Already counted in central ledger.
- https://openaccess.thecvf.com/content/CVPR2024/html/Guo_In-Context_Matting_CVPR_2024_paper.html — Already represented in central ledger.
- https://openaccess.thecvf.com/content/CVPR2024/html/Wang_EFormer_Enhanced_Transformer_towards_Semantic-Contour_Features_of_Foreground_for_Portraits_CVPR_2024_paper.html — Already represented in central ledger.
- https://openaccess.thecvf.com/content/CVPR2023/html/Li_Referring_Image_Matting_CVPR_2023_paper.html — Already represented in central ledger.
- https://www.alphaxiv.org/ko/abs/2306.05399 — Korean localized abstract mirror; canonical arXiv paper counted once.
- https://www.alphaxiv.org/ko/abs/2601.14255v1 — Korean localized abstract mirror; canonical arXiv paper counted once.
- https://habr.com/en/companies/sberdevices/articles/742528/ — English mirror of Russian StyleMatte article already represented in ledger.
- https://docs.opencv.org/4.12.0/javadoc/org/opencv/imgproc/Imgproc.html — Version mirror of OpenCV API documentation; not materially distinct for this batch.
