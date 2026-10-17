# Batch 490 Deduplication Report

Date: 2026-10-17
Branch: `chatgpt/dtf-smart-prepress-20260928`

## Accepted canonical pages
Ten pages are listed in `Batch_490_Canonical_URL_Hashes.tsv`. Canonical URL SHA-256 hashes were computed from the exact URL strings and independently verified locally.

## Exact-match checks
No exact normalized URL matches were found in accessible indexes for Batches 470, 472, 474, 477, 478, 479, 481, 483, 484 and 489. The visible B485, B487 and B488 hash-index records were also manually checked for exact URL overlap. Some indexes are unavailable: B471, B480, B482 and B486 were not found at the expected paths. This check is not a global semantic deduplication guarantee.

## Material-distinctness notes
- The four Habr articles are separate technical pages with distinct scopes: PSF/deconvolution theory, practical deconvolution, total-variation restoration, and blind kernel estimation. They are a related series but not simple translations or duplicate pages.
- ViTMatte and Fast Multi-Level Foreground Estimation are different papers and methods.
- The GitHub Context-Aware-Matting README is implementation documentation, not a localized copy of a paper; it contributes setup, runtime and licensing constraints.
- The Adobe transparency-flattener options page and Italian print-provider guide are separate operational references for different output workflows.
- ITMO record is retained as an abstract-level source only; the unavailable PDF is not counted separately.
- Failed opens and search snippets were excluded.
