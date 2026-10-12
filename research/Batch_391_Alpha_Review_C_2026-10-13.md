# Batch 391 — Mask Semantics

The inspected Matlab example infers processing eligibility from nonzero image color rather than the trimap classification. This incorrectly omits valid zero-valued color samples. Foreground and background channel statistics also omit zero-valued samples. Smart Prepress should use independent mask state and preserve all valid color values in statistics.
