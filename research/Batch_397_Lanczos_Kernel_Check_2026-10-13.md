# Batch 397 Lanczos kernel check

A reviewed Japanese interpolation tutorial returns zero at x=0 in its illustrative Lanczos function. The correct normalized sinc-based Lanczos kernel is one at x=0. A regression test should check center value, symmetry and normalization. This concerns a third-party tutorial snippet, not the DTF Studio codebase. Local Batch 397 mathematical safeguards: 30 tests passed.
