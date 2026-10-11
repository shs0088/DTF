# DTF Smart Prepress — Batch 350 Engineering Synthesis
Date: 2026-10-11. Newly opened/read locally distinct pages: 18. Provisional cumulative upper bound: 3,261 / 10,000 (32.61%). Globally certified unique-page count remains unknown pending complete historical semantic deduplication.

## Engineering findings
1. Chinese GrabCut implementation distinguishes hard graph-cut segmentation from optional narrow-band soft alpha matting. Segmentation masks are not equivalent to clean printable transparent artwork.
2. Alpha crop tools with nonzero thresholds can erase very faint artwork. Compare bounding boxes at zero and nonzero thresholds and use print-size-aware padding. Preserve immutable originals.
3. Japanese Photoshop research shows gray working-space configuration can affect numerical exported alpha values. Treat alpha as linear coverage and verify decoded PNG channels after roundtrip.
4. Japanese compositing notes and official Adobe guidance distinguish keying, edge RGB decontamination, matte adjustment and final compositing. White/dark halos cannot be solved by blanket erosion alone.
5. Portuguese bilateral filtering and German anisotropic-diffusion research emphasize edge-aware smoothing; small components can still be lost. Test connected components, stroke width, edge displacement and hole preservation.
6. French mathematical morphology lectures and Spanish scikit-image exercises demonstrate that reconstruction preserves surviving connected shapes but cannot restore an isolated dot lost during marker erosion.
7. Italian morphology and Turkish dimensional-metrology research show that pixel-based kernels and measurements require physical-scale interpretation. At 300 effective PPI, 0.15 mm corresponds to approximately 1.77 pixels.
8. Chinese open-source image workflow combines premultiplied alpha sampling, OKLab/CIEDE2000 color difference and several dithering algorithms. These are preview candidates, not substitutes for calibrated DTF RIP screening.
9. Portuguese local API distinguishes art/glow from solid-object removal and uses batch manifests. Image and ZIP uploads need resource limits, decompression limits, idempotent jobs and per-item error handling.
10. Russian highlight inpainting can erase intentional white design elements. Any restoration must be reversible and protected by semantic and structural QA.
11. Korean OpenCV code correctly contrasts NumPy uint8 wraparound with saturating arithmetic but misspells cv2.subtract and cv2.addWeighted. Lint and test third-party examples before adoption.

## Required QA and implementation
Preserve source pixel dimensions and ICC profile. Store distinct segmentation probability, refined alpha, foreground RGB, RGBA, mockup preview and printer-specific production derivatives. Verify composites against black, white and target garment colors; preserve Arabic dots/diacritics and intentional disconnected components. Evaluate effective PPI, physical line width, and underbase choke in millimeters. White density, ICC, screening and choke require printer-specific physical calibration.

24 independent synthetic regression tests passed using NumPy, OpenCV and SciPy. No physical printer calibration, model benchmark, deployment or merge was performed.

Complete 18-source canonical URL ledger and SHA-256 manifest are in the local Batch 350 research package.