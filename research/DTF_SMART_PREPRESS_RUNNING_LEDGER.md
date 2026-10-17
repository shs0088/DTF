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
