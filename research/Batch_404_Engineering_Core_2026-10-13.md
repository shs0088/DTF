# DTF Smart Prepress Batch 404 — Engineering Core

14 new opened/read and locally distinct sources; provisional upper bound 4,216, globally certified unique count unknown.

Critical reproducible failure: Pillow Image.paste(src, mask=src) on transparent target turns (255,0,0,128) into (128,0,0,64). Image.alpha_composite(src) preserves (255,0,0,128). Do not use masked paste as source-over.

Photoshop gray working space can alter exported numeric alpha. Marker/mask geodesic reconstruction preserves surviving geometry but cannot recover tiny components removed during erosion. Foreground-color reconstruction must be separate from alpha estimation. Decontamination and edge-geometry operations must be separately controlled. White-background RGB thresholding can delete white lettering. Preserve original Ready-to-Print Master and create derivatives.

18 local deterministic synthetic tests passed; no production deployment or physical RIP calibration. Historical semantic audit outstanding.
