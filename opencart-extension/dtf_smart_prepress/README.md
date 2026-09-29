# DTF Smart Prepress — OpenCart 4 extension source

Status: research-preview, isolated, not deployed.

Purpose:
- analyze and prepare uploaded artwork before it can become a Ready-to-Print Master;
- operate on the image/prepress side only: pixels, alpha/matte, edge color, restoration, resampling, color/profile state, AI-edit provenance and export integrity;
- produce explainable QA findings and a processing decision plan;
- keep print-master and mockup derivatives separate;
- never silently destructively rewrite the source artwork;
- stop at an auditable DTF Print Master handoff. An external RIP owns printing, screening, white-separation generation/interpretation, printer ink limits and device execution.

Initial contracts implemented in v0.1:
- EdgeClass
- AlphaPolicy
- EdgeColorPolicy
- BackgroundRemovalMode
- ThresholdRecipe
- NoiseModel
- RestorationEvidence
- UnderbaseDiagnosis
- HalftoneRecipe
- PreflightResult

Safety gates:
1. original upload is immutable;
2. destructive alpha hardening requires hard-edge classification;
3. mockup derivative can never replace print master;
4. automatic processing must retain recipe/provenance;
5. failed critical QA blocks Ready-to-Print Master acceptance;
6. all physical thresholds are represented in mm or derived from effective PPI, never unexplained fixed pixels.

This folder is deliberately independent from the protected storefront and from OpenCart core. Packaging/install integration will be added only after validation against the actual Oracle OpenCart 4 tree.


## Decision engine additions

The research-preview engine now includes:
- Edge Cleanup Router: none, remove-white-matte, remove-black-matte, local color decontamination, or diagnostic-first defringe.
- Resampling Router: nearest-neighbor only for pixel/binary artwork, detail-preserving upscale for photographic/illustrative enlargement, antialiased downsample for reduction, and a balanced fallback.
- Color Management Report: source/target ICC state plus mandatory explicit Assign-vs-Convert, rendering intent and black-point-compensation provenance.
- Matting Router: alpha estimation and foreground-color estimation remain separate decisions.
- Restoration gates: BRISQUE remains diagnostic-only; deconvolution remains evidence-gated and never automatic.

These are decision contracts, not claims that Photoshop/Illustrator algorithms are embedded or reproduced. Production pixel-processing backends remain intentionally decoupled.


## Current image-only pre-RIP boundary (research contract 1.3.0)

The research engine is intentionally **not a RIP replacement**. The acceptance pipeline is:

`Source → Analyze → Segment/Matte → Edge/RGB cleanup → Restore/Resize if justified → Color/export QA → Re-measure → Accept/Reject → DTF Print Master → external RIP`.

Current research reports additionally cover:
- background-removal integrity: segmentation is not automatically final alpha; soft edges may require matting plus foreground-RGB reconstruction and decontamination;
- AI mask semantics: provider, mask polarity, dimensions, confidence/stability and original-alpha handling;
- generative-edit integrity: source comparison, outside-mask change checks, text/logo preservation and mandatory re-preflight;
- AI upscale integrity: scale/model/detail policy, alpha preservation and synthetic-detail risk;
- inpaint integrity: mask/context expansion and verification that unmasked pixels remain unchanged;
- AI model-license evidence: commercially prohibited model weights block a commercial production path and unknown licensing requires review;
- deterministic refinement: guided alpha refinement, threshold method/polarity and soft-alpha preservation;
- edge-color preservation: despill/decontamination is boundary-scoped and opaque subject colors can be monitored with Delta-E;
- restoration evidence: deconvolution requires PSF evidence, adaptive Wiener-style repair requires noise evidence, and denoise should precede sharpening/creative post effects.

Adobe, Autodesk and MATLAB documentation are research references for behavior and measurable principles; this extension does not claim to embed or reproduce proprietary algorithms. Open-source backends can be selected only after technical, license and commercial-use review.
