# DTF Smart Prepress — Engineering synthesis addendum 278

See research/Batch_278_2026-10-08.md for seven individually read Japanese, Chinese, Russian, Turkish and Portuguese sources.

**New implementation direction:** use Euclidean distance transforms and medial-axis sampling to report physical stroke-width distributions in millimetres after final print dimensions are locked. Approximately twice the distance-to-background at a medial-axis point estimates local thickness for ordinary strokes, but junctions, endpoints, antialiasing and raster sampling require uncertainty flags. Choke-risk checks should compare local width with twice the calibrated inset; no universal numerical threshold.

**Topology safeguards:** Zhang–Suen thinning uses alternating neighbor-deletion rules and is a diagnostic, not printable output. Compare components, holes, endpoints and junctions before/after mask cleaning. Binary mask topology is not the same as soft-alpha quality.

**Alternative segmentation:** Chan–Vese uses region means and curvature regularization, making it a possible fallback for weak boundaries; it can smooth away small intentional marks. CascadePSP can refine a coarse mask, but its tutorial's JPEG export must never be used for a transparent print master.

**SDF caution:** signed-distance glyph rendering is useful for previews and edge analysis, not evidence of new high-frequency source detail. Do not increase effective PPI from SDF conversion.

**Color QA:** native PNG iCCP/cHRM warnings must be captured and investigated. Preserve source ICC provenance and never strip all profiles indiscriminately.

**Acceptance tests:** tiny punctuation, distressed dots, counters/holes, acute corners, soft hair alpha, two physical sizes, two RIP print modes, and a malformed embedded PNG profile. Assert no silent deletion of foreground or white support.

No merge, deployment, or storefront changes.
