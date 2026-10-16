# Batch 478 Synthesis

## Main conclusions
- White choke compensates for registration tolerance. It does not clean contaminated RGB or remove every semi-transparent edge pixel. Convert pixel settings to physical units at the RIP raster resolution and avoid applying choke twice.
- Keep segmentation, alpha estimation, foreground-color recovery and compositing as separate stages. Assess fine boundary recovery independently from foreground coverage.
- Compare global, iterative/local and edge-informed thresholds using boundary displacement, mask overlap, component survival, thin-stroke survival and runtime.
- Detect impulse noise before smoothing; verify that dots, thin lines and text counters survive.
- Use morphology as a reversible diagnostic for isolated specks, holes, narrow gaps and fragile joins.
- Treat white-underbase previews as preflight only; inspect the actual RIP channel.
- ICC profile registry membership does not prove suitability for a specific printer, ink, film and RIP condition.

## Evidence limits
Some academic pages were read only at abstract level; paid French tutorial videos were not accessed. Vendor settings require physical calibration. No physical DTF validation was performed. Historical semantic deduplication remains incomplete, so the cumulative count is a provisional upper bound.