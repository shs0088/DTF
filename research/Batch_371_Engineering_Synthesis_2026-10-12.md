# Batch 371 Engineering Synthesis — 2026-10-12

## Verified research scope
17 individually opened, locally distinct pages. Historical corpus-wide semantic deduplication remains incomplete; cumulative 3,628 is provisional, not globally certified.

## Findings
1. Alpha and RGB must be handled independently. Straight/premultiplied interpretation errors create dark or colored fringes. Preserve straight-alpha printing masters; use alpha-aware mockup texture resampling and validate compositing on dark/light backgrounds.
2. Linear-light high-precision resampling and kernel choice affect edge quality. Japanese ImageMagick analyses reveal filter-specific behavior; a tutorial's JavaScript Lanczos example appears to mishandle x=0, reinforcing independent unit testing.
3. Foreground segmentation is not alpha matting. Confidence-aware foreground/background color sampling and interactive trimaps improve ambiguous boundary estimation. Inspect alpha, foreground RGB and protected components separately.
4. Erosion, dilation, opening and closing may remove dots/diacritics, merge objects or fill intentional counters. Use topology-preserving quality gates, not default morphology.
5. Dithering and alpha quantization are distinct: GEGL exposes alpha levels separately from RGB. DCT denoising and ICC transforms must not silently change alpha topology. Preview dithering does not validate physical DTF RIP screening.
6. Rockchip RGA documents premultiplication controls and asynchronous fences. GPU output must be synchronized before readback, with chip/format capability checked.
7. Commercial model licensing must be verified against official license terms, not third-party tutorials.

## Engineering gates
Immutable original; reversible derivatives; effective PPI and print size; 4/8-connectivity, holes and minimum stroke checks; alpha/RGB fringe checks on multiple backgrounds; uncertainty-guided review; RIP/printer-specific white underbase, choke and ink settings; avoid double choke.

## Validation
36 deterministic synthetic tests passed. No physical printer, ink, film, white-registration or RIP separation test. No merge, deployment, or storefront change.