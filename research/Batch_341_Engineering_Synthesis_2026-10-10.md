# Batch 341 Engineering Notes

Research batch: 14 newly opened and read pages in 11 language groups, 16 mathematical regression tests passed.

## Findings
- Alpha masks and recovered foreground RGB are distinct. Inversion of alpha compositing becomes unstable when alpha approaches zero.
- Bilateral filters use spatial and color-range weights. Strong smoothing can still erase thin strokes; compare against clean reference images.
- Adaptive thresholds are useful under uneven lighting. Erosion and opening can remove isolated Arabic dots, diacritics and fine artwork.
- Connectivity-aware flood filling can remove edge-connected background without deleting disconnected same-color foreground details.
- Floyd-Steinberg distributes the entire quantization error, whereas Atkinson diffuses only three quarters.
- Anisotropic diffusion can exhibit directional artifacts; check diagonal and horizontal features.
- Use precision, recall and F-score to evaluate edge maps against reference data.
- A German tutorial contained unresolved merge-conflict markers; third-party code must be linted before reuse.

Approved printing masters remain unchanged. Mockup derivatives are separate. DTF RIP choke, underbase and screening require printer-specific calibration.

Count: provisional 3130 of 10000. Certified global unique count remains unknown because older semantic deduplication is incomplete.
