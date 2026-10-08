# DTF Smart Prepress — Engineering Synthesis Addendum 287

14 new individually read source pages; details in research/Batch_287_2026-10-08.md.

1. Keep segmentation, fractional alpha and RGB edge decontamination separate. Do not globally remove white, holes, text dots or disconnected parts.

2. Correct straight-alpha source-over is C=a*F+(1-a)*B; premultiplied source-over is C=Fp+(1-a)*B. Preserve ICC and original print master.

3. Measure components, holes, min stroke width at final physical size, weak-alpha tails and edge-color spill on contrasting backgrounds.

4. White choke radius c pixels can remove all white support of a line width w<=2c. Convert mm to actual RIP raster units and test film/powder/transfer.

5. Record Bayer/blue-noise/diffusion matrix, seed and traversal; shader dithering cannot replace physical RIP halftone calibration.

6. Vendor W1 TIFF spot-channel mapping and white screen settings require actual RIP confirmation; never assume universal choke, LPI or ink density.

7. FastAPI upload sample trusts MIME and buffers entire input: require content signature, pixel/resource limits, isolated workers, immutable masters.

8. Six-product binary IoU study is insufficient; add alpha MAE, boundary metrics, topology, print-size and physical transfer tests.

No merge, deployment or protected storefront changes.