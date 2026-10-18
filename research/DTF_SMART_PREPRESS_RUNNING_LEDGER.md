# DTF Smart Prepress — Running Ledger Snapshot

Snapshot date: 2026-10-17
Target: 10,000 individually opened/read, materially distinct pages.

## Current checkpoint

- Consolidated checkpoint through Batch 484: 5,472 provisional pages.
- Batches 485–491: +69 reported pages (B485–B490: 60; B491: 9), yielding 5,541. An earlier synthesis text said 59; that was an arithmetic typo.
- Batch 492: +11 reported, but its only visible hash row is DOI 10.3724/SP.J.1089.2022.19175, already listed as B487-001. Corrected provisional upper bound: 5,551.
- Batch 493: +8 reported; provisional upper bound 5,559. Its hash index is absent from the branch.
- Batch 494: +8 accepted pages; provisional upper bound 5,567.
- Batch 495: +8 accepted pages; provisional upper bound **5,575 / 10,000 (55.75%)**.
- Remaining by arithmetic: **4,425**.
- Globally certified unique-page count: **unknown**.

## Reconciliation and integrity

This is a corrected arithmetic upper bound, not global uniqueness certification. Historical semantic deduplication remains incomplete because Batch 486's index is unavailable, Batch 492's index is incomplete, Batch 493's index is absent from the branch, and older history is not fully reconciled. Alternate publisher/preprint URLs and semantic duplicates may still exist. Do not describe 5,575 as a globally verified unique-page count.

Batch 495 source details and exact canonical URL hashes are in the batch-specific source index and hash index. Reading depth varies and is recorded per source. Search snippets, failed opens and inaccessible PDFs were not counted. Exact URL hash integrity does not prove semantic uniqueness.

## Recent research artifacts

- Batch 494: canonical URL hash index and synthesis update are committed; source index/manifest and central-ledger update were not present on branch at the start of Batch 495.
- Batch 495: source index, canonical URL hashes, engineering synthesis, deduplication report and ledger addendum are being recorded as separate artifacts.
- Batch 493 hash index is missing on the branch.
- Batch 492 hash index contains only one row and a truncated hash; do not treat it as a valid complete index.
- Batch 486 hash index is unavailable.

## Safety boundaries

No merge, deployment, protected storefront change or Ready-to-Print Master change was performed. No printer/film/ink/powder/curing/press/wash validation was performed. Keep the corpus provisional until historical URLs and semantic duplicates are reconciled globally.


## Batch 501 update — 2026-10-17

- Batch 496–500 were previously reported as +9, +9, +10, +10 and +12 respectively, but their full source indexes are not synchronized on this branch.
- Batch 501: 7 accepted pages after individual reading and available-index dedup checks.
- Provisional arithmetic including the reported B496–B500 additions and B501: 5,632 / 10,000 (56.32%); 4,368 remaining by arithmetic.
- Conservative arithmetic anchored to the committed B495 checkpoint plus Batch 501 only: 5,582.
- Globally certified unique-page count remains UNKNOWN.
- Batch 501 excludes two exact-URL duplicates (scikit-image filters already in B485; PixelCleaner choke article already in B478) and one paper already present in the consolidated corpus (Fast Multi-Level Foreground Estimation).
- Batch 501 research focuses on alpha/foreground separation, self-supervised denoising calibration, resampling/anti-aliasing, edge-preserving filtering, recent matting and segmentation/contour pipelines.
- See Batch_501_Canonical_Source_Index.md, Batch_501_Canonical_URL_Hashes.tsv, Batch_501_Engineering_Synthesis.md and Batch_501_Dedup_Report.md.
- No physical DTF/RIP validation, merge, deployment, protected storefront change or Ready-to-Print Master change.


## Automation checkpoint — Batch 518 (2026-10-18)

- Batch 517 was reported as +11, producing provisional arithmetic 5,772/10,000; its source package was not synchronized to this branch.
- Batch 518 accepted **7 newly read candidate pages** after checking canonical URLs against the available sampled source-index files. Batch-local SHA-256 URL hashes are recorded in `Batch_518_Canonical_URL_Hashes.tsv`.
- Updated provisional arithmetic based on the prior report: **5,779/10,000 (57.79%)**, 4,221 remaining by arithmetic. Conservative arithmetic excluding reported B496–B500 additions: **5,729**.
- **Globally certified unique-page count remains UNKNOWN.** The arithmetic includes unsynchronized reported batches B507–B517; not every historical index file was scanned, and URL hashes cannot prove semantic uniqueness.
- B518 topics: foreground edge sampling and protection; marker-controlled watershed and over-segmentation; controlled preprocessing ablations with Dice/IoU/boundary metrics; Gaussian scale-space segmentation; global/local denoising fusion; non-local self-supervised denoising; mathematical morphology for noise and contour processing.
- Excluded duplicates: PyMatting docs (B409), BorderCut README (B440), MEMatte (B481), PixelCleaner choke article (B478), Aero Print guide (B470/B478), and Russian Habr ARC-filter tutorial (B421). Arabic Photoshop Quick Action page was excluded as a localized mirror; inaccessible or metadata-only pages were not counted.
- No physical DTF validation, merge, deployment, protected storefront change, or Ready-to-Print Master change occurred.
