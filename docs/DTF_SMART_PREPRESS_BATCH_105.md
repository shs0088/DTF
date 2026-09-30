# DTF Smart Prepress Research — Batch 105

Verified cumulative count: **1,522 / 10,000**.

Five new materially distinct pages were opened/read and deduplicated by canonical/content identity. Search snippets were not counted; localized mirrors were collapsed.

## Pages 1518–1522
1518. https://www.mybay.it/content/26-la-tecnica-dtf-guida-tecnica-completa-alla-stampa-direct-to-film — Italian. Final-size DPI, transparency, RGB/CMYK, RIP white underbase, choke, physical feature limits.
1519. https://dtf-blitz.de/pages/faq — German. Final-size DPI, RIP mirroring, automatic white underbase, minimum strokes, semi-transparency.
1520. https://optipix.art/noise-remover — Denoising: bilateral, median, NLM, luminance/chroma separation, WebAssembly/Web Worker. Localized mirrors collapsed.
1521. https://pixlane.media/ar-sa/structure-texture/ — Arabic. Structure-texture decomposition, bilateral texture filtering, L0 gradient smoothing. Localized mirrors collapsed.
1522. https://ope.lightpublishing.cn/ara/article/doi/10.37188/OPE.20223003.0350/ — Arabic machine translation of Chinese research; DOI identity counted once. Adaptive Canny, impulse-noise filtering, Sobel, adaptive/Otsu thresholding, edge metrics.

## Engineering synthesis
- Physical printability dominates metadata: final-size effective DPI plus stroke/island/hole widths in mm and post-choke survival.
- Visible artwork white and technical white underbase are separate semantics.
- Weak alpha can create unstable white support and needs output-condition-aware handling.
- Route denoising by noise class; compare removed-noise residuals so intended detail is not erased.
- Structure-texture decomposition is distinct from denoising and must be opt-in for logos/text/distressed art.
- Edge QA needs boundary/connectivity/topology metrics in addition to PSNR/SSIM.

Research-only update; protected storefront unchanged.
