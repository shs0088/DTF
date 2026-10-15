# Batch 451 Engineering Summary

1. Protect disconnected Arabic dots, diacritics, punctuation, thin strokes and halftone islands by comparing component/hole counts before and after morphology.
2. For resampling, use premultiplied color P=alpha*RGB; safely unpremultiply and preserve straight-alpha PNG master.
3. Wiener/inverse deblurring can amplify noise; wavelet denoising and visual improvement do not prove original detail fidelity.
4. Ordered dithering, error diffusion, green noise and direct binary search require printer-specific dot survival tests; avoid double RIP halftoning.
5. Color proofing requires device/media-specific profiles; an RGB preview is not a physical proof.
6. Alpha selection is not white-underbase separation. Keep calibrated white-channel processing RIP-aware.
7. Validate RGBA buffer sizes and preserve original master SHA-256; keep mockup derivatives separate.

Provisional 5,085 / 10,000, 14 new read pages. No deployment, merge, storefront or approved master changes.
