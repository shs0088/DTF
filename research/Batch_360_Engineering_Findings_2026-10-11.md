# Batch 360 Engineering Findings (2026-10-11)

1. Separate fractional alpha estimation from foreground RGB decontamination; inverse compositing is unstable at low alpha.
2. Transparent-edge RGB extension depends on the resampling filter footprint; bilinear and Lanczos need different support.
3. Protect disconnected artwork, Arabic dots, thin strokes and interior holes before morphology.
4. Treat PNG as straight alpha on disk; use consistent premultiplied working buffers.
5. Bind white underbase, choke, ink limits and ICC to printer/RIP print mode; no universal calibration.
6. Validate third-party formulas: a reviewed Spanish thesis prints luminance coefficients summing to 1.300.
7. Preserve immutable printing masters and derived preview provenance.

16 locally distinct pages; provisional cumulative 3,426. Historical semantic deduplication incomplete. 35 synthetic tests passed; no physical calibration.
