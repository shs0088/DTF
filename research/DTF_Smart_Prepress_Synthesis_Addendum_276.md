# DTF Smart Prepress synthesis — Batch 276

Source: research/Batch_276_2026-10-08.md.

1. Evaluate alpha-mask geometry, low-alpha foreground RGB, and mockup texture interpolation independently. Use a separate mockup derivative for edge-color extension; preserve print master.
2. Record source pixels, final physical size, source effective PPI, resampling kernel, gamma and alpha handling. DPI metadata is not added image detail. Check for ringing and thin-line loss.
3. Guided matting can improve high-resolution alpha edges but does not restore lost artwork detail. Keep matting and artwork upscaling provenance separate.
4. Bayer, Floyd–Steinberg and Atkinson have different error/tone behavior. Verify kernel coefficients and measured coverage. A preview dither is not a calibrated RIP screen.
5. Measure both minimum printable dot and tone-value increase with a specific printer, ink, film, RIP mode and transfer process. Other printing methods' numeric thresholds are not DTF standards.

Research-only. No deployment, merge, or protected storefront modifications.
