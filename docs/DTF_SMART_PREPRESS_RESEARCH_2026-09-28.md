# DTF Smart Prep Studio — Research & Architecture Baseline

Date: 2026-09-28
Branch: chatgpt/dtf-smart-prepress-20260928
Status: Research-backed implementation baseline. Not deployed.

## Objective

Create a semi-automatic DTF image-preparation tool that is launched from the storefront's existing Print Your Dream path, performs heavy work server-side, preserves browser responsiveness, produces separate display/mockup/print artifacts, and integrates cleanly with the existing mockup workflow.

The tool must NOT become a printer RIP. Final printer-specific CMYK/white-channel driving, ICC linearization and device control remain the responsibility of the RIP.

## Research scope

A broad web sweep was performed across more than 100 targeted search queries covering DTF/DTG RIP systems, prepress/preflight software, background-removal systems, vectorization/upscaling tools, image-processing libraries, color management, halftoning algorithms, mockup APIs, POD APIs, upload security and asynchronous processing architectures.

Priority was given to official documentation, public API references, vendor help systems and maintained open-source repositories rather than marketing listicles.

### Representative systems studied

DTF / DTG prepress and RIP:
- ActionSeps DTX Live
- Fiery / CADlink Digital Factory DTF
- Caldera Direct-to-Film
- PrintFactory DTF
- DTF Pro RIP / TransferRIP
- Wasatch SoftRIP DTF workflows
- NestSheet DTF prepress

General preflight:
- Enfocus PitStop Pro
- callas pdfToolbox
- Markzware FlightCheck

Image preparation:
- Adobe image tools / Illustrator trace concepts
- PhotoRoom API
- remove.bg API
- BRIA RMBG / rembg
- Segment Anything family
- Topaz Gigapixel
- Vectorizer.AI

Processing infrastructure:
- libvips / Sharp
- ImageMagick
- OpenCV
- LittleCMS
- Redis / BullMQ style background job queues

Mockup and POD integration:
- Existing DTF Studio MockupRenderer
- Printify catalog/product data
- Printful Mockup Generator API
- Dynamic Mockups API
- MockCity
- Mediamodifier Mockup API

## Findings

### 1. Separate analysis from fixing

Professional preflight products do not reduce readiness to one score. They expose exact errors/warnings and the data that caused them.

DTF Smart Prep must therefore store:
- real file signature and normalized MIME
- pixel dimensions
- embedded DPI when present
- effective DPI per selected product print area
- physical print size
- alpha/transparency statistics
- scaling/enlargement risk
- previewability
- format-specific constraints
- product compatibility
- rule/version used
- timestamp
- exact warning/error codes

A fix may never silently erase the original preflight evidence.

### 2. Alpha is the key DTF object

Background removal is not just binary deletion. Good systems preserve a non-binary alpha matte so hair, smoke, glow, anti-aliased edges and soft gradients remain usable.

Pipeline rule:
- preserve original RGB + source alpha
- derive an editable alpha matte
- refine alpha edges
- decontaminate edge color when the removed background polluted RGB
- avoid converting all semi-transparent pixels to opaque
- keep an undoable version chain

### 3. White-underbase logic is derived from alpha, not from a white rectangle

Research across DTF RIP systems consistently shows:
- underbase may be generated from artwork coverage/alpha
- white density can be adaptive to pixel opacity or color
- choke contracts the white mask inward to prevent white peeking/halo
- highlight white and underbase white are separate concepts in advanced workflows

DTF Smart Prep should PREVIEW a white-underbase channel and choke. It should not pretend to drive printer white ink directly.

### 4. Halftone must be optional and measurable

Halftone is valuable for:
- smoke/glow/translucency on dark garments
- reducing heavy solid ink areas
- simulating softer hand / garment blending

It is not appropriate for every design.

Controls to expose:
- screening mode
- frequency / nominal LPI
- angle
- dot/shape family
- threshold/levels
- alpha-driven hole sizing
- preview on dark/light garment

Safe first implementation can use deterministic ordered/clustered-dot screening. More advanced AM/FM or stochastic screening can be added later.

### 5. Effective DPI matters more than metadata DPI

A PNG can contain physical-density metadata, but embedded DPI alone cannot make a low-resolution image printable.

Effective DPI must be calculated from:
pixel dimensions / intended physical print dimensions.

The same source may PASS for a mug and FAIL for a large hoodie placement.

### 6. Upscaling must be advisory

AI upscaling can increase pixel count, but must never be presented as restoring real detail with certainty.

Policy:
- compute required scale
- if enlargement is modest, offer high-quality resampling
- if enlargement is significant, offer optional AI upscale
- keep original and record the operation
- re-run preflight on output
- require user approval if the visual appearance changes materially

### 7. Vectorization is useful only for the right artwork

Logos, flat illustrations and line art can benefit from vector tracing. Photographs generally should not be auto-vectorized.

The system should classify likely line-art / flat-color candidates and OFFER vectorization, never force it.

### 8. Mockup compatibility must be a first-class contract

Mockup engines generally need:
- an artwork asset URL or binary
- a product/template identifier
- a printable area / smart-object identifier
- transform information

DTF Smart Prep should produce a stable Mockup Asset Contract independent of any one provider.

Required fields:
- assetId
- processedVersionId
- sourceHash
- processedHash
- transparentAssetUrl
- webPreviewUrl
- widthPx
- heightPx
- physicalWidthIn / physicalHeightIn
- productType / productId / variantId
- placement
- printAreaId
- normalized positionX / positionY
- scale
- rotation
- flip
- safe-area status
- preflight status
- processing recipe/version

This contract can feed:
- existing local MockupRenderer
- Printify product/mockup data
- Printful mockup generation
- Dynamic Mockups / PSD smart objects
- future providers

### 9. Do not use the print master as the storefront image

Store distinct artifacts:
1. Original Source
2. Working/Processed Master candidate
3. Approved Ready-to-Print Master
4. Display Image
5. Mockup Asset
6. Web Thumbnail
7. Preflight JSON
8. White-underbase preview
9. Optional halftone variant

The web page should use optimized display assets. The print master should remain private and high resolution.

### 10. Browser performance architecture

The browser should:
- validate basic file size/type hints
- create only a small local preview when safe
- upload using streaming/multipart
- subscribe/poll job status
- render small preview outputs
- never run heavyweight segmentation/upscaling on the main UI thread

The server should:
- verify signature
- enforce pixel/decompression limits
- persist original
- enqueue heavy work
- perform image processing
- store versioned outputs
- return status/progress

Recommended image engine for deterministic raster operations: Sharp/libvips because of low memory usage and demand-driven processing.

Recommended queue abstraction:
- production: Redis/BullMQ or equivalent
- fallback/demo: durable database/job table with strict state transitions

### 11. Security

Required:
- real signature validation, not extension trust
- MIME/signature match checks
- maximum compressed size
- maximum decoded pixel count
- SVG sanitization or rasterization in isolated worker
- PDF page/complexity limits
- reject malformed/decompression-bomb inputs
- safe generated storage keys
- do not execute embedded scripts
- strip unnecessary metadata from web previews
- keep source files private
- provider API keys server-side only
- audit every destructive or AI-changing operation

### 12. Semi-automatic policy

AUTO (safe/deterministic):
- inspect
- compute effective DPI
- transparent-bounds crop suggestion
- generate web preview
- generate dark/light background previews
- detect likely halo / background / scaling risks
- produce underbase preview
- build mockup metadata

ASK / APPROVAL REQUIRED:
- background removal when confidence is not high
- edge color decontamination if appearance may change
- strong contrast/color changes
- AI upscale
- AI retouch
- vectorization
- halftone replacing the normal master
- destructive crop outside transparent-only bounds

### 13. Product-fit must be dynamic

Do not hard-code only seven combinations.

Each product model should provide:
- placement IDs
- printable width/height
- safe margin
- min effective DPI
- alpha requirement/allowance
- allowed formats
- optional maximum ink/coverage guidance
- mockup template mapping

The same prepress engine then evaluates any current or future product.

## Proposed pipeline

UPLOAD
  -> INSPECT
  -> PREFLIGHT
  -> CLEAN
  -> ENHANCE (optional)
  -> PRODUCT FIT
  -> HALFTONE / UNDERBASE PREVIEW (optional)
  -> MOCKUP ASSET
  -> USER REVIEW
  -> APPROVE DISPLAY ASSET
  -> APPROVE READY-TO-PRINT MASTER
  -> VERSIONED SAVE

## API surface

POST /api/prepress/jobs
GET  /api/prepress/jobs/:id
POST /api/prepress/jobs/:id/actions
POST /api/prepress/jobs/:id/approve
GET  /api/prepress/jobs/:id/artifacts
GET  /api/prepress/products/:id/print-areas
POST /api/prepress/mockup-contract

Action names are declarative, e.g.
- remove_background
- refine_edges
- decontaminate_edges
- crop_transparent_bounds
- normalize_levels
- upscale
- vectorize
- halftone
- underbase_preview

## Processing modes

1. local-deterministic
   - works without paid APIs
   - libvips / ImageMagick / OpenCV style operations
   - inspection, crop, resize, alpha morphology, deterministic halftone, previews

2. ai-provider
   - optional server-side provider adapter
   - background removal / upscale / vectorization
   - provider choice is admin-configurable
   - no provider name exposed to customers

3. rip-handoff
   - produces print-ready source/master and preflight metadata
   - does not replace Fiery/Caldera/PrintFactory/other printer RIP

## Acceptance gates

- Original source is immutable.
- Heavy processing does not block the customer page.
- Every operation creates a version/audit entry.
- User can compare before/after.
- Every mockup uses the exact processed asset/version selected.
- Mockup placement metadata and print-master metadata refer to the same design version.
- Print master remains private.
- Web/display derivatives are optimized.
- No external provider secret is exposed.
- Arabic/English and RTL/LTR are supported.
- Existing protected Home card sizing/navigation behavior is not altered.
- No deployment or main merge without CI + runtime validation.


## Research Batch 001 — programming/tutorial sources

Scope of this batch: practical programming documentation, image-processing tutorials, print/preflight documentation, queue architecture, and mockup APIs. This is not the final design decision.

### OpenCV / scikit-image findings

- OpenCV erosion/dilation operate on shape with structuring elements. This maps directly to measurable DTF white-underbase choke/spread and alpha-edge cleanup rather than using arbitrary blur.
- OpenCV opening/closing can remove small foreground specks and fill small holes in a binary/alpha mask.
- Morphological gradient provides a practical way to isolate an edge band. That edge band is useful for halo detection and edge decontamination analysis.
- Distance Transform gives per-pixel distance to background. This is a strong candidate for variable edge treatment and smart choke rather than a fixed one-pixel contraction.
- Watershed and marker-based segmentation are useful for separating touching objects, but should not be the universal background remover.
- scikit-image thresholding material confirms global thresholding is cheap when background is uniform; local/adaptive thresholding is more suitable when illumination varies but is slower.
- scikit-image object-removal operations are suitable for cleaning tiny mask islands after segmentation.
- Exposure/intensity transforms must preserve numeric ranges and data types carefully; careless uint8/float conversions can alter the result.

### DTF RIP / white-underbase findings

CADlink / Fiery documentation confirms:
- automatic white underbase and externally supplied white layers are different paths;
- choke can be measured in pixels;
- adaptive white can use pixel opacity;
- semi-transparent pixels can optionally be treated as opaque, proving that alpha policy needs to be explicit;
- white-underbase strength, highlight white, and color data are distinct controls.

Caldera documentation confirms:
- white generation may track image transparency;
- a 50% transparent pixel can produce proportionally reduced white undercoat;
- spread expands the underbase while choke contracts it;
- smart choke removes unsupported white near boundaries to prevent visible white outlines;
- opacity reduction is explicitly used to suppress white halos caused by residual low-opacity pixels.

Conclusion for our tool: DTF Smart Prep should generate a previewable UNDERBASE MASK object from alpha/content, with independent choke/spread and threshold parameters. This is a prepress preview/handoff artifact, not direct printer-channel output.

### Effective resolution / print-fit finding

Enfocus preflight documentation reinforces that resolution is evaluated in the output context and that scaling changes effective resolution. Therefore:
- embedded DPI is metadata only;
- effective DPI must be calculated against the selected physical print area;
- a source can pass one product/placement and fail another;
- unnecessarily excessive resolution can also be flagged to avoid huge files and wasted processing.

### Mockup interoperability findings

Printify:
- uses normalized x/y coordinates;
- placeholder center is x=0.5, y=0.5;
- scale is relative to print-area width;
- artwork angle is explicit;
- product print areas can contain multiple artwork objects.

Printful:
- mockup generation accepts placement plus an explicit position object;
- that position uses area_width, area_height, artwork width/height, top and left;
- mockup generation is task-oriented rather than merely returning an immediate flattened image.

Dynamic Mockups:
- renders against a mockup UUID and smart-object UUID;
- accepts a public artwork URL or binary file;
- supports fit modes such as contain/cover/stretch;
- can apply top/left placement overrides.

Conclusion: use a provider-independent placement contract and write small adapters:
1. DTF Studio local renderer adapter
2. Printify normalized coordinate adapter
3. Printful pixel/relative-area adapter
4. Dynamic Mockups smart-object adapter

The processed artwork version ID must be part of every mockup request so preview and production cannot silently diverge.

### Browser/server architecture findings

Cloudflare image-transformation documentation confirms that optimized delivery derivatives can:
- scale down without upscaling;
- contain/cover/crop/pad;
- strip metadata;
- produce separate delivery variants.

BullMQ documentation confirms:
- job state and progress can be reported;
- failed jobs can retry with backoff;
- multiple workers improve availability;
- high async concurrency is useful for I/O-heavy jobs;
- CPU-heavy processing should not simply run at high Node concurrency and is better isolated/sandboxed.

Conclusion:
- browser handles selection, a bounded lightweight preview, status and comparison UI;
- server verifies and stores source;
- CPU/GPU-heavy processing runs in isolated jobs;
- web previews are generated as separate small delivery artifacts;
- the original and print master remain private/high-resolution.

### Provisional algorithm routing model

Do not use one universal Auto Fix. Use a classifier/router with deterministic fallbacks:

A. Already-transparent artwork
- inspect alpha histogram
- detect opaque background islands / low-alpha haze
- crop transparent bounds
- edge-band analysis
- optional choke/halo cleanup

B. Flat logo / line art
- threshold/segmentation
- remove small mask artifacts
- optional vectorization candidate
- preserve hard edges

C. Photo / complex object
- segmentation model or provider
- alpha-matting refinement
- edge color decontamination
- no forced vectorization

D. Smoke / glow / soft transparency
- preserve soft alpha
- do NOT binarize
- allow optional halftone conversion for dark-garment output
- compare normal-alpha and halftone variants

E. Low-resolution source
- compute required enlargement from target product
- high-quality resampling for small changes
- optional AI upscale for large changes
- re-run preflight after upscale
- never overwrite original

### Current decision status

No final stack decision yet.
No merge to storefront.
No deployment.
No protected Home/Mockup behavior changed.

The research direction currently favors:
- deterministic core: Sharp/libvips + targeted OpenCV-style morphology/math
- optional segmentation/upscale/vector adapters
- server-side async jobs
- versioned artifacts
- provider-independent mockup contract

This remains a hypothesis to be tested against further tutorial/API/source-code research before implementation is locked.
