# Batch 308 — Dithering

A reviewed Korean implementation uses a channel-maximum grayscale transform. That does not preserve perceptual brightness. Use a calibrated luminance transform before preview dithering, and verify output boundary rows. Printer RIP halftoning remains a separate process.
