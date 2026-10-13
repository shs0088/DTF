# DTF Smart Prepress — Batch 399 engineering synthesis

## Key findings

1. **Go flood-fill alpha bug risk.** Japanese Go implementation checks white using `Color.RGBA()` against 61680. Go returns alpha-premultiplied channels; a half-transparent white pixel has RGB about 32896 and fails the white test. This can retain a pale halo. For classification, use unassociated chroma with a low-alpha guard, and protect enclosed white artwork. This is an inspected third-party source inference, not a DTF Studio defect.
2. **Topology-preserving background extraction.** Russian reconstruction code and Korean OpenCV C++ examples show how border-connected component extraction differs from global white deletion. Opening can erase isolated 1–2 pixel dots; check components, holes and Arabic punctuation before accepting cleanup. Broken outlines permit exterior flood-fill to invade the foreground.
3. **Guided matting depends on encoding.** Radiance node uses `a=cov(I,p)/(var(I)+eps)` and refines an uncertain trimap band. Epsilon has different effect in sRGB and linear-light guides. Separate segmentation, trimap, Alpha and foreground RGB; verify on contrasting mockup backgrounds.
4. **Do not bake preview backgrounds into print master.** Krita's non-destructive transparency masks preserve editable coverage. GIMP semi-flattening mixes edge colors with a known backdrop for non-fractional-alpha outputs, unsuitable for a transparent Ready-to-Print Master.
5. **White underbase is profile-specific.** NeoStampa has per-image vs profile white-intensity controls and physical-mm choke; 1 mm at 300 PPI equals 11.81 pixels and is not a universal default. Caldera RIP can generate white and choke downstream. Record provenance and avoid double underbase or double choke; preserve white-only and thin artwork.
6. **Resampling changes segmentation.** Mexican academic work compares interpolation before Otsu/watershed and notes small-object sensitivity. Never claim upscaling recovers missing original details; check effective PPI at final physical size.
7. **Source quality caveats.** Italian morphology tutorial uses a neighbor-count rule that is not the general erosion definition; cross-check with formal reference. Chinese third-party rembg API sample does not establish a verified endpoint contract. Arabic wavelet edge detection and Turkish filtering work inform defect-specific, not universal, enhancement.

## Acceptance gates

Immutable master hash; explicit straight/premultiplied Alpha and color encoding; connected-component and enclosed-area invariants; white-only and Arabic typography fixtures; physically dimensioned choke; independent RGB and Alpha inspection; RIP/printer calibration required for production claims.

Batch 399: 17 individually opened/read locally distinct pages. Provisional cumulative upper bound 4,129/10,000 (41.29%), not globally certified. 28 deterministic synthetic tests passed locally; no deployed-app or physical print tests. No deployment, merge or protected storefront changes.
