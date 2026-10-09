# Batch 311 — Dither and Alpha Engineering Findings

2026-10-09. A synthetic Floyd–Steinberg test used RGB=[200,128], Alpha=[0,255]. Standard RGB diffusion quantized the invisible pixel 200 to 255 and transferred -24.0625 to the next opaque pixel. The opaque value 128 became 103.9375 and quantized to 0. When the transparent pixel was skipped, the opaque pixel remained 128 and quantized to 255. This is an independent synthetic test, not a claim of a defect in any reviewed library.

Recommendation: define how error diffusion handles transparent and semi-transparent pixels, and test both scan directions. Preserve the original artwork, color profile and Alpha. Use premultiplied linear-light RGB when filtering derived textures, with guarded conversion back to straight Alpha.
