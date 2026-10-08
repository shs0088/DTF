# DTF Smart Prepress — Engineering synthesis addendum 279

## Novel findings and corrections
1. **Physical-feature-aware morphology:** A structuring element larger than an intentional fine stroke can erase that stroke; dilation/closing can fill deliberate counters and holes. Validate kernel geometry against local feature widths at locked physical size. Record component count, hole count, stroke widths and speckle retention before/after. Source: https://habr.com/ru/articles/565378/
2. **Confidence-banded segmentation:** Russian OCR feedback pipeline suggests testing strong and weak threshold masks and retaining connected components supported by stronger evidence. Use categorical segmentation only to construct a trimap/uncertainty region; matting must estimate soft alpha separately. Sources: https://habr.com/ru/articles/172651/ and https://www.cnblogs.com/yjbjingcha/p/19010676
3. **Flood-fill contract:** Mask H+2 x W+2, 4/8 connectivity, fixed/floating tolerance and edge barriers are first-class parameters. Border-connected removal is not safe when antialiasing creates leakage. The source's ad hoc -0.25 alpha offset can produce negative opacity and must NOT be copied. Source: https://www.cnblogs.com/bjxqmy/p/12309640.html
4. **Matte/RGB decontamination separation:** Source composite I=aF+(1-a)B cannot be inverted robustly when a is near zero. Do not alter alpha during RGB-only repair; preserve source RGB and report uncertainty; test black/white/garment composites. Source: https://www.dostool.com/articles/cmqgt3sln002nqst7k9exobwj
5. **Exact dithering-kernel provenance:** Two independent Japanese implementations illustrate Bayer ordered patterns and error diffusion. A sample uses weights (right,down-left,down,down-right)=(5,3,5,3)/16, not Floyd–Steinberg=(7,3,5,1)/16. Require an explicit kernel manifest, scan order, error accumulator type, coverage checks and boundary conditions. Sources: https://qiita.com/ltzz/items/2160b5a73c206e14bde3 and https://qiita.com/garmiy/items/ce2cf348e24ee744b334
6. **Denoiser metric trap:** An Indonesian tutorial uses the noisy original as PSNR reference. A near-identity result scores highly without necessarily removing noise. Reject such rankings as restoration evidence; use clean ground truth for PSNR/SSIM or no-reference metrics and topology retention when ground truth is absent. Source: https://medium.com/@polescat2/penghilangan-noise-pada-foto-lama-menggunakan-median-filter-gaussian-filter-dan-non-local-means-7e4c9e1e6cef
7. **Historical CLI examples are not standards:** Turkish Rembg alpha-matting and erosion options show qualitative differences but fixed pixel erosion is not a DTF printability specification. Source: https://medium.com/@mucahitkurtulusakin/yapay-zeka-ile-bir-resmin-arka-plan%C4%B1n%C4%B1-silmek-python-f280114dc784

## Priority acceptance suite
- Tiny white-on-black and black-on-white text, intentional holes, distress dots: topology and width regression after each morphology operation.
- Transparent anti-aliased colored logo on black, white, dark fabric: alpha-vs-RGB edge decontamination and zero-alpha guards.
- Known-coverage ramps through Bayer, standard Floyd–Steinberg and custom kernel, at non-multiple-of-four dimensions; compare total coverage and residual error.
- Ground-truth denoising with controlled Gaussian and impulse noise; PSNR/SSIM against clean target plus edge retention and connected-component preservation.
- RIP ownership gate: screening, choke, white underbase and color management are analysis-only unless the production profile explicitly delegates the operation to prepress.

These are research recommendations, not implemented production code. No storefront edits, deployment or merge.
