# Batch 396 — Alpha and mockup engineering

Pillow RGBA alpha-mask pitfall: on a transparent target, pasting (255,0,0,128) with the same RGBA image as mask yields (128,0,0,64). Image.alpha_composite instead preserves (255,0,0,128). This was reproduced locally and indicates that a mask can attenuate fractional alpha twice. Use explicit alpha replacement or alpha_composite, and test fractional alpha gradients after export.

Semantic segmentation labels are discrete integers and must not be antialiased. Alpha matting estimates fractional coverage. Maintain separate class masks, trimaps, alpha floats, foreground RGB and final RGBA. For 3D mockups, RGB extension into transparent texels can avoid seams; perform it only on preview derivatives and do not change the master or its alpha.
