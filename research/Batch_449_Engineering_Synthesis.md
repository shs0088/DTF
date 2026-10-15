# Batch 449 — Engineering synthesis

Date 2026-10-15. 15 new individually opened/read locally distinct pages. Provisional cumulative 5,055/10,000; globally certified count unknown pending historical semantic deduplication.

1. White underbase choke is physical and RIP-specific. LINKO PrintFactory guide starts with 0 mm for tiny text and -0.1 mm for regular graphics, then calibrates in 0.1 mm steps. Source-image pixels are not necessarily RIP pixels; avoid double choke. White may disappear when line width is at or below twice inward choke.
2. Alpha mask and edge foreground RGB are separate problems. Adobe distinguishes Color Decontaminate, Defringe and black/white matte removal. Preserve original artwork, test against light and dark garments.
3. ImageMagick border-seeded flood fill removes connected background while preserving enclosed white regions. Protect boundary-touching artwork, Arabic dots and thin strokes; check component/hole topology before approving cleanup.
4. Transparent mockup transforms require boundary-aware sampling and consistent premultiplied Alpha. A Chinese C++ rotation implementation treats outside-image samples as transparent, preventing opaque border smears.
5. PNG-8 may carry multilevel Alpha via tRNS, but some export paths quantize to binary transparency. Inspect decoded pixels, not extension or palette type. Do not strip ICC profiles merely to imitate game-icon compatibility tools.
6. Interpolation and AI enlargement do not reconstruct provable original details. Chinese bilinear/bicubic tutorials and original Russian experiments support fidelity-oriented evaluation; Zernike subpixel edge accuracy claims need independent validation.
7. Japanese browser ONNX/WASM and Spanish local Flet/rembg implementation show architecture for one-time segmentation, editable masks, cancellation, and independent postprocessing. Portuguese tutorial covers edge-preserving denoising and Richardson-Lucy restoration.
8. Italian halftone vendor and German DTF press material reinforce that white-ink circulation, RIP, garment and dot geometry matter. Marketing claims are not standards; test printed dots, underbase and registration physically.

Production gates: immutable master hash; dimensions, effective PPI and ICC; Alpha histogram and foreground RGB; connected components/holes; physical feature widths; RIP-specific choke, halftone and white mask; bilingual publication requirements. No physical printer/RIP test was performed. No deployment or merge.
