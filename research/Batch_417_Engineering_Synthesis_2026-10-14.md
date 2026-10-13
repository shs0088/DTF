# DTF Smart Prepress — Batch 417 Engineering Synthesis
Date: 2026-10-14. 16 individually opened/read locally distinct pages. Provisional cumulative upper bound **4,448 / 10,000 (44.48%)**. Globally certified uniqueness unknown; historical semantic deduplication remains incomplete.

## Alpha conventions and matting
Japanese FFmpeg examples demonstrate that mismatched straight and premultiplied alpha can create fringes on transparent boundaries even when an opaque-background preview looks correct. French GIMP/babl engineering notes confirm that hidden RGB in fully transparent pixels may matter during transformations and alpha edits. Chinese matting analysis contrasts Bayesian, closed-form Laplacian, nonlocal KNN, and learned approaches. Rust `keying` documents model mask -> trimap -> closed-form fractional alpha -> independent foreground-color decontamination. **Requirement:** preserve separate segmentation, trimap, fractional alpha, foreground RGB and final RGBA artifacts; declare alpha mode and color space at each boundary. Check the Rust documentation's `mask > 240 and < 10` wording against implementation before adopting it.

## Topology, connectivity and lettering
Russian flood-fill research distinguishes 4-neighbor and 8-neighbor connectivity: diagonal adjacency changes what counts as an isolated region and can leak background into art. Portuguese topology-preserving segmentation, Turkish fuzzy-topology gradients and edge-continuity methods show that noise suppression and fixed thresholds can alter connectivity. **Requirement:** protect Arabic dots, diacritics, punctuation, disconnected logo components and glyph holes. Record connected components, holes, Euler characteristic and minimum feature width before/after morphology.

## Denoising and restoration
Arabic-language Iraqi research finds that enhancement filters can change image features more than the original Gaussian noise. Baghdad engineering research combines Wiener/inverse restoration with adaptive wavelet thresholding to mitigate amplified noise. **Requirement:** assess text and edge geometry in addition to PSNR; avoid automatic destructive smoothing.

## Resampling and mockups
Italian signal-processing treatment explains reconstruction and anti-alias low-pass filtering before downsampling. Spanish 12-page subpixel-edge study evaluates interpolation followed by Sobel/Prewitt/Canny. Interpolation increases sample density, not source detail. Korean OpenCV affine tutorial details a 2x3 transformation matrix. **Requirement:** preserve immutable Ready-to-Print Master and generate alpha-safe mockup derivatives, with effective PPI and ringing checks.

## Color-key and printability
German image-selection research differentiates hard-edged logos, hair and semitransparent glass. Spanish CIELAB segmentation uses perceptual color distances instead of a single RGB threshold. Italian antialiasing examples show how binary transparency and white-baked edge pixels create halos on dark backgrounds. **Requirement:** avoid globally removing white pixels, isolate edge-band RGB contamination from alpha geometry, and calibrate DTF white underbase/choke/spread in physical units with actual printer/RIP tests.

## Regression checks
9 deterministic synthetic tests passed: correct straight/premultiplied compositing, double-premultiply failure, zero-alpha behavior, 4/8 connectivity, protected Arabic dot, physical choke, effective PPI, master integrity, zero-alpha unpremultiplication guard. No deployed application or physical printer was tested.

Source evidence: `research/Batch_417_Canonical_Source_Index_2026-10-14.md`. Research-only branch; no merge, deployment or storefront/master modifications.
