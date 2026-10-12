# Batch 385 — Image-processing findings

- Keep segmentation mask, trimap, fractional alpha and reconstructed foreground RGB separate.
- Use premultiplied-alpha filtering with matching blend conventions; avoid double-alpha darkening and hidden-RGB edge contamination.
- Validate resampling kernels, linear-light behavior, border handling and fine text at final physical print size.
- Color-to-alpha keying can erase legitimate pale artwork. Compare alpha, connected components and dark/light composites.
- Morphological structuring elements can erase dots and holes; evaluate topology before automatic cleanup.
- Denoising and high-pass sharpening are optional and defect-specific.
