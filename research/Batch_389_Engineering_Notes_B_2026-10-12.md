# Batch 389 engineering notes — production constraints

- Arabic wavelet edge extraction is a candidate for multiscale denoising; test fine lettering before use.
- Turkish image-processing paper appears to reverse opening and closing effects in prose; independently test morphology on synthetic masks.
- Keep JPEG2000 lossy transforms out of the immutable Ready-to-Print Master.
- Color clustering and connected morphology require artwork-specific ground truth and topology checks.
- Two-backdrop foreground reconstruction applies only to controlled multi-background capture.
- 20 local synthetic tests passed. No physical printer calibration or deployment.
