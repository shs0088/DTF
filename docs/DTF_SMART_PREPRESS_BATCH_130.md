# DTF Smart Prepress Research — Batch 130

Verified research continuity before this batch: **1,637 / 10,000**.

This batch adds **5 materially distinct pages actually opened/read**, bringing research continuity to **1,642 / 10,000**. Search-result snippets were not counted. Localized mirrors of already represented documentation were excluded.

## New verified pages

1638. https://transparentbackground.org/ru/
1639. https://axa.biopapyrus.jp/ia/opencv/morphology-transformation.html
1640. https://habr.com/ru/articles/565378/
1641. https://docs.kano-lab.com/java/opencv/morphology/
1642. https://www.jorgeciscar.com/gestion-color-i-introduccion-calibracion/

## Engineering synthesis

### Full-resolution export does not prove full-resolution inference
The Russian TransparentBackground workflow explicitly says its AI works on an optimized working image and then applies the resulting mask back at the original width/height. Therefore output dimensions must never be used as evidence of matte inference resolution. Record `source_geometry`, `model_input_geometry`, `mask_geometry`, `mask_resample_method`, and `export_geometry` separately, and run boundary QA on the final physical-size alpha.

### Human mask corrections are first-class provenance
The same workflow keeps per-image positive/negative keep/remove points and separate result state. Smart Prepress should store interactive corrections as replayable mask operations rather than destructively baking them into the only master. Batch/async processing should keep status/history isolated per asset.

### Morphology can destroy printable topology
The Japanese BioPapyrus page explains that erosion removes boundary information and thins objects, while dilation thickens them; opening removes small white noise and closing fills small dark defects. The Russian Habr treatment makes the failure condition explicit: erosion can completely remove objects smaller than the structuring element, and dilation can fill gaps/voids smaller than it. This reinforces a hard `minimum-feature guard` before morphology is authorized on text, hairlines, distressed artwork, or white-underbase masks.

### Kernel geometry is semantic, not cosmetic
Kano Lab documents circular, rectangular and cross-shaped structuring elements and notes that morphology changes with kernel shape and size. Smart Prepress therefore records kernel shape, dimensions, anchor/origin, iterations, border policy and physical radius; a generic `cleanup strength` slider is not sufficient provenance.

### Color-management QA begins with the display but ends with the output condition
The Spanish color-management tutorial ties monitor calibration, ICC profiles and print preparation together. Display calibration is evidence for trustworthy soft-proof review, not authority to rewrite the master. Keep `DisplayProfile`, `DocumentProfile`, `ProofProfile`, and `OutputConversionProfile` separate, and prevent soft-proof simulation from being baked into the print master.

## Exclusions
- Adobe localized matte-removal/background-removal pages: read/reviewed but excluded as localized documentation identities already represented in the corpus.
- GIMP German/French/Turkish/Italian Dither pages: excluded as localized mirrors of one documentation identity.
- Machine-translated OpenCV mirrors: excluded as mirrors rather than materially distinct sources.
- Search snippets and failed full-page opens: not counted.

No merge, deployment, Oracle execution, or protected-storefront modification was performed.
