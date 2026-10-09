# Batch 315 Engineering Synthesis — A
Provisional cumulative upper bound 2,758 of 10,000 (27.58%). Globally certified unique count unavailable pending historical semantic deduplication.

**Color processing:** A Japanese dithering implementation applies gamma after weighted encoded RGB, rather than linearizing channels before computing linear-light luminance. Independent synthetic calculations: red 0.0332 versus 0.2126; green 0.4783 versus 0.7152; blue 0.00308 versus 0.0722. The example's RGBA branch ignores transparency. Preserve ICC and Alpha; test color-space ordering before quantization.

**Edge treatment:** Distinguish foreground RGB decontamination, Alpha matting, and compositing. Evaluate artwork on black, white and saturated backgrounds; preserve immutable print originals.