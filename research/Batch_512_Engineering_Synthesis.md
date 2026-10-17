# DTF Smart Prepress — Batch 512 Engineering Synthesis

Date: 2026-10-18

## Key findings

1. Matting quality can be assessed spatially. MatAnyone 2's learned evaluator uses RGB, predicted alpha and a segmentation mask to create pixelwise reliability/error maps, including a morphologically defined boundary band. This is a QA-triage idea, not a validated still-DTF model.
2. Alpha estimation is not foreground-color recovery. MP-Mat explicitly models both alpha and foreground color for instances and treats background separately. The Chinese Any-Render implementation reverses C=alpha*F+(1-alpha)*B, but F=(C-(1-alpha)*B)/alpha is unstable as alpha approaches zero and sensitive to B errors. Guard low alpha, restrict correction to uncertain edge pixels and preserve original RGB.
3. Binary masks create seams where fractional alpha gives smoother compositing. The Japanese 10-page study supports preserving antialiasing for mockups; do not globally threshold alpha to fix an RGB fringe.
4. Super-resolution has a perception/fidelity tradeoff. AIM 2025 and VQualA 2025 use realistic degradation and perceptual metrics, and warn that average scores can hide catastrophic local artifacts. Another IQA-guided SR paper reports grid-like patterns and unnatural colors from naive optimization. Review text, edges, flat fills and small details at final physical size; retain the original and do not imply AI-invented detail is recovered truth.
5. Segmentation quality needs false-split/false-merge diagnostics. Adapted Rand error and variation of information complement, but do not replace, soft-alpha/gradient metrics and print-size feature checks.
6. RGBA comparison must explicitly include alpha. ImageMagick difference maps and RMSE/PSNR are useful, but image alignment, offsets and virtual pixels affect scores; use local boundary crops and topology checks too.
7. Separate hard-edge and soft-edge processing profiles where uncertainty justifies the extra matting cost. Model choice and quality claims still require independent testing.
8. Async processing should separate queue logic, runners and session state. Process-local rate limits do not coordinate multiple workers/replicas; use shared admission control, idempotent outputs, retry-safe states and explicit failure/cancel status. Keep mockup compositing separate from the print master.

## Acceptance gates

- Preserve source RGB, alpha matte, corrected foreground RGB, final RGBA, mockup composite and print master as separate artifacts.
- Preview on black, white and saturated backgrounds; evaluate alpha and edge RGB independently.
- Use local QA maps plus component/hole/minimum-feature checks; no single score should auto-approve an image.
- Guard compositing inversion at low alpha; clamp or skip unstable pixels.
- Keep mockup color adaptation out of print-master processing.
- Verify the actual exported white separation in the receiving RIP and perform physical tests before asserting print readiness.

No physical DTF validation was performed.
