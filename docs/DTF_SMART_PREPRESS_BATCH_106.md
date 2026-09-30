# DTF Smart Prepress Research — Verified Batch 106

Verified cumulative target before batch: 1522 / 10,000.

## New opened/read pages

1523. https://dtfnestly.com/docs/white-ink-uv/
- Named W1 spot channel; standard DTF uses one white plane while UV workflows may use W1/W2/W3.
- Separates hard-threshold white edges from soft anti-aliased white edges.
- TIFF transparency, ICC embedding, vector pass-through and RIP-compatible compression are explicit interoperability concerns.

1524. https://dtfnestly.com/blog/w1-white-channel-rip/
- Distinguishes RIP-generated white from explicit per-pixel W1 white authority.
- Explicit W1 is useful when semi-transparency or unattended queueing needs deterministic white behavior.
- White-channel screening is distinct from color screening; frequency/angle interaction can create moire.

1525. https://halftoneapp.com/
- Couples target physical size and output DPI to raster dimensions.
- Separates garment-color/luminance knockout from a transition-band halftone.
- Exposes minimum dot diameter in millimeters and warns that sub-floor dots may not survive transfer.

1526. https://pigmentalab.io/en/semitonos-dtf
- Alpha-mask halftoning keeps RGB unchanged and multiplies the original alpha by a dot mask.
- Dot spacing, maximum radius, curve/exponent, shape and angle are independent screening controls.
- Very small pointed shapes can rasterize into fragile features; robust shapes should be validated against final physical dot size.

1527. https://img.nouplo.com/halftone-generator/
- Browser-local halftoning with dot/line families and transparent output.
- Reinforces that semi-transparent fades and solid ink masses are different production problems; halftoning can replace continuous low-opacity coverage with printable opaque marks.

1528. https://halftoneprint.com/dtf/
- Treats dot size, angle and density as artwork/process-dependent rather than universal presets.
- Explicitly recommends judging screen structure at final artwork size and validating against the actual printer/film workflow.

## Dedup/counting notes
All six pages above were opened/read individually. Search-result snippets were excluded. Localized mirrors of the same page were not counted separately. Pages already known from earlier batches (including DTFWiz white checker, Vecspine underbase, Brandum, Golden DTF and Aero Print) were not added.

## Engineering synthesis
1. Introduce `WhiteAuthority = RIP_GENERATED | EXPLICIT_W1` and prohibit silent double-generation of white.
2. Preserve white as its own plane with explicit edge policy (`hard` versus fractional/soft), rather than deriving it late from display RGB.
3. Screening QA must use physical minimum dot diameter after final scaling; LPI/DPI metadata alone cannot establish transfer survival.
4. Model alpha-mask screening as `alpha_out = alpha_in * screen_mask` so RGB and coverage semantics remain independently testable.
5. Treat screen family, angle, spacing/frequency, dot shape and tone-growth curve as provenance-bearing parameters; any later resize invalidates physical screen calibration.
6. Add a RIP round-trip/interoperability check for named spot channels, transparency, ICC metadata and compression where production export depends on TIFF/RIP conventions.

Verified cumulative count after batch: 1528 / 10,000.
