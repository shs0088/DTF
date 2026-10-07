# DTF Smart Prepress synthesis addendum — Batch 272

Bayesian matting: RGB observation alone cannot uniquely determine foreground, background and alpha; keep local color priors and trimap uncertainty.

Product cutout: distinguish unwanted cast shadows from transparent product components; protect lenses and other translucent parts.

Background removal: border-connected flood fill preserves enclosed white artwork, unlike global white knockout. Broken contours can leak, so test connectivity before applying.

Edge quality: alpha geometry and RGB decontamination are separate operations. Keep masks reversible and test on black, white and garment backgrounds.

Bayer dithering: ordered threshold matrices are deterministic but not a replacement for calibrated RIP halftones. Lock physical size, screen phase and output DPI; revalidate white/adhesive survival after choke.

Sources: research/Batch_272_2026-10-08.md. Counts and duplicates: docs/DTF_SMART_PREPRESS_LEDGER_272_ADDENDUM.md. Research-only, no deployment.
