# DTF Smart Prepress — Batch 304 synthesis B
Date: 2026-10-09. Sources: docs/DTF_SMART_PREPRESS_LEDGER_304_A.md and docs/DTF_SMART_PREPRESS_LEDGER_304_B.md.

5. **Artifact separation:** Segmentation masks, soft alpha, 3D mockup textures, visual outlines and RIP white-underbase are distinct. Do not modify an approved Ready-to-Print Master during preview generation.
6. **Physical limits:** Software edge quality, skeletonization, microscopy Dice/IoU and alpha correctness do not establish DTF minimum printable feature size, choke, dot survival or transfer durability. Calibrate with the real RIP/printer/ink/film and physical test prints.
7. **Safe processing:** Validate image signature, dimensions and decompression limits; keep source hashes and provenance; use bounded async jobs, cancellation, timeouts and clear model-download/license disclosures.

Suggested regression suite: synthetic RGBA alpha 0/1/127/254/255; anti-aliased circles, glass, isolated Arabic diacritics, letter holes, thin lines and non-square images. Track component/hole/stroke changes and RGB/alpha deltas. White choke 0/1/2 px may be simulated at a specified physical size but cannot be universally approved without RIP/print tests.

Count: prior provisional upper bound 2,563; 16 newly opened locally distinct pages; updated provisional upper bound **2,579** (25.79%). Globally certified unique count remains unknown pending historical semantic deduplication. No merge or deployment.
