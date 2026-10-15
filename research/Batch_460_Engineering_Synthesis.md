# Batch 460 — Engineering Synthesis

Date: 2026-10-15

## Progress and correction

Batch 459 reported a corrected previous cumulative value of 5,217 by treating Batch 456 as if it had added 22 pages. The Batch 456 manifest actually records 24 accepted pages and 5,190 cumulative (5,166 + 24). Therefore the arithmetic chain is Batch 456 = 5,190; Batch 457 = 5,201; Batch 458 = 5,219; Batch 459 = 5,232 (5,219 + 13). Batch 460 adds ten locally distinct pages, giving a **provisional upper bound of 5,242/10,000 (52.42%)**. This supersedes the Batch 459 arithmetic correction.

The globally certified unique-page count remains unknown because historical semantic deduplication across all batches is incomplete.

## Engineering findings

1. **Matting supervision:** The AAAI paper demonstrates learning from coarse trimaps with a directional distance-consistency loss. Its evaluation reports SAD, MAD, MSE, gradient and connectivity metrics. Keep those metrics separate: a matte can score well on pixel error while losing thin details or boundary structure.
2. **Morphology and choke:** Erosion/dilation are governed by structuring-element shape and size. Convert physical choke to pixels at final effective PPI and run topology/component survival checks before export. One pixel of erosion is not a fixed physical width across resolutions.
3. **Alpha pipeline:** ImageMagick exposes explicit associate/disassociate, alpha activation/removal, channel scoping and compositing operations. Make Alpha association and operator choice explicit, especially for mockups and transparent-edge processing.
4. **Color management:** Use the ICC specification as the format contract; inspect profile metadata after export. Keep input profile, working space, conversion intent and output profile as explicit pipeline state.
5. **Resampling:** Pixel dimensions, PPI and physical print size are mathematically linked. Avoid repeated resampling, select a kernel based on content and resize direction, and calculate effective PPI from final physical dimensions.
6. **RIP/underbase ownership:** Separate white-undercoat generation, choke, ink amount and screening controls. Vendor guides provide starting points only. Ensure exactly one component owns each transformation to prevent double choke, underbase generation or halftoning.
7. **RIP workflow distinction:** The French Serico page documents persistent server jobs and 1-bit separations with explicit DPI/LPI/dot-shape/angle controls. This is a generic prepress reference, not a DTF-specific preset.
8. **Master safety:** Corrections and previews should be versioned derivatives. Keep the approved Ready-to-Print Master immutable; mockup blending must never overwrite it.

## Validation status

Twelve deterministic synthetic specification checks passed. They validate arithmetic and guardrails, not production image algorithms. No physical DTF printer, ink/film/powder/press combination, or production RIP was tested.

## Deduplication status

Ten pages were individually opened/read, checked for canonical URL duplicates within the batch, and screened against locally available Batch 450–459 manifests. Historical semantic deduplication remains incomplete; the cumulative number is an upper bound, not a globally certified unique count.

No merge, deployment, protected storefront change, or approved printing-master modification occurred.
