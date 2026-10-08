# DTF Smart Prepress — Batch 293 synthesis

- Japanese error-diffusion example uses 5/16,3/16,5/16,3/16 instead of standard Floyd-Steinberg 7/16,3/16,5/16,1/16; its Mesh ordered threshold matrix repeats 1. Test exact weights and matrix uniqueness.
- Indexed PNG can carry intermediate palette alpha through tRNS, contrary to a 2006 Italian Photoshop-era tutorial. Use W3C PNG specification for file-format behavior.
- Inverse compositing for foreground color estimation is unstable near alpha zero; add confidence gates.
- Marker-based reconstruction can delete intentional disconnected artwork. Preserve dots, letter counters and fine lines.
- Supersampled halftone previews are not proof of RIP-specific white underbase, choke or printed dot survival.

Do not alter approved print masters or protected storefront. No deployment or merge.
