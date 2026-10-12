# Batch 389: Alpha and halftone findings

Japanese image-processing research describes nearest-neighbor foreground RGB extension into semitransparent edges. Preserve the alpha channel, but check whether edge gradients are damaged.

A separate Japanese halftone implementation rasterizes CMYK dot patterns at higher resolution before downsampling to reduce jagged boundaries. This is artistic image processing, not a substitute for printer RIP calibration.

Korean matting research separates object segmentation, trimap generation, fractional opacity and foreground color estimation. Test on small isolated letters before accepting outputs.
