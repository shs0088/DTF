# Batch 462 Engineering Synthesis

Date: 2026-10-15

Nine individually opened/read pages were accepted after local canonical-URL checks. The updated provisional cumulative upper bound is 5,259/10,000 (52.59%), with 4,741 remaining by arithmetic. The globally certified unique-page count remains unknown because historical semantic deduplication is incomplete.

Engineering findings:
1. Keep Alpha estimation and foreground RGB decontamination as separate stages. A good mask can still retain background-colored edge pixels.
2. Declare RGBA channel order, bit depth, Alpha association, and output format explicitly; reopen exports and verify channels, dimensions, Alpha extrema, and ICC metadata.
3. Keep model selection, matte refinement, and edge decontamination independently switchable so defects can be traced.
4. Evaluate thresholded masks against reference masks, then also check connected components, holes, thin strokes, and edge displacement. Threshold rankings are dataset-dependent.
5. Make white-underbase ownership explicit: prepress-generated, RIP-generated, or spot-channel file. Avoid duplicate underbase generation and validate choke at final physical size.
6. Route removal by evidence: dual-background difference matting when paired captures exist; boundary-connected color key for uniform backgrounds; neural matting only within its supported subject domain; color-range removal for simple flat backgrounds.
7. Keep mockups and corrected derivatives separate from the approved Ready-to-Print Master.

Validation: nine corpus-integrity checks passed. These checks do not validate image quality or physical print output. No physical DTF printer or production RIP was tested.

Repository safety: research-only. No merge, deployment, storefront change, or Ready-to-Print Master modification.
