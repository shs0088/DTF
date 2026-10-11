# Batch 361 Engineering Synthesis

2026-10-11; 19 locally unique opened pages; provisional 3445/10000, not globally certified.

1. **GrabCut BGR black is not transparent:** Arabic and Chinese OpenCV examples multiply or bitwise-AND a three-channel image by a binary mask. Require actual RGBA output, decode/verify Alpha and preserve the original.
2. **Four segmentation labels are not fractional Alpha:** GrabCut's 0/1/2/3 definite/probable classes cannot recover hair-like transparency or foreground RGB without matting.
3. **WebGL additive blend is not a PNG Alpha representation:** Japanese premultiplied-alpha shader uses alpha-zero additive fragments; an ordinary PNG composite discards that emission. Separate mockup glow from production artwork.
4. **Mask polarity must specify the layer:** A French tutorial says black reveals/white hides, but for a foreground layer mask white reveals the foreground and black conceals it (revealing the background). Unit-test rather than copying slogans.
5. **Topology preservation:** Portuguese color-aware morphology, Turkish opening/closing and Russian region growing show how kernels and seeds can remove Arabic dots, fill holes, or join disconnected strokes. Measure components, holes and minimum width before/after.
6. **Color threshold limitations:** RGB color distance and HSL thresholding depend on lighting and similarity; escalate to guided segmentation/matting when foreground matches background.
7. **Mask and foreground color are separate:** Italian color-decontamination methods address RGB fringe while selection masks address Alpha. Test both on black/white/garment backgrounds.
8. **Research caution:** several university pages supplied only abstracts; no full-paper or physical RIP/printer testing was performed.

No merge, deployment or storefront modifications.
