# DTF Smart Prepress — Running Ledger Snapshot

Snapshot date: 2026-10-16
Target: 10,000 individually opened/read, materially distinct pages.

## Current checkpoint

- Last consolidated checkpoint reported for Batch 473: 5,362 provisional pages.
- Batch 474: +10; provisional upper bound 5,372.
- Batch 475: +10; provisional upper bound 5,382.
- Batch 476: +10; provisional upper bound 5,392.
- Batch 477: +10; provisional upper bound 5,402.
- Batch 478: +10; provisional upper bound 5,412.
- Batch 479: +10; provisional upper bound **5,422 / 10,000 (54.22%)**.
- Remaining by arithmetic: **4,578**.
- Globally certified unique-page count: **unknown**.

## Reconciliation and integrity

This is an arithmetic checkpoint, not a global uniqueness certification. Historical semantic deduplication is incomplete because the full older source registry is not reconciled; the local package set used for this run includes Batches 469, 470, and 472–479, while Batch 471 and parts of older history remain unavailable. Exact normalized URL checks for Batch 479 found no matches in those locally available batch indexes. Alternate URLs, preprint/publisher copies, and semantic duplicates may still exist.

Batch 479 accepted ten individually opened pages. Read depth varies and is recorded per source; abstract-only records are not represented as full-paper reads. Local integrity tests passed 19/19. No physical DTF validation was performed.

## Recent research artifacts

- Batch 477: source index, synthesis, manifest summary, test results and ledger addendum.
- Batch 478: canonical source index, manifest, canonical URL hashes, synthesis and ledger checkpoint.
- Batch 479: canonical URL hashes, manifest summary, engineering synthesis, deduplication report and local detailed package. The detailed source-index write and test-results write were blocked by connector safety checks; their complete versions remain in the downloadable package.

## Safety boundaries

No merge, deployment, protected storefront change, or Ready-to-Print Master change was performed. No printer/film/ink/powder/curing/press/wash validation was performed. Keep this ledger provisional until the historical registry is reconciled and deduplicated globally.
