# Batch 380 — DTF Smart Prepress Engineering Synthesis
Date: 2026-10-12. Accepted 23 individually opened/read pages in all 12 requested languages; provisional cumulative 3,785, not globally certified.
## New implementation findings
1. **Premultiplied-alpha, linear-light filtering:** Decode sRGB to linear RGB, keep alpha linear, premultiply for resampling/warping and compositing, then unpremultiply safely when exporting a straight-alpha PNG. 8-bit premultiply/unpremultiply loses low-alpha color precision. Preserve original master. Sources: Real-Time Rendering; Lomont; Japanese OPTPiX.
2. **Matting is not binary segmentation:** Keep mask polarity, fractional alpha and foreground RGB reconstruction separate. Validate edges on black, white and saturated garment backgrounds; compare topology and boundary metrics. Sources: Bayesian Matting; Chinese Image Matting survey.
3. **Topology-aware morphology:** Erosion/opening may remove Arabic dots, diacritics, thin bridges and white artwork; closing can fill intentional holes. Check connected components, holes, skeleton endpoints, minimum physical stroke width. Use geodesic reconstruction and manual review for uncertainty. Sources: ENSTA Paris, University Ulm, Spanish geodesic morphology, PUCRS.
4. **White-underbase physical choke:** 0.20 mm equals 2.36 px at 300 PPI and 4.72 px at 600 PPI. Stroke widths <= 2*choke can lose all white support. Printer/RIP/ink/film/fabric-specific calibration required; no universal white density or choke defaults. Source: DTF Database practitioner guide (not normative).
5. **Noise-specific denoising:** Diagnose impulse versus directional noise before changing artwork; protect thin typography and disconnected components. Sources: Turkish k-means salt-pepper paper and directional multiresolution filter-bank study.
6. **Separate print master from mockup derivatives:** 3D texture RGB bleed can prevent halos without changing alpha; flattening and alpha removal vary across software versions. Preserve SHA-256, ICC, DPI metadata, and per-consumer alpha conventions. Sources: OPTPiX and Japanese ImageMagick analysis.
7. **High-resolution matting:** MEMatte reports adaptive-token-routing memory and latency benefits on benchmarks, not proven for DTF. Test 4,800px artwork with fine lines and transparent edges.
## Verification
23 synthetic numerical/topology tests passed. No physical printer/RIP calibration. Historical corpus-wide semantic deduplication remains incomplete.
## Safety
No storefront, deployment, merge, or Ready-to-Print Master changes.
