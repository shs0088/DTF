# DTF Smart Prepress — Batch 443 engineering synthesis

## High-priority implementation conclusions

1. **Preserve the foreground independently of alpha.** Context-aware matting research estimates both foreground RGB and fractional alpha. Keep segmentation, trimap, alpha, foreground reconstruction and edge decontamination as separately testable stages. Never substitute a binary mask for alpha matting.
2. **Detect noise before morphological cleanup.** Chinese adaptive morphology research protects pixels not classified as noisy. Require connected-component, hole-count, stroke-width and edge-gradient comparisons before accepting any cleanup. Preserve Arabic diacritics, punctuation, fine white strokes and halftone islands.
3. **Calibrate textile color on the actual print condition.** FOGRA58 Textile RGB and the Fogra textile media wedge provide a useful measurement methodology; they do not automatically certify a DTF printer profile. Record substrate, ink, white underbase, viewing illuminant and RIP configuration.
4. **Treat white as a production separation.** Check RGB/CMYK-to-white alignment, spot-channel naming, RIP halftoning, choke/spread and effective physical print dimensions. Prevent duplicate white generation or choke between Smart Prepress and the RIP. Vendor accuracy claims require independent testing.
5. **Inspect alpha conventions at every boundary.** Mockup derivatives and video renderers may use premultiplied alpha; PNG export expects straight/unassociated alpha. Test edge colors against light and dark backgrounds and protect low-alpha division. Keep glows and additive effects as separate mockup layers when necessary.
6. **Use print-size-aware quality gates.** Test physical stroke survival, isolated dots, effective PPI, transparent-background truth, typography, and halftone texture; avoid universal 300-PPI or choke pass/fail rules.

## Evidence quality and status

21 new pages individually opened/read, locally URL-deduplicated; source records in six Batch 443 index files. Several academic records are abstracts only. Historic global semantic dedup remains incomplete. Provisional cumulative upper bound: 4,963 / 10,000. No physical DTF printer or deployed-site validation, no deployment, no merge, and no protected master changes.
