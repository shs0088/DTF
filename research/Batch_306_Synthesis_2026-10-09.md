# DTF Smart Prepress — Batch 306 engineering synthesis
Date 2026-10-09. Source ledger: docs/DTF_SMART_PREPRESS_LEDGER_306_ADDENDUM.md (13 individually opened sources). Previous provisional upper bound 2,595; updated provisional upper bound 2,608. Globally certified unique count **not established**.

## P0 — Alpha representation, resampling and color
- Keep original upload and approved Ready-to-Print Master immutable. Derived previews, masks, white underbase and mockup textures are separate artifacts.
- Explicitly tag straight/premultiplied RGBA, BGRA channel order, bit depth and color space. For appropriate compositing/filtering, use linear-light premultiplied float RGBA, then guarded unpremultiplication for straight-alpha PNG export. Low-alpha 8-bit roundtrips lose RGB information.
- Local synthetic OpenCV test: 2x2 image with one opaque red pixel and three transparent black pixels resized to 12x12. At (4,4), naive per-channel bilinear result BGRA=(0,0,143,143), premultiplied-filtered/unpremultiplied result BGRA=(0,0,255,143). The former contaminates edge RGB. This is an algorithmic test, not printer calibration.

## P0 — Morphology, thin details, white support
- A 2-pixel-wide, 9-pixel-high synthetic stroke (18 foreground pixels) is entirely deleted by a 3x3 rectangular erosion. Regression tests must protect Arabic dots/diacritics, small lettering, holes and isolated halftone islands.
- Generate white underbase from a separate mask using **physical** print dimensions and printer-specific choke. Warning w <= 2c for a stroke width w with inward choke c on both sides is geometry, not a universal print limit. Report disappearing support before applying any change.

## P1 — Segmentation and edge decontamination
- BGR/HSV color thresholding and contiguous color selection yield coarse binary masks, not reliable soft alpha or foreground RGB recovery. Evaluate interior color-similar artwork and transparency on black/white/colored backdrops.
- Preserve topology and track both alpha and foreground RGB changes. Do not silently convert soft alpha to binary or fill all holes.

## P1 — Dithering and color management
- Compare Floyd-Steinberg, serpentine, ordered Bayer, clustered-dot and alternative error diffusion on gradients, text and alpha; audit actual preserve_alpha behavior before adopting a library.
- Gamma/linear-light processing and dot gain matter; a display halftone is **not** proof of DTF RIP dot formation, white density or transfer durability. Vendor 300-DPI, choke, LPI, ICC/FOGRA advice is context-specific and must not become universal gates.

## P2 — Mockup-safe images
- Premultiplied alpha-safe interpolation can improve derived 3D mockup textures. Portuguese SIFT/DoG research may help 3D photo matching, but cannot justify altering the printing master.

## Acceptance gates
1. Original/master SHA-256 unchanged after analysis and preview.
2. RGBA/BGRA, straight/premultiplied, ICC, low-alpha and alpha-zero tests.
3. No new visible fringes on black, white or colored backgrounds.
4. Explicit warnings on lost components, strokes, holes and diacritics.
5. White support risk computed in mm at final physical size using printer-specific configuration.
6. Dither/halftone conversions opt-in, reversible and separated from RIP calibration.
7. Log processing provenance and never claim physical printability from PSNR/SSIM/Dice alone.

No merge, deployment or protected storefront modification. Historical semantic deduplication remains incomplete.