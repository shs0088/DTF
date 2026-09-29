# Standalone DTF Image Prepress Engine

This package is intentionally **separate from OpenCart**. It is a standalone image-prepress component that can later be connected to OpenCart, another storefront, a desktop client, or a RIP-facing workflow through a thin adapter.

## V1 scope

V1 provides:

- effective-DPI validation from real pixels and intended physical print size;
- alpha/transparency measurement;
- sRGB/RGBA-safe derived candidate export while preserving the original file;
- deterministic Accepted / Review / Rejected decisions;
- routing rules for photo, text-heavy, logo/line-art, mixed, and already-print-ready artwork;
- hard protection against silently applying unconstrained generative restoration to detected text;
- conservative routing for white-on-white, black-on-black, low-contrast boundaries, glow and shadow;
- OCR-before/OCR-after evidence contract including Arabic text;
- topology, edge displacement, and color ΔE00 QA evidence hooks;
- RIP profile abstraction;
- provider registry with licensing/enablement gates;
- provenance records for every derived candidate;
- explicit rule that the master artwork does **not** bake a white underbase.

The package does not modify OpenCart, its database, its admin pages, products, designs, or checkout.

## Architecture

```
source artwork
  -> decode + inspect
  -> classify/router
  -> optional specialist candidates
       background removal: segmentation -> alpha matting -> foreground decontamination
       risky boundaries: conservative trimap -> preserve soft/semi-transparent effects -> review
       text/logo: OCR baseline -> vector/text-safe candidate
       photo: deblur/artifact reduction/super-resolution candidate
  -> deterministic QA
       effective DPI
       OCR preservation
       topology preservation
       alpha/edge QA
       color ΔE00
  -> Accepted / Review / Rejected
  -> derived RGBA candidate + provenance
```

Specialist AI engines are provider adapters, not authorities. Their output becomes a candidate only. The deterministic QA gate decides whether a candidate can advance.

## Hard background-safety rules

When foreground artwork shares the background color, boundary contrast is low, or a design intentionally contains glow/shadow, the router forbids color-key background removal and hard alpha thresholding. It requires conservative matting and human review. This prevents legitimate white/black artwork or soft effects from being deleted as if they were background.

## Why original files are never silently replaced

Every processed output is a derived candidate. The source SHA-256, operations, rule version, RIP profile and preflight result are recorded. A future integration may explicitly promote a candidate to Ready-to-Print Master, but this package never overwrites the source or auto-selects a master.

## Default print target

The generic profile targets 300 effective DPI. For a 16-inch-wide design, that means 4,800 real pixels across. Embedded DPI metadata alone cannot approve a low-resolution file.

## CLI

```bash
cd tools/dtf-image-prepress
bun install

bun src/cli.ts analyze artwork.png 16 18 text-heavy true
bun src/cli.ts export artwork.png derived-master.png 16 18 already-print-ready false
```

The deterministic exporter refuses to enlarge a low-resolution source. Such a source must first go through a dedicated upscaler candidate and then pass OCR/topology/edge/color QA.

## Provider candidates

The provider boundary is intentionally independent. The catalog currently records Sharp as the local raster core, PaddleOCR as OCR evidence, VTracer for vector candidates, Real-ESRGAN/SwinIR-class restoration candidates, BiRefNet-class matting candidates, and optional Adobe APIs for vector/mockup workflows.

No provider is automatically trusted just because it returned a result. External code and model-weight licenses must be verified separately before production enablement.

## OpenCart integration later

A future connector should send an asset reference + print intent to this engine and receive:

1. analysis report;
2. processing plan;
3. candidate/provenance references;
4. Accepted / Review / Rejected status.

No OpenCart coupling is required inside this engine. The management/admin UI for this engine is also separate and can be added later.
