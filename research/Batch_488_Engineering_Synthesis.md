# Batch 488 Engineering Synthesis

Date: 2026-10-17  
Target: 10,000 verified unique pages  
Previous reported provisional upper bound: 5,502  
New accepted pages: 10  
Updated provisional cumulative upper bound: **5,512 / 10,000 (55.12%)**  
Remaining by arithmetic: 4,488  
Globally certified unique-page count: **unknown**

## Findings that matter most for Smart Prepress

### 1. Matting quality improves when the pipeline has background priors and a correction path
The Korean KCI article on high-resolution artifact matting reports that prior background information plus trained data can improve extraction around object boundaries; the proposed method and FBA with a manual trimap performed well in the reported comparisons. This is a domain-specific result, but it supports retaining manual trimap correction as a fallback for uncertain uploads. Do not assume the reported performance transfers directly from artifact photographs to apparel graphics.

### 2. Use region-aware denoising rather than one global strength
The Chinese segmentation-guided non-local-means paper first adapts parameters to noise level and texture, then denoises detail and background regions separately and uses back-projection to exploit residual structure. For Smart Prepress, benchmark global NLM against region-aware restoration and track edge displacement, connected-component survival and texture retention alongside PSNR/SSIM.

### 3. Morphology is only safe when the structuring element matches the feature scale
The Chinese grayscale edge-detection abstract combines threshold decomposition, binary morphology and an edge detector. Its results depend on a suitable structuring element. DTF-specific tests must protect Arabic dots/diacritics, letter counters, distressed texture, isolated dots and narrow gaps. Keep morphology reversible and record kernel shape/size.

### 4. Segmentation evaluation should include shape and class-specific reference masks
The Portuguese SciELO paper extends region-growing heterogeneity criteria with morphological attributes and evaluates segments against manually drawn reference segments. It emphasizes that appropriate shape attributes vary by object class. Apply this principle by evaluating separate datasets for text, logos, photographs, line art and textured graphics; do not tune one segmentation metric on all classes and assume it is sufficient.

### 5. Localized destriping suggests a general restoration pattern: isolate edges, restore regions
The Chinese satellite-imaging article partitions images using local mean, median and gradient cues, extracts edges separately, and applies moment matching to regions. Although satellite striping is not a DTF defect, the design principle is useful for scanned artwork: estimate degradation regions while protecting boundaries and texture from broad corrections.

### 6. Avoid evaluating thresholding with a metric that rewards its own objective
The arXiv study compares Otsu and Kapur threshold objectives with PSNR and SSIM across BSDS500 images and reports image-dependent correlations. This reinforces that evaluation can be biased when the selection objective and validation metric reward similar properties. For Smart Prepress, use independent reference masks plus boundary displacement, small-component survival and final-size legibility. Treat PSNR/SSIM as supporting metrics, not the acceptance rule.

### 7. Edge-preserving denoising needs noise-aware parameters and artifact checks
The Japanese adaptive bilateral-filter abstract chooses spatial/range parameters using perceptual noise sensitivity in flat regions. A separate Japanese paper proposes fast M-estimation to reduce noise without the edge blur associated with low-pass filtering. These are candidates for benchmark tests, not interchangeable production defaults. Measure halos, edge displacement, color shift and noise residuals.

### 8. Separate compression artifacts from genuine fine texture
The Japanese TV-regularization paper splits structure and texture components, then uses edge-guided filtering to reduce JPEG block and mosquito noise while retaining small texture signals. This is relevant when customer uploads contain compressed JPEG artwork. Add a compression-restoration route that is opt-in and verify that thin strokes and distressed texture survive.

## Recommended benchmark design

1. Create labelled references for: flat logos, text-heavy designs, Arabic-script graphics, fine line art, distressed graphics, transparent/photo cutouts and compressed uploads.
2. For segmentation/matting: report alpha/IoU where appropriate, boundary displacement, edge-band error, and small-component survival.
3. For denoising/restoration: report PSNR/SSIM only alongside edge/texture retention and visual review.
4. For printability: render test charts at the target physical size; record minimum surviving line width, gap width, dot size and letter-counter size.
5. Make every transform reversible; store source hash, algorithm/version, parameters and operator corrections.
6. Keep preview compositing and mockup shadows separate from the transparent print master.
7. Do not infer DTF-specific performance from medical, remote-sensing, archaeological or JPEG-restoration benchmarks.

## Evidence-depth statement

Of the ten accepted pages, the Portuguese segmentation paper and the arXiv thresholding paper had substantial body sections read. The remaining accepted pages were read at abstract/metadata level (some with both original-language and English abstracts). The source index records this distinction. Two attempted pages were excluded because retrieval failed or returned a verification challenge.

## Scope and safety

No physical DTF print test was performed. No storefront code, production application, Ready-to-Print Master or deployment was changed. No merge was performed.
