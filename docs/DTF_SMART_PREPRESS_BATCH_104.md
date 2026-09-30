# DTF Smart Prepress — Verified Batch 104

Verified cumulative count: 1517 / 10000.
New materially distinct pages: 6.

1512. https://helpx.adobe.com/uk/photoshop/desktop/make-selections/refine-modify-selections/fringe-pixels-around-a-selection.html
1513. https://removebgx.com/en
1514. https://bgremovers.org/ar/
1515. https://helpx.adobe.com/photoshop/desktop/crop-resize-transform/resize-adjust-resolution/resampling-options.html
1516. https://docs.gimp.org/3.0/eo/gimp-filter-unsharp-mask.html
1517. https://docs.opencv.org/4.5.1/dc/d69/tutorial_dnn_superres_benchmark.html

All six pages were individually opened/read and checked absent from both the monolithic branch ledger (through 1505) and Batch 103 (1506–1511) by canonical URL. Search snippets were not counted. Localized Adobe resampling mirrors were deliberately excluded as translations of the same material. Previously counted WhiteBackgroundRemover Arabic, ImageFader, Golden DTF, Aero Print and other duplicates were excluded.

## Engineering synthesis

Edge decontamination: anti-aliased edge pixels can retain RGB from the old background even when selection/alpha geometry is correct. Defringe and color-decontamination are therefore foreground-RGB repair operations, distinct from alpha refinement. DAPR should diagnose alpha geometry and foreground RGB contamination independently and validate repaired edges by compositing against strongly different backgrounds.

Matting routing: segmentation predicts foreground/background membership, while an optional alpha-matting pass is appropriate for hair and translucent boundaries. This reinforces a staged route: segmentation/subject localization -> uncertain-edge detection -> fractional-alpha refinement, rather than forcing every image through a binary mask.

Browser-local processing: client-side background removal demonstrates a privacy-preserving execution option. Security limits still need to be based on decoded pixels, dimensions, file count and compute budget, not compressed upload MB alone.

Resampling: interpolation must be content- and direction-aware. Enlargement, reduction, smooth photographic gradients and hard-edged/pixel graphics have different suitable kernels. DAPR should record every geometry transform and prohibit treating DPI metadata changes as equivalent to resampling.

Sharpening: unsharp-mask style sharpening targets edge contrast but cannot restore information below the sampling limit. It should be applied after final geometry is known, with halo/noise/text-edge gates, and must not be treated as deblurring.

Super-resolution QA: OpenCV's benchmark evaluates SR outputs with both PSNR and SSIM, reinforcing multi-metric evaluation. For DTF these soft IQA metrics remain subordinate to hard constraints: glyph/topology preservation, alpha integrity, minimum physical feature survival, color error and underbase support.

No deployment, merge, Oracle execution or protected-storefront modification was performed.
