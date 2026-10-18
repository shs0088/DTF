# Batch 520 — Canonical Source Index

Date: 2026-10-18. Seven pages were individually opened and read. Search snippets alone were not counted.

## B520-001 — OpenCV Alpha Matting API
URL: https://docs.opencv.org/4.13.0/d4/d40/group__alphamat.html
Language: English. Full API reference read.
Finding: Information Flow matting estimates a grayscale alpha matte from an RGB image and a grayscale trimap. The unknown region is estimated using pixel affinities.
SHA-256 URL: e6103b34719a9ca06cdb2367ab9d5679018eb7d87341f2c88ff0c59621853990

## B520-002 — OpenCV Information Flow tutorial
URL: https://github.com/opencv/opencv_contrib/blob/5.x/modules/alphamat/tutorials/alphamat_tutorial.markdown
Language: English. Build, test, and reference sections read.
Finding: Documents how to compile and run the sample with an RGB image and trimap. It complements the API reference but is a distinct tutorial page.
SHA-256 URL: bd2bde7cec8b9cb8a5d549ea5d309563152345f2200f78162fd0d061d7791912

## B520-003 — Any-Render implementation README
URL: https://github.com/Functionhx/Any-Render
Language: Chinese. Workflow and foreground-color correction sections read.
Finding: Describes recovering foreground color around partially transparent edges when the original background is known and approximately uniform. The correction must be guarded at very low alpha values.
SHA-256 URL: 826d6abcd158259abe0205b94acdff3adf2f281f62984d254fb8b888e6b25517

## B520-004 — ClearMatte Studio README
URL: https://github.com/hu-qi/clearmatte-studio
Language: English. Local model loading, browser execution, and deployment sections read. The Chinese README is a localized parallel version and was not counted separately.
Finding: Browser-local Transformers.js and BiRefNet-lite ONNX processing; same-origin model hosting and WebGPU/WASM fallback.
SHA-256 URL: 082cd3cd3a773f4166f613a7249915374b17bad07ac617ce95c9b0f2bd5cdd45

## B520-005 — Cloudinary background-removal documentation
URL: https://cloudinary.com/documentation/background_removal
Language: English. Fine-edge option, derived transformations, image-size limit, asynchronous upload/update, notifications and confidence sections read.
Finding: On-the-fly processing preserves the original and creates a derivative; initial generation may return a temporary 423. Upload/update processing is asynchronous and can replace the stored original.
SHA-256 URL: 7a8702464b9ae91a81079ada350787fe3c9e6b5c0f20dedc9fe814e12df335d6

## B520-006 — Bria Remove Background API
URL: https://docs.bria.ai/image-editing/editing/background-remove
Language: English. Alpha preservation, thresholding, async status and webhook sections read.
Finding: Input partial alpha can be preserved; optional thresholding converts alpha to a binary mask. Async mode returns a status URL and can send a completion webhook.
SHA-256 URL: b122a425a2954f4535ee4618fb1d07e90381953dd97e92a49ff4aa71b91b0e36

## B520-007 — Snipmat API
URL: https://snipmat.com/api
Language: English. Endpoint, parameters, size limits, output modes, error codes and batch behavior read.
Finding: Supports RGBA or alpha-only output, optional crop/keep-largest behavior, 25 MB/32 MP limits, retry-aware rate-limit/queue errors, and asynchronous batches.
SHA-256 URL: d3ff0f0e22bd7791d7214928ca229ec39acc639ae59197ac40fc6b189f683ec1

## Deduplication boundary
Accepted URLs are distinct within this batch and absent from the only historical URL-hash index available at the expected path (B511). Most other expected historical hash files were unavailable, so global uniqueness remains unknown. The Japanese multi-language matting article, Russian encyclopedia mirror, and overlapping UApiPro API page were excluded. No physical DTF validation was performed.
