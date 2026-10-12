# DTF Smart Prepress — Batch 374 engineering synthesis

**19 individually opened/read, locally distinct pages.** Provisional cumulative upper bound **3,681**. Global certified count **not established**.

## Findings

1. Japanese Canvas experiments show that premultiply/unpremultiply of 8-bit RGBA irreversibly quantizes low-alpha RGB (alpha=1 can retain only 0 or 255). Never treat browser Canvas roundtrips as archival Ready-to-Print master transformations.
2. A ComfyUI node documents incompatible foreground/background mask polarities and a separately installed pymatting dependency. Record and test mask polarity and dependencies explicitly.
3. Portuguese chroma-key and Spanish HSV segmentation research show that background-color selection and nonuniform illumination alter segmentation performance. Use conditional algorithms and preserve interior holes and small text components.
4. French/German edge-decontamination workflows distinguish replacing contaminated edge RGB from shrinking alpha. Verify against white, black and garment mockup backgrounds, preserving topology and fractional alpha.
5. Japanese two-threshold chroma-key code provides a gradual alpha band but may delete foreground artwork sharing the background color. Add a protected-white-letter regression case.
6. Arabic noise-filter research finds enhancement can alter features more than added Gaussian noise. Denoise only with downstream edge and topology checks.
7. Italian materials distinguish preview error diffusion and thresholding from printer-specific RIP halftoning. Never apply laser engraving or generic screen settings as universal DTF white-underbase/choke or dot-size standards.
8. Preserve immutable originals and record processing provenance: mask polarity, alpha representation, color profile, effective PPI, physical print size, derivatives and printer calibration.

## Limits

No physical printer/RIP validation. Complete corpus-wide semantic deduplication unfinished. Do not infer a globally verified 3,681 pages. No storefront modification, merge or deployment.

## Next work

Consolidate historical source ledgers and DOI/title hashes, confidence-aware foreground RGB reconstruction, Arabic diacritic/stroke preservation, white underbase printer profiles, physical dot survival tests, and async upload security.
