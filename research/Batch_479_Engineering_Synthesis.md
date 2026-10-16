# Batch 479 — Engineering Synthesis

Date: 2026-10-16

## Evidence quality

Ten individually opened pages were accepted across Chinese, Japanese, Korean, Turkish, Spanish, Portuguese, French, Italian and English. Read depth varies: several publisher records exposed abstracts rather than full papers; the Spanish and Portuguese papers exposed substantial HTML text; selected sections of the Italian thesis PDF were read; and the Matte README was read in detail. No physical DTF validation was performed.

## Findings

### Resampling and upscaling
The Chinese Newton-interpolation paper reports a four-stage parallel pipeline and 4x scaling at 1920×1080/30 fps in its hardware experiment. This is a throughput/resource result, not proof that interpolation creates correct missing detail. Preserve the original, prefer vector source where available, and evaluate ringing, stroke width and text fidelity at final physical size.

### Compression-artifact denoising
The Japanese TV-regularization abstract describes separating structure and texture, filtering block artifacts in the texture component, and using edge information to suppress mosquito noise. The Italian thesis compares ordinary TV with weighted TV using Split Bregman; its reported weighted-TV PSNR is higher for the tested noise levels. These suggest optional restoration for visibly compressed/noisy uploads, not default filtering. TV methods can erase thin lettering or texture, so compare before/after at 100% and final print size.

### Metrics must be plural and domain-aware
The Korean FNLM study uses CNR, coefficient of variation, NIQE and BRISQUE. The Spanish adaptive-morphology paper evaluates ground-truth masks with accuracy and ROC-related measures including TPR/FPR. A single score is insufficient: high accuracy can coexist with poor recall, and no-reference quality metrics do not establish printability. Smart Prepress should separately measure region overlap, boundary displacement, thin-feature survival and runtime.

### Morphology and thresholding should be class-aware
The Turkish particle-counting abstract reports that morphology, filtering and thresholding alone were insufficient for all images and that combinations varied with image characteristics. The Spanish paper reports gains from adaptive structuring elements over fixed disk/diamond elements on its dataset, but warns that unconstrained shapes can produce incorrect erosion/dilation. The French thesis abstract describes marker-controlled watershed after filtering insignificant minima. Use morphology first as a diagnostic; constrain kernel size and protect counters, dots, isolated marks and narrow gaps.

### Parameter sensitivity is a failure mode
The Portuguese facade-damage study shows that increasing a clustering parameter can classify unrelated regions. Threshold, tolerance, kernel size and confidence should therefore be bounded, logged and testable. Prefer warnings or review queues over silent aggressive cleanup.

### White-underbase printability is scale-dependent
The DTFWiz checker illustrates that choke can remove white support beneath narrow strokes and halftone dots, especially after reducing artwork to a smaller garment placement. Treat its suggested values as vendor guidance, not universal limits. Estimate surviving mask width in millimeters and pixels at the actual output resolution, then validate a calibration chart on the target RIP/printer/film/ink combination. The tool's browser-only processing claim was not independently network-audited.

### Asynchronous background removal needs robust job contracts
The open-source Matte README documents HTTP 202 plus job ID, queue conversion, separate status/result routes, credential-protected image routes, registered callback destinations rather than arbitrary callback URLs, and the timeout invariant: retry window > worker timeout > conversion timeout. It describes ML and GrabCut engines with different quality/startup trade-offs. Smart Prepress should use upload limits and validation, private temporary storage, opaque job IDs, authorization on status/result endpoints, retention limits, idempotent jobs and signed/allowlisted callbacks. These are recommendations; the code was not audited or executed.

## Recommended engineering decisions

1. Keep source, restoration preview, segmentation mask, alpha matte, decontaminated RGB and print master as separate artifacts.
2. Denoise/deblock only when detected corruption justifies it; do not sharpen or upscale by default.
3. Use multiple mask metrics plus a DTF-specific thin-feature suite.
4. Use class-aware thresholds and constrained morphology; flag uncertain cases.
5. Convert choke to physical units at final print size and model underbase loss on narrow components.
6. Distinguish a white-underbase preview from a RIP-validated separation.
7. Enforce upload limits, authorization, private storage, timeout/retry invariants and safe callback destinations.
8. Preserve ICC profiles and source RGB; log every intentional color conversion.

## Limits

The cumulative count is not globally certified. Exact URL checks covered locally available Batches 469, 470 and 472–478; Batch 471 and older historical records remain incomplete. No printer, film, ink, powder, curing, press or wash test was performed.
