# DTF Smart Prepress — OpenCart 4 extension source

Status: research-preview, isolated, not deployed.

Purpose:
- analyze uploaded artwork before it can become a Ready-to-Print Master;
- produce explainable QA findings and a processing decision plan;
- keep print-master and mockup derivatives separate;
- never silently destructively rewrite the source artwork.

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
