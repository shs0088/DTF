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
- Batch 479: +10; provisional upper bound 5,422.
- Batch 480: +10; provisional upper bound **5,432 / 10,000 (54.32%)**.
- Batch 481: +10; provisional upper bound **5,442 / 10,000 (54.42%)**.
- Batch 482: +10; provisional upper bound **5,452 / 10,000 (54.52%)**.
- Batch 483: +10; provisional upper bound **5,462 / 10,000 (54.62%)**.
- Batch 484: +10; provisional upper bound **5,472 / 10,000 (54.72%)**.
- Remaining by arithmetic: **4,528**.
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


## Batch 480 checkpoint — 2026-10-16

- Batch 480: +10 individually opened/read source pages; provisional cumulative upper bound **5,432 / 10,000 (54.32%)**.
- Remaining by arithmetic: **4,568**.
- Globally certified unique-page count: **unknown**; exact URL checks covered available local packages for Batches 470 and 472–479 only. Batch 471 and parts of older history remain unavailable.
- Language coverage this batch: 7 English-language pages (including a J-STAGE paper record presented in English), 2 Arabic bibliographic records/abstracts, and 1 Turkish article record/abstract. The Chinese SwinIR translated mirror, Russian page that timed out, inaccessible Turkish morphology thesis, and Spanish pages that timed out were excluded.
- Batch 480 local integrity checks: **30/30 passed**; canonical URL hashes verified against the manifest. Full-text depth varies; abstract-only sources are explicitly marked.
- No physical DTF validation, merge, deployment, storefront edit, or Ready-to-Print Master modification.

### Batch 479 hash-index correction
The previously committed Batch_479_Canonical_URL_Hashes.tsv contained malformed/truncated hash values. It has now been replaced with the correctly computed values from the locally validated Batch 479 package. Use the corrected branch file, not any earlier cached copy.


## Batch 481–484 consolidated checkpoint — 2026-10-16

- Batch 481: +10 individually opened/read pages; provisional upper bound 5,442.
- Batch 482: +10 individually opened/read pages; provisional upper bound 5,452.
- Batch 483: +10 individually opened/read pages; provisional upper bound 5,462.
- Batch 484: +10 individually opened/read pages; provisional upper bound **5,472 / 10,000 (54.72%)**.
- Remaining by arithmetic: **4,528**. Globally certified unique-page count remains **unknown**.
- Batch 484 accepted languages include English, German, Russian and Portuguese full/partial technical pages, an Arabic catalog abstract, and an English abstract on a Chinese journal platform. Read depth is recorded per source.
- Batch 484 exclusions include the PyMatting duplicate (Batches 395/409), the alternate-URL Portuguese ovitrampas work already listed in Batch 469, and pages that failed to open. Search-result-only candidates were not counted.
- Exact URL/title checks covered accessible source-index and batch artifacts across Batches 324, 346, 353, 357, 360, 370–421 where available, 432–469, and selected Batches 470–483. Some paths were missing or incomplete and older history is not fully reconciled; this checkpoint is a provisional upper bound, not global uniqueness certification.
- Batch 479 hash-index repair was reported as verified in Batch 483; retain the branch's read-back artifact as the evidence and do not rely on cached copies.
- No physical DTF/RIP validation was performed. No merge, deployment, protected storefront edit, application-code modification or Ready-to-Print Master modification occurred.
