# DTF Smart Prepress — Batch 347 Engineering Synthesis (2026-10-11)

Sources: 15 individually opened/read, distinct technical documents across Arabic, Chinese, Japanese, Korean, Russian, Spanish, Portuguese, German, French, Italian and Turkish. See the adjacent canonical source ledger for URLs and URL SHA-256 hashes. English was also searched; non-English material was prioritized.

## A. Reconstruction-aware morphology is not lossless
Spanish geodesic-reconstruction teaching material and an independent 241-page color-morphology dissertation show that opening by reconstruction better preserves surviving component shapes than conventional opening. However, erosion can still eliminate isolated dots before the marker is formed. Synthetic tests confirm a connected narrow tail is recovered while an isolated 1-pixel dot is not. Protect Arabic diacritics, punctuation, disconnected logos and thin strokes with explicit component and hole checks. Portuguese university morphology notes clarify kernel and outside-border conventions.

## B. Alpha matting must recover color, not just opacity
Chinese Bayesian-matting research explains that three observed RGB channels do not uniquely determine foreground RGB, background RGB and Alpha (seven unknowns). Local statistical priors/trimaps help constrain the problem. A separate Chinese background-replacement analysis distinguishes fractional Alpha from foreground-color decontamination. The formula F=(C-(1-alpha)B)/alpha becomes unstable near Alpha=0. Guard low-Alpha division, estimate background carefully, retain confidence and compare composites on white, black and garment-colored backgrounds.

## C. Source-code examples can distort geometry
Japanese HSV-keying example uses erosion once and dilation twice, which can expand the mask; its green despill can also damage intentionally green art. A Korean OpenCV tutorial contains a sentence incorrectly saying dilation shrinks foreground, although the rest of its explanation is correct. Do not trust explanatory text or snippets without independent tests.

## D. Halftoning: floating point, scan direction, calibration
French CNRS teaching exercise explicitly recommends floating-point CV_32FC1 accumulation for Floyd-Steinberg and distinguishes per-channel RGB diffusion from vector error to a palette. Independent French 1995 paper analyzes Bayer and error-diffusion patterns and dot gain. Italian thesis uses serpentine scanning: reverse the horizontal error kernel on alternating rows. A Turkish OCR paper reports improved recognition after Floyd-Steinberg in its own dataset, which does not establish print fidelity. Never pre-dither an approved DTF master as a default; RIP screening remains calibrated to ink/film/printer.

## E. Deblurring is noise-sensitive
German dissertation reports that Richardson-Lucy restoration enhanced fine-detail contrast but increased high-frequency grain after 30 iterations. Restoration requires bounded iteration count, noise/edge controls and reversible output. Upscaling cannot guarantee recovery of missing information.

## F. Algorithm selection and Arabic typography
Russian comparison of watershed, MeanShift, FloodFill and GrabCut shows that different backgrounds require different segmentation assumptions. Watershed may oversegment texture, flood fill may leak through open boundaries, and mean-shift color clusters do not imply semantic components. Arabic research on OCR thresholding and thinning must not be treated as safe DTF artwork cleanup: recognition improvements can destroy dots and antialiased lettering.

## Recommended gates
Preserve immutable master, decoded dimensions/ICC/Alpha and checksum. Separate segmentation -> fractional Alpha -> RGB decontamination -> topology-gated cleanup -> transparency-safe resampling -> physical preflight -> preview/mockup derivative. Keep printer-specific white-underbase/choke/ICC/halftone profiles in the RIP stage.

## Validation and limitations
20/20 synthetic software/mathematical tests passed. At 300 PPI, a 0.15 mm choke is 1.77165 pixels per side; a 0.20 mm stroke can lose all idealized underbase under twice that choke. No physical printer calibration was performed. The 3,215 cumulative figure is a provisional upper bound: full historical semantic deduplication is not certified. No storefront, deployment, merge or Ready-to-Print Master modification.
