# DTF Smart Prepress — Batch 335 Research Synthesis

Date: 2026-10-10. Seventeen new materially distinct pages were individually opened and reviewed in Arabic, Chinese, Japanese, Korean, Russian, Spanish, Portuguese, French, Italian, German and English. Turkish material was investigated but not counted because full content could not be opened.

Previous provisional upper bound: 3,015. Updated provisional upper bound: **3,032** (30.32% of 10,000). Global historical semantic deduplication remains incomplete, so a certified cumulative unique-page count is not established.

## Key engineering conclusions

1. **Matting vs decontamination.** An alpha matte does not reconstruct contaminated foreground RGB or suppress chroma spill. Multi-scale and texture-based methods improve difficult transparent edges but require separate RGB/alpha confidence evaluation. Maintain immutable original RGB, alpha and recovered foreground separately.
2. **Error diffusion vs RIP screening.** Portuguese image-processing notes and Chinese textile research document directional scanning artifacts; symmetric diffusion can reduce scan bias. Italian RIP documentation distinguishes fast dithering from slower error diffusion that can improve fine detail but sometimes produce unusual colors. Do not pre-dither approved print masters.
3. **White underbase and physical diagnosis.** Epson's DTF film guide identifies wrong film side, wrong job type, ink density and alignment as possible causes of white/ink bleed. Choke is only one variable. Convert choke from mm at actual output resolution; do not erode fine text automatically.
4. **Edge-safe denoising.** Arabic, French and Spanish research on adaptive filtering, diffusion and restoration show that noise reduction and deblurring require explicit boundary handling and edge-specific validation. Check stroke survival, topology, alpha edges and ringing.
5. **Color profiles.** German prepress guidance requires correct source and target ICC profiles, rendering intent and gamut warnings. A softproof is not a physical DTF calibration print.

Fourteen deterministic synthetic regression tests passed (alpha compositing, low-alpha instability, double premultiplication, connected-background protection, stroke erosion, dithering boundaries, transparency-safe interpolation, clipping, effective PPI and choke geometry). Physical DTF testing was not performed.

Counting: only individually opened/read pages count. Localized mirrors, previously counted sources and inaccessible pages are excluded. The complete 17-source URL/hash manifest, source-specific notes and tests are preserved in the local Batch 335 package.

Safety: research documentation only. No merge, deployment, protected storefront change, mockup change or Ready-to-Print Master modification.
