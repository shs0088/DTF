# Batch 322 engineering notes

11 individually opened multilingual technical sources; provisional total 2852; globally certified count unknown.

1. Color-only deletion can erase white foreground; border-connected flood fill can leave enclosed white background. Use protected masks and inspect internal regions.
2. Morphological erosion removed an isolated 1-pixel mark in a synthetic test. Require component, hole, and stroke-preservation gates for Arabic typography.
3. Single-background inverse matting is underdetermined: observed intensity 0.75 on white can arise from alpha 0.25 and foreground 0, or alpha 0.5 and foreground 0.5.
4. Reopen PNG outputs and validate alpha. Keep web/mockup derivatives separate from printing masters.

No storefront, deployment or merge changes.