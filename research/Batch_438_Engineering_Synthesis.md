# DTF Smart Prepress — Batch 438 engineering synthesis

Date: 2026-10-14. 20 new individually opened/read locally distinct sources; previous provisional upper bound 4,828, new **4,848/10,000 (48.48%)**. Globally certified unique-page count not established. See `research/Batch_438_Canonical_Source_Index.md` for all canonical URLs and read references.

## Engineering findings

1. **Boundary quality needs a separate metric.** The Russian SaluteJazz case constructs a narrow evaluation band using dilation minus erosion and reports boundary Dice in addition to whole-image Dice. DTF should add a boundary-specific check, but global/edge metrics do not replace physical print tests.
2. **Background connectivity is not alpha matting.** Japanese border-seeded ImageMagick flood-fill and Canvas BFS can preserve enclosed white artwork better than global white-to-transparent thresholding, but softening the edge does not recover contaminated foreground RGB. Use segmentation, trimap, alpha estimation and foreground-color reconstruction as separately validated stages.
3. **Silhouette thresholding is risky for printing.** A Korean garment-measurement thesis demonstrates a post-rembg alpha threshold of 100/255. That is application-specific: on DTF graphics it could remove anti-aliasing, Arabic dots, thin strokes, halftone islands and intentional translucency. Never apply such a threshold universally.
4. **White-underbase choke is RIP- and unit-specific.** LINKO's PrintFactory guide uses negative millimeters, with -0.1 mm as a regular-art starting example and 0 mm for very fine lines. At 300 PPI, 0.10 mm is 1.181 pixels per edge. Do not double-choke between Smart Prepress and the RIP; test physically.
5. **Morphology must be topology-preserving for text.** French, Japanese, Spanish, Italian and German sources describe erosion, opening, closing and region operations. Opening can delete tiny components; closing can fill counters/holes. Compare component count, enclosed holes and minimum physical stroke width before/after, and protect Arabic diacritics and small text.
6. **Noise suppression has a scale tradeoff.** Arabic wavelet research examines scale, noise and edge width. Optimize for readable printed features rather than maximizing smoothness.
7. **Alpha-edge contamination detection is heuristic.** Comparing translucent edge RGB with neighboring opaque colors can flag suspected matte halos, but legitimate glow and colored translucency can trigger false positives. Preview on white, black and actual garment colors; require approval before changing colors.
8. **Preserve provenance.** Japanese PNG validation distinguishes immutable original, processing candidate, verified export and delivery file. Reopen exports and check alpha distribution, dimensions, profile and RGB edges; mockup derivatives never overwrite Ready-to-Print Masters.
9. **Processing architecture.** Browser ONNX/WASM can reduce artwork upload exposure but requires model memory/loading controls. An Indonesian API documents independent alpha matting, erosion and threshold parameters; record parameter provenance per job.

## Proposed validation gates

- Immutable original with hash and input security/size checks.
- Algorithm selection by artwork type; no automatic global white removal.
- Independent mask, alpha, foreground RGB and color-space checks.
- Component/hole preservation, boundary metric and effective PPI at final print dimensions.
- RIP-specific white preview, physical choke in mm, one choke owner, printer calibration.
- Export/reopen transparent PNG, dark/light/garment previews, explicit master approval.

## Limitations

20 new sources were checked against the accessible central ledger and mounted recent manifests, not a complete historical semantic corpus. Each opened PDF URL counts as one document, not hundreds of pages. Mathematical regression tests are synthetic and do not validate deployed DTF Studio or physical printer output. No merge, deployment or protected storefront changes.
