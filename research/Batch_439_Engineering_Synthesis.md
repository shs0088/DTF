# DTF Smart Prepress — Batch 439 engineering synthesis

Date: 2026-10-15. Source index: `research/Batch_439_Canonical_Source_Index.md`. 23 newly opened/read locally distinct pages; provisional cumulative upper bound 4,871. This is **not** a globally certified unique count.

## Engineering conclusions (research-informed, not printer-certified)

1. **Halftone algorithms are not interchangeable.** Fixed threshold loses tonal detail; Bayer produces repeatable structured patterns; error diffusion spreads quantization residuals but may produce directional "worms", overshoot and edge sharpening. A Japanese 1996 abstract identifies overshoot around intensity steps; adaptive-threshold research examines directional artifacts and distortion. Evaluate coverage error, edge continuity, periodic artifacts and tonal stability on actual printed output. [JA CiNii; EN IEEE PubMed; JA Zenn; ZH Chaosgoo]

2. **Linear-light calculations versus RIP tone reproduction.** Dithering directly in sRGB values is not physically equivalent to diffusing light/ink coverage in a linearized domain. Linear-light handling is a useful candidate for perceptual fidelity, but ink dot gain, garment absorbency and RIP tone curves require measured calibration; do not apply a generic gamma correction blindly. [ZH Chaosgoo; EN Plotcaster; EN Go dither]

3. **Minimum physical dot support is a separate printability constraint.** Japanese clustered-dot QUBO example enforces 2×2 clusters to avoid isolated 1-pixel dots. At 300 PPI a source pixel is 25.4/300 = 0.0847 mm, so a 2-pixel source feature is about 0.169 mm. This is a *source-raster measurement*, not the printer's native droplet resolution or a universal printable minimum. Build calibration patches and measure minimum stable white/color dot size. [JA QUBO clustered-dot; DE Dresden raster PDF]

4. **White-underbase/punch is controlled by the RIP.** neoStampa 10.2 added DTF halftone and punch effects on the white mask, with choke settings and white-layer method controls. DTFForge's guide shows a separate spot channel (often `Spot_1`), selection contraction and TIFF round-trip validation. Treat these as workflow examples, not universal parameters. Capture the exact RIP, profile, white generation mode, choke ownership, punch method, spot-channel name, and output format per printer. Never apply Smart Prepress choke on top of a RIP choke without explicit configuration. [ES neoStampa; ES DTFForge]

5. **Protect Alpha and foreground geometry.** Dither RGB or white-mask coverage in a controlled derivative; preserve fractional Alpha, foreground RGB, tiny Arabic marks and enclosed regions. A black/white halftone preview must never replace an approved RGBA Ready-to-Print Master. Some open-source implementations explicitly preserve Alpha, but this must be verified on export and against light/dark garments. [EN Go dither; IT GIMP 3; PT multimedia lab]

6. **Mockup resampling is independent from print-master preflight.** Reverse/inverse geometric mapping with explicit sampling kernels reduces holes in transformations, but kernel selection trades sharpness against ringing and blur. Keep original pixels immutable; use separate mockup derivatives. [RU SmartEngines]

7. **Use language-independent processing identifiers.** The multilingual corpus includes implementation and academic material in ZH, JA, FR, DE, RU, ES, PT, IT, TR and EN. Localized interface labels should never drive operation dispatch. Record algorithm, parameters, version, input hash, output hash, Alpha semantics and target profile.

## Proposed quality gates
- Validate source geometry, effective PPI, transparency distribution, component/hole topology, minimum physical stroke/dot width and color profile before optional halftoning.
- Generate reproducible 1-bit/CMYK/white-layer *derivatives*, each tagged with target RIP and calibration revision; never silently overwrite masters.
- Measure tone reproduction and dot gain using printed test charts at actual film, ink, powder, curing and transfer conditions.
- Compare ordered, serpentine error-diffusion and clustered-dot halftones with tone/coverage error, worm artifact rate, edge overshoot and small-detail survival.
- Export/reopen TIFF or PNG and verify channels, Alpha, physical dimensions and ICC/profile provenance.

## Count and integrity
Previous provisional 4,848 + 23 new locally distinct = **4,871 / 10,000 (48.71%)**. Remaining provisional gap: 5,129. Historical semantic deduplication is incomplete, so 4,871 remains an upper bound, not a globally verified unique-page count. Abstract pages were not mistaken for full papers. No deployment, merge, protected storefront change or approved master modification.
