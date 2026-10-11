# DTF Smart Prepress — Batch 363 Engineering Synthesis

Date: 2026-10-11. 20 newly opened/read locally distinct technical pages. Provisional cumulative 3,484 / 10,000; historical global semantic uniqueness not yet certified.

## Engineering findings

1. Border-connected flood-fill can preserve enclosed white details where global color thresholding destroys them. It can still leak through gaps. Protect Arabic dots, internal holes and disconnected components.
2. Alpha estimation and foreground RGB decontamination are different stages. Nearest opaque-color propagation may flatten real gradients; known-background inversion is unstable as Alpha approaches zero.
3. Browser Canvas premultiplied-Alpha round-trips can quantize hidden RGB. Preserve original decoded pixels and keep Canvas as preview-only unless verified.
4. BiRefNet ONNX dichotomous segmentation is not proof of fractional Alpha Matting. Independently inspect mask and edge-color quality. Verify Rembg API version and model licensing.
5. Morphological kernel shape and connectivity determine which tiny components survive. Korean OpenCV example uses binary mask compositing that loses partial Alpha and contains an addWeight/addWeighted naming error.
6. FFT low-pass denoising may remove real thin strokes. Benchmark minimum physical stroke width and edge displacement, not only PSNR or speed.
7. A Mimaki DTF printer workflow documents CMYK+white and RasterLink7; choke, white density, ICC, film and ink require printer-specific calibration. At 300 effective PPI, 0.15 mm is 1.77 pixels per side; two-sided choke can eliminate a 0.20 mm isolated stroke's underbase.
8. Keep segmentation, edge detection, Alpha Matting, compositing and mockup preparation as separate operations. Preserve the original Ready-to-Print Master.

All 30 deterministic software tests passed; no physical DTF printer/RIP calibration. No merge, deployment or storefront changes.

See Batch_363_Canonical_Source_Ledger_2026-10-11.md for 20 individual source URLs.