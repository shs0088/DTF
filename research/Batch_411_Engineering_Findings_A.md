# Batch 411 — Alpha and morphology

GrabCut masks are binary, not fractional matting. Maintain separate segmentation, trimap, alpha, foreground-color reconstruction and final RGBA stages. Preserve Arabic diacritics and small independent design components during morphology.
