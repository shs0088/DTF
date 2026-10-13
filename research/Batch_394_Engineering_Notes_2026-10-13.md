# Batch 394 Engineering Notes
Date: 2026-10-13

20 individually opened/read, locally distinct sources across nine accepted languages; historical semantic certification pending.

1. Seeded, exterior-connected flood fill preserves enclosed white artwork better than global white-to-transparent replacement. Add topology and protected-component checks for Arabic lettering.
2. Separate segmentation, trimap, fractional alpha and foreground RGB. Apply consistent straight/premultiplied alpha conventions for previews and resampling; keep printing master immutable.
3. Opening and closing can destroy small dots or fill holes. Compare components and minimum stroke width. Physical choke: 0.2 mm at 300 ppi is about 2.36 px; printer/RIP calibration still required.
4. Error-diffusion kernels and weights must be tested independently of RIP screening. Avoid double halftoning and uncontrolled stochastic variation.
5. No-reference IQA for blur/compression and edge-selective sharpening are promising but do not prove printability. Pair metrics with final-size geometry and actual test prints.
6. Independent synthetic regression suite: 26 tests passed; not deployed-app or printer validation.

Source URLs, detailed limitations and evidence references are preserved in the local Batch 394 research package. No merge, deployment or storefront changes.
