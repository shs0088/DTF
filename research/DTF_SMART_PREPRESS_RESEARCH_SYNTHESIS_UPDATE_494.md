# DTF Smart Prepress — Running Research Synthesis through Batch 494

Updated: 2026-10-17
Branch: `chatgpt/dtf-smart-prepress-20260928`

## Corrected provisional progress
- Consolidated branch ledger checkpoint through Batch 484: 5,472.
- Reported Batches 485–491 add 69 pages, yielding 5,541. An earlier sentence saying 59 was an arithmetic typo.
- Batch 492 reported 11, but its committed hash file shows B492-001 DOI 10.3724/SP.J.1089.2022.19175 already present as B487-001. Corrected provisional upper bound after Batch 492: 5,551.
- Batch 493 report: +8, giving a provisional upper bound of 5,559.
- Batch 494: +8 accepted pages.
- Previous provisional cumulative upper bound: **5,567 / 10,000 (55.67%)**.
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

---

## Batch 495 update — 2026-10-17

### Provisional count
Batch 495 accepted eight individually opened/read pages. New provisional upper bound: **5,575 / 10,000 (55.75%)**; 4,425 remaining by arithmetic. Global uniqueness remains unknown.

### Matting architecture and reference-guided processing
The DCAM paper combines a semantic backbone, global object aggregation for contour refinement, local appearance aggregation for boundary detail, and a matting decoder. It evaluates on five datasets including Adobe Composition-1K and human-matting datasets. These results support testing a two-scale pipeline, but they do not establish performance on logos, connected scripts or DTF printability.

In-Context Matting uses a reference image plus a mask, scribbles or points to define a target category, then uses diffusion features and inter-/intra-image similarity to process related target images. It evaluates with SAD, MSE, gradient and connectivity metrics on ICM-57 and AIM. This could help batch processing of related product imagery, but must be tested for instance mismatches, missing components, latency and dependency cost.

### Alpha and foreground RGB are separate outputs
The temporal dual-backdrop paper predicts foreground RGB and alpha from two frames with different background colors, masking the color loss where alpha is zero. The multi-frame requirement means it is not directly applicable to a single static upload, but it reinforces the need to assess edge-color decontamination independently from alpha accuracy.

### White-underbase generation and choke
The NestSheet documentation derives W1 from PNG alpha, offers a sheet-wide 0/1/2 px choke, includes a thin-detail rescue step and recommends checking the exported white separation rather than relying on preview alone. Its documented output is a mirrored 300 dpi TIFF with CMYK+W1 for a specific queue; this is a vendor-specific contract, not a universal standard.

The PrintFactory guide recommends test transfers and 0.1 mm choke adjustments, with minimal/no choke as a starting point for very fine lines and small logos. Choke is a physical offset and should be calibrated against the final dimensions, RIP, substrate and registration. Assign choke ownership to either prepress or RIP to avoid double contraction. Mechanical misregistration cannot be repaired by editing artwork.

### Restoration and segmentation
A Chinese publisher abstract describes edge regularization and blind deconvolution for low-resolution indoor design images, reporting PSNR 32.63 dB, SSIM 0.99 and 2 ms latency. The full paper was unavailable, and these results cannot be transferred to DTF without independent tests.

The Spanish parametric-segmentation record discusses optimizing Canny, Otsu and watershed parameters against mask similarity and ROC. The SIAM abstract describes a noise-aware convex smoothing stage followed by multi-phase thresholding. These are methodological leads, not ready-made DTF defaults.

### Recommended additions to the acceptance suite
- Compare alpha metrics and foreground RGB contamination separately.
- Test reference-guided matching on groups with both repeated and visually similar but different items.
- Inspect the exported W1 channel and test fine lines, small text and solid shapes.
- Convert choke between pixels and physical units using output DPI.
- Measure ringing, geometric drift, invented detail and fine-component survival in restoration.
- Evaluate segmentation against labeled reference masks using ROC, precision/recall, F-measure and IoU.

### Batch 495 evidence limitations
Three arXiv papers were read through core methods and selected results; two DTF technical pages were read in full; one Chinese publisher page and one Spanish publisher record were read at abstract level; one SIAM abstract/method description was read. Russian, French, Portuguese and Japanese candidates that failed to open were excluded. No physical DTF/RIP experiment was performed. Batch 486 remains unavailable, Batch 492 is incomplete, Batch 493's index is absent from the branch, and older semantic deduplication remains incomplete.
