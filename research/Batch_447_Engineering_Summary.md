# Batch 447 — engineering findings

2026-10-15: 20 newly opened/read locally distinct pages; provisional cumulative 5,030/10,000. Historical semantic deduplication incomplete.

Closed-form matting requires trimap constraints and separate foreground RGB recovery; correct premultiplied-alpha arithmetic prevents halos. Floyd–Steinberg conserves diffusion weights, Atkinson sends only 6/8; printer-specific dot survival needs testing. Morphology and Otsu/HSV/Canny require topology and dtype checks to protect Arabic dots and thin strokes. Vendor RIP white choke/ICC numbers are not universal; avoid double-choke and calibrate in millimeters. Preserve immutable print masters and generate separate alpha-safe mockups.

Detailed synthesis and complete manifest retained in Batch 447 local package. No deployment or merge.
