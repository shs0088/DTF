# DTF Smart Prepress — Running Research Synthesis through Batch 494

Updated: 2026-10-17
Branch: `chatgpt/dtf-smart-prepress-20260928`

## Corrected provisional progress
- Consolidated branch ledger checkpoint through Batch 484: 5,472.
- Reported Batches 485–491 add 59 pages, yielding 5,541.
- Batch 492 reported 11, but its committed hash file shows B492-001 DOI 10.3724/SP.J.1089.2022.19175 already present as B487-001. Corrected provisional upper bound after Batch 492: 5,551.
- Batch 493 report: +8, giving a provisional upper bound of 5,559.
- Batch 494: +8 accepted pages.
- New provisional cumulative upper bound: **5,567 / 10,000 (55.67%)**.
- Remaining by arithmetic: **4,433**.
- Globally certified unique-page count: **unknown**.

## Engineering findings

### Matting should estimate alpha and foreground color together
The context-aware matting paper uses local detail features and global context to estimate foreground RGB and alpha. It combines a Laplacian-pyramid alpha loss with perceptual feature losses and re-JPEG/blur augmentations to reduce synthetic foreground/background artifact bias. Preserve source RGB, alpha, corrected foreground and final composite separately. Validate over black, white and saturated backgrounds. AlphaNet combines segmentation and matting with attention-guided sampling and describes a fashion/e-commerce dataset, but only its abstract and introduction were read; it remains an evaluation candidate, not a production dependency.

### Impulse-noise cleanup should be selective
The Turkish EDBAF record weights clean neighbors by Euclidean distance to a corrupted center pixel. A separate Turkish comparison evaluates mean, median and Gaussian filters on mixed impulse/Gaussian noise using PSNR and SSIM. Abstracts do not establish a universal winner. Detect likely noise first, preserve clean pixels, and benchmark on text, distressed art and isolated dots.

### Thresholding and morphology can remove legitimate features
The Japanese character-extraction study uses global/local binarization, opening, Gaussian filtering and histogram-based line extraction on degraded inscriptions, with F-measure evaluation. For DTF, test each threshold/morphology stage against reference masks and script-aware checks. Report removed components, counters, stroke widths and negative gaps rather than simply calling the result cleaner.

### Grouping and segmentation need reference-based evaluation
The Spanish 2D laser-line paper combines an orientable elliptical mean-shift kernel with modified RANSAC and total least-squares fitting. The Spanish cloud-segmentation paper compares gray-level thresholding and Hough-based boundaries against spectral-band reference masks and evaluates pixelwise MSE. These are not direct artwork algorithms, but they reinforce robust outlier handling and explicit reference-mask evaluation.

### Blur restoration needs more than a single sharpness score
The Chinese abstract describes group-sparse residual constraints and attention-enhanced detail restoration, reporting PSNR, SSIM and entropy. Since the full paper and numeric tables were inaccessible, this is a research lead only. Measure edge ringing, line-width change, texture invention and feature survival at final physical print size.

## Recommended acceptance tests
- Alpha/foreground: composites over black, white and saturated backgrounds; edge RGB contamination.
- Noise: clean-pixel alteration rate, impulse removal, PSNR/SSIM when ground truth exists, plus visual review.
- Threshold/morphology: connected components, counters, dots/diacritics, minimum stroke and negative-gap width.
- Restoration: ringing, geometric drift, invented texture and color shifts.
- Segmentation: precision/recall/F-measure and IoU against a labeled reference mask; do not rely on one global score.
- Printability: evaluate at physical output dimensions and explicitly assign RIP ownership for white-underbase generation and choke/spread.

## Evidence limitations
Batch 494 accepted eight pages: two arXiv technical pages (one read through methods/results, one abstract/introduction only), one Japanese abstract record, one Chinese abstract record, two Turkish article records/abstracts, and two Spanish full visible HTML articles. Several candidates were excluded for CAPTCHA, internal errors, duplicate DOI or insufficient reading. No physical DTF/RIP experiment was performed. Historical global deduplication is incomplete.
