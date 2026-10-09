# Batch 301 synthesis A — alpha and image geometry

Matting sources distinguish coarse segmentation masks, soft opacity, and estimated foreground color. Color contamination at a partially transparent edge is not repaired merely by changing opacity. Keep original pixels immutable and compare compositing on dark and light backgrounds.

A French NumPy morphology exercise zeroes unprocessed border pixels. Such initialization can create false borders or delete strokes. Test image-border policies, component connectivity, holes, isolated dots, and Arabic diacritics before accepting a cleanup step.
