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


## Research Batch 002 — alpha edges, halftone, color management, security and performance

This batch extends the programming/tutorial review. No final architecture decision is locked yet.

### Alpha edge quality and decontamination

Rembg implementation and usage documentation provide a very useful distinction between:
- naive alpha application;
- edge color decontamination;
- alpha matting;
- ViTMatte refinement.

Important implementation lesson:
- edge decontamination changes foreground RGB on soft-edge pixels without necessarily changing coverage;
- alpha matting refines both edge coverage and foreground estimation;
- these are not the same operation and must not be exposed as one vague 'clean edge' checkbox.

For DTF this is directly relevant to:
- colored halos after background removal;
- white haze after a dark/white background is removed;
- hair/fur/smoke/fabric edges;
- preserving semi-transparent pixels for proper dark-garment rendering.

Proposed rule:
1. detect whether the edge problem is coverage, color contamination, or both;
2. apply only the needed operation;
3. compare on white, black and checkerboard backgrounds;
4. never overwrite the original.

### Premultiplied-alpha handling

Image-compositing documentation confirms that many blending pipelines work in premultiplied alpha.

Implementation implication:
- every internal operation must declare whether RGB is straight-alpha or premultiplied;
- resize/blur/composite operations must not mix representations;
- conversion back to straight alpha is required before transparent export when the chosen file pipeline expects it.

This is important because incorrect alpha math can create dark/bright fringes that later become very visible over a shirt mockup.

### Halftone research

ImageMagick ordered-dither documentation shows that halftoning can be represented as threshold maps, including:
- dispersed ordered matrices;
- angled halftone matrices;
- orthogonal halftone matrices;
- circular patterns;
- custom XML threshold maps.

The documentation also demonstrates applying ordered dithering to the alpha channel itself.

This is highly relevant to DTF smoke/glow workflows:
- instead of converting soft alpha to solid white underbase, alpha can be converted into controlled dot occupancy;
- dot pattern and threshold map are deterministic and reproducible;
- custom threshold maps allow us to build DTF-specific patterns later.

Additional practical comparison:
- Ordered/Bayer-style screening: fast, deterministic, stable for preview and repeat output.
- Floyd–Steinberg error diffusion: preserves average tone well but is directional and can create worm-like structures.
- Blue-noise screening: visually less structured and attractive for stochastic patterns, but must be tested for minimum printable dot size and DTF production repeatability.

Current provisional plan:
- V1 preview: deterministic ordered/clustered-dot screening with explicit dot-cell size.
- V2 experiments: blue-noise/FM screening.
- Do not auto-halftone all artwork.

### Color management

Sharp documentation and Little CMS confirm that ICC handling is a separate technical concern from simple HSL/contrast operations.

Findings:
- Sharp normally strips metadata and converts standard output toward web-friendly sRGB unless metadata/profile retention is requested.
- Sharp can preserve an input ICC profile or transform to a specified output ICC profile.
- Little CMS is a full ICC color-management engine supporting V2/V4 profiles and RGB, Gray, CMYK, Lab, device-link and other ICC classes.

Architecture implication:
- Display Image should intentionally target sRGB for predictable browser/mockup rendering.
- Original and Print Master should preserve source/profile information unless an approved conversion is part of the workflow.
- ICC conversion should be explicit and logged.
- DTF Studio should not silently claim that an RGB-to-CMYK conversion equals printer calibration; the final printer/RIP profile remains device-specific.

### Streaming and memory efficiency

libvips documentation confirms demand-driven execution:
- image header can be loaded first;
- pixels are read only after an operation pipeline is connected to an output;
- sequential access is more memory efficient than random access when the workflow permits it.

This supports keeping Sharp/libvips as the primary deterministic raster candidate for:
- metadata/size inspection;
- web derivatives;
- trim/crop;
- resize;
- compositing;
- alpha extraction;
- format conversion.

Operations that need random neighborhood analysis or custom pixel algorithms can be delegated to OpenCV/custom workers rather than forcing all work into one engine.

### Input safety and denial-of-service limits

Sharp exposes a pixel-count input limit and recommends strict handling for untrusted image input.

ImageMagick documents independent limits for:
- memory;
- memory map;
- disk;
- file descriptors;
- threads;
- total elapsed time;
- pixel area.

This suggests layered input limits rather than only a maximum uploaded file size.

Required validation before decoding:
- compressed byte-size cap;
- detected dimensions;
- decoded pixel-count cap;
- maximum width/height;
- maximum frames/pages where relevant;
- CPU time limit;
- memory/disk scratch budget;
- format allowlist;
- signature/MIME agreement.

Heavy parsers such as SVG/PDF should be isolated from the public request process.

### Important correction to the earlier '300 DPI' mental model

Sharp can write density metadata, but setting metadata density does not create real detail.

The tool must distinguish:
- embedded density;
- pixel dimensions;
- requested physical print size;
- calculated effective DPI.

The output may carry 300-DPI metadata for production compatibility, but approval must be based on effective DPI and actual pixels.

### Refined processing architecture after Batch 002

Candidate deterministic path:

SOURCE
  -> signature/header inspection
  -> orientation normalization
  -> ICC/profile inventory
  -> alpha inventory
  -> bounded preview decode
  -> classification/router

Transparent art:
  -> transparent bounds
  -> edge-band detection
  -> halo/color contamination test
  -> optional decontaminate
  -> optional alpha morphology

Opaque product/photo art:
  -> segmentation
  -> confidence analysis
  -> alpha refinement/decontamination
  -> approval if visual change is material

Soft-alpha / glow / smoke:
  -> preserve straight alpha master
  -> optional ordered-halftone derivative
  -> dark/light shirt comparison
  -> underbase preview

All:
  -> product-fit effective DPI
  -> mockup contract
  -> sRGB display derivative
  -> private print candidate
  -> audit/version record

### Current status after Batch 002

Strong candidates, still not final:
- Sharp/libvips for common deterministic raster transforms and web derivatives.
- OpenCV/custom numeric operations for mask morphology, edge analysis and distance transforms.
- Little CMS or Sharp ICC functions for explicit color-profile transforms.
- Optional rembg-compatible model adapter for segmentation/matting, not hard-wired as the only provider.
- Ordered dither as the first predictable halftone implementation.
- Isolated worker/job execution with strict resource budgets.

No storefront merge.
No production deployment.
No protected Home or current Mockup UI modifications.


## Research Batch 003 — vectorization, super-resolution, model routing and artifact integrity

This batch extends the study with programming libraries and implementation details for vectorization, matting model selection, upscaling and output integrity. No storefront merge or production deployment.

### Vectorization

VTracer is a strong open-source candidate for optional raster-to-SVG conversion because:
- it supports color images rather than only monochrome tracing;
- it exposes presets for black-and-white, poster and photo-like inputs;
- it supports color clustering and watershed region formation;
- it supports Rust, Python and Node.js/WASM integrations;
- it can split the pipeline into segmentation and finishing stages.

Important DTF rule:
- vectorization must be offered only when the artwork is likely to benefit: logos, flat illustrations, line art, icons and limited-palette graphics;
- photographs and soft-gradient artwork should not be silently vectorized.

Potential classifier hints before offering vectorization:
- low number of dominant colors;
- strong edge density;
- low local texture entropy;
- large flat-color regions;
- limited gradient content.

### Upscaling / restoration

Real-ESRGAN remains a useful optional provider/engine rather than a universal step.

Implementation details confirmed from source:
- tile-based inference is supported;
- grayscale and 16-bit sources are handled;
- RGBA input is split so alpha can be processed separately;
- alpha upscaling can use the same model or a non-AI path.

DTF policy derived from this:
- never run AI upscale automatically on every upload;
- compute required enlargement first;
- if effective DPI already passes, do not upscale;
- for modest enlargement use deterministic high-quality resampling;
- for large enlargement offer AI upscale with before/after preview;
- re-run edge analysis and preflight afterward;
- keep original alpha and compare AI-upscaled alpha versus deterministic alpha because an AI model can alter edge geometry.

### Matting model router

Research confirms that matting models differ substantially by subject domain.

MODNet:
- designed for portrait matting;
- accepts RGB without a trimap;
- optimized for real-time portrait workflows.

ViTMatte:
- matting-focused transformer architecture;
- expects a trimap in its standard demo path;
- targets high-quality alpha-matte recovery.

Rembg ecosystem:
- supports multiple interchangeable sessions/models;
- supports naive cutout, decontamination, alpha matting and ViTMatte refinement;
- exposes mask-only output.

Architectural consequence:
DTF Studio must not have one hard-coded model called 'Remove Background'.

Use a provider/model router such as:
- portrait/person -> portrait matting candidate;
- general product/object -> general foreground segmentation;
- already-transparent artwork -> no segmentation, inspect existing alpha;
- logo/flat art -> deterministic threshold/edge path may outperform AI;
- complex soft-edge output -> optional matting refinement.

The model choice and version must be written into the processing recipe for reproducibility.

### Artifact integrity

The same visible design may create several derivative files, so every artifact needs strong linkage.

Minimum integrity record:
- sourceAssetId
- sourceHash
- processingJobId
- processingRecipeVersion
- model/provider/version where applicable
- outputArtifactId
- outputHash
- width/height
- alpha mode
- ICC/profile state
- effective DPI for the selected placement
- createdAt

Mockup requests must reference outputArtifactId, not only a URL.

This prevents a failure mode where:
- customer approves Preview A,
- processing later changes the asset,
- mockup or production accidentally uses Preview B.

### A/B review requirement

Vectorization, AI upscale, background removal and strong edge correction can materially alter artwork.

Therefore the professional UI should include:
- Original
- Current Processed
- Dark Garment
- Light Garment
- Mockup
- optionally Alpha Mask / Underbase

Approval stores the exact processedVersionId.

### Further rejection of a one-click destructive workflow

Research so far reinforces that one universal destructive Auto Fix would be technically weak.

The semi-automatic system should:
- auto-run inspection and low-risk derivative generation;
- auto-suggest fixes with reasons;
- apply deterministic non-destructive previews;
- require approval before committing appearance-changing operations.

### Status after Batch 003

Current research direction:
- raster core: Sharp/libvips;
- numeric mask/edge analysis: OpenCV-style operations;
- ICC: explicit profile-aware path;
- general segmentation: replaceable adapter;
- matting refinement: optional;
- vectorization: VTracer-style optional adapter;
- upscaling: optional Real-ESRGAN-style adapter;
- all expensive work: isolated server-side jobs;
- all outputs: versioned and hash-linked;
- mockup: exact processed artifact + normalized placement contract.

Still not final.
No deployment.
No merge.
No changes to protected Home or current Mockup behavior.


## Research Batch 004 — alpha math, halftone physics, upload resilience, mockup transforms and security

This batch focuses on programming details that directly affect visual correctness, large-file reliability, and keeping mockups identical to production placement.

### Premultiplied alpha and edge correctness

Modern compositing pipelines distinguish straight alpha from premultiplied alpha. This is not a cosmetic implementation detail. Resizing, blurring or compositing RGB without respecting the alpha representation can create dark or bright edge fringes that become obvious on black or white garments.

Required internal metadata:
- alphaMode: straight | premultiplied | opaque
- sourceHasAlpha
- alphaHistogramSummary
- edgeBandWidthPx
- edgeTreatmentRecipe

Rule:
- processing stages must explicitly convert alpha representation at boundaries rather than assuming one convention.

### Edge diagnosis must be specific

Research into matting/decontamination implementations shows that edge defects are not one problem.

Proposed diagnostic codes:
- COLOR_FRINGE: foreground RGB contaminated by previous background color
- COVERAGE_HARD_EDGE: alpha transition too abrupt
- COVERAGE_LEAK: unwanted low-alpha background remains
- SOFT_DETAIL_LOSS: hair/smoke/glow detail removed
- LOW_ALPHA_HAZE: broad low-opacity region likely to create white haze or unintended underbase

Each code maps to a different suggested operation. A generic destructive "clean edges" button is rejected.

### DTF halftone should be a derivative

Ordered-dither documentation confirms deterministic threshold maps including dispersed, angled, orthogonal and circular patterns. The same method can be applied to alpha rather than destroying RGB.

V1 halftone design:
1. preserve source RGB;
2. extract the alpha mask;
3. apply selected deterministic threshold map to alpha;
4. merge the new alpha with source RGB;
5. generate dark/light garment previews;
6. save as HALFTONE_DERIVATIVE;
7. never overwrite the normal transparent master.

The UI should expose physical meaning rather than only an arbitrary slider:
- cell size in pixels;
- effective DPI;
- calculated physical cell size in mm/inches;
- nominal screen frequency where meaningful.

This lets the preflight flag patterns whose dots are too small for reliable transfer or so large that visual detail is lost.

### Color management policy

Programming documentation for Pillow, OpenImageIO, OpenColorIO, Little CMS and Sharp reinforces that display color and production color are separate concerns.

Policy:
- browser/display derivative: explicit sRGB display target;
- original: preserve profile metadata;
- print candidate: preserve profile unless an approved transform is requested;
- ICC transforms are explicit, versioned and logged;
- DTF Studio does not claim that generic RGB-to-CMYK conversion replaces the printer/RIP ICC, linearization, white-channel control or ink limits.

The UI may offer an approximate soft-proof preview later, but it must be labeled as a preview rather than a guaranteed printer proof.

### Security: file size is not enough

OWASP, Pillow and binary-signature tooling reinforce a layered upload model.

Required gates:
- extension allowlist;
- real signature/magic-byte detection;
- MIME/signature agreement;
- compressed byte-size limit;
- decoded pixel-count limit;
- maximum width/height;
- maximum frame/page count;
- decompression-bomb rejection;
- worker CPU timeout;
- worker memory/scratch-disk limits;
- generated storage keys, never user paths;
- private source storage;
- metadata stripping on public web derivatives;
- audit event for upload validation outcome.

SVG requires its own security path because it is XML/text rather than a simple binary-signature image. Do not treat generic HTML sanitization as sufficient for every SVG sink. Prefer strict allowlisting and/or safe rasterization for customer previews.

### Large-file upload architecture

For normal artwork:
- direct signed upload to private object storage.

For large PSD/PDF/source assets:
- multipart/resumable upload;
- retry individual parts;
- persist upload session state;
- never base64-encode a large print asset into JSON.

The request-serving process should not retain full high-resolution source bytes in memory while heavy processing occurs.

### Job isolation

Separate workloads by class:

IO jobs:
- storage operations;
- metadata persistence;
- provider API calls.

CPU jobs:
- raster transforms;
- alpha morphology;
- edge analysis;
- halftone;
- vectorization.

GPU/AI jobs:
- segmentation;
- matting;
- super-resolution where configured.

Every job requires:
- idempotency key;
- immutable input artifact hash;
- processing recipe/version;
- progress;
- timeout;
- bounded retries/backoff;
- cancellation state;
- output artifact hash.

### Browser memory rule

The browser is not the production processor.

Allowed browser work:
- file selection;
- basic early validation hints;
- bounded preview decode;
- small OffscreenCanvas/Web Worker enhancements;
- visual comparison;
- mockup transform controls;
- progress/status.

Browser cleanup:
- cap preview dimensions;
- close ImageBitmap resources when done;
- revoke object URLs;
- release replaced canvases;
- never keep multiple full-resolution copies alive.

### Provider-neutral mockup coordinates

External mockup providers use different coordinate systems. DTF Studio should keep one authoritative placement record.

Internal ArtworkPlacement:
- printAreaId
- normalized center x/y in [0,1]
- normalized width/height relative to print area
- rotationDeg
- flipX / flipY
- fitMode
- physical width/height
- processedVersionId

Adapters derive provider payloads from that record.

For a provider using top-left pixel coordinates:
left = (x - width / 2) * areaWidth
top  = (y - height / 2) * areaHeight
artWidth  = width  * areaWidth
artHeight = height * areaHeight

Round only at the provider boundary to avoid transform drift.

Critical rule:
Mockup and print must NOT maintain separate placement values. Both derive from the same ArtworkPlacement record and the exact same processedVersionId.

### Batch 004 decision status

The following are stronger engineering conclusions but still not a final locked stack:
- explicit alpha representation through the pipeline;
- diagnosis-specific edge repair;
- halftone stored as a versioned derivative;
- explicit display-vs-production color policy;
- layered upload security;
- resumable object-storage uploads for large files;
- isolated job classes;
- one authoritative mockup/production placement record.

No storefront merge.
No deployment.
No protected Home or current Mockup changes.


## Research Batch 005 — resilient uploads, worker isolation, edge diagnostics and underbase fidelity

This batch is based on individually opened programming/API/tutorial pages recorded in the verified corpus ledger.

### Upload transport: prefer direct, resumable storage paths

Cloudflare R2 documentation confirms that multipart upload is intended for large files, supports parallel part upload and retrying failed parts, and can be driven through Workers or S3-compatible tooling. R2 multipart uploads can be resumed with an upload ID, and incomplete uploads have lifecycle/error behaviors that must be handled explicitly.

The tus protocol adds a provider-neutral HTTP model:
- HEAD discovers current Upload-Offset;
- PATCH resumes from the exact byte offset;
- optional checksums verify chunks;
- creation/expiration/termination are explicit protocol states;
- upload metadata must be validated because arbitrary metadata can become a header-smuggling risk.

Decision direction:
- small normal artwork: direct signed PUT;
- large PSD/PDF/source files: multipart or tus-style resumable upload;
- never proxy large source files through JSON/base64.

### Browser memory discipline

MDN confirms:
- object URLs must be revoked when no longer needed;
- createImageBitmap can decode with explicit resizeWidth/resizeHeight and alpha/color-space options;
- ArrayBuffer can be transferred to a Worker rather than copied, detaching it from the sender.

Practical UI rule:
- generate a bounded preview;
- transfer, do not duplicate, large buffers where possible;
- close/release bitmap and object URL resources;
- never retain multiple full-resolution copies in customer UI state.

### Deterministic image inspection and derivatives

Sharp metadata() reads header metadata without decoding compressed pixels. It can expose:
- width/height;
- density;
- color space;
- channel count/bit depth;
- ICC presence;
- alpha presence;
- frame/page counts.

Sharp resize supports withoutEnlargement, making it suitable for web/display derivatives that must never accidentally upscale a low-resolution original.

Sharp output metadata behavior also reinforces a critical rule:
setting output density metadata changes the PPI tag, not the underlying pixel detail. Print approval remains based on effective DPI.

### Worker architecture

BullMQ documentation separates asynchronous I/O concurrency from CPU-heavy work:
- high local concurrency is useful mainly for async I/O;
- CPU-heavy processors should be sandboxed/isolated;
- multiple workers improve availability;
- retries should use bounded attempts and backoff.

DTF worker pools should therefore be split:
- IO pool: object storage/provider calls;
- raster CPU pool: Sharp/OpenCV/ImageMagick;
- AI/GPU pool: segmentation/matting/upscale;
- vector pool: tracing/vectorization.

A failed deterministic job may retry; a repeated failure should preserve the original input and exact error rather than falling into an infinite retry loop.

### Edge classification became more concrete

OpenCV morphology, Canny and GrabCut research suggests different tools for different diagnostics:
- morphology/opening/closing: remove small mask defects and close pinholes;
- morphological gradient/Canny: identify a narrow edge band for analysis;
- distance transform: measure distance from mask edge for variable choke/decontamination;
- GrabCut: useful as an interactive/deterministic segmentation fallback when a coarse object region is known.

These should not be combined into one generic "enhance image" operation.

### Background-removal implementation evidence

The rembg source distinguishes:
- naive mask application;
- alpha matting;
- mask post-processing;
- edge-color decontamination;
- ViTMatte refinement.

Its source explicitly notes that ViTMatte recovers coverage but foreground color still needs decontamination to avoid preserving the old background color in recovered strands.

This strongly supports storing two separate concepts:
- alpha/coverage refinement;
- foreground RGB edge decontamination.

### White-underbase fidelity

CADlink documentation confirms:
- underbase and highlight white are separate controls;
- choke can be specified in pixels;
- a coverage underbase can distribute white based on image/grayscale values;
- adaptive behavior can use pixel opacity;
- semi-transparent pixels can optionally be treated as opaque;
- tolerance can ignore low-opacity/errant pixels that otherwise create unwanted white.

Caldera documentation confirms:
- white generation can follow transparency;
- Spread grows and Choke shrinks underbase;
- Smart Choke removes unsupported white at boundaries;
- an opacity-reduction coefficient exists specifically to reduce white halos from residual low-opacity pixels;
- underbase generation can be based on raster and vector transparency with multiple rendering resolutions.

DTF Smart Prep should therefore model underbase preview as a separate artifact with parameters:
- alpha threshold / low-opacity suppression;
- opacity-to-white transfer curve;
- choke/spread distance;
- smart-edge cleanup;
- optional treat-semitransparent-as-opaque mode;
- highlight-white preview kept separate from underbase.

### Color conversion and alpha interaction

OpenImageIO colorconvert explicitly supports an unpremult option during color transformation. This is useful implementation evidence that alpha representation must be considered during color-space transforms rather than blindly transforming premultiplied RGB values.

OpenColorIO documentation likewise separates ColorSpaceTransform from DisplayViewTransform.

Policy remains:
- sRGB display/mockup derivative;
- explicit production color transform only when approved;
- no claim that storefront color conversion replaces RIP/printer calibration.

### libvips memory model

pyvips documents sequential access as lower-memory and faster for top-to-bottom processing compared with full random access.

Use sequential access where the processing graph allows it:
- decode -> resize -> colorspace -> encode web preview;
- decode -> simple alpha extraction/trim -> encode derivative.

Use random-access/numeric worker paths only where neighborhood analysis actually requires it.

### Batch 005 current architecture position

The evidence is converging on:
1. immutable source asset;
2. header-first inspection before expensive decode;
3. resumable/direct object upload;
4. classifier/router;
5. dedicated alpha/edge diagnostics;
6. optional segmentation/matting;
7. explicit effective-DPI product-fit;
8. separate underbase/halftone derivatives;
9. exact processedVersionId shared by mockup and production;
10. isolated CPU/GPU workers;
11. sRGB display derivative + profile-aware print candidate.

This is still a research conclusion, not authorization to merge or deploy.


## Research Batch 006 — verified corpus milestone 100 pages

The verified corpus ledger has now reached 100 individually opened/read unique pages. This batch adds stronger evidence around queue correctness, upload isolation, alpha-aware resampling, PSD/PDF handling, vectorization, segmentation and mockup interoperability.

### Job semantics: idempotence is mandatory

BullMQ's idempotent-job guidance explicitly recommends designing jobs so retrying them does not change the final result, and keeping jobs atomic/simple.

For DTF Smart Prep:
- every processing job key should include immutable input artifact hash + recipe version;
- a retry must either reproduce the same output hash or create a clearly versioned new attempt;
- database mutation and external provider calls should not be mixed casually into one opaque job;
- complex workflows should be represented as explicit stages/flows.

### Queue failure handling

Cloudflare Queues documentation reinforces:
- retries are bounded;
- a failed message can be redirected to a Dead Letter Queue;
- batching can cause an entire batch to retry unless individual messages are acknowledged;
- concurrency and retry settings are first-class deployment controls.

For our Cloudflare-oriented repo this creates a viable native alternative to Redis/BullMQ for certain workflow orchestration. The final queue choice remains open pending runtime/deployment constraints.

### Direct upload security

Cloudflare R2 presigned URLs are bearer tokens for one object/operation until expiry.

Implications:
- short expirations;
- server-generated object key;
- restrict Content-Type in the signature where useful;
- post-upload signature/header inspection still required because Content-Type is not proof of file content;
- original object remains private;
- browser receives only the minimum capability required for the upload.

### Mockup geometry is provider-specific but mathematically adaptable

Printify confirms:
- center-based normalized coordinates in approximately [0,1];
- center at x=0.5, y=0.5;
- scale relative to print-area width;
- explicit artwork angle.

Printful confirms a different contract:
- top-left-origin position;
- area_width/area_height;
- width/height;
- top/left;
- values are relative rather than inherently fixed to pixels;
- its mockup generation is task-oriented.

This validates the provider-neutral ArtworkPlacement model. Store one authoritative transform and derive provider payloads.

### Alpha-aware resizing is not optional

The Rust image crate documents that its resize path assumes alpha premultiplication for non-constant alpha and also warns that color distortion may occur if filtering is done outside scene-linear light.

This is important evidence for our image-quality tests:
- transparent-edge resize tests must include colored fringe cases;
- alpha mode must be explicit;
- where high fidelity matters, evaluate whether resizing in nonlinear sRGB produces measurable edge/color errors compared with a linear-light path.

### Browser preview architecture

MDN documentation confirms:
- createImageBitmap works inside Web Workers;
- a canvas can transfer control to an OffscreenCanvas;
- OffscreenCanvas can encode a Blob off the main thread.

However OffscreenCanvas export metadata may use 96-DPI conventions. Therefore browser-generated preview blobs must never be treated as authoritative print masters or evidence that the source is 300 DPI.

### ImageMagick security model

ImageMagick's current security guidance is especially relevant for untrusted uploads:
- security policy is open by default unless restricted;
- resource limits cover time, threads, memory, mmap, disk, area, width, height and list length;
- external delegates can be disabled;
- module/coder allowlists can restrict processing to web-safe formats;
- indirect reads and sensitive paths can be denied;
- SVG entity substitution can be disabled;
- PDF/PostScript interpretation can be disabled in the public raster worker.

Therefore, if ImageMagick is used at all, DTF Studio should run a purpose-built restrictive policy inside an isolated worker/container rather than relying on defaults.

### SVG/XML security

OWASP documents XML External Entity attacks through SVG processing and recommends disabling DTD/external entity resolution in untrusted XML parsers.

For DTF Studio:
- SVG cannot share the exact same trust path as PNG/JPEG;
- sanitize/parse with a strict allowlist or rasterize inside a locked-down process;
- disable external resource/entity resolution;
- block scripts, remote references and file references for customer-generated previews.

### PDF preview safety

PDF.js exposes maxImageSize and canvasMaxAreaInBytes style controls in its document-loading/rendering configuration.

This supports a bounded preview policy:
- limit pages;
- limit decoded embedded-image pixels;
- limit canvas memory;
- render only required preview pages;
- keep production PDF parsing/normalization in an isolated service.

### PSD support: inspect, do not promise perfect rendering

PSD.js can expose document structure, dimensions, layers, opacity, text metadata, vector masks and flattened data, but its own documentation notes format/mode limitations and reliance on compatibility/flattened previews in some cases.

Conclusion:
- accept PSD as source/master candidate only with explicit parser capability checks;
- generate a preview from a trusted flattened composite when available;
- do not promise perfect browser reconstruction of every PSD blend mode/layer effect;
- preserve original PSD privately.

### Segmentation router grows stronger

OpenCV and scikit-image tutorials add useful non-AI fallbacks:
- GrabCut: interactive foreground extraction from rectangle/mask priors;
- watershed: useful for separating touching regions from markers;
- active contours: can fit a smooth boundary to edges;
- random walker: marker-based segmentation with gradient-sensitive diffusion.

These are valuable as:
- repair/refinement tools;
- deterministic fallback paths;
- assisted/manual tools.

They should not replace general-purpose learned segmentation for all photos.

### Vectorization

VTracer's current implementation exposes pluggable stages and can run from Rust, Python and Node/WASM. It can cache segmentation and rerun finishing, use custom palettes, watershed clustering and adaptive black/white thresholding.

For our architecture:
- vectorization service should be optional;
- route only likely logo/flat-art candidates;
- cache expensive segmentation if the user adjusts fitting/simplification;
- keep source raster and vector result as separate artifacts.

### AI upscaling and alpha

Real-ESRGAN source confirms that RGBA images split alpha from RGB and can upscale alpha with either the same model or a standard interpolation path.

This is a critical test point:
- AI alpha upscaling may reshape an edge;
- deterministic alpha interpolation may retain geometry but not synthesize detail;
- DTF Studio should compare both for edge-sensitive artwork rather than assuming one is always better.

### Architecture status at the 100-page milestone

Strong conclusions now:
- immutable originals;
- header-first/bounded inspection;
- explicit alpha state;
- diagnosis-specific edge repair;
- direct/resumable private uploads;
- isolated processing jobs;
- idempotent/versioned recipes;
- DLQ/failure observability;
- provider-neutral mockup geometry;
- effective DPI instead of trusting metadata DPI;
- optional segmentation/vector/upscale adapters;
- separate sRGB display derivative and production candidate;
- no untrusted SVG/PDF/ImageMagick defaults.

Still intentionally undecided:
- exact queue backend;
- exact segmentation model/provider;
- exact upscale provider;
- whether ImageMagick remains in the production stack or is limited to isolated specialist jobs;
- whether PSD normalization uses a native parser, Adobe service, or a combination.

No storefront merge.
No deployment.
No protected Home or existing Mockup UI changes.


## Research Batch 007 — streaming delivery, display derivatives and model deployment constraints

This batch raises the verified corpus to 115 individually opened/read unique pages.

### Cloudflare Workers streaming is directly useful for this project

Cloudflare Workers documents that Web Streams allow very large request/response bodies to be handled incrementally within the Worker memory limit instead of buffering the full payload. This is directly relevant to DTF Studio because high-resolution source files should not be held in memory as complete buffers in the request path.

Use cases:
- stream uploads onward when appropriate;
- stream large provider responses;
- avoid request.arrayBuffer() for production-sized source files when a streaming path is available;
- keep heavy image decode outside the request-serving process.

### FixedLengthStream and content length

Cloudflare documents that FixedLengthStream can enforce an exact byte count and provides Content-Length semantics for streamed requests/responses.

Potential use:
- bounded proxying for known-size artifacts;
- stronger integrity checks for generated preview responses;
- not a substitute for content signature validation.

### Image delivery should be a dedicated derivative layer

Cloudflare Images transformation docs reinforce several useful storefront rules:
- scale-down can guarantee no accidental enlargement;
- modern output formats such as WebP/AVIF can be generated independently of the print master;
- transformations can be cached;
- variants can strip metadata;
- origin access can be hidden/restricted behind Workers;
- a display crop/fit is not the same as the production placement geometry.

Therefore the storefront should request a versioned Display Artifact, not the private print master.

### Built-in foreground segmentation is useful but should not own the master pipeline

Cloudflare Images currently exposes foreground segmentation based on BiRefNet for transformation workflows. This may be useful as:
- a fast optional preview/background-removal provider;
- a fallback or comparison provider;
- a way to produce lightweight web derivatives.

It should not silently become the only segmentation engine because:
- production quality may need different models/matting refinement;
- provider behavior can change;
- model licensing and commercial terms must be tracked separately from code/library licensing;
- production results must remain reproducible with an explicit provider/model/version recipe.

### BRIA RMBG-2.0 licensing is a real architecture constraint

The BRIA RMBG-2.0 repository states that the model is source-available for non-commercial use and commercial use requires a commercial agreement. It returns a non-binary grayscale alpha matte rather than merely a binary foreground mask.

Implications:
- technically attractive does not automatically mean deployable commercially;
- model license must be stored in the provider capability registry;
- the runtime should support swapping the segmentation provider without changing the surrounding workflow;
- mask output should preserve continuous alpha for downstream matting/choke/underbase logic.

### Browser-side background removal can work, but is not the default production architecture

The bg-eraser example demonstrates a browser workflow using Transformers.js, WebGPU with WASM fallback, a Web Worker and a client-side feather control. This proves that local/browser background removal is technically possible for moderate images.

For DTF Studio the safer architecture remains:
- browser preview path may optionally use local inference for responsive UX where supported;
- production artifact generation remains server-side and versioned;
- local preview is never automatically promoted to print master without server verification.

### Small-model deployment trade-off

The Rust/background-removal example and related implementations show a recurring practical constraint: background-removal models may consume hundreds of megabytes to more than 1 GB depending on model and precision. Input-side caps around 640–1024 px are commonly used on constrained hosts to control memory.

This is further evidence that:
- segmentation preview resolution and final production resolution should be separate concepts;
- high-resolution alpha can be reconstructed/refined from lower-resolution inference rather than blindly running every model on a 5K source;
- GPU/AI workers should have their own resource profile and concurrency limits.

### New operational rule: separate inference canvas from source canvas

Recommended pattern:
1. inspect source at native resolution;
2. create bounded inference image, preserving aspect ratio;
3. run segmentation/matting model;
4. upscale/refine mask back to source coordinates using an alpha-safe method;
5. perform edge refinement against original-resolution RGB;
6. save source-resolution transparent derivative;
7. compare against original on dark/light backgrounds;
8. record model input resolution as part of the recipe.

This avoids wasting GPU memory while preserving high-resolution production geometry.

### Batch 007 status

Stronger conclusions now:
- streaming belongs in the transport path;
- display delivery belongs in a separate derivative layer;
- segmentation provider must be replaceable and license-aware;
- browser inference is optional UX acceleration, not production authority;
- inference resolution must be stored separately from source/output resolution;
- production alpha reconstruction/refinement must operate against source-resolution pixels.

Still no storefront merge, no deployment, and no protected Home/Mockup modification.


## Research Batch 008 — resampling quality, alpha compositing, preview decoding and geometric diagnostics

The verified corpus has reached 142 individually opened/read unique pages.

### Alpha compositing must preserve hidden-edge color semantics

ImageMagick compositing documentation reinforces an important transparency fact: fully transparent pixels can contain arbitrary RGB values, and alpha composition methods differ in whether those hidden colors can later become visible. This is directly relevant to DTF edge halos.

Implementation rule:
- do not treat alpha replacement and Porter-Duff compositing as equivalent operations;
- keep edge RGB and alpha diagnostics separate;
- test transparent artwork over black, white and checkerboard backgrounds after every edge-changing operation.

### Resampling quality is content-dependent

ImageMagick's resampling documentation shows the trade-off between blocking, aliasing, ringing and blur across filters. scikit-image likewise notes that anti-aliasing is crucial when downscaling.

For DTF Studio:
- downscale previews with explicit anti-aliasing;
- do not use nearest-neighbor except for intentionally pixel-art-like inputs;
- do not assume one interpolation kernel is best for photos, logos and line art;
- keep production master untouched when creating display-size derivatives.

### Morphological distance is useful beyond binary cleanup

ImageMagick morphology documentation demonstrates Euclidean distance gradients and feathering based on distance from an edge. This strengthens the design for variable choke/spread and controlled alpha feathering.

Potential use:
- measure distance inward/outward from the alpha boundary;
- create a physically meaningful edge band;
- vary underbase opacity or decontamination strength by edge distance rather than a crude fixed blur.

### Distortion and mockup preview are separate from production geometry

ImageMagick distortion examples confirm that perspective/polar/general distortions are resampling operations and can introduce interpolation artifacts.

Policy:
- a mockup may use perspective/distortion to look realistic;
- production placement remains an undistorted authoritative 2D print-area transform;
- never derive print-master pixels back from a distorted mockup render.

### Sharp pipeline details

Sharp provides:
- composition with explicit blend modes;
- auto-orientation using EXIF Orientation;
- pipeline color-space controls;
- trimming/flattening/threshold/blur/sharpen and related operations.

This supports a deterministic processing core, but the operation order must be explicit in the recipe because orientation, resize, extract and composition order changes output.

### Pillow is useful for validation/testing utilities, not necessarily the main high-throughput engine

Pillow ImageOps/ImageChops/ImageFilter/ImageEnhance provide useful reference implementations for:
- contain/cover/fit/pad semantics;
- per-channel arithmetic and difference masks;
- edge/sharpen/blur filters;
- controlled contrast/color/brightness/sharpness adjustments.

These are valuable for tests and prototypes. The high-throughput server path still favors libvips/Sharp for large raster jobs unless benchmarking proves otherwise.

### PDF preview sizing must not be confused with print resolution

PDF.js examples state that a PDF viewport at scale 1 is based on the PDF coordinate system and commonly described in 72-DPI-style units for rendering. PDF.js then scales the canvas independently for display/HiDPI.

Critical rule:
- browser canvas dimensions from a PDF preview are not evidence of the print file's native raster DPI;
- PDF preflight must inspect page geometry, embedded raster resolution where relevant, and intended physical placement separately.

### Browser image decoding options can alter preview behavior

MDN createImageBitmap exposes explicit options for:
- EXIF orientation behavior;
- premultiplyAlpha;
- colorSpaceConversion;
- resizeWidth/resizeHeight;
- resizeQuality.

WebCodecs ImageDecoder can decode in a Worker and may expose progressive/partial decoding where supported, but it is not universally available across browsers.

Architecture consequence:
- createImageBitmap is a practical cross-browser preview primitive with bounded resize;
- ImageDecoder can be an optional progressive path behind feature detection;
- browser decoder choices must be recorded as preview-only behavior, never print-master authority.

### Geometric diagnostics can improve automatic crop/placement suggestions

OpenCV contour features and image moments provide:
- area;
- centroid;
- perimeter;
- bounding rectangles;
- convexity and contour approximation.

scikit-image region properties provide a broad measurement layer for labeled regions.

Potential DTF use:
- identify main foreground component;
- detect tiny detached islands/noise;
- compute transparent bounds and visual center separately;
- recommend placement centered on visual mass rather than only rectangular bounds;
- flag a design whose important foreground lies close to the printable-area edge.

### Batch 008 current position

New stronger conclusions:
- alpha color and alpha coverage must be treated separately;
- preview downsampling needs explicit anti-aliasing policy;
- edge-distance fields are a useful common primitive for choke/spread/feather analysis;
- realistic mockup distortion must never feed back into production artwork;
- PDF preview pixels are not print-resolution evidence;
- browser decode is bounded and preview-only;
- visual-centroid/region measurements can improve automated placement suggestions.

No storefront merge, no deployment, and no protected Home/Mockup modification.


## Research Batch 009 — PSD realism, browser color precision, Cloudflare execution limits and mockup task lifecycle

The verified corpus now contains 167 individually opened/read unique pages.

### PSD support needs capability negotiation, not a generic "PSD supported" badge

Comparing several PSD parsers shows large differences:
- PSD.js and derivative parsers expose tree/layer metadata and flattened image access but are incomplete for many newer layer features.
- ag-psd supports broad layer structures but documents important limitations: unsupported/non-native handling for some color modes, 16-bit limitations in some builds, incomplete text behavior and no guarantee of faithfully redrawing every effect after edits.
- @webtoon/psd supports PSD/PSB and uses WebAssembly for faster decoding, but parser support still must be tested against the exact production files we accept.

Policy:
- preserve original PSD/PSB privately;
- perform a capability scan before promising editable support;
- prefer a trusted composite/flattened preview when exact layer rendering is uncertain;
- distinguish "accepted as source/master" from "fully editable in browser";
- record parser name/version and unsupported-feature warnings in preflight.

### Printful confirms asynchronous mockup generation and temporary result URLs

Printful API documentation confirms that mockup generation is a task workflow:
- submit a generation request;
- receive/store task key;
- poll task status;
- download/store generated mockups when complete;
- returned mockup URLs can be temporary.

Architecture implication:
- external mockup provider output must be ingested into our own artifact storage if it is part of an approved design record;
- provider URLs cannot be the durable source of truth;
- mockup task id/status/error should be part of provider-job metadata.

### Printful v2 is still evolving

Printful v2 documentation labels the API beta and notes that endpoint details may still change. It also uses rate-limit headers and standardized error payloads.

Adapter rule:
- isolate provider contracts behind versioned adapters;
- do not leak provider-specific response shapes into DTF core domain objects;
- add contract tests against recorded fixtures;
- tolerate provider-specific rate limits/backoff.

### Browser canvas can now represent wider color/precision, but this remains a preview concern

MDN documents Canvas/ImageData support for:
- sRGB and Display-P3 color spaces;
- 8-bit normalized RGBA;
- float16 RGBA in supported implementations.

This creates a useful future path for higher-fidelity browser previews, but the APIs remain browser-dependent and some capabilities are experimental.

Policy:
- baseline preview remains sRGB 8-bit for compatibility;
- optional wide-gamut/float preview can be feature-detected;
- never infer print-master color precision from browser canvas capabilities.

### Canvas readback may not be bit-exact in all privacy modes

MDN notes that certain privacy/fingerprinting protections can introduce subtle noise into getImageData() results.

Therefore:
- browser canvas pixel values must not be used for cryptographic integrity checks or authoritative production comparisons;
- hashes and pixel-exact QA belong server-side on deterministic decoded artifacts.

### OpenImageIO reinforces metadata-vs-conversion separation

OpenImageIO ImageInput can expose a color-space hint in metadata, but simply reading the image does not perform a color conversion.

Important rule:
- inventory/profile detection and actual color conversion are separate pipeline stages;
- never assume that reading a file into a library normalizes it to sRGB;
- explicit conversion recipe required.

### Local entropy can help classify artwork complexity

scikit-image rank-filter examples show local entropy as a measure of neighborhood complexity.

Potential classifier feature:
- low entropy + few dominant colors + strong closed contours -> logo/flat-art candidate;
- high entropy + broad tonal variation -> photographic/complex-art candidate.

This feature should supplement, not replace, learned classification.

### Multi-Otsu is useful for more than binary masks

Multi-Otsu separates an intensity histogram into multiple classes.

Potential DTF uses:
- distinguish background, antialiased edge and foreground on simple artwork;
- separate low-opacity haze from stronger semi-transparent detail in derived alpha analysis;
- provide a deterministic fallback for flat/simple images.

Do not use Multi-Otsu on every photo; it is most useful when intensity classes are meaningfully separable.

### Cloudflare Worker limits strongly argue against heavy raster/AI processing in the request path

Current Cloudflare Workers documentation states a 128 MB memory limit per isolate and plan-dependent CPU limits. Cloudflare explicitly recommends streaming instead of buffering large request/response bodies when memory pressure is a risk.

For our current Cloudflare-based repo:
- authentication, job creation, signed upload, lightweight header validation and orchestration fit well in Workers;
- full PSD/PDF decode, high-resolution morphology, AI segmentation and super-resolution should run in a separate processing service/worker environment with a suitable resource budget;
- do not assume one Cloudflare HTTP Worker should execute the entire prepress pipeline.

### R2 capacity is not the bottleneck; request-path limits are

R2 supports very large objects and multipart upload with many parts. This confirms that object storage can preserve high-resolution source assets even when the request-serving Worker should not buffer them.

Operational rule:
- storage object size capability does not justify large in-memory request handling;
- use direct/multipart upload and process by object key afterward.

### Queue payloads must remain metadata-sized

Cloudflare Queues documents a finite message-size limit and bounded consumer execution.

Therefore a prepress queue message should contain:
- jobId;
- source object key;
- source hash;
- recipe/version;
- product/placement id;
- priority and trace identifiers.

It should never contain image bytes/base64.

### Batch 009 status

Stronger conclusions:
- PSD/PSB support must be capability-aware;
- durable mockup artifacts must be copied out of temporary provider URLs;
- provider APIs stay behind versioned adapters;
- browser wide-gamut/float pixels remain preview-only;
- pixel-exact QA is server-side;
- artwork complexity metrics can improve deterministic routing;
- Cloudflare Workers are best used for orchestration/streaming, not the whole heavy prepress engine.

Still intentionally no storefront merge, deployment, or protected Home/Mockup changes.


## Research Batch 010 — durable orchestration, object-event integrity, storage retention and upload privacy

The verified corpus has reached 203 individually opened/read unique pages.

### Cloudflare Workflows is now a serious orchestration candidate

Current Workflows documentation supports:
- durable multi-step execution;
- per-step automatic retries;
- persisted state;
- sleeping/waiting for external events;
- instance lifecycle/status inspection;
- step-level observability;
- streamed step results;
- configurable CPU/retry/step limits.

The strongest architectural use is orchestration, not heavy image processing.

Recommended split:
1. Worker receives authenticated request and creates upload/job.
2. R2 stores immutable source.
3. object-create event or explicit trigger starts a Workflow.
4. Workflow records inspection result and dispatches heavy CPU/GPU work to a suitable processing service/consumer.
5. Workflow waits for processing result.
6. user approval is represented as an external event.
7. Workflow publishes the approved artifact only after approval.

This matches the required human-in-the-loop DTF flow very well.

### Workflow steps must remain idempotent

Cloudflare's Rules of Workflows explicitly warns that steps can be retried and recommends idempotent API/binding calls.

For DTF Smart Prep:
- source ingestion step uses sourceHash/jobId as an idempotency key;
- output creation must not silently produce multiple competing masters on retry;
- approval transition must be compare-and-set / state-validated;
- external provider calls need a provider request key when supported;
- repeated events should be safe.

### Workflow limits confirm that image bytes should live in R2

Current limits impose finite per-step result/persisted-state budgets, while the docs recommend storing very large/long-lived binaries in external storage and returning references.

Therefore Workflow state contains:
- artifact IDs;
- object keys;
- hashes;
- dimensions/profile/preflight metadata;
- provider/task IDs;
- status/progress.

It does not persist full print images as ordinary serialized step state.

### R2 event notifications can remove polling after upload

R2 object-create notifications can fire for PutObject/CopyObject/CompleteMultipartUpload and send object key, size, eTag and event time to a Queue.

This enables:
direct/multipart upload -> R2 object-create event -> validation/preflight orchestration.

Important safeguard:
- the event is a trigger, not proof of validity;
- handler re-opens the object, verifies signature/header, and computes our own cryptographic source hash before acceptance.

### R2 consistency helps deterministic post-upload startup

R2 documents strong read-after-write consistency once an upload completes, including completed multipart uploads.

That means a post-upload event handler can fetch the completed object without designing around ordinary object-storage stale-read assumptions.

However cached public delivery has separate cache semantics, reinforcing why the private source path and public preview path should be separate.

### Retention policy should differ by artifact class

R2 supports object lifecycle policies and bucket locks.

Suggested classes:
- ORIGINAL_SOURCE: protected/long retention; never auto-deleted while referenced by an active design/order.
- APPROVED_PRINT_MASTER: protected/long retention.
- DISPLAY_ASSET: retained while published.
- TEMP_UPLOAD_PARTS: short lifecycle.
- FAILED_JOB_INTERMEDIATE: short lifecycle.
- PREVIEW_DERIVATIVES: regenerable and eligible for cleanup.
- AUDIT/PREFLIGHT_JSON: retained with source/master linkage.

Bucket locks may be useful for immutable production/audit records, but applying them broadly would make normal cleanup and user deletion difficult. Use selectively, not as a blanket setting.

### Storage durability does not replace application backup/version rules

R2 documents very high durability and synchronous persistence semantics, but also explicitly distinguishes durability from accidental/intentional deletion.

Therefore:
- immutable/versioned object keys remain required;
- never overwrite a production master in place;
- approval points to an exact version/hash;
- admin deletion policy remains an application-level control.

### Data Access Logs are useful but not a complete audit ledger

R2 Data Access Logs are best-effort/asynchronous and omit some failed requests. Audit Logs focus on configuration changes rather than object data access.

Therefore DTF Studio still needs its own authoritative business audit events for:
- master selection;
- processing recipe;
- approval/rejection;
- publish/unpublish;
- production download;
- destructive deletion.

Provider/storage logs supplement, but do not replace, application audit.

### Direct Creator Upload is convenient, but R2 remains better for print masters

Cloudflare Images can issue one-time creator upload URLs and private delivery variants. It is attractive for display/customer-preview images.

But current hosted Images upload limits are much smaller than R2's object/multipart capabilities and are oriented toward optimized image delivery.

Recommended split:
- R2: original/source/print candidate/master and high-resolution processing artifacts.
- Cloudflare Images or R2+Image Transformations: public display/thumbnail/mockup derivatives.
- do not upload the authoritative master into an optimization product and then treat the transformed delivery copy as production truth.

### Cloudflare Images privacy behavior affects ID design

Cloudflare notes that custom image IDs/paths have restrictions with signed/private delivery in some upload modes, while private images use signed URL tokens.

Therefore internal IDs and public delivery IDs should not be assumed to be the same.
Keep an internal immutable artifact ID and map it to any delivery-provider identifier.

### Flexible variants have a privacy caveat

Cloudflare documents that flexible variants cannot be used for images that require signed delivery URLs.

This matters for our preview design:
- public storefront images can use flexible optimization;
- private designer/source previews may need predefined private variants or Worker-mediated transformation instead of relying on flexible variants.

### Queue concurrency should be resource-aware

Cloudflare Queues autoscaling can increase concurrent consumers based on backlog. That is good for metadata and network jobs, but dangerous if each consumer launches memory/GPU-heavy image work.

Policy:
- IO queue may autoscale broadly;
- CPU queue has bounded concurrency;
- GPU/AI queue concurrency tracks actual accelerator capacity;
- provider/API queue can cap concurrency to respect upstream limits.

### Queue metrics should become part of operational health

Cloudflare exposes backlog and consumer-concurrency metrics.

DTF operations dashboard should eventually track:
- queued jobs;
- oldest job age;
- processing latency p50/p95;
- failure/retry count;
- DLQ count;
- CPU/GPU worker saturation;
- provider error/rate-limit count.

This prevents "processing..." from becoming an unexplained customer state.

### Human approval maps naturally to workflow events

Workflows can wait for external events and later resume. For appearance-changing operations, this is a strong model:

PROCESS -> REVIEW_REQUIRED -> waitForEvent(approved/rejected/edit-requested) -> continue.

The event payload should carry:
- jobId;
- processedVersionId;
- actorId;
- action;
- timestamp;
- optional comment.

The workflow then validates that the approved version is still the current review candidate before promoting it.

### ImageDecoder streaming can help preview memory use

MDN's ImageDecoder constructor accepts ReadableStream input and transferable ArrayBuffers, with configurable color-space conversion and desired dimensions where the codec supports it.

This is useful for progressive/bounded browser previews, but remains feature-detected preview behavior only. Server-side deterministic decode remains authoritative.

### Batch 010 status

The architecture is converging further:
- R2 as authoritative private artifact storage;
- Cloudflare Worker as authenticated edge/orchestration entry;
- Workflows as a strong candidate for durable human-in-the-loop state orchestration;
- Queues for decoupled worker dispatch;
- external/isolated CPU-GPU processing for heavy operations;
- Images/transformations only for delivery derivatives;
- app-level immutable versioning/audit remains authoritative.

Still not locked:
- Workflows versus a database-driven state machine for every stage;
- exact external processing runtime;
- exact AI providers/models;
- exact private display delivery mechanism.

No storefront merge.
No deployment.
No protected Home/Mockup modification.


## Research Batch 011 — image-processing methods themselves

Per project direction, this batch shifts priority toward how the pixels are actually processed, not only upload/storage/orchestration.

### 1. Edge-preserving smoothing should replace generic blur for many repair tasks

OpenCV documents several edge-aware filters: bilateral, guided, domain-transform, adaptive-manifold, fast bilateral solver and fast global smoother.

DTF implication:
- Gaussian blur is acceptable for intentionally soft masks and low-frequency operations;
- median filtering is useful for isolated impulse/speck noise;
- bilateral/guided filtering is better when we want to smooth noise while preserving artwork boundaries;
- guided filtering is a particularly strong candidate for refining an alpha matte using the original RGB image as the guide.

Proposed alpha-refinement experiment:
1. obtain coarse alpha A0;
2. use original RGB or luminance as guide G;
3. guided-filter A0 -> A1;
4. clamp to [0,1];
5. preserve known foreground/background seeds;
6. compare edge leakage, halo and detail retention against morphology-only refinement.

### 2. Alpha matting is mathematically different from binary segmentation

OpenCV's alphamat module describes alpha matting as estimating foreground opacity in unknown trimap regions, where pixels may be mixtures of foreground and background.

This confirms a three-class view:
- definite foreground;
- definite background;
- unknown transition region.

For hair, smoke, glow, fur, anti-aliased typography and soft brushwork, the unknown region should not be collapsed to a binary mask.

DTF rule:
- segmentation answers "what belongs to the subject";
- matting answers "how much foreground coverage is in this edge pixel";
- edge-color decontamination answers "what foreground RGB should that partially transparent pixel contain".

These remain separate processing stages.

### 3. Background subtraction algorithms for video are mostly the wrong tool for uploaded artwork

OpenCV bgsegm methods such as MOG/GMG/CNT/LSBP rely on temporal/background history and are useful for video streams, not normal single uploaded artwork.

This is a valuable negative result: do not choose a technically available algorithm simply because it is named foreground/background segmentation.

### 4. Denoising must be classified by noise type and texture importance

The scikit-image denoising tutorials compare total variation, bilateral, wavelet and non-local means.

Observed method characteristics:
- Total Variation: preserves major edges but tends toward piecewise-flat/posterized regions when strong.
- Bilateral: smooths while preserving edges; good for moderate noise but can produce cartoon-like flattening if pushed.
- Wavelet: useful for noise distributed across frequency bands; BayesShrink is adaptive while a single universal threshold can oversmooth.
- Non-local Means: compares patches and can preserve repeated texture better than local smoothing, but costs more computation.

DTF routing proposal:
- logo/flat art: avoid general denoise unless diagnostic evidence says it is needed;
- scanned/photographic noisy art: NLM or wavelet candidate;
- slight speck noise: median/local morphology first;
- smooth gradients: avoid TV settings that create bands/posterization.

No denoiser should run automatically merely because the image is low resolution.

### 5. J-Invariance offers a way to tune denoising without a clean reference

scikit-image documents self-supervised J-invariant calibration for choosing denoising parameters from the noisy image itself.

This is useful because customers normally provide only one source image, not a clean ground-truth pair.

Potential advanced mode:
- estimate candidate noise level;
- evaluate a small bounded parameter grid using J-invariant self-supervised loss;
- select the least destructive candidate;
- still require quality gates around edge sharpness/text readability.

This is a better direction than arbitrary fixed "denoise strength = 50" defaults.

### 6. Sharpening should be diagnosis-driven, not a mandatory enhancement

Unsharp masking is:
  enhanced = original + amount * (original - blurred)

It can increase apparent edge contrast but cannot create genuine missing detail. Aggressive settings also create ringing/halos around high-contrast DTF edges.

Recommended sharpening policy:
- measure blur first;
- skip sharpening when blur metric is already acceptable;
- use a small radius for fine-edge recovery;
- cap overshoot around transparent/high-contrast boundaries;
- compare on black and white garment backgrounds;
- never label sharpening as "increase DPI".

### 7. Blur detection can become a real preflight metric

scikit-image exposes a no-reference perceptual blur metric in the range 0..1. This gives us a measurable signal instead of a vague "looks blurry" flag.

Use carefully:
- compare only under a fixed measurement configuration;
- establish thresholds experimentally on DTF artwork classes;
- combine with effective DPI, edge spread and text/line-art diagnostics.

Potential preflight status:
- SHARP_ENOUGH;
- SOFT_BUT_ACCEPTABLE;
- BLUR_RISK;
- UPSCALE_CANNOT_RECOVER_SOURCE_BLUR.

### 8. Deconvolution is a specialized repair tool, not a generic sharpen button

Richardson-Lucy deconvolution assumes a point-spread function and requires iterative tuning. It can be powerful for known blur but may amplify noise/artifacts when the blur model is wrong.

DTF policy:
- keep deconvolution out of normal auto mode;
- allow only as an advanced repair candidate when blur appears convolutional and a plausible PSF can be estimated;
- preserve the original and compare before/after.

### 9. Inpainting can repair small isolated defects, but should never silently invent major artwork

Biharmonic inpainting reconstructs masked regions using surrounding information.

Suitable DTF uses:
- tiny dust/scratch removal;
- filling pinholes after background cleanup;
- repairing very small isolated defects after an explicit mask.

Unsuitable default uses:
- reconstructing faces/text/logos;
- removing large objects automatically;
- replacing missing design content.

Appearance-changing inpainting requires explicit approval.

### 10. Difference-of-Gaussians can separate edge/detail bands from illumination/background variation

DoG subtracts two Gaussian-smoothed versions to form a band-pass response.

Potential uses:
- detect high-frequency detail/edges;
- suppress slow illumination/background gradients during diagnostic analysis;
- estimate whether line art contains enough edge energy;
- assist halo/edge-band diagnosis.

It should usually be diagnostic or a mask-building primitive, not a final visual filter.

### 11. Thresholding needs algorithm selection, not one fixed threshold

scikit-image distinguishes histogram/global methods from local methods and provides multiple threshold estimators.

For simple logos/scans:
- Otsu/Yen/Triangle/Isodata may work well on bimodal or structured histograms;
- local/adaptive methods work better with uneven backgrounds but cost more and may create fragmented masks.

Hysteresis thresholding adds a useful two-threshold concept:
- strong pixels above high threshold seed the result;
- weak pixels above low threshold survive only if connected to strong regions.

DTF use:
- preserving faint but connected line details while rejecting isolated noise;
- edge-mask construction;
- not for arbitrary photo segmentation.

### 12. Gamma/log/contrast operations should be explicit tone transforms

Gamma and logarithmic transforms change tonal mapping; histogram equalization and CLAHE redistribute contrast.

Important caution:
- global histogram equalization can over-amplify regions or destroy intended tonal relationships;
- CLAHE limits local contrast amplification and is safer in some uneven images, but can still emphasize noise;
- these operations change appearance and therefore should normally be suggested/previewed, not silently applied to customer artwork.

A professional UI should expose the reason for the suggestion, e.g.:
- LOW_CONTRAST_SOURCE;
- SHADOW_DETAIL_LOSS;
- LOCAL_CONTRAST_IMBALANCE;
- NOISY_LOW_CONTRAST — denoise before contrast enhancement.

### 13. Color difference metrics can objectively check whether processing changed artwork colors

scikit-image provides Lab conversion and Delta-E metrics including CIEDE2000 and CMC variants.

Potential QA gate:
- compare source vs processed colors in high-confidence opaque foreground regions;
- ignore pixels intentionally changed by user-approved color correction;
- calculate median/p95 Delta-E;
- flag unexpected color drift caused by resize/profile conversion/denoise/decontamination.

This is especially valuable because RGB channel numeric differences are not perceptually uniform.

### 14. Proposed image-processing router after this batch

A. Transparent clean artwork
- inspect alpha;
- transparent-bounds crop;
- edge-band/halo diagnostics;
- no background-removal model unless a problem is detected.

B. Transparent artwork with fringe/haze
- classify COLOR_FRINGE vs COVERAGE_LEAK;
- guided/edge-aware alpha refinement where useful;
- targeted foreground-color decontamination;
- low-alpha haze suppression only after preview.

C. Flat logo / line art on simple background
- histogram analysis;
- global/local threshold candidates;
- hysteresis for faint connected detail;
- morphology for specks/pinholes;
- optional vectorization.

D. Photo/product on complex background
- learned segmentation;
- trimap construction;
- alpha matting/refinement;
- RGB decontamination;
- optional denoise only if measured noise warrants it.

E. Noisy photographic artwork
- estimate noise;
- compare bilateral/wavelet/NLM candidates;
- preserve texture/edges;
- sharpen only after denoise and only if measured blur remains.

F. Soft/glow/smoke art
- preserve continuous alpha;
- no binary threshold by default;
- edge-aware matte refinement;
- optional halftone derivative, never forced.

G. Blurry/low-effective-DPI art
- distinguish source blur from insufficient pixel count;
- optional upscale addresses pixel count, not source blur;
- optional conservative sharpening/deconvolution only if diagnostics justify it;
- rerun effective-DPI and blur checks afterward.

### Batch 011 engineering conclusion

The core philosophy is now more specific:
- first DIAGNOSE the image defect;
- then choose the narrowest processing method that addresses that defect;
- compare before/after quantitatively and visually;
- preserve alpha/color/geometry invariants;
- store every appearance-changing result as a separate version;
- never chain generic denoise + sharpen + contrast + background removal on every upload.

This is still research. No storefront merge, no deployment, and no protected Home/Mockup changes.


## Research Batch 012 — deeper study of the image-processing methods themselves

The verified corpus now contains 241 individually opened/read unique pages. This batch continues the requested shift toward actual pixel-processing algorithms.

### 1. Denoising should have at least three technical families, not one slider

OpenCV's current denoising documentation exposes both Non-Local Means and TV-L1. The two methods have different assumptions:
- NLM searches for similar patches and averages them; it is strong when an image contains repeated local structures, but stronger filtering removes detail and costs more computation.
- TV-L1 is variational: it favors spatial smoothness while staying close to observed data; it can remove outliers while tending toward piecewise-smooth regions.

The router should therefore distinguish likely noise classes and texture importance before choosing a denoiser.

For color NLM, OpenCV converts to CIELAB and denoises luminance and chroma components separately. This is a useful design pattern: luminance detail and chroma noise should not necessarily share one strength parameter.

### 2. NL-Bayes is a meaningful advanced candidate for photographic art

IPOL's NL-Bayes improves on plain NLM by estimating a Gaussian model/covariance for groups of similar patches. This makes it a useful research candidate where repeated photographic texture must be preserved.

It is probably too expensive for a default synchronous path, but could be evaluated in an offline quality benchmark against:
- fast NLM;
- wavelet denoising;
- bilateral/guided filtering;
- modern learned denoisers.

### 3. Parameter-free or self-tuned denoising is preferable to arbitrary UI defaults

The IPOL parameter-free NLM work reinforces the idea that denoising strength can be derived from noise estimates/training rather than forcing customers to guess a number.

Combined with the previously studied J-Invariance, the product direction becomes:
- estimate noise/quality signals;
- generate a small bounded candidate set;
- choose a conservative candidate automatically only when confidence is high;
- otherwise show two or three preview choices.

### 4. Matting should use explicit known/unknown regions

Closed-form natural image matting models opacity in an unknown transition region using foreground/background constraints. This strengthens the trimap architecture for difficult hair/fur/smoke edges.

Proposed matte representation:
- definite foreground alpha = 1;
- definite background alpha = 0;
- unknown band solved/refined by matting;
- RGB foreground decontamination remains a separate step.

A segmentation model can create the first trimap by eroding/dilating its coarse mask:
- eroded core -> definite foreground;
- exterior beyond dilated mask -> definite background;
- band between them -> unknown.

### 5. Top-hat morphology is useful for defect detection, not only cleanup

White top-hat extracts small bright structures relative to their neighborhood. The complementary black top-hat concept can highlight small dark structures.

DTF diagnostic uses:
- detect tiny white residue/specks around a removed background;
- find pinholes or small detached artifacts;
- detect isolated dust-like defects before deciding whether morphology/inpainting is justified.

This should primarily produce a defect map; automatic removal depends on object size and whether the component is connected to meaningful artwork.

### 6. Butterworth frequency filtering gives a controlled frequency-domain diagnostic

Butterworth low/high-pass filtering exposes cutoff frequency and order, with padding needed to reduce DFT boundary artifacts.

Potential DTF uses:
- estimate how much of a design's visual energy is fine detail versus broad tone;
- distinguish coarse blur from missing high-frequency detail;
- create diagnostic high-frequency maps for edge/detail analysis.

It should not become a generic visual effect applied to masters.

### 7. Mean, percentile mean and bilateral mean reinforce content-aware smoothing

scikit-image's rank-filter examples show that ordinary mean smoothing affects both background and detail, while bilateral-style local means preserve higher-frequency structures better.

This supports a processing rule:
- use plain mean/box blur mainly for diagnostics or intentionally low-frequency masks;
- prefer edge-aware methods for actual artwork cleanup;
- never smooth text/logo edges simply because noise was detected elsewhere in the image.

### 8. FSR inpainting adds a frequency-domain repair option

OpenCV's xphoto FSR inpainting reconstructs missing pixels using a frequency-selective model. Compared with biharmonic inpainting, this gives us another specialized candidate for small damaged regions.

Policy remains strict:
- inpainting is allowed only on an explicit defect mask;
- small dust/scratch/pinhole repairs can be auto-suggested;
- faces, typography, logos and large missing regions require manual approval and should not be silently invented.

### 9. Ordered dithering is a strong first DTF halftone implementation

ImageMagick's ordered-dither documentation provides named threshold maps, including angled/orthogonal halftone patterns, and explicitly demonstrates dithering only the alpha channel.

This is very useful for DTF because we can preserve RGB while converting continuous alpha into dot occupancy.

V1 halftone candidate:
- operate on alpha only;
- selectable threshold map/cell size;
- keep RGB unchanged;
- calculate physical dot/cell size from effective DPI;
- reject settings that create dots below a configurable printer/process limit;
- save as a derivative, never overwrite normal master.

Floyd-Steinberg can also be tested, but its directional error-diffusion texture should not be assumed superior to ordered patterns for transfer printing.

### 10. Resampling must be benchmarked in both perceptual and alpha-edge terms

ImageMagick's Nicolas Robidoux resampling guidance highlights that filter choice, linear-light versus nonlinear-light processing, HDRI intermediate precision and negative-lobe filters all influence resize artifacts.

This suggests a benchmark matrix for DTF artwork:
- photo enlargement;
- logo enlargement;
- transparent anti-aliased text;
- thin white/black lines;
- glow/smoke alpha;
- downsample to web preview.

Metrics should include:
- edge overshoot/ringing;
- alpha halo width;
- Delta-E in opaque foreground;
- SSIM/PSNR only as supporting metrics;
- text/line continuity.

### 11. Niblack/Sauvola should be limited to locally varying backgrounds and line/text art

These methods calculate local thresholds from neighborhood statistics and are useful when illumination/background is uneven.

DTF uses:
- scanned lettering;
- photographed sketches;
- monochrome logos on nonuniform paper/background;
- recovery of dark lines without forcing one global threshold.

They are not general photo background-removal methods.

### 12. Edge-preserving filtering has several classes worth benchmarking

OpenCV ximgproc provides guided, joint bilateral, fast global smoother, L0 smoothing and rolling-guidance filters.

Potential roles:
- guided filter: refine alpha/masks using original RGB structure;
- joint bilateral: smooth one signal while respecting edges in a guide image;
- rolling guidance: remove small structures/noise while retaining strong edges;
- L0 smoothing: simplify strong structures, potentially useful diagnostically for logo/flat-art classification;
- fast global smoother: candidate for globally coherent edge-aware smoothing.

These need synthetic edge/halo tests before any automatic use.

### 13. Non-photorealistic detail enhancement is not a default "quality improvement"

OpenCV detailEnhance/edgePreservingFilter can make images look subjectively sharper or more stylized. But they intentionally alter appearance.

Therefore:
- edgePreservingFilter may be useful as a processing primitive in controlled cases;
- detailEnhance/stylization/pencilSketch are not automatic prepress fixes;
- any use of them belongs to an optional creative-edit path, not preflight correction.

### 14. White-balance algorithms are risky for designed artwork

OpenCV supports Gray-world, SimpleWB and learning-based white balance. Gray-world assumes average scene color should be gray, which can be reasonable for photographs but wrong for intentionally color-biased artwork.

Policy:
- never auto-white-balance logos/illustrations;
- for photographs, detect likely color cast and only suggest a correction;
- keep ICC/profile handling separate from photographic white-balance correction;
- measure resulting color drift and require approval for appearance-changing corrections.

### 15. Poisson/seamless local editing should stay out of the automatic master path

OpenCV's seamless cloning, local color change, illumination change and texture flattening are useful editing tools, but they can materially alter artwork. Texture flattening deliberately removes texture while preserving selected edges; illuminationChange modifies gradient fields.

These belong, if ever exposed, in an advanced/manual editing mode. They are not safe automatic DTF prepress operations.

### Batch 012 processing architecture update

The image-processing router is now better defined around measurable defect classes:
- NOISE -> NLM/wavelet/bilateral/NL-Bayes candidate path;
- BLUR -> blur metric -> conservative sharpen/deconvolution candidate;
- BACKGROUND -> segmentation -> trimap -> matting -> decontamination;
- SPECKS/PINHOLES -> top-hat/component analysis -> morphology/inpainting;
- UNEVEN SIMPLE BACKGROUND -> Sauvola/Niblack/local threshold;
- ALPHA SOFTNESS -> preserve continuous alpha -> guided/matting refinement;
- HALFTONE NEED -> alpha-only deterministic threshold-map derivative;
- COLOR CAST PHOTO -> optional white-balance suggestion;
- COLOR PROFILE -> explicit ICC transform, separate from white balance;
- LOW EFFECTIVE DPI -> resample/upscale path, not sharpen masquerading as resolution.

No final algorithm stack is locked yet. No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 013 — image-quality metrics, super-resolution gating, background estimation and segmentation diagnostics

The verified corpus now contains 261 individually opened/read unique pages.

### 1. Super-resolution must be benchmarked per artwork class, not treated as universally better than interpolation

OpenCV's dnn_superres documentation exposes EDSR, ESPCN, FSRCNN and LapSRN, while its benchmark tutorial compares them against bicubic, nearest-neighbor and Lanczos using PSNR, SSIM and runtime.

The benchmark evidence shows a real quality/speed trade-off: higher-quality neural models can be substantially slower, and the ranking varies by scale and image content.

DTF implication:
- choose an upscale model only after classifying the artwork;
- compare at the exact scale actually needed for the target print area;
- include conventional Lanczos/bicubic baselines because a neural model is not automatically the best choice for logos, text or synthetic graphics;
- keep model name/version/scale in the processing recipe.

### 2. Multi-output super-resolution can avoid redundant inference when several scales are needed

LapSRN multi-output can produce intermediate 2x/4x/8x-style outputs in one forward pass.

Potential use:
- generate candidate scales once;
- evaluate which candidate reaches the required effective DPI with the least visual change;
- avoid automatically selecting the largest output just because it exists.

### 3. PSNR and SSIM are useful but insufficient as standalone DTF quality metrics

scikit-image's metrics documentation and SSIM tutorial demonstrate that images with similar MSE can have substantially different perceived structural quality.

DTF QA should combine:
- SSIM for structural change;
- PSNR as a simple distortion measure;
- Delta-E for color drift;
- alpha-edge metrics for halo/coverage changes;
- OCR/text or line-continuity checks for small typography/line art;
- effective DPI and physical print size.

A high SSIM does not guarantee correct transparency or correct print color.

### 4. Use local quality maps, not only global scores

SSIM can return a full similarity image/map.

That is useful for DTF because a global score can hide a severe local defect on a logo edge, small text, face or transparent boundary.

Proposed QA:
- compute a weighted SSIM/edge-difference map;
- emphasize opaque foreground and the alpha transition band;
- report localized warnings such as TEXT_EDGE_CHANGED or ALPHA_EDGE_CHANGED.

### 5. Canny is a good diagnostic edge map, not a master-processing filter

The Canny pipeline smooths noise, computes gradients, performs non-maximum suppression and hysteresis thresholding.

Useful roles:
- compare edge preservation before/after denoise/upscale;
- estimate line continuity;
- build an edge band for halo analysis;
- detect whether a sharpen step created new ringing/double edges.

It should not be applied to the final artwork itself.

### 6. Segmentation quality needs metrics of its own

scikit-image's segmentation metrics distinguish region-level errors from ordinary pixel/image similarity.

For our background-removal benchmark, create a curated validation set with ground-truth masks and measure:
- boundary accuracy;
- false foreground/background area;
- Hausdorff/boundary displacement where relevant;
- connected-component damage;
- alpha-aware error in the transition band.

This is stronger than ranking models only by visual impression.

### 7. Chan-Vese is useful when the object/background differ by region statistics even when edges are weak

Chan-Vese segments based on region energy rather than relying exclusively on a strong gradient boundary.

Possible niche use:
- flat/illustrative art with weak but consistent foreground/background intensity difference;
- assisted repair of coarse masks;
- not a universal natural-photo background remover.

### 8. Morphological snakes remain attractive as a deterministic refinement tool

The scikit-image segmentation family shows morphological active-contour approaches can evolve boundaries using morphology rather than a floating-point PDE solver, offering numerical stability and useful behavior on noisy/partially visible contours.

Potential flow:
coarse mask -> morphological contour refinement -> alpha matting transition band.

This remains a refinement option, not the default for every upload.

### 9. Rolling-ball background estimation is a useful deterministic tool for photographed/scanned artwork

Rolling-ball estimates a slowly varying background surface.

DTF uses:
- remove uneven paper illumination from photographed sketches/lettering;
- estimate background before local thresholding;
- separate slow lighting gradient from actual dark/light artwork features.

Important restriction:
- this is background-intensity correction, not semantic object removal;
- always preview because broad tonal gradients may be intentional artwork.

### 10. Image pyramids can make diagnostics and processing more efficient

Gaussian/Laplacian pyramids provide multi-scale representations.

Potential uses:
- run coarse segmentation/background analysis at low resolution;
- refine edges at higher levels;
- estimate detail loss across scales;
- accelerate expensive search/diagnostics;
- create scale-aware blur/detail metrics.

This supports the existing principle: inference resolution and production resolution are separate.

### 11. Windowing matters for any frequency-domain diagnostic

The scikit-image FFT-window tutorial shows that image boundaries create spectral leakage because FFT assumes periodicity.

Therefore if we use frequency-domain blur/detail analysis, Butterworth/DoG comparisons or spectral noise estimation:
- apply a suitable window before FFT-based metrics;
- otherwise strong horizontal/vertical artifacts from the image boundary can mislead the classifier.

### 12. Local entropy is a useful routing feature

Local entropy measures neighborhood complexity and can distinguish low-texture flat regions from highly textured/photo regions.

Proposed classifier features:
- entropy percentiles;
- dominant-color count;
- edge density;
- gradient orientation distribution;
- connected-component count;
- alpha coverage statistics.

These help decide whether an image is more like a logo/line-art asset or photographic art before selecting denoise/vectorization/segmentation behavior.

### 13. Attribute morphology can preserve long/thin structures better than fixed-footprint closing

Connected/attribute operators such as diameter closing use shape/extent attributes rather than a single fixed structuring element.

This is promising for DTF line art because a thin but long stroke should not be removed merely because its local thickness is small.

Potential use:
- remove isolated specks while preserving long thin typography strokes;
- fill small holes without destroying narrow connected shapes;
- compare against ordinary morphology in the synthetic test suite.

### 14. Resizing needs a specific anti-aliasing policy for downsampling

scikit-image explicitly demonstrates that downsampling without anti-aliasing causes aliasing, while Gaussian pre-smoothing avoids it.

Rules:
- web/display derivative: anti-alias when reducing size;
- logo/pixel art: allow a content-specific path if hard-grid preservation is intentional;
- print master: do not downsample unless an explicit product/export rule requires it.

### 15. Sharp and OpenImageIO confirm practical operation-level safeguards

The reviewed operation docs reinforce several implementation choices:
- median filtering is good for compact high-frequency defects without globally blurring edges;
- unsharp-mask threshold can avoid sharpening low-contrast noise;
- OpenImageIO separates high-quality resize from fast lower-quality resample;
- color conversion can explicitly unpremultiply/repremultiply alpha;
- morphology primitives can build open/close/gradient/tophat operations deterministically.

These should be exposed internally as recipe primitives, not as a customer-facing wall of technical controls.

### Batch 013 updated method-selection principle

For every uploaded image, the engine should first build a diagnostic vector before choosing any fix:
- source format/profile/alpha;
- effective DPI by product placement;
- blur score;
- estimated noise;
- edge density and edge continuity;
- local entropy/texture complexity;
- dominant colors;
- alpha histogram and transition-band width;
- background flatness/illumination gradient;
- connected-component statistics;
- likely artwork class.

Only then should it propose or run the narrowest correction path.

No storefront merge, deployment, or protected Home/Mockup changes.


## Research Batch 014 — edge-aware refinement, topology QA, proofing, and DTF white-ink behavior

The verified corpus now contains 271 individually opened/read unique pages.

### Edge-aware refinement can use confidence, not only a mask

OpenCV's Fast Bilateral Solver accepts a guide image, the signal to be smoothed, and a separate confidence map. This is especially interesting for alpha refinement.

Possible DTF use:
- source RGB as guide;
- coarse alpha as the signal;
- confidence = high in definite foreground/background and low in unknown transition band;
- solve a smooth matte that respects image edges.

This creates a more principled refinement path than uniformly blurring a mask.

### Fast Global Smoother is useful when the matte must stay globally coherent

The Fast Global Smoother can regularize a signal while respecting a guide image. It is a candidate for:
- smoothing uneven alpha noise;
- maintaining a coherent broad matte;
- avoiding isolated local corrections that create visible seams.

It still requires comparison against guided/bilateral/matting methods because aggressive regularization can flatten fine transparent detail.

### Ximgproc confirms a useful deterministic toolkit

The current OpenCV ximgproc module includes:
- anisotropic diffusion;
- edge-preserving filter;
- Niblack/Sauvola/Wolf/NICK local thresholding;
- Zhang-Suen and Guo-Hall thinning.

This supports a deterministic fallback toolbox for:
- noisy scans;
- line-art cleanup;
- topology measurement;
- local thresholding on uneven simple backgrounds.

These are routed by diagnosis, not chained by default.

### Ridge filters can detect elongated thin structures

scikit-image's Frangi/Sato/Meijering/Hessian ridge filters are designed to enhance elongated ridge-like structures at multiple scales.

For DTF these can be used diagnostically on:
- thin decorative strokes;
- fine line art;
- narrow Arabic/Latin calligraphy features;
- very thin contours vulnerable to background-removal or downsampling damage.

They are not a default visual enhancement; they are a QA/detection primitive.

### Gamut checking should be treated as a warning layer, not a color-changing auto-fix

Little CMS documents gamut checking and soft proofing as distinct operations.

DTF Studio should use gamut checking to flag colors that the selected proof/printer profile may not reproduce, while leaving the source master unchanged.

Suggested status:
- IN_GAMUT;
- NEAR_GAMUT_BOUNDARY;
- OUT_OF_GAMUT_PREVIEW_WARNING.

The actual rendering intent/profile transform remains an explicit operation.

### Soft proofing needs a selected output profile and display transform

Little CMS tooling reinforces that soft proofing means simulating a target output device on a display; it is not just converting an image to CMYK.

Therefore:
- select an output/printer profile;
- apply proof transform + display transform;
- mark the result as an approximation;
- never store the proof image as the authoritative print master.

### DTF white ink needs multiple independent controls

CADlink and Caldera documentation reinforce that white ink behavior can include:
- underbase strength;
- highlight white;
- maximum white ink;
- choke;
- halftone frequency and angle;
- hole size;
- varying hole size with transparency;
- opacity-sensitive/adaptive white;
- low-opacity cleanup to reduce halos.

This means the DTF preview model should expose these as separate internal parameters rather than one generic "white layer" slider.

### Halftone frequency must be treated as a physical print parameter

CADlink describes halftone frequency in Lines Per Inch (LPI) and angle as a rotation of the halftone cell.

For our engine:
- LPI must be connected to effective output resolution;
- a physical minimum dot/hole size must be validated;
- preview must show the chosen pattern at realistic zoom;
- halftone remains a derivative, never an overwrite of the normal master.

### Semi-transparent areas need a deliberate policy

Both CADlink and Caldera offer controls that decide whether semi-transparent pixels stay proportional, are treated as opaque, or are modified by transparency-sensitive rules.

Therefore the engine must not silently decide this globally.

Required recipe field:
semiTransparentPolicy = preserve | opaque_for_white | thresholded | halftone

Default should be preserve unless the selected production profile or user-approved workflow requires otherwise.

### White-ink and color logic must remain distinct

Coverage underbase may depend on grayscale/color values while transparency separately determines where ink should exist.

This strengthens the three-signal model:
1. foreground color;
2. continuous alpha/coverage;
3. derived white-ink response.

The third signal may use both color and alpha, but must be reproducible from an explicit recipe.

### Batch 014 conclusion

The processing engine is converging toward:
- confidence-aware alpha refinement;
- topology/line preservation metrics;
- optional gamut/proof warnings;
- explicit physical halftone parameters;
- separate semi-transparent policy;
- separate color, coverage, and white-ink response.

No storefront merge, deployment, or protected Home/Mockup change.


## Research Batch 015 — structural preservation, adaptive contrast, edge-aware smoothing, and proofing discipline

The verified corpus now contains 292 individually opened/read unique pages.

### 1. Edge-aware filters need parameter guards because they can easily over-simplify artwork

OpenCV ximgproc exposes guided, joint bilateral, domain transform, adaptive manifold, fast global smoother, fast bilateral solver, rolling guidance, L0 smoothing, and bilateral texture filtering.

These are not interchangeable. The most useful production rule is to expose them as internal recipe primitives with bounded parameter ranges and route by defect type.

Examples:
- alpha/matte refinement: guided or fast bilateral solver with confidence;
- photographic noise: bilateral/domain-transform candidates;
- texture suppression for diagnostics: bilateral texture or rolling guidance;
- strong structural simplification: L0 only for classification/preview, not automatic master editing.

### 2. Structure-preserving texture filtering can help separate noise/texture from meaningful edges

The ximgproc bilateral texture filter explicitly targets texture while preserving structure. This is valuable for determining whether a region is likely photographic texture versus a meaningful contour.

Potential diagnostic:
- compare original against texture-smoothed result;
- residual = high-frequency texture map;
- use residual energy to estimate texture complexity;
- do not automatically subtract that residual from the master.

### 3. Sobel and Scharr should underpin edge-quality metrics

Sobel combines smoothing and differentiation; Scharr gives better 3x3 rotational accuracy.

For DTF QA:
- compute gradient magnitude/orientation before and after processing;
- compare edge energy and edge spread;
- detect double edges after aggressive sharpening/upscale;
- detect lost edge segments after denoise/background removal.

Use signed/float derivatives internally; visualization copies may be 8-bit.

### 4. Hough transform can protect long straight design elements

The Hough line transform is useful for detecting persistent straight strokes from an edge map.

DTF-specific use:
- compare long line count/orientation before and after processing;
- protect borders, frames, underlines, geometric logo elements and thin straight typography strokes;
- flag a processing candidate that shortens or fragments a long structural line.

This is a QA signal, not a visual filter.

### 5. Directional morphology is valuable for line-art repair masks

The OpenCV morphology-line tutorial uses custom horizontal/vertical structuring elements to extract line features.

For artwork repair:
- detect damaged horizontal/vertical strokes;
- create candidate repair masks for breaks smaller than a bounded physical width;
- never repair broad photographic regions with this method.

### 6. Thresholding must remain conditional on background statistics

OpenCV's fixed threshold operators are simple and deterministic, but are only suitable when foreground/background intensities are meaningfully separable.

Router rule:
- flat/simple background -> test global threshold families;
- nonuniform background -> local/adaptive threshold or rolling-background correction first;
- complex photo -> semantic segmentation/matting, not thresholding.

### 7. Connected components become an important post-segmentation audit

OpenCV structural analysis provides connected-component labeling with configurable connectivity and algorithms.

Use after mask generation to compute:
- number of foreground islands;
- area distribution;
- tiny detached residue;
- newly disconnected design parts;
- unexpectedly merged components.

This helps differentiate legitimate detached elements from background-removal debris.

### 8. Contours, hulls and moments can quantify visual geometry preservation

OpenCV contour analysis provides area, perimeter, centroid, bounding boxes and convex hull.

For a processed transparent artwork version, compare against source-derived foreground geometry:
- centroid shift;
- bounding-box drift;
- area change;
- perimeter change;
- convex-hull area and solidity change.

Large geometry changes should block auto-approval unless the user explicitly requested crop/removal.

### 9. Visual centering should use mass/contour information, not only rectangular bounds

Image moments provide a foreground centroid independent of the bounding-box center.

For mockup placement, use both:
- geometric bounding-box center;
- visual/mass centroid.

A large asymmetrical design may look centered when the visual centroid, rather than the outer rectangle, is aligned to the product print area.

### 10. Bounding boxes are useful but should be derived after noise filtering

If one stray low-alpha pixel remains far from the artwork, a naive bounding box becomes too large.

Recommended sequence:
- alpha threshold for diagnostic bounds;
- connected-component cleanup rules;
- retain legitimate detached components based on area/distance/content;
- compute transparent bounds and placement bounds separately.

### 11. Laplacian is useful for blur/ringing diagnostics but is noise sensitive

The Laplacian is a second-derivative operator and responds strongly to high-frequency transitions.

Potential metrics:
- variance/energy of Laplacian as one blur indicator;
- overshoot/ringing detection after sharpen/upscale;
- compare only under fixed scale/color preprocessing.

Never rely on a Laplacian score alone; noise can artificially increase it.

### 12. Histogram equalization and CLAHE must remain appearance-changing suggestions

Global histogram equalization remaps intensity distribution across the full image. CLAHE operates locally and limits contrast amplification.

Important implementation detail: scikit-image exposure documentation notes that its CLAHE path for RGBA removes alpha during processing, so production code must explicitly preserve and restore alpha rather than passing RGBA blindly through a contrast function.

For DTF:
- run contrast operations on a controlled color/luminance representation;
- preserve alpha independently;
- compare Delta-E and local edge quality afterward;
- require approval for material appearance changes.

### 13. Bilateral filter has a clear failure mode: cartoon-like flattening

OpenCV notes that large bilateral sigma values can make the result strongly smoothed/cartoon-like.

Therefore parameter limits should depend on artwork class and texture metrics. A photographic design should not be auto-processed with aggressive bilateral smoothing merely to reduce noise.

### 14. Histogram comparison can become a lightweight global-change detector

OpenCV exposes correlation, chi-square, intersection, Bhattacharyya/Hellinger and KL-style histogram comparisons.

Possible QA:
- compare opaque-foreground luminance/chroma histograms before/after processing;
- use as a fast warning for large tonal/color redistribution;
- never substitute histogram similarity for spatial/edge/color metrics.

### 15. ICC profile inspection should be separated from proofing and conversion

Little CMS tools reinforce three distinct operations:
- inspect profile structure/tags/curves/CLUTs;
- perform gamut checking/soft proofing;
- perform actual color conversion.

The DTF tool should preserve the original profile, record profile identity/hash, and only perform an explicit conversion when a production recipe requires it.

### 16. Soft proofing must be an explicitly labeled preview

The Little CMS Abstractor manual describes soft proofing as simulating a target output device on a display using profiles and a rendering intent.

Therefore:
- proof image is a display artifact;
- source/master remains unchanged;
- proof requires selected output profile + display profile + rendering intent;
- proof is not guaranteed physical print identity.

### 17. Proposed geometric integrity block

Add a reusable GeometryIntegrityReport to each processed candidate:
- foregroundAreaRatio;
- boundingBoxDelta;
- centroidDeltaNormalized;
- perimeterRatio;
- componentCountDelta;
- tinyIslandCount;
- hullAreaRatio;
- solidityDelta;
- longLineRetention;
- edgeEnergyRatio.

For text/logo/line-art, thresholds should be stricter than for photographic art.

### Batch 015 conclusion

The image processor is converging toward a two-stage decision system:
1. visual defect diagnosis (noise, blur, background, alpha, contrast, color, geometry);
2. structural integrity validation after every candidate transformation.

A candidate can look cleaner and still fail if it breaks topology, shifts geometry, loses thin strokes, changes color materially, or damages alpha edges.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 016 — alpha-color separation, trimap quality, topology-aware cleanup and physically safer edge processing

The verified corpus now contains 312 individually opened/read unique pages.

### 1. A correct alpha matte is not enough: foreground color must also be estimated

PyMatting explicitly demonstrates that simply multiplying the original RGB image by an alpha matte can produce color bleeding/halos when the source edge contains background contamination.

The more correct model is:
I = alpha * F + (1 - alpha) * B

where F and B are estimated foreground/background colors.

DTF implication:
- remove-background stage must output both alpha coverage and an estimated clean foreground color near transition pixels;
- the source RGB should remain immutable;
- the transparent production candidate should combine estimated foreground RGB with the recovered alpha, not merely reuse contaminated source edge RGB.

This directly targets the familiar white/colored halo problem.

### 2. Edge decontamination should therefore be a first-class processing stage

A practical DTF background-removal pipeline should now explicitly separate:
1. semantic/coarse foreground segmentation;
2. trimap construction;
3. alpha estimation in unknown pixels;
4. foreground-color estimation;
5. edge-color decontamination;
6. structural QA;
7. underbase derivation.

This is stronger than treating "remove background" as one black-box model call.

### 3. Different alpha-matting solvers have different computational behavior

PyMatting currently includes Closed Form, Large Kernel, KNN, Shared Matting and other approaches.

Engineering use:
- do not expose algorithm names to normal customers;
- benchmark solvers on our own DTF edge classes;
- route by image complexity and unknown-band size;
- keep a deterministic fallback if an AI matte is uncertain.

Large Kernel Matting is attractive when broad neighborhoods help, while KNN matting uses similarity relationships in feature space. Shared Matting explicitly gathers foreground/background samples and refines them.

### 4. Unknown-band width should be adaptive, not fixed

Trimap construction is critical. Too narrow an unknown band locks in segmentation mistakes; too wide a band wastes computation and may destabilize foreground/background estimation.

Proposed adaptive trimap:
- start from coarse probability mask;
- erode by an inward physical radius to form definite foreground;
- dilate outward by a possibly different physical radius for definite background;
- use edge complexity, local alpha confidence and source resolution to determine unknown-band width;
- store both radii in physical units and pixels.

For hair/smoke/fur/soft glow, allow a wider unknown band than for hard logo edges.

### 5. Trimap repair needs explicit threshold rules

PyMatting's utilities include trimap normalization/fixing using lower and upper thresholds.

For our engine:
- trimap values near 0 become definite background;
- values near 1 become definite foreground;
- uncertain mid-range becomes unknown;
- thresholds are recipe/versioned parameters;
- never silently reuse arbitrary segmentation probabilities as final alpha.

### 6. Foreground estimation can be multi-scale

PyMatting's multi-level foreground estimator uses small-scale and large-scale iterative stages and has CPU plus GPU-oriented implementations for foreground estimation.

This supports a useful architecture:
- compute/refine alpha at a bounded working resolution when necessary;
- estimate foreground color multi-scale;
- project/refine the result against original-resolution RGB;
- preserve output at production resolution.

### 7. Foreground-estimation QA should focus on transition pixels

The foreground-estimation evaluation work scores errors specifically in the region where 0 < alpha < 1, using SAD, MSE and gradient error.

This is exactly where DTF halos live.

Our benchmark should weight:
- alpha transition band;
- foreground RGB error in that band;
- gradient continuity;
- compositing error on black, white and neutral backgrounds.

Opaque interior pixels should not dominate the score.

### 8. Use multiple compositing backgrounds during QA

A contaminated edge can look acceptable on one background and fail badly on another.

Mandatory preview test set:
- black garment;
- white garment;
- neutral gray;
- checkerboard/transparency;
- optionally a saturated diagnostic background.

A processed candidate should be evaluated across all of them before automatic approval.

### 9. Morphological operations must be chosen by defect type

OpenCV's morphology documentation makes the distinctions clear:
- opening removes small bright structures;
- closing fills small dark gaps;
- morphological gradient extracts an outline band;
- top-hat extracts small bright structures relative to background;
- black-hat extracts small dark structures;
- hit-or-miss finds specific binary neighborhood patterns.

DTF mapping:
- speck residue -> opening/component logic;
- pinholes -> closing/remove-small-holes;
- edge band -> morphological gradient;
- local residue diagnostics -> top-hat/black-hat;
- line-junction pattern checks -> hit-or-miss/thinning-related logic.

Do not use one morphology operation as a universal cleanup filter.

### 10. Area/diameter operators can preserve long thin artwork better than fixed kernels

scikit-image's area/diameter morphology removes components based on area or bounding-box extension rather than only a fixed structuring element.

This is particularly valuable for typography:
- a very thin but long stroke may have low local thickness but high structural importance;
- diameter-based operators are less likely to delete it than a naive fixed-radius opening.

This should be benchmarked on Arabic calligraphy, thin Latin fonts, borders and ornamental lines.

### 11. Medial-axis distance gives a direct estimate of local stroke width

scikit-image's medial_axis can return both the skeleton and the distance transform.

Approximate local stroke width can be derived from twice the distance-to-boundary along the skeleton.

For DTF preflight:
- estimate minimum meaningful stroke width in pixels;
- convert to millimeters using effective DPI;
- compare before/after processing;
- warn if cleanup/halftone/choke reduces a critical stroke below the selected process limit.

This is substantially better than a generic "thin lines detected" warning.

### 12. Connected-component statistics strengthen debris-vs-design decisions

OpenCV connectedComponentsWithStats provides:
- component area;
- bounding box;
- centroid;
- connectivity choices.

Use after alpha thresholding to classify:
- tiny isolated debris;
- legitimate detached punctuation/dots;
- separated logo elements;
- new fragmentation introduced by processing.

Removal policy must consider size, distance, context and artwork class, not area alone.

### 13. Morphological gradient and distance transform form a useful edge coordinate system

Combine:
- signed/continuous alpha;
- binary diagnostic mask;
- morphological gradient for boundary band;
- distance transform for inward/outward distance.

This enables operations such as:
- choke by physical distance;
- spread by physical distance;
- edge-only decontamination;
- edge-weighted quality metrics;
- low-alpha haze suppression limited to a narrow band.

### 14. Physical-unit morphology should be the default internal representation

A 2-pixel erosion means different real dimensions at 150, 300 and 600 PPI.

Recipe parameters should therefore prefer:
- chokeMm;
- spreadMm;
- minStrokeMm;
- edgeBandMm;
- maxSpeckAreaMm2 where practical.

Pixels are derived at execution time from the actual artifact resolution.

### 15. Alpha estimation should be benchmarked separately from foreground-color estimation

A model can produce an excellent alpha boundary but still leave contaminated RGB along that boundary.

Benchmark dimensions should therefore include:
- matte accuracy;
- foreground RGB accuracy;
- compositing error;
- topology preservation;
- runtime/memory.

This prevents choosing a background-removal method solely because the cutout silhouette looks good.

### Batch 016 architecture update

The background-removal subsystem now has a clearer internal contract:

Input:
- immutable source RGB/profile;
- coarse segmentation probability or mask;
- processing resolution;
- optional user hints.

Outputs:
- alpha matte;
- foreground RGB estimate;
- optional background estimate;
- diagnostic trimap;
- edge confidence map;
- compositing previews;
- structural QA report;
- processing recipe/model/version.

Only after these outputs pass quality gates should an artifact become a candidate transparent master.

No storefront merge, no deployment, and no protected Home/Mockup modification.


## Research Batch 017 — practical alpha-matting implementations, foreground reconstruction, high-resolution refinement, and premultiplied-alpha discipline

The verified corpus now contains 333 individually opened/read unique pages.

### 1. The production cutout should be modeled as foreground color plus alpha, not alpha alone

Closed-form matting formalizes the compositing equation as an underdetermined per-pixel problem involving foreground color, background color, and opacity. Practical implementations such as FBA Matting and closed-form-matting expose foreground/background reconstruction in addition to alpha.

This strengthens the DTF rule:
- segmentation gives object membership;
- matting gives fractional coverage;
- foreground reconstruction/decontamination gives the RGB that should exist at semi-transparent edge pixels;
- the final transparent artifact uses the reconstructed foreground RGB with the matte.

A visually good alpha with contaminated RGB can still create white or colored halos on garments.

### 2. Joint F/B/alpha prediction is a useful model family to benchmark

FBA Matting directly predicts:
- alpha;
- foreground RGB;
- background RGB.

Its implementation restores known trimap pixels after inference:
- definite background forces alpha to 0;
- definite foreground forces alpha to 1;
- fully foreground pixels copy source RGB into the foreground estimate;
- fully background pixels copy source RGB into the background estimate.

This is valuable for our benchmark because it naturally aligns with the desired output contract rather than requiring a separate foreground reconstruction algorithm after alpha prediction.

### 3. Trimap confidence and prior-aware solvers are useful for semi-automatic workflows

The closed-form-matting implementation supports:
- scribbles;
- trimap input;
- a prior plus prior-confidence.

This is important for our semi-automatic design: a coarse AI mask can be converted to a prior/confidence field, while user brush corrections or trusted interior/exterior regions become hard constraints.

The tool should preserve user-confirmed foreground/background regions across later refinement.

### 4. MatteFormer shows that trimap regions can be treated as global priors

MatteFormer represents foreground, background, and unknown trimap regions with prior tokens and carries that context through the transformer.

Engineering takeaway:
- the UNKNOWN band is not merely pixels to process locally;
- global context about the whole foreground/background can improve ambiguous edge decisions;
- our model-adapter interface should support trimap-conditioned models as a distinct capability class.

### 5. Semantic Image Matting suggests different edge types deserve different treatment

Semantic Image Matting explicitly separates matting-pattern semantics rather than assuming every unknown pixel behaves identically.

This supports our image-class router and suggests an edge-class router inside the matte:
- hair/fur;
- transparent material;
- net/fine structures;
- hard antialiased edge;
- motion/soft blur;
- glow/smoke.

Even if we do not deploy that exact model, the architectural lesson is useful: one global matte-refinement strength is too crude.

### 6. ViTMatte remains a strong trimap-based candidate, but the trimap is part of the contract

The official ViTMatte inference path consumes both the RGB image and a trimap.

Therefore a ViTMatte adapter would need:
- generated or user-edited trimap;
- explicit trimap resolution and thresholds;
- exact model/checkpoint version;
- quality validation after inference.

It should not be presented as a trimap-free background remover.

### 7. High-resolution matting should use coarse global inference plus selective full-resolution refinement

BackgroundMattingV2 is especially relevant architecturally. Its model:
- downsamples source/background for the base network;
- predicts coarse alpha, foreground, error, and hidden features;
- ranks or thresholds error regions;
- refines selected full-resolution patches;
- returns final alpha and foreground.

This is directly applicable to DTF uploads even though the original model uses a captured background.

Generalized DTF pattern:
1. coarse/global segmentation or matte at bounded resolution;
2. predict an uncertainty/error map;
3. identify only high-risk regions;
4. refine those regions against original-resolution RGB;
5. stitch/refine without altering low-risk regions.

This is much more efficient than forcing a large model over every source pixel.

### 8. Robust Video Matting demonstrates another resolution-aware refinement pattern

The RVM implementation supports a downsample_ratio and, when downsampling is used, applies either a deep-guided or fast-guided refiner.

It predicts a foreground residual and alpha, then reconstructs foreground as:
foreground = source + predicted_residual

This residual formulation is interesting for DTF edge recovery because it encourages the model to estimate corrections relative to the original source rather than synthesize all foreground color from scratch.

For still-image DTF we would benchmark this concept without the temporal recurrent state.

### 9. Refinement should be driven by uncertainty, not uniform high-resolution compute

BackgroundMattingV2 can refine:
- everywhere;
- a fixed number of pixels with highest predicted error;
- only pixels whose predicted error exceeds a threshold.

This maps well to our processing budget:
- low-risk opaque interior: do not spend expensive full-res inference;
- transparent/uncertain edge: refine;
- small text/line art: force high-priority refinement even if generic uncertainty is low;
- user-corrected region: force refinement/validation.

### 10. Index-aware upsampling matters for thin edges

IndexNet focuses heavily on the upsampling stage and reports meaningful gains from better learned indexing.

DTF implication:
- decoder/upsampling choice can materially affect one-pixel and subpixel edge structure;
- alpha upsampling is not a trivial final resize;
- our benchmark must include thin strokes, antialiased type, hair-like details, and small detached components when comparing models.

### 11. GCA reinforces the value of context propagation inside the unknown band

Guided Contextual Attention is trimap-based and designed to propagate contextual information to ambiguous matte regions.

Operational takeaway:
- difficult edge pixels should not be judged only from a tiny local neighborhood;
- global or nonlocal context can help when foreground/background colors overlap;
- this supports a two-level refinement design: local edge evidence plus broader object/context evidence.

### 12. Portrait-specific models must remain scoped

MODNet is optimized for real-time portrait matting. It is useful evidence for decomposing:
- low-resolution semantic branch;
- high-resolution detail branch;
- fusion branch.

But portrait scope is a capability constraint. It should not be routed to logos, mugs, artwork, vehicles, smoke, or arbitrary product graphics just because it is fast.

### 13. Premultiplied and straight alpha must be explicit in every resize/composite operation

Apple's Core Image and Accelerate documentation exposes explicit premultiply/unpremultiply operations and premultiplied-alpha compositing routines.

DTF rule:
- record alpha representation in the processing primitive;
- do color operations that require straight RGB only after unpremultiplication where appropriate;
- perform compositing with the expected representation;
- do not resize or filter RGBA blindly without deciding whether channels are straight or premultiplied.

Incorrect alpha representation is a direct source of dark/white fringe artifacts.

### 14. Black/white proofing should use the same alpha-compositing math as the final preview

The QA preview should composite the candidate over:
- black;
- white;
- neutral gray;
- checkerboard.

The compositing path must use the same alpha convention as the production artifact. Otherwise the QA preview itself can create or hide halos.

### 15. DTF underbase should be derived only after the transparent artwork is validated

The reviewed DTF underbase guide reinforces:
- solid versus screened white;
- choke as an inward mask adjustment;
- outline/spread as an outward adjustment;
- LPI/dot choices for soft-hand white;
- export of the white layer separately.

Therefore the order should remain:
validated color+alpha artifact -> underbase derivation -> choke/halftone preview.

Do not use the underbase mask to repair a bad alpha matte.

### 16. Licensing must be tracked at code, model, and training-data levels separately

Several matting projects have permissive code licenses while pretrained weights or the training dataset can have additional restrictions. Some repositories explicitly note that Adobe-derived pretrained assets are restricted to noncommercial use.

Provider/model registry fields should include:
- code license;
- model/weights license;
- training-data restrictions;
- commercial-use status;
- attribution obligations;
- source URL/version.

A model is not approved for production merely because its GitHub source is readable.

### 17. Recommended high-resolution matte strategy after this batch

Candidate architecture:
1. classify artwork and background-removal need;
2. generate coarse segmentation probability;
3. create adaptive trimap/confidence;
4. run bounded-resolution matte/foreground estimation;
5. derive uncertainty map;
6. force high-resolution refinement on uncertain alpha edges and topology-critical thin structures;
7. reconstruct/decontaminate foreground RGB in the transition band;
8. run geometry/topology/color/alpha QA;
9. composite on multiple diagnostic backgrounds;
10. only then save the transparent candidate and derive the white underbase.

### Batch 017 conclusion

The strongest new conclusion is that "background removal" should not be one service call. The internal contract should explicitly produce and validate:
- alpha matte;
- foreground RGB estimate;
- uncertainty/confidence map;
- trimap/prior;
- high-resolution refinement map;
- structural QA;
- multi-background composites.

This architecture gives DTF Studio a much better chance of preserving hair, smoke, antialiasing, fine text and colored edges without halos while keeping heavy compute localized to the pixels that actually need it.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 018 — diagnose halo cause first, physical choke/stroke guards, halftone cell math, and alpha-safe resize

The verified corpus now contains 353 individually opened/read unique pages.

### 1. A visible white halo has multiple root causes and choke is only one of them

The DTF sources in this batch distinguish:
- dirty/low-alpha debris in artwork;
- underbase geometry that extends beyond color;
- color-to-white registration or scaling drift;
- soft/semi-transparent artwork whose threshold policy exposes white;
- excessive white density that makes an existing geometry defect more visible.

This means the diagnostic order should be:
1. inspect approved color artifact;
2. inspect alpha;
3. inspect generated white plane;
4. compare color/white registration geometry;
5. only then recommend threshold, choke, white amount, or printer/RIP registration.

The tool should never treat every white outline as “increase choke.”

### 2. Choke should be protected by a minimum-stroke rule

Multiple DTF sources warn that choke can make small text and fine details disappear. One production guide gives a 0.02 inch minimum feature recommendation, while other documentation recommends testing choke charts rather than relying on a universal number.

Our engine should compute:
- minStrokeMm;
- proposed chokeMm;
- residualWhiteStrokeMm ≈ minStrokeMm - 2*chokeMm for interior-sided erosion cases.

If the residual approaches the process minimum, block or warn before applying the choke.

### 3. Physical-unit choke is preferable to fixed-pixel choke

Caldera explicitly explains that the physical size of a pixel changes with DPI. CADlink and other workflows may expose choke in pixels or physical units depending on the product.

Internal rule:
- store choke in mm as the authoritative intent;
- derive pixels from output/effective DPI at render time;
- record the converted pixel radius in the recipe for reproducibility.

This prevents “2 px” from meaning different physical erosion at 300, 600, or 1200 DPI.

### 4. Choke should be selected with a test-chart workflow

DTF Station/CADlink documentation uses a choke wizard that prints a range of candidate values and asks the operator to select the best physical result.

This is important: the right choke depends on actual printer/film/ink/registration behavior.

Future production calibration profile:
- deviceId;
- printModeId;
- film/media;
- resolution;
- measured preferred choke range;
- date/operator;
- minimum printable stroke/dot observations.

The prepress tool can suggest, but the physical calibration remains printer-specific.

### 5. Underbase generation order should be explicit

A useful operational sequence supported by current DTF sources is:

alpha/coverage -> eligibility threshold -> base white response -> choke/spread -> optional screening/halftone -> white amount/max ink.

Why this matters:
- threshold changes which pixels are eligible;
- choke changes geometry;
- halftone changes spatial coverage;
- white amount changes density, not footprint.

The UI and recipe should keep these controls separate.

### 6. White amount is not a geometry control

Reducing maximum white ink or underbase strength can make a halo less visible but does not repair a white mask extending beyond color.

The diagnostic system should distinguish:
- GEOMETRY_ERROR;
- DENSITY_ERROR;
- REGISTRATION_ERROR;
- ALPHA_CONTAMINATION.

Each class receives a different suggested action.

### 7. Underbase response can be tone-dependent

CADlink documents coverage underbase/manual curves where white amount varies with grayscale/color content, plus separate highlight white and maximum white controls.

This strengthens the proposed underbase response curve:

whiteCoverage = f(alpha, sourceTone, whitePolicy, calibrationProfile)

rather than:
whiteCoverage = alpha

The exact f remains RIP/process-specific.

### 8. Semi-transparent pixels require their own white policy

CADlink and current DTF artwork guidance confirm that workflows may:
- preserve proportional opacity;
- treat semi-transparent pixels as fully opaque for white;
- vary hole size/ink removal with transparency;
- threshold low-opacity data.

This remains a versioned recipe field, never a hidden default.

### 9. Halftone cell size has a direct DPI/LPI relationship

CADlink documentation provides a useful physical relation:

cellPixelsPerSide = outputDPI / LPI

Examples:
- 300 DPI / 60 LPI = 5 px cell;
- 600 DPI / 60 LPI = 10 px cell.

A simple theoretical count of addressable binary fill states for a square cell is approximately:

levels = cellPixelsPerSide^2 + 1

before considering device/drop behavior, screening algorithms, supercells, and real print physics.

Implication:
- raising LPI makes cells smaller and can reduce available discrete area levels at a fixed DPI;
- lower LPI gives more pixels per cell but makes the pattern more visible.

This should drive a physical halftone validator rather than a purely visual slider.

### 10. Supercells expose a resolution-versus-tone trade-off

CADlink can group four normal halftone cells into a supercell to increase available gray levels without simply lowering frequency.

This suggests a future simulation layer:
- normal ordered cell;
- supercell;
- jittered screening;
- transparency-varying holes.

These are advanced preview modes, not first-version master processing.

### 11. Jitter is controlled pattern decorrelation, not random noise everywhere

CADlink’s halftone documentation describes jitter as small distortions to make the dot pattern less discernible, with separate highlight/midtone/shadow ranges.

If we add jitter in a later phase:
- deterministic seed required;
- bounded amplitude;
- separate tonal ranges;
- never use unrestricted random noise in the master recipe.

### 12. Ink-removal halftones should be modeled as coverage holes, not conventional color quantization

CADlink “Ink Removal” explicitly creates holes to reduce deposited ink, including variable hole size in semi-transparent regions.

This matters for DTF soft-hand design:
- the target is material/ink coverage, not merely reproducing a grayscale screen aesthetically;
- dot/hole masks need minimum printable-size constraints;
- output should be evaluated against adhesion/coverage requirements.

### 13. White-only printing illustrates why color, alpha, and white response are independent

CADlink’s white-only modes can map color/tone data into white output while respecting transparency. Disabling color information can lose tonal blends.

This supports our three-signal architecture:
- source color/tone;
- alpha/coverage;
- derived white response.

Even a “white-only” job may need source tonal information.

### 14. Maximum white ink needs physical calibration, not a software guess

CADlink’s profiler asks operators to print charts and select the highest useful white level that provides opacity without flooding/bleeding.

Therefore DTF Studio should not claim to calculate the final printer white-ink limit from pixels alone.

We can:
- preview relative white coverage;
- store calibrated device presets;
- flag extreme coverage.

But the final maximum ink limit belongs to a printer/media/ink calibration profile.

### 15. Printer calibration and ICC creation are separate from artwork correction

CADlink calibration uses printed/measured charts and a spectrophotometer to linearize channels before ICC creation.

Therefore:
- do not “fix” systematic printer color behavior by destructively changing uploaded artwork;
- printer linearization/profile belongs to the production device profile;
- artwork color correction is a separate, explicit user-approved operation.

### 16. Alpha-safe resizing has a concrete implementation pattern

Sharp’s own PNG benchmark explicitly describes:
decode RGBA -> premultiply alpha -> Lanczos3 resize -> unpremultiply -> encode PNG.

This is highly relevant to our server processing.

For transparent raster resampling:
1. know source alpha representation;
2. convert to premultiplied representation if required by the filter path;
3. resize/filter color+coverage consistently;
4. unpremultiply only if the target storage format/API expects straight alpha;
5. preserve hidden RGB intentionally where the pipeline needs it.

This should become a regression-tested primitive rather than ad-hoc RGBA resize.

### 17. Transparent-edge decontamination can use interior subject colors plus local background estimates

The chroma-alpha implementation studied in this batch reconstructs contaminated edge color using:
- a palette learned from confident interior subject colors;
- a local background estimate;
- the compositing equation;
- edge-limited processing.

We should not copy that implementation blindly, but the principle is strong:
- learn/estimate plausible foreground color from reliable interior pixels;
- restrict decontamination to the transition/edge band;
- solve against locally estimated background contamination;
- preserve source luminance/detail where useful.

This provides a non-neural fallback for certain keyed/flat-background images.

### 18. Convolution boundary behavior must be explicit

OpenCV’s border tutorial is a reminder that filters need a boundary-extension policy (constant, replicated, etc.).

For DTF transparent artwork, blindly replicating RGB at the rectangular canvas edge can create false color support near crop boundaries.

Processing primitives should therefore specify border mode explicitly and, where possible:
- add safe transparent padding;
- process;
- crop back to the intended bounds.

This is especially important for blur, convolution, sharpen, morphology, and guided filtering near the canvas edge.

### 19. Recommended halo diagnosis report

Add a HaloDiagnostic block:

- sourceLowAlphaResidueScore;
- edgeColorContaminationScore;
- whiteMaskOvershootMm;
- directionalRegistrationOffsetPx;
- proposedChokeMm;
- minStrokeAfterChokeMm;
- whiteDensityRisk;
- semiTransparentPolicy;
- confidence;
- recommendedAction.

Possible actions:
- CLEAN_ALPHA;
- DECONTAMINATE_EDGE_RGB;
- CHOKE_WHITE;
- REDUCE_WHITE_AMOUNT;
- FIX_REGISTRATION;
- PRESERVE_SOFT_ALPHA;
- MANUAL_REVIEW.

### Batch 018 conclusion

The strongest new conclusion is that the DTF preparation system must diagnose **which layer is wrong** before modifying anything:
- source RGB;
- alpha/coverage;
- generated white geometry;
- white density;
- halftone coverage;
- printer registration/calibration.

That separation is essential to avoid using choke to hide bad alpha, using white-density reduction to hide geometry errors, or sharpening/resizing to compensate for printer calibration problems.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 019 — progressive refinement, edge-only matting, alpha-safe filtering, and printability-aware QA

The verified corpus now contains 373 individually opened/read unique pages.

### 1. A three-tier quality mode is technically justified

The local-background-remover implementation provides a useful production pattern:
- fast: segmentation model only;
- balanced: zoomed second pass + guided filter + color decontamination;
- best: balanced path + full-resolution alpha matting only in the uncertain edge band.

For DTF Studio this maps naturally to:
- PREVIEW_FAST for immediate customer feedback;
- STANDARD for common product/logo/photo uploads;
- QUALITY for hair, fur, fabric, smoke, soft antialiasing, and difficult edges.

The expensive path should be triggered by edge complexity and confidence, not by every upload.

### 2. Full-resolution processing should be concentrated on the edge band

The strongest repeated pattern across current implementations is:
coarse model -> upscale probability -> guided refinement -> optional alpha matting in the uncertain boundary only.

This is a key performance decision. Most pixels in a large DTF file are either definitely foreground or definitely background; the difficult pixels are concentrated near the transition band.

Recommended internal masks:
- hardForeground;
- hardBackground;
- unknownBand;
- topologyCriticalBand for small text and narrow strokes.

Only the last two require expensive refinement.

### 3. Simultaneous foreground and alpha estimation is preferable for contaminated edges

Context-Aware Matting and MG Matting both explicitly estimate foreground color as well as alpha. MG Matting can take a rough mask rather than requiring a carefully authored trimap.

This strengthens the adapter capability model:
- SEGMENTATION_ONLY;
- ALPHA_ONLY;
- ALPHA_PLUS_FOREGROUND;
- TRIMAP_REQUIRED;
- ROUGH_MASK_GUIDED;
- HIGH_RES_REFINEMENT.

Models that output foreground RGB deserve separate evaluation because they may reduce color-fringe cleanup work.

### 4. Rough-mask-guided matting can reduce manual trimap dependence

MG Matting is important for a semi-automatic workflow because it accepts a general rough mask generated by segmentation/saliency and progressively refines it.

Potential path:
segmentation probability -> rough mask -> guided matting -> structural QA.

This offers a second route beside explicit trimap-based ViTMatte-style processing.

### 5. Deterministic non-AI fallback remains valuable for simple backgrounds

NanoAlpha demonstrates a useful deterministic sequence for uniform/near-uniform backgrounds:
- sample/cluster border colors in a perceptual space;
- flood-fill background-like connected regions from the border;
- calculate an edge band;
- estimate fractional alpha by inverse compositing;
- decontaminate edge RGB and propagate plausible foreground color.

This is highly relevant for flat-background customer artwork and should be benchmarked because it is cheap, reproducible, and easy to explain.

### 6. Multi-background capture can solve alpha more directly when the source permits it

NanoAlpha also supports two aligned renders on contrasting backgrounds. With two observations of the same foreground over different known backgrounds, alpha/foreground recovery becomes better constrained.

This is not common for ordinary customer uploads, but could be useful for AI-generated design workflows where we control rendering and can request two background plates.

### 7. Physical minimum line width must be a configurable production rule

House DTF publishes a concrete example guideline of 0.02 in (0.5 mm) minimum line thickness, warning that thinner features may fail to print or transfer.

We should not universalize one vendor's number, but the product model needs:
- minPrintableStrokeMm;
- minPrintableGapMm;
- optional minPrintableDotMm;
- calibrationProfileId.

Artwork preflight should measure the design in physical units at the chosen print size and compare it with the configured production profile.

### 8. Alpha-preserving AI upscale must be tested separately from RGB upscale

Alphaveil demonstrates tiled Swin2SR-style upscaling while preserving alpha. This confirms the use case, but our benchmark must distinguish several strategies:
- upscale premultiplied RGBA together;
- upscale RGB and alpha separately;
- AI upscale RGB, deterministic upscale alpha;
- AI upscale RGB plus separate matte refinement at source resolution.

The best choice may vary by edge class. Soft alpha and hard logo boundaries should not necessarily share one alpha-upscale strategy.

### 9. Transparent color is real data even when alpha is zero

ImageMagick's transparency documentation makes an important engineering point: fully transparent pixels still contain RGB values. Those hidden colors can become visible after blur, resize, filtering, or later changes to alpha.

Therefore the pipeline must never assume RGB under alpha=0 is irrelevant.

For an approved transparent artifact, define a hidden-RGB policy:
- reconstructed/propagated foreground color near edges;
- controlled neutral or nearest-foreground fill farther away if needed;
- never accidental decoder/library defaults that introduce black/white fringe sources.

### 10. Blur and resize around transparency need explicit alpha semantics

ImageMagick's historic resize/blur halo examples illustrate the failure mode clearly: treating RGBA channels as unrelated grayscale channels can mix invisible background RGB into visible edge pixels.

Even though current libraries may have fixed specific historical bugs, the underlying test remains essential.

Regression fixtures should include:
- white glyph on transparent black;
- black glyph on transparent white;
- saturated red/blue edges with hidden opposite-color transparent pixels;
- soft glow;
- one-pixel line;
- repeated resize down/up cycles.

### 11. libvips gives us explicit premultiply/unpremultiply primitives

The current libvips bindings expose dedicated premultiply and unpremultiply operations with an explicit alpha range.

This supports a canonical raster primitive:
straight-alpha input -> premultiply -> alpha-aware filter/resize -> unpremultiply if output requires straight alpha.

The exact ordering must be tested per operation; importantly, we should not depend on implicit library behavior.

### 12. Sharp history reinforces that alpha handling changed for correctness

Sharp changelog history includes changes that moved premultiplication before box-filter shrink, added explicit premultiplied raw/composite behavior, and fixed premultiplication of composite backgrounds.

This is evidence that alpha order is not an implementation detail we can ignore; it belongs in our tests and recipe semantics.

### 13. Color decontamination and mask refinement are different controls

Several open-source removal tools now expose decontamination independently from alpha matting.

Our UI logic should reflect this distinction:
- SHAPE_ERROR -> matte/refine alpha;
- COLOR_FRINGE -> decontaminate foreground RGB;
- both -> alpha refinement followed by foreground reconstruction.

This avoids needlessly changing the shape of a mask when only color contamination is wrong.

### 14. Edge quality metrics should be localized

The local-background-remover project reports edge MAE in addition to whole-mask IoU. This is conceptually correct for DTF because a large correct opaque interior can hide severe edge defects in a global score.

Our benchmark should emphasize:
- edge MAE/SAD;
- transition-band compositing error;
- topology retention;
- minimum stroke width change;
- color contamination on contrasting backgrounds.

### 15. Background-removal engines should be routed by artwork type

The compared tools repeatedly reveal different strengths:
- simple hard-edge product/logo: segmentation + guided refinement may suffice;
- hair/fur/fabric: matting required;
- uniform/chroma-like background: deterministic color-distance/flood-fill can be excellent;
- portrait: portrait-specialized models can be fast;
- full-frame graphic with no clear subject: generic subject segmentation can be the wrong tool entirely.

This supports an ARTWORK_CLASS -> PROCESSOR_ROUTE table rather than a universal remove-background button.

### 16. Browser/WebGPU background removal is useful for preview, but production truth stays server-side

Browser tools demonstrate that soft masks and even tiled AI upscale are feasible locally, but device capabilities and browser implementations vary.

Recommended split remains:
- browser: instant preview, optional local rough mask, crop/placement, manual corrections;
- authoritative server/worker: deterministic artifact generation, versioned models, QA hashes, print-master candidate.

### Batch 019 conclusion

The strongest architectural refinement from this batch is a staged quality ladder with localized high-resolution work:
1. classify artwork;
2. run inexpensive coarse segmentation/analysis;
3. estimate confidence and edge complexity;
4. guided refinement on normal edges;
5. true matting only on uncertain/soft regions;
6. foreground RGB decontamination only where color contamination is detected;
7. validate physical stroke/gap limits at print size;
8. run multi-background edge QA;
9. save a new version only after passing structural checks.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 020 — straight-vs-premultiplied alpha contracts, linear compositing, guided refinement, and libvips execution rules

The verified corpus now contains 393 individually opened/read unique pages.

### 1. PNG is explicitly straight-alpha storage

The PNG Third Edition states that PNG stores color samples unassociated/non-premultiplied by alpha. Alpha is linear coverage and is not gamma-corrected.

This gives us an authoritative file-boundary rule:
- PNG decode produces straight/unassociated RGB+alpha semantics;
- internal processing may convert to premultiplied form when a filter/compositor expects it;
- PNG export should return to straight alpha unless the encoder/API explicitly handles the conversion.

### 2. Alpha should remain linear even when RGB is gamma-encoded

The PNG specification explicitly says gamma correction does not apply to alpha.

Therefore:
- never apply RGB gamma/transfer-function operations to alpha;
- alpha resize/filtering is a coverage problem;
- color-space conversion and alpha processing remain separate paths.

### 3. Correct compositing should happen in intensity/working-light space, not blindly in encoded sRGB

The PNG specification says compositing equations should be applied to intensity samples rather than gamma-encoded samples.

For high-quality QA/proof compositing:
1. decode/convert RGB to the chosen linear-light working representation;
2. composite using alpha;
3. encode to display color space.

For lightweight browser previews we may accept browser-native behavior, but production QA should have a deterministic linear-light reference implementation.

### 4. W3C compositing confirms the Porter-Duff contract

W3C defines source-over and related operators using premultiplied output color contributions:
co = alpha_s * C_s + alpha_b * C_b * (1 - alpha_s)

This gives us a canonical mathematical reference for black/white/gray diagnostic composites.

Important distinction:
- compositing math uses alpha-weighted/premultiplied contributions;
- blend-mode color functions are defined on non-premultiplied colors.

Our primitives must not conflate these two concepts.

### 5. Fully transparent RGB can be meaningful source data

The PNG specification notes two valid semantics:
- transparent pixels may preserve meaningful color for future edits;
- or they may be filler where color is irrelevant.

DTF Studio should therefore avoid destructive normalization of hidden RGB on the immutable source.

For processed transparent candidates:
- preserve source hidden RGB by default away from edges;
- reconstruct plausible foreground RGB in the edge decontamination band;
- only normalize fully transparent far-background RGB in a derived artifact when there is a concrete reason.

### 6. Apple Core Image reinforces explicit alpha-state transitions

Core Image exposes separate operations for premultiplying and unpremultiplying alpha and states that filters generally expect premultiplied input.

This supports a processing primitive with explicit state:

RGBA_STRAIGHT
-> PREMULTIPLY
-> FILTER/RESIZE/COMPOSITE
-> UNPREMULTIPLY if the next stage/export expects straight alpha.

Every operation should declare:
- required alpha representation;
- output alpha representation.

### 7. Guided filter is especially suitable for mask refinement because the guide and signal are separate

The guided-filter implementation computes local linear relationships between a guide image and the signal being filtered.

For DTF alpha refinement:
- guide = source RGB/luminance;
- signal = coarse alpha;
- output = alpha aligned to source edges.

The color implementation uses local covariance across RGB guide channels, which is stronger than filtering alpha based only on alpha neighborhoods.

### 8. Guided-filter border behavior is not an incidental detail

The reviewed implementation uses a replicated border for its box filter.

This means edge behavior near the canvas boundary depends on the chosen extension rule.

Our regression suite should include subjects touching:
- left/right border;
- top/bottom border;
- corners.

For production, add transparent safe padding before refinement when appropriate, then crop back after processing.

### 9. Global matting shows a useful deterministic fallback sequence

The global-matting implementation uses:
- trimap;
- optional expansion of known regions;
- global foreground/background sampling;
- alpha solution;
- guided-filter refinement;
- re-imposition of known trimap values.

This is a valuable deterministic fallback for hard/simple cases and a strong pattern even when we use learned models:
hard constraints must be restored after soft refinement.

### 10. User-confirmed trimap pixels should be immutable constraints

The reviewed global-matting flow explicitly resets alpha to 0/255 in known trimap regions after guided filtering.

Our workflow should do the same conceptually:
- user-marked definite foreground cannot drift;
- user-marked definite background cannot drift;
- only UNKNOWN is freely optimized unless the user changes the constraints.

### 11. Pillow is useful as a reference implementation and test oracle

Pillow exposes:
- alpha_composite;
- putalpha;
- per-channel access;
- alpha-aware bounding boxes.

Its implementation routes alpha compositing through a core alpha_composite operation.

This makes Pillow useful for:
- small correctness fixtures;
- cross-checking Porter-Duff behavior;
- generating regression expectations.

It is not necessarily the high-throughput production engine for large DTF files.

### 12. libvips explicitly warns that resize does not premultiply alpha

This is one of the strongest implementation findings in the batch.

The current libvips resize documentation explicitly says:
- vips_resize does not premultiply alpha;
- if an image has alpha, premultiply first.

Therefore the server-side transparent resize primitive should be explicit:
premultiply -> resize -> unpremultiply.

This should be a unit-tested helper rather than relying on callers to remember the rule.

### 13. libvips affine/mapim/composite expose premultiplied flags

Affine, mapim and composite operations have explicit premultiplied options.

This means the recipe/runtime can consistently propagate alpha-state metadata into:
- geometric transforms;
- mockup warps;
- arbitrary coordinate maps;
- compositing.

Do not assume every operation shares the same default alpha convention.

### 14. libvips compositing space should be explicit

libvips composite allows a compositing_space option and can work in scRGB/Lab or other interpretations.

For our production QA:
- choose a documented working/compositing space;
- avoid silently compositing in whichever encoded space happens to be attached;
- convert display derivatives separately.

### 15. libvips resize is a strong deterministic production candidate

Current documentation states:
- Lanczos3 is the normal final reduction kernel;
- resize may combine shrink/reduce/affine for quality/performance;
- resize does not update xres/yres automatically.

DTF implications:
- keep physical-size/effective-DPI metadata under application control;
- resizing pixels alone must not silently preserve stale DPI semantics;
- after any resize, recompute effective DPI for each target placement.

### 16. libvips thumbnail is not the same as master resize

The resample documentation notes that thumbnail combines loading, resize, color management, and correct alpha handling for efficient delivery.

Use case split:
- thumbnail/display pipeline: vips thumbnail-style optimization is attractive;
- authoritative print candidate: explicit decode/profile/alpha/resize steps with logged recipe.

### 17. Browser Canvas compositing is suitable for UI preview semantics

MDN documents Canvas globalCompositeOperation and globalAlpha, including source-over and Porter-Duff-style operators.

This is useful for:
- dark/light garment preview;
- mask/debug overlays;
- selection visualization;
- non-authoritative mockup interactions.

But browser canvas remains preview-only for deterministic print QA because implementation/color-management details can vary.

### 18. Preview and production should share the same logical compositing operator names

Even if browser and server implementations differ, the domain model can standardize:
- SOURCE_OVER;
- SOURCE_IN;
- DESTINATION_IN;
- DESTINATION_OUT;
- etc.

This lets us test that browser previews and server reference composites are semantically aligned.

### 19. Proposed AlphaState metadata

Add explicit metadata to intermediate artifacts/recipe nodes:

alphaRepresentation:
- STRAIGHT
- PREMULTIPLIED
- NONE

alphaMeaning:
- COVERAGE
- BINARY_MASK
- TRIMAP
- CONFIDENCE

colorEncoding:
- SRGB_ENCODED
- LINEAR_SRGB
- PROFILED_RGB
- OTHER

This prevents an alpha mask, confidence map, and compositing alpha from being treated as interchangeable simply because each is a one-channel image.

### 20. Proposed transparent-resample regression suite

Before locking the processing engine, create synthetic fixtures:
- opaque red square with transparent blue hidden RGB outside;
- white anti-aliased text over transparent black hidden RGB;
- black anti-aliased text over transparent white hidden RGB;
- thin saturated 1px/2px strokes;
- radial soft glow;
- smoke-like soft alpha;
- edge touching canvas border;
- alpha=0 / alpha≈0 transition;
- repeated downscale/upscale;
- affine rotation then resize.

For every fixture compare:
- straight-naive resize;
- premultiply-resize-unpremultiply;
- browser preview;
- libvips reference;
- optional Pillow reference.

Measure edge color error, alpha error, halo visibility on black/white, and topology retention.

### Batch 020 conclusion

The strongest new conclusion is that alpha handling must be encoded as a type/contract, not inferred from “RGBA”.

A large class of halos and edge errors can be prevented if every operation knows:
- whether RGB is straight or premultiplied;
- whether alpha is coverage, mask, trimap or confidence;
- which color/working space the operation assumes;
- whether physical resolution metadata must be recomputed after the operation.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 021 — export semantics, hidden-RGB preservation, resolution-aware sharpening, ICC proofing, and DTF screening controls

The verified corpus now contains 413 individually opened/read unique pages.

### 1. TIFF export can carry production-critical semantics that must be explicit

libvips TIFF output supports:
- 1-bit, 2-bit, 4-bit and ordinary higher-depth data;
- MINISBLACK/MINISWHITE behavior for 1-bit TIFF;
- explicit x/y resolution;
- tiled/strip output;
- metadata;
- optional premultiplied-alpha output.

This matters for DTF because a white-channel mask exported as 1-bit TIFF is not just "an image":
- bit sense must match the downstream RIP;
- resolution metadata must match the intended physical scale;
- the exporter must not accidentally invert white/black meaning;
- output alpha semantics must match the consumer.

Therefore export format/settings belong in a versioned production recipe.

### 2. libvips resolution units are pixels per millimetre

The TIFF API documents libvips resolution values in pixels/mm.

Internal DTF metadata should retain a canonical physical-resolution representation and convert carefully at file boundaries.

For example:
pixelsPerMm = DPI / 25.4

Do not confuse TIFF resolution metadata with the already-computed effective DPI at product placement; both need to be consistent but represent different layers of intent.

### 3. Premultiply/unpremultiply can destroy hidden RGB at alpha=0

The libvips unpremultiply operation outputs zero RGB when alpha is zero.

This is an important caveat:
- premultiply -> unpremultiply is not lossless for fully transparent hidden RGB;
- immutable sources that may contain meaningful transparent RGB must not be round-tripped destructively merely for convenience;
- processing copies may normalize/reconstruct hidden RGB under an explicit policy.

This refines the earlier alpha-safe-resize rule: use premultiplication for filtering correctness, but never confuse it with a lossless preservation transform for hidden source color.

### 4. Transparent source and processed derivative need different hidden-RGB policies

Recommended:
- ORIGINAL_SOURCE: preserve bytes/profile/hidden RGB exactly.
- WORKING_COPY: may premultiply/filter with explicit state.
- APPROVED_TRANSPARENT_CANDIDATE: edge hidden RGB should be reconstructed toward foreground color where it prevents halos; far fully-transparent RGB may be normalized if justified.
- DISPLAY_DERIVATIVE: optimized for delivery; hidden RGB preservation is secondary to artifact-free rendering.

### 5. Automatic trim should not rely blindly on flattened color

libvips find_trim flattens alpha, median-filters photographic input, compares against a background color, and has a line_art option that disables median filtering.

That makes it a useful tool for photographs, but not the authoritative transparent-bound computation for all DTF artwork.

Recommended:
- transparent artwork: derive primary bounds from alpha/coverage;
- line art: avoid median filtering that could erase small strokes;
- photos on opaque/simple backgrounds: find_trim can be a useful candidate;
- preserve separate diagnostic bounds and production placement bounds.

### 6. Sharpening should be tied to raster resolution

libvips sharpen works on the L channel in LAB and explicitly suggests larger sigma as raster resolution increases; its documentation distinguishes image raster resolution from halftone resolution.

This supports:
- resolution-aware sharpening parameters;
- no fixed radius across all export sizes;
- luminance-focused sharpening as a candidate to reduce chroma artifacts;
- explicit post-sharpen edge/ringing QA.

Sharpening remains appearance-changing and should not run automatically without a diagnosed blur/softness need.

### 7. Blur/convolution precision should be explicit in high-quality edge work

libvips Gaussian blur exposes precision, and generic convolution can run in floating-point or faster integer/approximate modes.

For alpha/matte refinement and regression-reference outputs:
- prefer float precision where edge fidelity matters;
- allow approximate paths only for non-authoritative previews or after benchmark validation;
- record precision mode in the recipe if it can change output pixels.

### 8. Safe padding must explicitly set the new pixel values

libvips embed defaults to black for generated edge pixels.

For transparent-art filtering, default-black padding can contaminate results if RGB/alpha are not deliberately constructed.

Before convolution/blur/guided filtering near a canvas edge:
- create explicit transparent padding with controlled hidden RGB/alpha semantics;
- apply the operation;
- crop back;
- test corner/border fixtures.

### 9. ICC transform is distinct from generic color-space conversion

libvips colourspace converts among known mathematical color-space interpretations. ICC transform instead:
- selects an input profile;
- moves through PCS;
- applies an output profile;
- supports rendering intent and black-point compensation;
- attaches the output profile.

DTF Studio should model these as separate operations:
- COLORSPACE_CONVERT;
- ICC_PROFILE_TRANSFORM.

A tagged RGB image is not equivalent to "just convert to CMYK" without an explicit target profile.

### 10. ICC profile selection needs deterministic precedence

libvips icc_transform can use:
1. embedded profile;
2. explicitly supplied input profile;
3. compatible built-in profile.

Our server should not silently fall through these choices for production masters.

Policy should be explicit:
- detect and record embedded profile;
- if missing, mark ASSUMED_PROFILE and identify the assumed profile;
- require explicit output profile for production transform;
- log intent, black-point compensation and output bit depth.

### 11. 16-bit input should not be silently reduced when quality matters

The ICC transform API defaults output depth to 16 when the input is 16-bit.

This supports preserving high bit depth through production color transforms when the source and downstream path benefit from it, while web/display derivatives can remain 8-bit.

### 12. Soft proofing requires three profile roles

Little CMS documentation distinguishes:
- input/source profile;
- display/output profile for the monitor;
- proofing profile representing the printer/device being simulated.

A proof therefore needs its own rendering intent and can include black-point compensation/gamut checking.

The proof is a display artifact only; it must never become the print master.

### 13. Black-point compensation is mainly paired with relative colorimetric intent

Little CMS documentation and its validation paper describe BPC as mapping source/destination black points to preserve tonal detail when using relative-colorimetric conversions.

DTF implication:
- BPC is a profile-transform choice, not a generic "make blacks better" image adjustment;
- it belongs in printer/profile configuration;
- do not expose it as an ordinary customer brightness control.

### 14. Browser color management should never be the authoritative proof path

Little CMS has historically documented browser differences in ICC support. Even as browsers evolve, the architectural lesson remains:
- browser preview can be useful;
- server-side proof/reference transforms must be deterministic and versioned;
- color-critical acceptance cannot depend on a particular browser's current rendering behavior.

### 15. DTF white underbase controls should remain orthogonal

The reviewed DTF production guides repeatedly separate:
- white density/strength;
- choke/spread;
- threshold/alpha eligibility;
- halftone LPI;
- dot shape;
- angle;
- registration.

A single "white amount" slider cannot substitute for geometric choke, and choke cannot fix directional registration.

The engine should diagnose which dimension is wrong before suggesting a setting.

### 16. Dot shape is a process variable, not only a visual preference

The halftone guide distinguishes round, ellipse, diamond and square dots for different behaviors.

Our simulation should therefore store:
- screeningMethod;
- lpi;
- angleDeg;
- dotShape;
- targetCoverageCurve;
- minimumPrintableDotMm.

The physical printer profile can restrict which combinations are allowed.

### 17. Practical DTF guides reinforce testing rather than universal choke values

Current production guidance varies in recommended choke amounts and explicitly ties results to printer/ink/film/registration behavior.

Therefore:
- default choke is only a starting profile value;
- operator test charts remain authoritative for a specific production line;
- the software should store calibrated ranges, not present one universal number as "correct."

### 18. White density and print feel are linked

Practical DTF guidance consistently warns that too much white increases stiffness/heavy hand while too little white reduces opacity/vibrancy.

This strengthens the reason for underbase halftoning:
- white response is both an optical and material/coverage decision;
- soft-hand profiles should be evaluated for minimum dot/bridge integrity and sufficient color support;
- the software can preview relative coverage, but physical print validation remains necessary.

### 19. Proposed export contract

For every generated production artifact, record:
- format;
- bitDepth;
- widthPx/heightPx;
- xResolution/yResolution + unit;
- colorProfileId/hash;
- alphaRepresentation;
- alphaMeaning;
- TIFF photometric/1-bit sense where relevant;
- white-channel semantics;
- compression/lossless state;
- recipeVersion;
- outputHash.

This makes the artifact reproducible and auditable.

### 20. Batch 021 conclusion

The image-preparation system now needs two explicit boundaries:
1. a processing boundary where alpha/color operations are mathematically correct;
2. an export boundary where file-format semantics, resolution, profile, bit depth, channel meaning and RIP compatibility are made explicit.

Many production failures happen at the second boundary even when the pixels looked correct in the editor.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 022 — PSD/PDF normalization, soft-mask decontamination, source-vs-master separation, and output validation

The verified corpus now contains 433 individually opened/read unique pages.

### 1. PSD/PSB should be accepted as rich source containers, not assumed to be directly print-ready rasters

Adobe's Photoshop format specification confirms that PSD/PSB can contain:
- many image channels;
- layers;
- per-layer transparency and masks;
- user masks and vector masks;
- ICC profile resources;
- alpha-channel names/identifiers;
- spot/halftone-related resources;
- 8/16/32-bit channel depths.

DTF implication:
- preserve the original PSD/PSB;
- normalize to a versioned raster/vector-derived print candidate;
- do not flatten destructively in place;
- capability-scan the file before claiming full editability.

### 2. "Alpha channel" in PSD does not automatically mean document transparency

Photoshop can store alpha channels as saved selections/masks, while layer transparency and layer masks are separate concepts.

Therefore the importer must distinguish:
- layer transparency;
- layer/user/vector masks;
- extra alpha selection channels;
- spot-color channels;
- merged composite transparency.

Do not map every extra channel to print transparency.

### 3. Merged PSD transparency has format-specific semantics

Adobe's PSD specification notes that when the layer count is negative, the absolute value is the layer count and the first alpha channel contains transparency for the merged result.

This is useful for fallback rendering:
- if layers cannot be fully interpreted, a trustworthy merged composite may still be available;
- record whether the normalized preview came from a composite or reconstructed layers;
- never claim layer-level fidelity when using only the merged fallback.

### 4. PSD parser support is often partial

OpenImageIO documents limited PSD reading and no PSD writing in the examined plugin documentation.

It also exposes options that can change interpretation:
- non-RGB color modes may be auto-converted to RGB unless raw color is requested;
- unassociated alpha may be premultiplied unless explicitly preserved.

This reinforces the earlier capability-negotiation design:
PSD_ACCEPTED_SOURCE != PSD_FULLY_EDITABLE != PSD_PRINT_MASTER_READY.

### 5. Photoshop can preserve transparency in TIFF as an extra alpha channel

Adobe's TIFF save documentation explicitly says that "Save Transparency" stores transparency as an additional alpha channel when opened in other applications.

DTF implication:
- TIFF import/export needs an explicit alpha-channel interpretation rule;
- a TIFF alpha channel may be intended transparency, but arbitrary extra channels may also exist;
- perform a readback validation after export.

### 6. ImageOutput success does not guarantee semantic fidelity

OpenImageIO warns that an output format may:
- silently drop alpha if the target format only supports RGB;
- substitute a supported pixel type;
- ignore per-channel formats;
- drop arbitrary channel names;
- drop unsupported metadata.

This is a critical production finding.

Every print-master export should therefore perform POST-WRITE VERIFICATION:
- reopen;
- verify dimensions;
- verify bit depth;
- verify channel count/names;
- verify alpha/white-channel presence and semantics;
- verify ICC profile/hash where required;
- verify resolution metadata;
- compare pixel/hash expectations where lossless output is required.

"write() succeeded" is not a sufficient acceptance condition.

### 7. Header-first inspection can avoid unnecessary full-file decoding

OpenImageIO ImageBuf/ImageSpec can read the image specification before reading pixels.

This supports a safer preflight sequence:
1. signature/type inspection;
2. dimensions/channel count/bit depth/profile/metadata;
3. reject impossible or risky files before full decode;
4. only then allocate/decode pixels.

This reduces memory pressure and decompression-bomb exposure.

### 8. Data window and display/full window are different concepts

OpenEXR and OpenImageIO both model:
- a pixel/data window;
- a full/display window.

This is relevant beyond EXR:
- a cropped artifact can have pixel data smaller than the intended canvas;
- placement should not be inferred only from the stored pixel rectangle;
- original/full bounds can matter for alignment.

Our normalized artifact schema should therefore distinguish:
pixelBounds vs logicalCanvasBounds.

### 9. OpenEXR establishes a useful reference convention for premultiplied alpha

OpenEXR conventionally stores color premultiplied by alpha, while allowing nonzero RGB at zero alpha.

This reinforces two design rules:
- alpha representation is format-specific;
- zero-alpha RGB must not be destroyed casually.

OpenEXR is not a primary DTF customer format, but it is an excellent reference/test format for high-precision alpha behavior.

### 10. OpenEXR cropped data can preserve the original full window

OpenEXR's data/display windows and originalDataWindow attribute illustrate a robust crop model.

For DTF processing:
- Original Source keeps original canvas/bounds;
- Cropped Working Artifact records its crop rectangle relative to source;
- placement remains stable because geometry can be reconstructed.

This is safer than permanently rewriting the origin to 0,0 without provenance.

### 11. PDF transparency is richer than a simple raster alpha channel

PDF can represent transparency through:
- soft masks derived from alpha;
- soft masks derived from luminosity;
- transparency groups;
- blend modes;
- constant stroking/nonstroking alpha;
- shape versus opacity semantics.

Therefore a PDF import path must not assume that rasterizing "the alpha channel" reproduces PDF transparency semantics.

### 12. PDF soft-mask images may include a Matte / preblended background color

The PDF reference describes images whose samples were preblended with a matte color and supplies the Matte value so the original source can be recovered.

This is directly relevant to edge halos.

If extracting raster content from PDF:
- detect SMask/Matte;
- undo preblending correctly where possible;
- otherwise rasterize through a trusted PDF renderer at the target resolution;
- do not blindly reuse preblended RGB with a newly extracted alpha.

### 13. PDF shape and opacity are distinct

Adobe pdfmark documentation exposes AIS ("alpha is shape") plus separate stroking/nonstroking alpha constants and soft masks.

For DTF normalization:
- preserve appearance through a conforming renderer when semantic interpretation is complex;
- do not collapse shape and opacity into one mask unless the rendering result has been validated.

### 14. PDF luminosity masks can depend on color as well as opacity

A luminosity-derived soft mask uses the rendered luminosity of a transparency group, not merely geometric coverage.

This matters when converting PDF artwork to a single transparent raster:
- the mask may intentionally encode tonal softness;
- replacing it with binary object coverage can alter the design.

### 15. OpenImageIO normalizes some exotic file formats on read

OIIO's introductory documentation explains that non-RGB models may be converted to RGB and subsampled channels may be upsampled through plugins.

This is convenient but dangerous for forensic/source-preserving preflight.

Recommended split:
- SOURCE_INSPECTION mode requests raw/native semantics where supported;
- NORMALIZED_WORKING mode converts deliberately to a known working representation;
- record every conversion in the recipe.

### 16. OIIO channel identity should be explicit

ImageSpec can identify alpha and depth channels separately from arbitrary channel names.

Our normalized intermediate should likewise declare:
channelRole = COLOR_R/G/B, ALPHA_COVERAGE, MASK, SPOT_WHITE, SPOT_OTHER, DEPTH, AUXILIARY.

Do not infer channel role from position alone.

### 17. Photoshop preserves spot colors and alpha channels independently

Adobe's normal save workflow exposes separate switches for:
- alpha channels;
- spot colors;
- layers;
- embedded color profile.

This confirms that a PSD/TIFF source can contain print-relevant spot information independent of transparency.

For DTF:
- custom white/spot channels must be detected and surfaced;
- never silently discard them during normalization;
- operator can choose whether to honor or regenerate white.

### 18. PSD and PSB limits support a two-tier parser policy

PSD uses version 1 and standard dimensions up to 30,000 px, while PSB uses version 2 and can reach 300,000 px per dimension.

A secure importer must have application-level decoded-pixel and memory limits far below theoretical format maxima.

Format-valid does not mean operationally safe.

### 19. Lossless versus lossy source normalization must be explicit

OpenEXR supports both lossless and lossy compression families; OIIO writers may also choose supported encodings.

For authoritative print masters:
- prefer lossless output;
- if a lossy source is supplied, preserve source but do not pretend lost data can be recovered;
- any new lossy derivative belongs only to display/preview unless explicitly approved.

### 20. Batch 022 conclusion

The most important new architecture refinement is a strict SOURCE NORMALIZATION boundary before the prepress pipeline.

For PSD/PDF/TIFF-like rich containers:
1. preserve immutable original;
2. inspect container/channel/profile/mask semantics;
3. select a trusted rendering/normalization path;
4. create a normalized working artifact with explicit channel roles and alpha representation;
5. post-validate the normalized output;
6. only then run background removal, cleanup, resize, underbase, halftone and product-fit checks.

This prevents format-specific masks, spot channels, preblended colors, profile conversions, or dropped alpha from being misinterpreted as ordinary RGBA pixels.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 022 — foreground reconstruction, high-resolution matting, interpolation borders, and numerical precision

The verified corpus now contains 453 individually opened/read unique pages.

### 1. Foreground reconstruction is mathematically necessary for soft edges

The foreground-estimation literature makes the failure mode explicit:
using the original composite RGB as if it were foreground causes old-background colors to bleed into partially transparent pixels.

For DTF this means the transparent candidate must not be defined only by alpha.
The processing contract should carry:
- alpha matte;
- estimated foreground RGB;
- optional estimated background RGB;
- transition-band confidence.

This is especially important for hair, fur, smoke, glow, soft antialiasing and any remove-background source with a colored or white background.

### 2. Multi-level foreground estimation is a strong deterministic candidate

Fast Multi-Level Foreground Estimation solves foreground/background colors progressively from coarse to full resolution.

Important engineering advantages:
- color propagation happens cheaply at low resolutions;
- finer levels refine the result rather than starting from scratch;
- memory/runtime are substantially lower than global full-resolution optimization.

This is a good non-neural fallback or post-matting foreground reconstruction stage.

### 3. Matting architecture should separate coarse semantics from edge refinement

Deep Image Matting explicitly separates:
- encoder-decoder coarse alpha prediction;
- refinement network for sharper/more accurate alpha edges.

This pattern repeats in later work and strongly supports our staged architecture:
coarse subject understanding first, localized detail refinement second.

### 4. Automatic trimap generation should be a dedicated subsystem

Semantic-guided automatic matting predicts a trimap from segmentation/semantics before final matting.

DTF implication:
- do not hard-code trimap as simple erosion/dilation forever;
- keep a pluggable trimap generator;
- support deterministic morphology, learned trimap generation, and user-edited trimap;
- benchmark trimap accuracy separately from matte accuracy.

### 5. High-resolution matting needs explicit cross-patch consistency

HDMatt exists specifically because naive patch-by-patch full-resolution inference creates contextual inconsistencies.

If DTF Studio tiles large images:
- tiles must overlap;
- edge context must be shared or blended;
- global coarse matte/semantics should guide each tile;
- seam consistency must be tested;
- topology-critical objects crossing tile boundaries must be handled specially.

A simple independent 512x512 crop loop is not sufficient for production-quality hair/text/fine edges.

### 6. Saliency-based automatic matting is useful, but "most salient object" is not always the DTF subject

Salient Image Matting can automatically infer a foreground matte without a user trimap by using saliency.

This is useful for portrait/product photos, but risky for:
- full-canvas illustrations;
- logos with disconnected elements;
- multiple equally important objects;
- decorative frames/background graphics.

Therefore saliency-driven matting should be only one route in the artwork classifier.

### 7. Premultiplied alpha is the natural rendering/filtering representation

Microsoft's current Win2D documentation states that premultiplied alpha is preferred internally for rendering/filtering and that straight-alpha file/API values are converted before rendering.

This reinforces:
- file/storage semantics may be straight;
- working/render semantics may be premultiplied;
- the transition must be explicit and tested.

### 8. Straight and premultiplied source-over equations differ only because RGB carries different meaning

Straight alpha source-over:
result = sourceRGB * sourceA + destinationRGB * (1 - sourceA)

Premultiplied alpha source-over:
result = sourceRGB + destinationRGB * (1 - sourceA)

The engine should never use one formula on pixels encoded for the other representation.

### 9. Alpha-only masks and luminance-derived masks must not inherit RGB gamma behavior

The Direct2D luminance-to-alpha documentation explicitly recommends inverse gamma correction before computing luminance from gamma-encoded RGB.

This is important for any future "derive mask from brightness" tool:
- convert color values to an appropriate linear representation first;
- compute luminance;
- store resulting alpha as linear coverage;
- do not gamma-correct the alpha channel itself.

### 10. DPI-correction scaling and artwork scaling must remain separate concepts

The Direct2D BitmapSource effect can automatically scale according to source/device DPI.

DTF Studio must avoid letting graphics-runtime DPI correction silently alter print geometry.
Our domain model remains authoritative for:
- pixel dimensions;
- intended physical print size;
- effective DPI;
- normalized placement.

Display/UI DPI should not mutate print-master placement.

### 11. Interpolation choice should be recorded as part of the recipe

Direct2D exposes nearest, linear, cubic, Fant, mipmap-linear and higher-quality scale modes.

For our processing engine:
- line/pixel art may need nearest or specialized treatment;
- normal photographic resize should use a high-quality kernel;
- preview/downscale may use an optimized mipmap path;
- the chosen interpolation mode belongs in recipe metadata.

### 12. Border mode can change transparent-edge output

The Direct2D scale effect documents two distinct border behaviors:
- soft border pads with transparent black;
- hard border mirrors/extends source content.

Transparent black padding is not neutral for all alpha/color-processing pipelines.
For DTF:
- border policy must be explicit;
- add controlled safe padding when filtering edge-touching art;
- regression-test subjects touching all canvas borders.

### 13. High-quality cubic filters can generate out-of-range intermediate values

Direct2D precision documentation notes that cubic/high-quality cubic scaling and several other effects may emit values outside [0,1] in unpremultiplied space.

This is a major QA point:
- avoid implicit 8-bit clamping during intermediate processing;
- use higher-precision float intermediates for authoritative transformations;
- clamp only at a deliberate stage;
- record precision/bit-depth changes.

### 14. Effect-graph precision can change output across hardware/runtime versions

Direct2D may fuse shaders or allocate intermediate buffers differently depending on Windows/GPU capabilities.

This is another reason browser/GPU preview must not define the authoritative print master.

Production reference processing should use a controlled server implementation and fixed library/version/precision policy.

### 15. Higher source precision should be preserved where it exists

Microsoft's bitmap-source documentation recommends preserving higher-than-8-bpc precision with suitable RGBA formats.

For DTF:
- do not reduce 16-bit TIFF/PSD-derived sources to 8-bit before profile conversion or tonal repair unless required;
- web previews can be 8-bit;
- production working artifacts may remain 16-bit/float until export.

### 16. Large-image decode should not silently change alpha mode

The Direct2D image-source API notes that it does not automatically apply appearance-changing gamma or alpha-premultiplication adjustments in some loading paths and that straight-alpha limitations exist.

General rule:
- decoder result metadata must state actual alpha representation;
- never infer it only from the file having four channels;
- normalize into a known working representation explicitly.

### 17. White-underbase diagnosis remains orthogonal to alpha cleanup

The DTF production page reviewed in this batch reinforces:
- white laydown/density;
- choke;
- nozzle/mechanical white-ink problems;
- registration.

A clean alpha can still print badly because of white ink hardware or registration.
Our report should keep DIGITAL_ARTWORK issues distinct from DEVICE_PROCESS issues.

### 18. Render intent and black-point compensation are explicit transform parameters

Adobe's current image-serving ICC documentation exposes:
- output profile;
- rendering intent;
- black-point compensation;
- optional dithering in one path.

This supports the production color recipe fields already proposed.
No color transform should be logged merely as "converted to profile X"; intent/BPC/dither can affect output too.

### 19. Proposed high-resolution matting execution plan

For production-scale images:
1. decode authoritative RGB/profile/alpha;
2. classify artwork;
3. compute coarse semantic mask at bounded resolution;
4. generate trimap/confidence;
5. run global/coarse matte;
6. identify high-uncertainty edge regions;
7. tile only those regions with overlap and global context;
8. reconstruct foreground RGB;
9. blend tile refinements seam-safely;
10. restore hard foreground/background/user constraints;
11. run edge/topology/color QA;
12. save versioned artifact.

### 20. Batch 022 conclusion

The strongest new constraint is that high-resolution processing cannot be reduced to "run the same model on tiles."

Production quality requires:
- global semantics;
- explicit alpha representation;
- trimap/confidence;
- foreground-color reconstruction;
- overlap/context-aware high-resolution refinement;
- high-precision intermediates;
- deterministic border/interpolation behavior;
- structural QA before approval.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 024 — deterministic resampling and diagnostics with libvips

The verified corpus now contains 473 individually opened/read unique pages.

### 1. Downsampling should use a two-stage policy for large reductions
libvips documents reduce as a high-quality kernel-based reducer that works best below about 3x shrink, while shrink uses a box filter and can be combined with reduce for larger factors. This supports a production policy of coarse box shrink followed by a high-quality final kernel rather than one expensive large-radius reduction.

### 2. Display thumbnails should use a dedicated delivery path
thumbnail_image supports linear-light shrink, ICC input/output profiles, rendering intent, orientation handling, and target crop behavior. It is appropriate for display derivatives, while print-master resize remains an explicit recipe with controlled alpha/profile semantics.

### 3. Hidden-RGB propagation can be implemented deterministically
fill_nearest returns both nearest nonzero values and a distance field. This is a strong primitive for propagating trusted foreground RGB outward underneath transparent pixels near an edge before filtering, while limiting propagation by distance.

### 4. Flatten is only a proof/display operation
flatten composites alpha over a selected background and destroys the separate transparency channel. It should only be used for diagnostic black/white/gray proofs and never as part of transparent-master generation.

### 5. Gamma and linear operations must never be applied to alpha by accident
libvips exposes generic gamma and linear transforms across bands. The DTF engine must split color from alpha before tone/gamma operations unless an operation is explicitly intended for coverage.

### 6. Row/column projections are useful structural QA features
project computes sums per row and column. For text/logo artwork, comparing projections before and after processing can reveal missing strokes, clipped borders, shifted content, or overly aggressive crop/choke even when a global similarity metric remains high.

### 7. Global statistics are cheap preflight signals
stats exposes min/max/sum/sum-of-squares/mean/stddev per band. These can support fast checks for empty channels, nearly blank alpha, unexpected full-opacity alpha, and gross tonal changes before more expensive analysis.

### 8. Edge detectors should be treated as complementary measurements
Sobel, Scharr, Prewitt, and Canny are all available as deterministic primitives. For DTF QA, the engine should use them to compare edge continuity, orientation and sharpness across processing versions rather than using any one edge map as final artwork.

### 9. Rank filters provide robust local cleanup options
rank filtering can implement median-style cleanup and percentile selection. This is valuable for isolated specks and salt-and-pepper defects where Gaussian blur would damage edge definition.

### 10. Attention-based smart crop is not suitable as an authoritative print crop
smartcrop removes “boring” areas based on attention/interest heuristics. It can help generate web thumbnails, but production print bounds should come from alpha/geometry and explicit user placement, not visual-attention cropping.

### 11. Channel extraction/joining should underpin explicit alpha pipelines
extract_band and bandjoin2 make it straightforward to process RGB and alpha independently and reassemble them. This matches the project rule that alpha, color, trimap/confidence, and derived white response are distinct signal types.

### 12. bandmean and recomb can implement controlled luminance transforms
bandmean collapses channels; recomb applies an arbitrary band matrix. These are useful for deterministic luminance/feature derivation, but should not silently replace ICC-based profile conversions.

### 13. Effective-DPI metadata must be recomputed after resampling
reduce/shrink documentation explicitly states xres/yres are not updated. The application therefore owns physical-resolution semantics and must recompute placement effective DPI after any pixel-dimension change.

### Batch 024 conclusion
libvips is increasingly suitable as the deterministic CPU backbone for DTF Studio because it exposes the exact primitives we need for alpha-aware channel separation, resampling, edge diagnostics, local cleanup, hidden-RGB propagation, and delivery derivatives. The processing graph should still wrap these primitives with explicit alpha/color/physical-unit contracts and QA gates.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 025 — production-file semantics: TIFF alpha, PSD channels, PDF soft masks, spot-white separation, and profile discipline

The verified corpus now contains 498 individually opened/read unique pages.

### 1. TIFF explicitly distinguishes associated and unassociated alpha

TIFF 6.0 ExtraSamples semantics distinguish:
- associated alpha: RGB is premultiplied by alpha;
- unassociated alpha: RGB is independent/straight.

This must be preserved in the export contract. Writing an ExtraSamples value that disagrees with the actual pixel representation is a file-format correctness error, not merely metadata noise.

### 2. TIFF readers can silently change the representation

LibTIFF’s RGBA convenience path may normalize input into packed 8-bit RGBA and historically has had behavior around untagged extra samples and associated alpha.

For authoritative DTF print-master ingest, avoid treating TIFFRGBAImage as a lossless normalization path because it can:
- scale higher bit depth to 8-bit;
- convert color models to RGB;
- ignore colorimetry in the returned raster;
- normalize alpha representation;
- apply orientation behavior with limitations.

Use a lower-level/native-sample path when preserving bit depth, profile and exact alpha semantics matters.

### 3. TIFF orientation must be normalized deliberately

LibTIFF documents that some orientation cases require rotation plus width/height exchange and are not represented correctly by every lower-level RGBA helper.

Therefore source inspection should record orientation and the working pipeline should normalize it once, explicitly, before geometry/preflight measurements.

### 4. ExtraSamples must be read and written explicitly

TIFFSetField/TIFFGetField expose TIFFTAG_EXTRASAMPLES with a count plus type array.

Export rule:
- do not infer alpha type solely from “four channels”;
- set ExtraSamples explicitly;
- validate the tag after writing;
- include the alpha-association state in export QA.

### 5. ICC profile and TIFF alpha semantics are independent concerns

LibTIFF supports an ICC Profile tag in addition to ExtraSamples.

A valid production TIFF therefore needs separate validation for:
- color profile;
- sample depth;
- photometric interpretation;
- alpha association;
- physical resolution;
- orientation.

Passing one of these checks does not imply the others are correct.

### 6. PSD/PSB is structurally richer than a flattened raster

Adobe’s Photoshop format specification supports:
- multiple channels, including alpha;
- 8/16/32-bit depth;
- RGB, CMYK, Lab, Multichannel and other modes;
- per-layer transparency channels;
- user masks;
- vector masks;
- layer opacity/blend modes;
- optional merged/composite image.

The merged composite may not exist when “maximize compatibility” is disabled.

Therefore “PSD supported” must be capability-based:
- CAN_READ_COMPOSITE;
- CAN_READ_LAYERS;
- CAN_READ_TRANSPARENCY;
- CAN_READ_ALPHA_CHANNELS;
- CAN_READ_SPOT_CHANNELS;
- CAN_PRESERVE_16BIT;
- CAN_PRESERVE_32BIT;
- CAN_INTERPRET_COLOR_MODE.

### 7. PSD transparency and alpha channels are not the same thing

Adobe’s spec identifies per-layer channel ID -1 as transparency, while separate alpha channels are additional document channels.

DTF ingest must not assume “first alpha-like grayscale channel = transparency.”
A named alpha/spot channel may represent:
- a saved selection;
- a mask;
- a white-ink plate;
- another production separation.

### 8. Photoshop spot channels are a strong interchange model for explicit white-ink plates

Adobe Photoshop documents spot channels as separate printing plates and supports converting an alpha channel to a spot channel.

This is relevant for DTF RIP handoff where the downstream workflow recognizes a named white channel.

Potential export mode:
- COLOR composite/layers;
- named WHITE spot/separation channel;
- optional metadata identifying its intended role.

However RIP-specific naming conventions still require provider/device validation.

### 9. Photoshop “Solidity” is preview-only

Adobe explicitly notes that spot-channel Solidity affects on-screen/composite preview and does not change the printed separation.

This is a critical UI lesson:
- preview opacity is not ink density;
- actual white-response data must be stored in channel pixels or RIP parameters;
- never map a Photoshop-style “Solidity” control directly to production white amount.

### 10. Alpha-channel mask polarity is not universal

Photoshop can display/edit masks with either masked areas or selected areas represented by black/white depending on channel options.

Therefore imported grayscale channels require semantic metadata or user confirmation. Do not assume white always means print and black always means no-print merely because the channel is grayscale.

### 11. PDF transparency can use a separate soft-mask image

PDF supports soft masks via SMask and also supports encoded alpha/premultiplied data via SMaskInData for certain image encodings.

The mask may represent shape or opacity according to graphics-state semantics.

DTF PDF ingest should therefore distinguish:
- page transparency/compositing;
- raster image soft masks;
- clipping paths;
- spot/separation colorants.

A screenshot-style rasterization is sufficient for preview, not for production interpretation.

### 12. PDF can contain preblended image data with a matte color

The PDF reference describes a Matte entry for soft-mask images where source image samples may already be blended with a matte color.

A production rasterizer/normalizer must account for that relation when recovering straight foreground color; otherwise edge contamination can be baked into the extracted raster.

This is closely related to the halo problems already identified for ordinary premultiplied RGBA.

### 13. PDF transparency should remain isolated from the browser preview implementation

A PDF page can contain nested transparency groups, blend modes, masks and color-space interactions.

Recommended:
- bounded PDF.js/browser raster for preview only;
- isolated server-side raster/inspection path for production;
- explicit page size + embedded raster effective-DPI checks;
- preserve original PDF as immutable source.

### 14. Photoshop’s channel documentation confirms alpha and spot channels are different production objects

Adobe describes:
- color channels;
- alpha channels for masks/selections;
- spot channels for separate inks/plates.

This strongly supports the project domain model separating:
- transparency/coverage alpha;
- saved masks;
- production white/spot separations.

Do not store all three as a generic “alphaChannel[]” without role metadata.

### 15. Spot-channel names matter for interoperability

Adobe warns that spot channels should be named so other applications recognize them correctly.

For DTF export adapters:
- white-channel name should be provider/RIP-configurable;
- record the exact exported name in the recipe;
- validate the written file by reopening it and enumerating channels before release.

### 16. Soft proof is an output simulation, not an editing truth

Adobe soft-proof documentation explicitly depends on:
- document profile;
- proof/output device profile;
- monitor profile;
- ambient viewing conditions.

It also distinguishes simulated paper color and black ink.

Therefore DTF Studio may offer a profile-based proof view, but should label it approximate and keep it separate from the source/master.

### 17. Assign Profile and Convert to Profile are fundamentally different

Adobe’s current profile documentation makes the distinction explicit:
- Assign Profile changes interpretation without changing channel numbers;
- Convert to Profile changes channel numbers to preserve appearance under a new profile.

Our color pipeline should expose these as distinct internal operations and audit them separately.

A missing-profile repair is often ASSIGN/ASSUME, not CONVERT.

### 18. Untagged files require an explicit assumption state

Adobe describes untagged documents as raw color numbers interpreted through a working-space policy.

DTF ingest should store:
- embeddedProfile = null;
- assumedProfileId;
- assumptionReason;
- userOverrideStatus.

Do not silently tag every unprofiled image as sRGB without recording that assumption.

### 19. Gamut warning is a diagnostic, not an automatic color fix

Adobe’s gamut-warning workflow highlights pixels outside a selected proof profile.

This supports a DTF preflight warning:
OUT_OF_GAMUT_FOR_SELECTED_OUTPUT_PROFILE.

The tool should show affected regions and proof them; it should not automatically remap colors without an approved transform.

### 20. Color management is device/process specific

Adobe emphasizes that a reliable printer profile describes the printer plus print conditions/media.

For DTF that profile effectively depends on:
- printer;
- ink set;
- film/media/workflow;
- print mode/resolution;
- RIP calibration/linearization;
- measurement conditions.

The web application cannot infer this reliably from uploaded RGB pixels alone.

### 21. Profile embedding should be verified on export

Adobe lists PSD, TIFF, JPEG, PDF and PSB among formats that can carry embedded profiles.

Export QA should reopen the artifact and verify:
- profile exists where required;
- profile hash matches intended profile;
- color numbers were not accidentally converted when only embedding/assigning was intended.

### 22. ImageMagick trim semantics are unsuitable as the sole transparent-bound authority

ImageMagick’s current trim documentation notes fully transparent pixels are often treated as if color is irrelevant.

That is convenient for display trimming but may conflict with our hidden-RGB preservation model.

Production transparent bounds should derive primarily from alpha/coverage and component rules, not from corner-color trim alone.

### 23. General image libraries remain useful only behind explicit contracts

The libvips function inventory and ImageMagick command surface show that both libraries provide many primitives.

But the research increasingly shows that correctness depends less on “does a function exist?” and more on:
- alpha representation;
- channel role;
- bit depth;
- color profile;
- physical units;
- border behavior;
- deterministic recipe ordering.

### 24. Proposed ProductionChannel model

Add a domain-level channel descriptor:

channelRole:
- COLOR_COMPONENT;
- TRANSPARENCY;
- SAVED_MASK;
- SPOT_WHITE;
- SPOT_OTHER;
- CONFIDENCE;
- TRIMAP;

name;
bitDepth;
association: STRAIGHT | PREMULTIPLIED | NOT_APPLICABLE;
polarity: WHITE_IS_MORE | BLACK_IS_MORE | CONTINUOUS;
printSeparation: boolean;
profileOrColorantId;
sourceProvenance.

This prevents PSD/TIFF/PDF channels from collapsing into ambiguous arrays.

### 25. Batch 025 conclusion

The new conclusion is that DTF Studio’s file-ingest/export layer needs to be channel-aware, not merely image-aware.

For PNG, transparency is straightforwardly part of RGBA. For TIFF, PSD and PDF, extra channels can represent fundamentally different production concepts. The engine must preserve and label those roles before any automatic processing or RIP handoff.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 026 — alpha I/O policy, PSD/spot-channel preservation, local-contrast safety, and region-aware cleanup

The verified corpus now contains 518 individually opened/read unique pages.

### 1. OpenImageIO confirms that file alpha semantics and in-memory alpha semantics can differ

OpenImageIO's plugin documentation exposes an explicit `oiio:UnassociatedAlpha` flag. By default, formats that store unassociated/straight alpha may be converted to OIIO's associated/premultiplied convention when read, unless the caller explicitly asks to leave alpha unassociated.

Implication for DTF Studio:
- file-format alpha association must be recorded at ingest;
- working-memory alpha representation must be recorded separately;
- decode must not silently collapse those two concepts.

Recommended fields:
- fileAlphaAssociation;
- workingAlphaRepresentation;
- conversionAppliedOnDecode.

### 2. PNG premultiplication has an additional linear-light choice

OpenImageIO's PNG plugin has `png:linear_premult`, which can linearize sRGB/gamma-encoded RGB before premultiplication or unpremultiplication.

This is important because two mathematically different paths exist:
- premultiply encoded RGB directly;
- linearize -> premultiply -> encode again.

For high-fidelity DTF reference processing, benchmark both on:
- antialiased white text;
- saturated colored edges;
- soft glow;
- smoke;
- transparent gradients.

The pipeline must not assume that "premultiply" alone completely specifies the math.

### 3. Input decoders should expose alpha association instead of hiding it

OpenImageIO ImageInput allows the caller to request that unassociated alpha remain unassociated and exposes the resulting state in metadata.

This is a good design model for our decoder contract:
decode(input, alphaPolicy = preserve | normalize_to_premultiplied)

The decoded artifact should report the actual resulting alpha state.

### 4. TIFF extra-channel interpretation must be preserved explicitly

The TIFF/metadata material distinguishes associated alpha, unassociated alpha, and unspecified extra samples.

That means TIFF ingest cannot simply say "channel 4 = transparency."

For every extra channel:
- read its declared role if available;
- preserve association semantics;
- reject or quarantine ambiguous production channels rather than guessing.

This extends the ProductionChannel model from the previous batch.

### 5. PSD save options prove alpha channels, spot channels, layers, and color profile are independent preservation choices

Adobe's PhotoshopSaveOptions exposes separate switches for:
- alphaChannels;
- spotColor;
- layers;
- embedColorProfile.

Therefore a PSD can preserve or discard each independently.

DTF export/normalization must verify all required production properties after save; a successful PSD write does not guarantee spot white, masks, layers, or profile were retained.

### 6. Photoshop channel types are semantically distinct

Adobe exposes different channel kinds:
- COMPONENT;
- MASKEDAREA;
- SELECTEDAREA;
- SPOTCOLOR.

This strongly supports not treating every Photoshop channel as generic grayscale data.

For DTF:
- component channel -> color data;
- alpha/mask channel -> selection/mask semantics;
- spot channel -> printable separation such as white.

A spot-white channel should never be passed through alpha cleanup logic just because both are grayscale.

### 7. Photoshop channel opacity is separate from channel pixel values

Adobe's Channel object has an opacity/solidity property in addition to the pixel content itself.

For spot-color imports this matters:
- channel raster coverage;
- spot channel colorant identity;
- channel solidity/opacity
are distinct pieces of information.

Our parser/adapter should preserve all three when available.

### 8. Photoshop selections can be used as a controlled morphology reference

Adobe Selection APIs expose:
- contract;
- expand;
- feather;
- smooth;
- border;
- grow.

These are useful reference behaviors for manual correction UX, but they also reveal important edge cases:
- contract/expand near canvas bounds have specific behavior;
- smooth can remove isolated groups smaller than its radius;
- large operations can erase a selection entirely.

Our own mask-editing UI should implement guarded equivalents with:
- physical-unit conversion;
- preview;
- minimum-stroke checks;
- undo/versioning.

### 9. Selection smoothing is not a harmless cosmetic operation

Adobe explicitly states that smoothing can remove isolated pixel groups below the selected radius.

For DTF this means:
- punctuation, dots, registration marks, fine ornaments, or small detached design elements can disappear;
- smooth must be routed through connected-component protection;
- "clean edges" cannot be a blind global smoothing pass.

### 10. Adobe imaging API separates image color profile from mask profile

The Imaging API carries explicit colorSpace/colorProfile metadata for image data, while mask/selection examples use grayscale data and a grayscale profile.

This reinforces:
- mask values and color pixels live in different semantic spaces;
- do not run RGB ICC transforms on mask/alpha/trimap/confidence channels;
- mask transfer curves should be controlled independently.

### 11. JPEG export is destructive for transparency by definition of the workflow

Adobe JPEG save options include a matte color specifically for anti-aliased edges adjacent to transparent areas.

This is a practical warning:
- JPEG can be a display/mockup derivative only;
- it must never be considered a transparent print master;
- when generating JPEG previews, matte color must be explicit so edge appearance is predictable.

### 12. Matte color used for JPEG preview can conceal edge contamination

A white-matted JPEG preview can hide a white halo that will become obvious on a black garment.

Therefore quality review must use true alpha composites on multiple backgrounds before any flattened JPEG preview is generated.

### 13. PSD/PSB compatibility flattening needs verification

Adobe's file-handling options include maximizeCompatibility for PSD/PSB.

That can help interoperability, but our tool must distinguish:
- live editable layer/channel structure;
- flattened compatibility composite.

The compatibility composite is useful for preview/fallback, not sufficient proof that editable/production channels survived.

### 14. Adobe API output migration now includes explicit ICC profile handling

The current Photoshop API v2 output model adds optional ICC profile output controls.

This supports a provider-adapter rule:
- color profile intent must be passed explicitly when exporting through provider APIs;
- output artifact must be reopened/verified rather than trusting request intent alone.

### 15. Duotone/Multichannel behavior is relevant to separation logic

Adobe's duotone documentation notes that converting to Multichannel yields separate spot-color channels/printing plates, and that screen angles affect printed output.

For DTF this is another confirmation that printable spot separations are first-class production data, not display alpha.

### 16. OpenImageIO format plugins expose format-specific alpha/profile differences

The bundled plugin docs show that different formats have different:
- bit-depth limits;
- alpha conventions;
- color-space assumptions;
- metadata capabilities.

The ingest layer therefore needs per-format capability tables rather than one generic raster decoder policy.

### 17. Global histogram equalization remains unsuitable as a default artwork fix

libvips `hist_equal` is a global histogram equalization primitive.

It can dramatically change intended artwork tone.

Policy:
- diagnostic/advanced candidate only;
- never automatic for logos/illustrations;
- if proposed for photos, compare color drift and local contrast before/after.

### 18. CLAHE/local histogram equalization gives a safer but still bounded contrast option

libvips `hist_local` supports local histogram equalization and can limit the cumulative-histogram slope, effectively constraining maximum brightening.

This is preferable to unconstrained local contrast enhancement when needed, but still:
- apply on luminance/controlled channels;
- preserve alpha independently;
- constrain max_slope;
- require preview for appearance-changing results.

### 19. Region labeling should be a core cleanup primitive

libvips `labelregions` assigns labels to connected regions.

This can support:
- counting debris islands;
- preserving legitimate detached text marks;
- tracking fragmentation after cleanup;
- selective deletion based on area + distance + class;
- component-aware QA before/after morphology.

Region labeling should happen before destructive small-object removal.

### 20. Batch 026 conclusion

The image-preparation architecture now needs a stronger separation between:
- file-format semantics;
- in-memory pixel representation;
- mask/selection semantics;
- printable spot-channel semantics;
- display-preview semantics.

The same grayscale raster can mean transparency, a saved selection, a spot-white plate, a confidence map, or a trimap. Every ingest and export path must preserve that meaning explicitly.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 027 — resampling precision, operation scope, mask semantics, and transform safety

The verified corpus now contains 538 individually opened/read unique pages.

### 1. Low-level horizontal/vertical reduction exposes an explicit speed-vs-quality trade-off

libvips reduceh/reducev use interpolation kernels and can optionally pre-shrink with a box filter via the gap parameter. The documentation explicitly states that these operations do not update image x/y resolution.

DTF rule:
- recompute physical/effective DPI after any pixel resize;
- quality-critical print derivatives should use the accurate path;
- speed optimizations belong to preview paths until verified on transparent-edge fixtures.

### 2. Box shrinking is useful for coarse stages, not final print reduction

libvips shrinkh is a low-level box-filter reduction. Box averaging is valuable for fast coarse inference images, but it is not the preferred final reduction for antialiased text, fine line art, or soft alpha.

Use:
- coarse segmentation/inference preparation;
- fast analysis pyramid;
- never as the only final print-quality resampler unless validated for that content class.

### 3. Arbitrary transforms are resampling operations, not merely geometry metadata

libvips similarity/rotate delegate to affine processing and accept interpolation/background parameters.

Therefore any arbitrary-angle rotation or scale can alter:
- alpha transition width;
- thin-stroke topology;
- hidden RGB;
- edge color.

Production QA should run after the final placement transform, and newly exposed pixels must have explicit transparent-background semantics.

### 4. Right-angle rotation should use discrete rotation where possible

libvips rot handles fixed right-angle rotations separately.

Policy:
- 90/180/270-degree turns should use discrete rotation paths;
- arbitrary-angle rotation triggers interpolation-aware QA;
- repeated transformations should always derive from an immutable source/candidate rather than transforming the last transformed raster again.

### 5. Cast/quantization is a destructive boundary

libvips cast truncates floating-point values and clips values outside the output type range.

DTF rule:
- retain float/16-bit working data through high-quality alpha/color operations;
- delay 8-bit quantization until an explicit export/display boundary;
- record bit depth and quantization step in the processing recipe.

### 6. Band joining is not enough; channel meaning must also be carried

libvips bandjoin simply concatenates channels and may enlarge smaller images with zero padding.

Every assembly step must preserve semantic labels:
- R/G/B;
- alpha coverage;
- white spot plate;
- confidence;
- trimap;
- auxiliary mask.

A grayscale band must never become "alpha" merely because it is the fourth band.

### 7. Thumbnail generation is a delivery path, not a production-master path

libvips thumbnail uses shrink-on-load, block shrink, then Lanczos3 for at least the final stage, optimizing speed and quality for delivery.

Use it for:
- storefront;
- gallery;
- admin cards;
- mockup previews.

Never derive a print master from a thumbnail derivative.

### 8. Exact crop should use stored coordinates

extract_area gives deterministic rectangular extraction.

For authoritative production geometry:
- compute bounds from alpha/diagnostics;
- store left/top/width/height;
- crop exactly from those coordinates;
- preserve crop origin in placement metadata.

Attention/saliency crop belongs only to display derivatives.

### 9. Morphology must operate on intentionally binary masks

libvips morph expects binary object/background semantics and a structuring element with explicit object/background/don't-care values.

Therefore:
- do not feed continuous alpha directly into morphology;
- derive a binary operation mask from a versioned threshold;
- keep continuous alpha as the authoritative coverage;
- use morphology to propose/derive controlled corrections rather than replacing the matte blindly.

### 10. Median filtering is a targeted impulse-noise operation

libvips median is the median rank-filter special case.

Use for isolated specks/impulse noise only when diagnostics justify it. Protect text/logo topology by:
- physical filter-size limit;
- before/after component count;
- skeleton continuity;
- edge-energy check.

### 11. ifthenelse is a strong deterministic primitive for confidence-gated refinement

libvips ifthenelse selects per-pixel data from two candidates using a condition image.

This directly supports:
- keep original alpha in high-confidence regions;
- use refined alpha only in uncertain regions;
- replace RGB only inside an edge-decontamination band;
- merge manual correction masks without reprocessing the whole image.

This is exactly the kind of localized, explainable processing preferred for DTF.

### 12. Gaussian kernels should be generated reproducibly

libvips gaussmat creates a Gaussian kernel from sigma and a minimum-amplitude cutoff.

If Gaussian blur/feathering is used:
- store sigma/min-amplitude;
- relate sigma to physical edge-band intent where practical;
- use float precision for reference outputs;
- do not expose arbitrary blur as an automatic "quality improvement."

### 13. Approximate convolution should be restricted by workflow tier

libvips conva trades accuracy for speed using layers and clustering, while convf performs convolution in floating-point.

Suggested policy:
- authoritative reference/master candidate: float/exact path;
- preview/diagnostic path: approximate convolution allowed after benchmark validation;
- record precision/approximation mode if it can change visible output.

### 14. Frequency-domain multiplication is useful as a diagnostic primitive

libvips freqmult performs Fourier-domain masking and inverse transformation.

Potential DTF use:
- controlled low/high/band-pass diagnostics;
- frequency-energy analysis for blur/detail classification;
- not a default master effect.

Frequency-domain operations require boundary/windowing discipline to avoid interpreting rectangular-image boundaries as real signal.

### 15. ImageMagick compositing confirms mask/read-mask semantics must be explicit

ImageMagick's composite documentation distinguishes normal masks from read masks and exposes compositing, affine, alpha, profile, density and virtual-pixel behavior.

The main architectural lesson is that:
- mask direction/convention matters;
- alpha/channel targeting matters;
- virtual pixels/background during transforms matter;
- command defaults must never be trusted implicitly for a production recipe.

### 16. Processing tiers can now be formalized

PREVIEW_FAST:
- thumbnail/shrink-on-load;
- coarse segmentation;
- approximate/non-authoritative diagnostics.

STANDARD:
- alpha-aware high-quality resize;
- confidence-gated edge refinement;
- exact crop/placement geometry;
- deterministic masks.

QUALITY:
- float convolution/reference kernels;
- high-res matte/foreground reconstruction;
- topology/color/alpha QA;
- export/RIP contract validation.

### 17. Proposed operation contract extension

Each operation node should declare:
- operationName/version;
- inputAlphaRepresentation;
- outputAlphaRepresentation;
- maskMeaning if any;
- colorSpace/encoding;
- precision mode;
- interpolation/kernel;
- border/background policy;
- physical-scale metadata;
- whether geometry changes;
- whether appearance changes;
- output hash.

### 18. Proposed transform regression suite

For every resize/rotate/crop/morph pipeline test:
- hard black text;
- hard white text;
- 1px/2px lines;
- Arabic dots/diacritics;
- soft glow;
- smoke/fur edge;
- transparent colored hidden RGB;
- edge touching canvas boundary;
- detached small components.

Validate:
- stroke width;
- component count;
- skeleton continuity;
- alpha edge width;
- color fringe;
- effective DPI;
- crop/placement coordinates.

### 19. Batch 027 conclusion

The image-processing architecture should distinguish three different optimization goals:
- fast preview;
- standard safe preparation;
- high-quality production candidate.

The same low-level library can support all three, but the kernels, precision, alpha handling, mask semantics, and QA gates must differ.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 028 — quantitative QA from entropy/histograms, per-pixel Delta-E maps, and linear-light working conversions

The verified corpus now contains 558 individually opened/read unique pages.

### 1. Entropy can be a cheap routing feature, but not a quality score by itself

libvips exposes histogram entropy as:
- sum(p * log2(p)) with sign inversion.

For DTF routing, global or regional entropy can help distinguish:
- flat/logo-like regions;
- textured photographic regions;
- near-empty/low-information transparent assets.

But entropy alone is not "quality." A clean flat logo may intentionally have low entropy, while a noisy photograph may have high entropy.

Use entropy as a classifier feature, not an acceptance threshold.

### 2. Percentile-derived thresholds are more robust than hard-coded 8-bit values

vips_percent returns the pixel value below which a requested percentage of pixels falls and is explicitly suitable for thresholding scaled filter results.

That supports adaptive diagnostics such as:
- edge-strength cutoff based on the 90th/95th percentile;
- low-alpha haze cutoff from an alpha histogram percentile;
- bright/dark residue candidate thresholds based on distribution rather than one universal numeric value.

These thresholds still need guardrails for sparse graphics and bimodal masks.

### 3. Histogram matching is appearance-changing and should remain an opt-in repair

libvips hist_match can build a lookup mapping one normalized cumulative histogram toward another reference distribution.

This is useful as:
- controlled restoration toward a known reference;
- batch normalization under a documented template.

It is not safe as a generic "improve colors" operation for customer artwork because it can materially alter intentional tonal design.

### 4. Histograms can support diagnostics without applying histogram equalization

The combination of hist_find, hist_norm, hist_cum, percent, avg and deviate allows us to measure:
- alpha occupancy distribution;
- low-opacity residue;
- luminance spread;
- clipped highlight/shadow fractions;
- color-channel imbalance;
- before/after tonal redistribution.

This gives the preflight engine strong non-destructive evidence before it suggests contrast or cleanup.

### 5. Per-pixel Delta-E maps are practical in the chosen raster engine

libvips has explicit dE00, dE76 and dECMC image operations that produce an output image of color differences between corresponding pixels.

This enables:
- a full color-difference heat map, not just one average number;
- median / p95 / max Delta-E over opaque foreground;
- special weighting around text, logos, faces, and alpha-transition bands;
- exclusion of intentionally edited regions.

CIEDE2000 should be the main perceptual drift metric for general QA, with dE76 and CMC useful for supporting comparisons.

### 6. Color-difference QA should be region-aware

A whole-canvas average can be misleading because transparent/background pixels dominate many DTF files.

Compute color QA over masks such as:
- confident opaque foreground;
- edge transition band;
- user-designated protected colors;
- optional skin/text/logo semantic regions where available.

Report both global and masked percentiles.

### 7. Color transforms need an explicit encoded-to-linear step

libvips provides sRGB2scRGB and scRGB2sRGB, with 16-bit output support when converting back to sRGB.

This gives us a concrete deterministic route for operations that should be linear-light:
sRGB encoded -> scRGB linear working representation -> processing/compositing -> sRGB encoded display/export derivative.

Alpha remains separate and linear coverage throughout.

### 8. 16-bit display/export derivatives are technically possible

scRGB2sRGB supports 16-bit output.

That means the internal pipeline does not need to collapse every high-quality result to 8-bit immediately. For selected high-bit-depth artifacts, we can preserve additional precision through:
- color transform;
- high-quality composite/proof;
- later export.

Web display still usually receives an 8-bit optimized derivative.

### 9. Lab/XYZ conversion white-point assumptions must be explicit

libvips Lab2XYZ defaults to D65 but allows a specified color temperature.

Therefore any Lab/XYZ metric pipeline must record or control the reference white/temperature. Mixing Lab values computed under different white-point assumptions would invalidate color-difference interpretation.

The QA recipe should record:
- source profile/working space;
- Lab reference white;
- conversion path;
- Delta-E formula.

### 10. Patch measurement can support printer/profile validation

vips_measure analyzes a grid of color patches, averages the central 50% of each patch, and warns when patch deviation is high relative to the mean.

This is useful for a future calibration/verification workflow:
- photograph/scan/measured chart input;
- patch localization;
- patch average statistics;
- compare against expected values.

It should not replace spectrophotometer-based calibration, but it can support software-side chart QA and detect badly captured/uneven patch images.

### 11. Mean, standard deviation, minima and maxima are useful primitive checks

libvips avg, deviate, min and max are simple but valuable for robust assertions:
- alpha entirely zero -> empty asset;
- alpha entirely full -> opaque asset;
- suspiciously low RGB variance -> nearly blank/flat;
- extreme clipped regions -> possible posterization or bad levels;
- compare edge-band variation before/after processing.

These checks are fast and should run early in preflight.

### 12. Statistics should be computed on semantically relevant masks

For transparent DTF art:
- ignore fully transparent pixels for foreground color statistics;
- analyze alpha separately;
- use transition-band masks for halo diagnostics;
- use connected-component masks when one stray island would distort global min/max/bounds.

This avoids false alarms from hidden RGB under alpha=0.

### 13. Boolean band reductions can simplify mask-combination logic

vips_bandbool can reduce multiple bands to one using boolean operators.

Potential internal uses:
- combine per-channel threshold results;
- assert all channels satisfy a range condition;
- build one QA mask from multi-band relational outputs.

Because float input is cast to integer before boolean processing, use it only after deliberate thresholding/casting, not directly on continuous color values.

### 14. Automatic thresholds should use distributions, not only absolute values

A robust low-alpha residue detector could combine:
- alpha histogram;
- percentile threshold;
- connected-component size;
- distance from strong foreground;
- edge-band membership.

This is stronger than saying "delete every alpha below 5%" because legitimate smoke/glow may intentionally occupy that range.

### 15. Proposed ColorIntegrityReport

Add:
- deltaE00Median;
- deltaE00P95;
- deltaE00Max;
- edgeDeltaE00P95;
- protectedRegionDeltaE00P95;
- luminanceMeanDelta;
- luminanceStdDelta;
- clippedShadowFraction;
- clippedHighlightFraction;
- histogramShiftScore;
- workingColorSpace;
- referenceWhite;
- profileTransformId;
- intentionalColorEditMaskId.

The report is evidence for approval, not an automatic aesthetic judgment.

### 16. Proposed AlphaDistributionReport

Add:
- opaqueFraction;
- transparentFraction;
- semiTransparentFraction;
- alphaEntropy;
- lowAlphaResidueFraction;
- lowAlphaIslandCount;
- p01/p05/p50/p95/p99 alpha;
- transitionBandArea;
- disconnectedForegroundCount.

This gives the router a compact quantitative view of whether the artwork is hard-edged, soft, noisy, or mostly empty.

### 17. Calibration charts should have capture-quality gates

Before using a photographed or scanned patch chart:
- check patch uniformity/deviation;
- reject motion blur/glare/strong gradients;
- verify crop/grid alignment;
- use only central patch areas for robust averages;
- record capture lighting/device metadata when available.

Actual ICC calibration remains a measured production workflow; this software-side analysis is a validation aid.

### 18. Batch 028 conclusion

The prepress engine can obtain a large amount of reliable evidence with cheap deterministic statistics before invoking expensive AI.

A recommended early analysis pass is now:
1. alpha occupancy + histogram;
2. luminance/color histograms;
3. entropy/texture features;
4. min/max/mean/deviation;
5. connected-component geometry;
6. effective DPI;
7. edge/blur metrics;
8. only then choose AI or appearance-changing corrections.

This reduces unnecessary processing and makes every suggestion explainable.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 029 — orientation-first normalization, distance-based physical masks, response-curve validation, and diagnostic-only frequency transforms

The verified corpus now contains 578 individually opened/read unique pages.

### 1. Orientation must be normalized before any geometry or DPI analysis

libvips autorot applies EXIF/orientation metadata to the pixels and removes the orientation tag afterward to prevent accidental double rotation.

DTF ingestion order should therefore be:
1. inspect source metadata;
2. preserve immutable original;
3. create orientation-normalized working copy;
4. only then calculate width/height, alpha bounds, print placement, effective DPI, crop and mockup geometry.

Otherwise portrait/rotated phone artwork can receive incorrect physical-size and placement calculations.

### 2. Orientation normalization must be versioned, but not treated as an artistic edit

Record:
- sourceOrientationTag;
- normalizedRotationDeg;
- normalizedFlip;
- normalizedWidthPx/HeightPx.

This is a geometric normalization step, not a user appearance correction.

### 3. Adding an alpha channel is not the same as deriving transparency

libvips addalpha only appends an alpha channel.

The pipeline must distinguish:
- HAS_NO_ALPHA;
- OPAQUE_ALPHA_ADDED;
- SOURCE_ALPHA;
- DERIVED_ALPHA.

An opaque alpha added for API compatibility must never be misreported as successful background removal or transparency analysis.

### 4. Crop primitives should only execute after authoritative bounds are chosen

libvips extract_area performs an exact rectangular crop and requires the crop to fit the input.

For DTF, compute crop intent first from:
- alpha coverage bounds;
- component filtering;
- required safety margin;
- product placement rules.

Then use deterministic rectangular extraction. Crop should not itself decide what is meaningful artwork.

### 5. Geometric transforms require explicit interpolation and border policy

OpenCV documents geometric transforms as inverse mappings with two separate concerns:
- interpolation at fractional source coordinates;
- extrapolation outside source bounds.

Its available interpolation choices include nearest, linear, cubic, area and Lanczos, and it also supports BORDER_TRANSPARENT in warp operations.

This reinforces the need for every transform recipe to store:
- interpolation;
- borderMode;
- borderColor/alpha where relevant;
- alphaRepresentation;
- whether physical resolution metadata was recomputed.

### 6. Downscale and upscale need different interpolation policy

OpenCV specifically notes INTER_AREA as a preferred shrink method, while cubic or linear are typical enlargement choices.

For DTF:
- web/downscale path may use area/Lanczos-style antialiased reduction;
- print enlargement should be benchmarked by artwork class;
- nearest-neighbour is reserved for intentionally pixelated art or diagnostic masks.

### 7. Distance transform is a core primitive for physically meaningful choke/spread

OpenCV distanceTransform computes distance from each foreground pixel to the nearest zero/background pixel, with approximate and precise L2 modes.

This gives a stronger mask model than repeated morphology for larger physical distances:
- compute signed/paired inside-outside distance;
- threshold by physical radius converted from mm to pixels;
- derive choke/spread with consistent Euclidean geometry;
- compute local stroke radius along the medial structure.

### 8. Distance labels can link pixels to nearest background components

The labeled distance-transform variant can identify the nearest zero pixel or connected zero component.

Potential diagnostic uses:
- distinguish holes from exterior background;
- detect narrow gaps between design components;
- measure which background pocket would disappear first under spread/closing;
- support minimum-gap analysis.

### 9. Flood-fill and threshold functions remain deterministic fallback tools

OpenCV miscellaneous image transformations include thresholding, adaptive thresholding, flood fill and distance transforms.

For simple backgrounds:
- border-seeded flood fill constrained by color distance can identify connected background;
- thresholding can generate seeds/diagnostic masks;
- learned segmentation is unnecessary when deterministic evidence is strong.

These primitives should remain scoped to simple/controlled cases.

### 10. Lookup tables are a good implementation for reproducible underbase/tone response curves

libvips buildlut creates a piecewise-linear LUT from control points and maplut applies the LUT to selected bands.

This is a strong implementation candidate for:
- underbase response curves;
- calibrated opacity-response curves;
- deterministic tone corrections;
- printer-profile calibration helper curves.

The curve control points become part of the recipe and can be hashed/versioned.

### 11. Response curves should be validated for monotonicity

libvips hist_ismonotonic tests whether a LUT is monotonic.

For DTF underbase and calibration curves, monotonicity is a useful safety gate when a curve is intended to preserve ordering:
- increasing input coverage should not unexpectedly reduce output white unless the recipe explicitly allows a non-monotonic artistic/process curve.

Reject or warn on accidental inversions.

### 12. Measurement-derived inverse LUTs can support calibration helpers

libvips invertlut builds a response correction LUT from measured target-versus-real values and explicitly notes its utility for linearizing measurements from a color chart.

This is relevant to calibration-assist tooling:
- measured patches -> response table -> inverse correction curve.

But the documentation also warns that simple piecewise-linear inversion is poor for non-monotonic responses, so this is a helper, not a replacement for full ICC/device calibration.

### 13. Indexed histograms are useful for connected-component statistics

libvips hist_find_indexed can aggregate image values by an index/label image and is specifically useful together with region labeling for finding blob centers of gravity.

For DTF masks this can support:
- component area/centroid aggregation;
- residue cluster statistics;
- punctuation/detached-element analysis;
- comparing component geometry before and after processing.

### 14. Histogram plotting is diagnostic UI only

libvips hist_plot converts a histogram-shaped image into a visual plot.

This can power an advanced diagnostics panel for:
- alpha histogram;
- luminance histogram;
- white-underbase coverage histogram.

The plotted image is never production data; the underlying numeric histogram remains authoritative.

### 15. Frequency-domain transforms should stay diagnostic in the first production version

libvips fwfft and invfft provide Fourier-domain round trips.

Potential DTF uses:
- estimate directional periodic noise;
- inspect halftone/screen frequency;
- diagnose resampling aliasing;
- analyze repeated texture.

Do not apply arbitrary frequency masks to customer artwork automatically; FFT processing can create ringing and boundary artifacts if used carelessly.

### 16. Wrap/shift is useful for Fourier visualization, not normal artwork placement

libvips wrap moves image segments so a selected pixel shifts to a target position, defaulting toward the image center.

This is useful for centering Fourier spectra or cyclic diagnostic data. It must not be confused with ordinary canvas translation because content wraps across edges.

### 17. Nearest-neighbour subsampling is explicitly a speed primitive

libvips subsample is a fast nearest-neighbour integer shrink.

Use:
- coarse classifier input where quality is noncritical;
- rough masks;
- fast diagnostics.

Do not use it for customer-facing previews or print derivatives where aliasing can destroy thin details.

### 18. Canvas expansion must not inherit default black accidentally

libvips gravity places an image in a larger canvas and defaults new pixels to black unless another extend/background is specified.

For transparent DTF artwork:
- explicitly create transparent pixels with intended hidden-RGB policy;
- never rely on default black padding before blur/resize/matting;
- otherwise new black RGB can leak into semitransparent edges.

### 19. False-colour images are useful confidence/diagnostic visualizations

libvips falsecolour can turn scalar maps into easier-to-read visual diagnostics.

Good uses:
- uncertainty heatmap;
- alpha-edge risk;
- effective-DPI risk;
- blur/noise map.

Never persist false-colour output as part of the print-master path.

### 20. Batch 029 conclusion

The deterministic processing layer is becoming clearer:
- normalize orientation first;
- classify alpha semantics explicitly;
- derive geometry from masks/components before cropping;
- use distance fields for physical choke/spread/gap logic;
- use LUTs for reproducible response curves;
- validate those curves;
- reserve FFT/false-colour/subsample operations for diagnostics or bounded low-quality stages;
- explicitly control padding/interpolation at every geometric operation.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 030 — topology-aware mask repair, non-overlapping expansion, boundary-distance QA, and region-graph cleanup

The verified corpus now contains 600 individually opened/read unique pages.

### 1. Mask blending should use explicit condition semantics

libvips ifthenelse can select hard branches or smoothly blend by a condition value. For DTF this supports a clear primitive for combining:
- hard trusted foreground/background;
- soft uncertainty/confidence;
- local repair candidates.

The condition image must be typed semantically: MASK, COVERAGE, or CONFIDENCE. A confidence map should not accidentally become print alpha.

### 2. Band construction must be deliberate

bandjoin_const is useful for adding alpha or auxiliary channels, but only after channel order and interpretation are explicit. We should never infer that a four-band image means RGBA merely from band count.

### 3. Draw-mask style blending is useful for manual corrections

A user brush mask can be treated as a bounded edit layer rather than destructive painting on the source. Manual keep/remove strokes should become constraint masks that later matting/refinement respects.

### 4. Region adjacency graphs offer a smarter alternative to deleting tiny components independently

RAG methods model neighboring regions and their boundary/color relationships. This is useful when deciding whether a tiny region is:
- legitimate detached artwork;
- a fragment that should merge with a nearby region;
- background residue.

Component area alone is insufficient.

### 5. Boundary-weighted RAGs can use edge evidence directly

Boundary-based RAG examples weight adjacency by boundary evidence. In DTF cleanup, a strong edge between two regions argues against merging them, while a weak boundary plus similar color may support a merge.

### 6. Hierarchical RAG merging can create explainable cleanup stages

Instead of one destructive threshold, regions can be progressively merged by similarity. This is attractive for photographed sketches and simple-background art where illumination fragments one intended area into many pieces.

Every merge should remain bounded by topology/detail guards.

### 7. Hausdorff distance is useful for worst-case boundary displacement

Average boundary error can hide one severe local defect. Hausdorff distance reports the maximum nearest-boundary mismatch.

For DTF edge QA, compare source/reference and processed boundary sets and report both:
- mean/percentile boundary distance;
- Hausdorff/worst-case distance.

This is especially useful for missing serifs, clipped corners, and local choke damage.

### 8. Perimeter change is a practical complexity-loss metric

Different perimeter estimators show that perimeter measurement is sensitive to rasterization. Still, under a fixed method and scale, perimeter ratios are useful for detecting over-smoothing or jagged edge creation.

Do not compare perimeter values measured at different resolutions without normalization.

### 9. Flood fill is a strong deterministic background tool for connected uniform backgrounds

Flood fill grows from seeded pixels under a tolerance. For images with simple border-connected backgrounds, it can remove only the connected background while preserving same-colored interior elements that are not connected to the border.

This is safer than global color deletion in many logo/photo-on-solid-background cases.

### 10. Non-overlapping label expansion is ideal for controlled spread/repair zones

scikit-image expand_labels grows labeled regions by distance without overlaps. This suggests a powerful internal primitive for:
- expanding competing component influence zones;
- assigning ambiguous pixels to the nearest trusted component;
- preventing repair masks from different letters/logo parts from bleeding into each other.

It is not the same as ordinary binary dilation.

### 11. Euler number is a compact topology guard

Euler number captures components minus holes (with connectivity dependence). A change can indicate:
- a letter hole closed;
- a new hole appeared;
- components merged/split.

For text/logo art, topology-change warnings should accompany component count and skeleton metrics.

### 12. Random walker is a good user-guided fallback

Random-walker segmentation uses labeled seeds and image gradients to assign unlabeled pixels probabilistically. It fits semi-automatic correction well:
- user marks KEEP/REMOVE seeds;
- algorithm resolves the uncertain region;
- resulting mask goes through matting/edge QA.

This can be a deterministic fallback when learned segmentation is uncertain.

### 13. Superpixels are useful for diagnostics and local editing, not master rasterization

SLIC/felzenszwalb/quickshift/watershed segmentations can reduce millions of pixels into regions for analysis. They can accelerate:
- color/background statistics;
- local defect grouping;
- candidate region selection.

They should not directly quantize the approved master unless explicitly requested.

### 14. Compact watershed can regularize oversegmentation but may distort irregular art

Compactness biases segments toward regular shapes. That can help create analysis regions, but it is inappropriate as a final mask method for highly irregular artwork, hair, smoke, or calligraphy.

### 15. Contour extraction supports subpixel boundary QA

Contour finding on continuous-valued masks can extract an iso-alpha boundary, for example alpha=0.5, rather than relying only on thresholded raster edges.

This is useful for measuring:
- boundary displacement;
- shape change;
- choke/spread effect;
- contour smoothness.

### 16. Region properties can classify suspicious islands more intelligently

regionprops gives geometry such as area, bbox, centroid, eccentricity, orientation and related measurements.

A debris classifier can combine:
- physical area;
- aspect/eccentricity;
- distance from main artwork;
- alpha strength;
- relation to nearby components.

This is safer than remove-everything-below-N-pixels.

### 17. Local extrema and peak detection help with distance-field geometry

Peaks in a distance transform can approximate centers of thick components or candidate watershed markers. This can help split accidentally merged blobs or quantify local maximum stroke radius.

Parameters must be physical-scale aware because min_distance in pixels changes meaning with resolution.

### 18. Joining segmentations can combine independent evidence maps

The intersection/join of two segmentations can encode agreement between:
- color-based regions;
- alpha/edge-based regions;
- semantic model regions.

This provides a path to hybrid routing without forcing one segmentation algorithm to solve every case.

### 19. Normalized cuts are a higher-cost graph option for ambiguous region grouping

Graph cuts can separate regions using global graph structure rather than a local threshold. This is valuable as an advanced fallback, but likely too expensive/complex for routine uploads compared with simpler RAG merging and seeded methods.

### 20. Proposed topology integrity report extension

Add:
- componentCountDelta;
- holeCountDelta;
- eulerNumberDelta;
- meanBoundaryDistanceMm;
- p95BoundaryDistanceMm;
- hausdorffDistanceMm;
- perimeterRatio;
- mergeEvents;
- splitEvents;
- nearestComponentGapMm;
- suspiciousIslandCount.

For text/logo/line art, any topology change should normally require review unless the operation was explicitly meant to remove debris.

### Batch 030 conclusion

This batch strengthens a key principle: DTF cleanup should preserve **relationships between regions**, not just pixels. A clean-looking mask can still be wrong if it closes a letter hole, merges two nearby strokes, deletes punctuation, or shifts one local boundary too far.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 028 — transform integrity, white/color registration, interpolation boundaries, and mockup-safe warping

The verified corpus now contains 620 individually opened/read unique pages.

### 1. Production artwork and mockup geometry must be treated as separate transform domains

The transform references reinforce a critical architectural rule:
- the production master remains in an undistorted 2D print-area coordinate system;
- affine, projective, piecewise-affine, thin-plate-spline, optical-flow, and other warps are preview/mockup operations unless the production process explicitly requires a geometric correction.

This protects the print master from accidental mockup distortion.

### 2. Inverse mapping is the safer mental model for image warping

Both scikit-image and OpenCV explain geometric warping through inverse mapping: for each destination pixel, determine the corresponding source location and interpolate.

For our image engine:
- record the exact forward placement transform for domain semantics;
- use an inverse map internally when rasterizing the transformed preview;
- do not repeatedly transform an already-transformed raster because repeated interpolation compounds blur and alpha damage;
- whenever possible, re-render from the approved source artifact plus transform metadata.

### 3. Interpolation choice should depend on direction and artwork type

OpenCV recommends INTER_AREA for shrink and cubic/linear options for enlargement; scikit-image supports interpolation orders and anti-aliasing.

DTF implications:
- photographic downscale: area/anti-aliased reduction candidate;
- logo/line art: benchmark line retention and ringing, not just perceived smoothness;
- alpha should follow the explicit premultiply/filter/unpremultiply contract already established;
- geometric preview transforms should never silently become production resampling decisions.

### 4. Border/edge mode is a first-class artifact parameter

The interpolation-edge examples show materially different results for:
- constant;
- edge;
- wrap;
- reflect;
- symmetric.

For transparent DTF artwork, wrap is generally inappropriate because it can pull content from the opposite canvas edge. Edge/reflect can also create false RGB support near a transparent boundary.

Recommended transform primitive:
- explicit borderMode;
- explicit border RGBA;
- safe transparent padding where needed;
- crop back after filtering/warping.

### 5. Affine transforms are appropriate for placement; projective transforms belong mainly to mockups

Affine transforms preserve straight lines and parallelism, making them suitable for:
- scale;
- rotation;
- translation;
- simple skew/shear when needed.

Projective transforms preserve lines but not parallelism and are useful for mockup perspective.

Therefore the existing MockupRenderer adapter should use provider-neutral placement data and apply projective/perspective distortion only to the displayed mockup, never to the authoritative print geometry.

### 6. Thin-plate spline and piecewise-affine warps are useful for curved/surface mockups

Thin-plate splines provide smooth nonlinear deformation from sparse control points. Piecewise affine deformation fits local affine transforms over a mesh.

Possible mockup use:
- cloth curvature;
- cap crown distortion;
- localized garment folds;
- more realistic perspective/deformation.

Production rule:
- these are display transforms;
- keep original normalized placement/physical dimensions intact;
- never derive the print master from the deformed mockup raster.

### 7. Registration can detect white/color-plane translation errors

Phase cross-correlation can recover translation with subpixel precision, while masked normalized cross-correlation supports invalid/masked regions.

This is directly useful for DTF QA when we have:
- color-plane preview;
- generated white underbase;
- scanned/photographed calibration output or aligned reference.

Potential metric:
- estimated X/Y registration offset;
- confidence/error;
- valid overlap mask.

A directional shift should be reported as REGISTRATION_ERROR rather than repaired using symmetric choke.

### 8. Rotation and scale mismatch can be measured separately from translation

Log-polar transforms convert:
- rotation into angular translation;
- scale into radial translation.

This gives a possible diagnostic for:
- print/scan calibration images;
- provider-generated previews;
- checking whether a white layer or derived asset was inadvertently scaled/rotated relative to color.

Again, a scale error is not a choke problem.

### 9. ECC alignment is useful for intensity-based plane comparison

OpenCV findTransformECC estimates translation/euclidean/affine/homography alignment based on image intensity similarity and can use masks.

Potential production-calibration use:
- align photographed/scanned test charts to a digital reference;
- estimate small affine registration errors;
- compare before measuring edge/white-plane offsets.

Because ECC can fail without a good initialization under large displacement, it should be a refinement stage after coarse alignment.

### 10. Robust feature matching needs outlier rejection

RANSAC tutorials demonstrate why ordinary least-squares transform estimation can be badly distorted by incorrect correspondences.

For calibration/matching:
- detect/match features;
- estimate candidate transform;
- reject outlier correspondences with RANSAC;
- validate residual distribution;
- only then trust the geometric correction/measurement.

This is useful when aligning camera-captured test prints where some feature matches are wrong.

### 11. Masked registration is better when large image regions are invalid

Masked normalized cross-correlation specifically handles missing/invalid pixels without letting the masks themselves corrupt the correlation.

DTF uses:
- compare only printed calibration marks;
- exclude transparent/empty canvas;
- exclude folds/glare in captured test prints;
- register only stable opaque regions.

This is more robust than filling invalid regions with black/white and correlating normally.

### 12. Optical flow is valuable mainly for diagnosis of nonrigid deformation

Dense optical flow estimates a vector field, not just one global transform.

Potential use:
- analyze photographed garment/fabric deformation;
- compare a mockup surface warp against a reference;
- visualize local geometric distortion.

But it is not a good default correction for production artwork because it can introduce nonrigid geometry that has no direct print-space meaning.

### 13. Image stitching reinforces the importance of one reference coordinate system

The stitching example registers multiple images to a reference and composes transforms into a global domain.

The same principle should apply to DTF:
- one stable print-area coordinate system;
- every mockup/provider view derives from it;
- do not create chains of independent transforms between successive preview images.

This reduces accumulated interpolation and coordinate drift.

### 14. Fundamental-matrix/stereo geometry is low priority for the initial DTF engine

The fundamental-matrix material is relevant to multi-view 3D reconstruction, but it is not necessary for the first production-prepress implementation.

This is a useful negative result:
- do not add stereo-vision complexity simply because geometric libraries expose it;
- 2D normalized placement plus explicit mockup warps is sufficient for the current scope.

### 15. Phase unwrapping is also low priority for ordinary DTF artwork

Phase unwrapping is specialized for modulo-2π phase data and similar scientific signals. It does not solve our normal raster-artwork preparation problems.

It should not enter the initial processing stack.

### 16. Transform integrity should be measured after every appearance-changing warp

Add a TransformIntegrityReport for any transformed candidate:
- transformType;
- matrix/controlPointHash;
- interpolation;
- borderMode;
- sourceArtifactId/hash;
- outputDimensions;
- alphaRepresentation;
- boundingBoxDelta;
- centroidDelta;
- minStrokeBefore/After;
- componentCountDelta;
- edgeEnergyRatio;
- effectiveDpiBefore/After.

This makes warping auditable.

### 17. Re-render from source rather than repeatedly editing transformed rasters

The combined findings strongly favor a non-destructive model:
source artifact + recipe + placement/warp parameters -> rendered derivative.

For example:
- changing mockup scale should re-render from the approved transparent artifact;
- changing rotation should not rotate yesterday's already-rotated preview;
- changing print size should recompute from the approved master and effective-DPI rules.

This prevents interpolation debt.

### 18. White-plane registration should use directional correction, not geometry erosion when possible

CADlink supports X/Y plane shifts separately from choke in its white/color layer controls. Registration sources reinforce why these are different operations.

Internal diagnosis:
- symmetric white overshoot around all sides -> choke candidate;
- mostly one-sided offset -> X/Y registration shift;
- changing offset across image -> affine/nonlinear registration issue;
- white density visible without geometric overshoot -> density/underbase issue.

### 19. Mockup realism and print correctness should have separate quality metrics

Mockup metric:
- perceived surface fit;
- perspective/curvature plausibility;
- alignment to visible garment landmarks.

Print metric:
- physical size;
- normalized placement;
- effective DPI;
- print-area bounds;
- alpha/topology/color integrity.

A very realistic mockup can coexist with a wrong print placement if these domains are not separated.

### 20. Batch 028 conclusion

The major new architectural rule is:
**store placement and print geometry as clean mathematical data, and treat raster warps as disposable derivatives.**

Registration tools should be used mainly to measure and diagnose real output/calibration or to align external imagery, while mockup warps should never become the source of truth for the print master.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 029 — alpha-safe resampling, edge decontamination, trimap confidence, and ICC proofing

The verified corpus now contains 643 individually opened/read unique pages.

### 1. Premultiplied alpha is not optional for filtering/resampling correctness

Microsoft Win2D documentation and multiple resampler implementations converge on the same rule:
- straight alpha is convenient for authoring/storage;
- premultiplied alpha is safer for filtering/compositing;
- mixing RGB channels without alpha weighting creates color bleed/halos.

This supports a strict raster primitive:
STRAIGHT -> PREMULTIPLY -> FILTER/RESAMPLE -> UNPREMULTIPLY when required by the next stage/export.

### 2. Alpha-state should be tracked explicitly, not inferred from file format

Win2D uses straight alpha at parts of the API surface while internally rendering premultiplied. DirectX/WIC APIs also expose explicit alpha-mode choices.

For DTF Studio every processing node should declare:
- input alpha representation;
- output alpha representation;
- whether alpha is coverage, mask, trimap, or confidence.

### 3. Premultiply round-trips are not lossless at alpha=0

DirectXTex and libvips both document the practical consequence:
fully transparent pixels lose hidden RGB when converted to premultiplied form.

Therefore:
- immutable source bytes remain untouched;
- processing derivatives may lose hidden RGB only under an explicit policy;
- edge hidden RGB should be reconstructed toward foreground color where needed to suppress halos.

### 4. Alpha-weighted resampling is a widely repeated implementation pattern

STB image resize code and recent Java/matplotlib implementations explicitly premultiply before resampling and unpremultiply afterward.

This gives us an excellent cross-library regression target:
our transparent-resize fixture should agree closely with several independent implementations.

### 5. Color decontamination must remain separate from mask refinement

Current rembg-family implementations make a useful distinction:
- decontaminate: change edge RGB while preserving alpha;
- alpha matting: refine coverage/shape and also recover foreground color.

This maps directly to our diagnosis model:
COLOR_FRINGE -> decontaminate RGB;
COVERAGE_ERROR -> refine/matte alpha;
BOTH -> matte + foreground reconstruction.

### 6. A binary or coarse segmentation mask should not be treated as a final alpha matte

The matting survey, LSA Matting, SAM2Matting wrappers, and trimap-generator work all reinforce that segmentation and matting solve different problems.

Recommended path:
coarse segmentation -> confidence/trimap -> alpha refinement -> foreground reconstruction.

### 7. Trimap construction is itself a tunable algorithm

Automatic trimap generation using dilation/connected structure shows that unknown-band width and connectivity matter.

For DTF:
- hard logo edge -> narrow unknown band;
- hair/fur/smoke -> wider adaptive unknown band;
- small text/thin strokes -> topology-critical regions should be protected from over-expansion/erosion.

### 8. User corrections should become hard constraints

Traditional matting methods and trimap workflows consistently separate definite foreground, definite background, and unknown.

Any user brush correction in our editor should persist as a constraint:
- confirmed FG cannot be eroded away by later AI refinement;
- confirmed BG cannot return as semi-transparent haze;
- only UNKNOWN remains free for optimization.

### 9. Foreground reconstruction is as important as alpha for halo-free edges

Current tools such as nobg and closed-form/decontamination pipelines explicitly recover foreground RGB in semi-transparent pixels.

QA should separately score:
- alpha/coverage error;
- foreground RGB error in transition pixels;
- composite error on black and white backgrounds.

### 10. Two-background or known-background matting can be highly reliable when available

Some implementations solve foreground/alpha more directly when the same subject is observed against known contrasting backgrounds.

This is especially interesting for controlled AI/design-generation workflows where we can render the same artwork against two known backgrounds to recover cleaner transparency.

### 11. Edge quality metrics should dominate evaluation

Multiple background-removal projects now report edge-specific error because global IoU can hide poor boundaries.

Our benchmark should weight:
- transition-band MAE/SAD;
- connectivity/topology retention;
- minimum stroke/gap retention;
- color-fringe score;
- black/white composite error.

### 12. Different matting semantics may need different algorithms

The Semantic Image Matting survey direction confirms that hair, nets, transparent materials, fine structures, and soft blur are not equivalent edge cases.

Add an EDGE_CLASS signal:
- HARD_ANTIALIASED;
- HAIR_FUR;
- SMOKE_GLOW;
- TRANSLUCENT_MATERIAL;
- FINE_NET_STRUCTURE;
- MOTION_SOFT_EDGE.

Routing can then select/refuse algorithms by edge class.

### 13. Matting model licensing must remain part of model eligibility

Several modern matting repos/models use noncommercial terms or datasets with separate restrictions.

Production registry must continue to track:
- code license;
- checkpoint/weights license;
- dataset/training restrictions;
- commercial-use status.

A technically excellent model is not automatically eligible for a commercial DTF platform.

### 14. Matplotlib gives another real-world confirmation of float premultiplied resampling

Matplotlib converts uint8 RGBA to float where needed, premultiplies RGB by alpha, resamples, then divides by alpha where nonzero.

This also suggests avoiding low-precision integer arithmetic for repeated alpha conversions on quality-critical edges.

### 15. Color proofing needs a defined viewing context

ICC guidance defines D50-based reference conditions and distinguishes rendering intents.

For DTF soft proofing:
- proof profile and display profile are explicit;
- viewing intent is explicit;
- proof is approximate and should be labeled;
- output appearance depends on actual media/viewing conditions.

### 16. Rendering intent is a policy decision, not an automatic quality score

ICC documentation defines perceptual, saturation, media-relative colorimetric, and absolute colorimetric as different gamut-mapping goals.

DTF Studio should not claim one intent is universally “best.”
The selected production/profile preset should define the intended use.

### 17. Black-point compensation is contextual

ICC White Paper 40 explains BPC in relation to source/destination dynamic range and rendering intent.

BPC belongs in the color-transform recipe, not as a generic image-enhancement toggle.

### 18. Display-gamut diagnostics should not be confused with printer-gamut proofing

ICC's display-gamut guidance concerns the display profile and PCS. A display gamut warning does not tell us whether a DTF printer can reproduce the color.

We need separate states:
- DISPLAY_GAMUT_WARNING;
- PRINTER_PROOF_GAMUT_WARNING.

### 19. Browser/client preview can follow the same logical compositing semantics but is not authoritative

Client-side removal and compositing tools can provide fast visual feedback, but authoritative QA should remain server-side/versioned.

Browser outputs are useful for interaction and confidence hints, not the final production truth.

### 20. Batch 029 conclusion

The strongest result from this batch is a stricter type-and-routing discipline:

- alpha representation is explicit;
- alpha meaning is explicit;
- segmentation and matting are different stages;
- color-fringe cleanup and coverage refinement are different stages;
- edge class influences the algorithm;
- color proofing is profile- and context-dependent.

This should materially reduce halos, broken thin detail, and false confidence from simplistic “remove background” or “resize” operations.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 030 — proofing and print-path validation after pixel processing

The verified corpus now contains 665 individually opened/read unique pages.

### 1. Profile choice must be validated, not merely attached

ICC's Profile Viewing and Testing resources emphasize that profiles must be suitable for the intended use. DTF Studio should therefore record profile identity/hash and run sanity/proof checks rather than assuming any embedded ICC profile is production-safe.

### 2. Gamut warning is a diagnostic artifact

ICC's PRMG gamut-warning profile is designed to identify source content extending beyond a target gamut. This reinforces our architecture: gamut warning should flag risk, not silently modify the approved master.

### 3. Multiple working-space round trips can degrade data

ICC warns that repeated conversion into and out of LUT-based working spaces can degrade image data. Production recipes should minimize profile conversions and preserve the source/master profile state until an explicit output transform is required.

### 4. Rendering intent must be part of the production recipe

ICC materials distinguish Absolute, Relative Colorimetric, Perceptual and Saturation intents as different mapping policies. DTF Studio should never hide rendering intent behind a generic "convert profile" action.

### 5. Proofing and final conversion are separate operations

ICC print-production material distinguishes:
- source-to-PCS interpretation;
- output transform;
- proofing/simulation.

A proof image remains a display derivative. It cannot become the authoritative print master.

### 6. Printer profile validity depends on the reference printing state

ICC print-production guidance stresses that a printer profile is only valid for the state used to characterize it: device setup, media, inks, black generation, etc.

DTF production profile should therefore bind:
- printer/device;
- ink set;
- film/media;
- resolution/print mode;
- white-ink settings;
- calibration version/date.

### 7. Profile testing should combine numeric and visual criteria

ICC print workflow material recommends profile-accuracy measurements such as average/max Delta-E and also warns that numeric accuracy alone does not guarantee acceptable visual quality.

Our DTF proof QA should combine:
- Delta-E statistics;
- gamut warning;
- neutral/black behavior;
- edge/alpha checks;
- visual proof artifacts.

### 8. White-channel generation must remain distinct from color conversion

DTF sources in this batch confirm the RIP commonly derives a white underbase from transparency/coverage while applying separate white density/choke/halftone controls.

Therefore:
- color ICC transform does not define white geometry;
- white underbase does not replace color management;
- both should share placement geometry but have separate recipes.

### 9. Adaptive choke is safer than a fixed global pixel value

Current DTF technical guidance again warns that one fixed choke can destroy small details. A stronger implementation is locally adaptive:
- large solid areas may tolerate more choke;
- fine strokes/text get reduced or zero choke;
- near-white source-art and soft transparency need special handling.

The adaptive amount should still be bounded by the calibrated device profile.

### 10. Semi-transparent pixels need deliberate underbase behavior

DTF artwork guidance differs across providers: some threshold low-opacity pixels, some use halftones, some preserve proportional white.

This confirms there is no universal rule. The production profile must explicitly define:
- threshold;
- proportional/adaptive white;
- halftone mode;
- treat-semitransparent-as-opaque behavior.

### 11. Halftone should be tied to printability, not only appearance

Current DTF sources again connect LPI/dot structure with garment feel and white-ink coverage. The simulator must validate minimum printable dot/hole size for the selected output DPI/profile.

### 12. Image-transform QA should compare geometry before/after

ImageMagick's transformation and comparison examples reinforce the value of:
- explicit geometry/transform math;
- pixel-difference comparison;
- distortion/error metrics.

For DTF, every destructive transform candidate should produce:
- geometry delta;
- edge difference;
- alpha difference;
- color difference;
- optional visual diff image.

### 13. CMYK/spot/PDF workflows complicate alpha-derived white

RIP documentation notes workflows where white is not derived only from transparent PNG alpha; PDFs/spot colors and valid-pixel logic may carry separate spot/white semantics.

The importer must therefore detect:
- ordinary raster alpha;
- vector/PDF spot colorants;
- explicit white channel/layer;
- pre-separated content.

Do not flatten away spot/white semantics before deciding the production path.

### 14. Registration errors need directional diagnostics

DTF white-channel guidance distinguishes even halos from one-sided white shifts. A one-sided offset suggests color/white plane registration rather than symmetric choke need.

Proposed report:
- xRegistrationOffsetPx/mm;
- yRegistrationOffsetPx/mm;
- scaleMismatch;
- symmetricWhiteOvershoot;
- confidence.

### 15. ICC probe/test profiles can validate external software behavior

ICC's probe-profile resources deliberately distort output in different rendering-intent transforms to reveal which intent software actually uses.

This suggests a useful integration test for any RIP/export bridge:
- send known test assets/profiles;
- verify intended rendering intent/transform is actually honored;
- do not trust undocumented defaults.

### 16. Profile security belongs in the upload-security model

ICC maintains explicit profile-security guidance. Embedded profiles are structured external data and should be parsed with bounded, maintained libraries rather than trusted blindly.

Production ingestion should limit:
- profile size;
- malformed tag structures;
- excessive transforms/LUT dimensions where applicable;
- unsupported/private-tag handling.

### 17. Reference viewing condition matters for proof interpretation

ICC v4 perceptual reference medium assumptions include defined D50/reference viewing conditions. A customer's random mobile screen in arbitrary lighting is not a certified proofing environment.

Therefore the UI must label proofing as approximate unless the display/profile/viewing setup is controlled.

### 18. PDF/X and document color management require preserving intent metadata

The reviewed ICC PDF/X material reinforces that document workflows can carry ICC-based color-space and output-intent metadata separately from pixel data.

For PDF/AI ingestion:
- preserve/document output intent where present;
- inspect embedded profiles/spot channels;
- do not rasterize first and ask questions later.

### 19. Calibration precedes profiling

ICC print-calibration material separates process calibration/standardized printing state from later profile use.

For DTF:
- mechanical/ink/white calibration must stabilize first;
- then profile/characterize;
- artwork correction should not compensate for an unstable printer.

### 20. Batch 030 conclusion

The processing architecture now has a third explicit validation boundary after pixel processing and export semantics:

1. PIXEL PROCESSING correctness;
2. FILE/EXPORT semantics correctness;
3. OUTPUT-PROCESS/PROFILE validity and proofing correctness.

A master can be pixel-perfect and still fail if the wrong profile, rendering intent, output intent, white-channel policy, or printer calibration is used.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 031 — edge geometry, registration, contrast discipline, morphology footprints, and artwork-class descriptors

The verified corpus now contains 690 individually opened/read unique pages.

### 1. Hough-space line preservation is a useful structural QA for geometric artwork

The straight-line Hough transform converts line evidence into peaks in a parameter space, while the probabilistic variant returns explicit line segments with minimum-length and line-gap controls.

DTF use:
- detect long borders, underlines, geometric logo strokes, and frame edges before processing;
- compare retained line count, angle and length after denoise, resize, background removal, choke, or sharpen;
- flag structural fragmentation even when the image still looks subjectively acceptable.

This is especially useful for thin rectangular frames and technical-style graphics.

### 2. Circular/elliptical Hough features can protect logos and badge geometry

The circular/elliptical Hough examples show how curved geometric structures can be detected independently of the rasterized edge thickness.

For artwork containing rings, badges, emblems or circular text frames:
- compare center/radius/ellipse parameters before and after processing;
- reject candidate transforms that visibly deform the design's intended geometry.

### 3. Edge operators should be chosen for what they measure

The scikit-image edge-operator examples reinforce that Sobel, Scharr, Prewitt, Roberts and related operators have different directional sensitivity and numerical behavior.

The QA system should not reduce "edge quality" to one score. Instead maintain:
- isotropic edge-energy estimate;
- horizontal/vertical edge retention;
- gradient orientation distribution;
- thin diagonal-edge retention where appropriate.

This is valuable for Arabic calligraphy and fine geometric logos where directionality matters.

### 4. Interpolation boundary mode can create or suppress artifacts at the canvas edge

Interpolation edge-mode examples show the difference among constant, edge, reflect, symmetric and wrap-like behavior.

For DTF processing:
- transparent artwork should not accidentally inherit opaque edge colors from replicated borders;
- convolution/resize/warp operations must declare boundary mode;
- safe transparent padding remains preferable for edge-sensitive operations near the canvas boundary.

Boundary handling becomes part of the processing recipe and regression suite.

### 5. Registration can diagnose directional color/white misalignment

Phase cross-correlation can estimate translation between two images with subpixel precision.

This is directly relevant to DTF QA:
- compare a scanned/measured color plane against white-underbase or reference marks;
- estimate X/Y registration offset;
- distinguish a registration error from a choke/alpha error.

A directional one-sided white halo should trigger registration analysis before symmetric choke is suggested.

### 6. Global histogram equalization is too destructive for default artwork correction

Histogram equalization redistributes the full image intensity distribution and can make low-contrast images easier to see, but the scikit-image example explicitly notes that results can look unnatural.

For DTF:
- global equalization is a diagnostic/optional corrective tool;
- never apply automatically to logos or color-critical illustrations;
- if proposed, compare color drift and local edge behavior.

### 7. Local histogram equalization is even more powerful—and therefore more dangerous

Local equalization enhances variation in each neighborhood and can expose local details, but it also amplifies local noise and texture.

Use only for:
- difficult scanned art;
- photographed paper sketches;
- local-contrast diagnostics.

Do not auto-apply to smooth gradients, skin, brand colors or intentional low-contrast artwork.

### 8. Adaptive histogram equalization confirms scale must be physical/content-aware

The 3D AHE example chooses kernel dimensions relative to the image size.

For DTF, local-contrast neighborhood size should instead be interpreted relative to:
- physical print scale;
- artwork class;
- expected feature size.

A fixed 32-pixel CLAHE tile means very different things at 150 PPI and 600 PPI.

### 9. Histogram matching is unsuitable as a general color-correction shortcut

Histogram matching aligns cumulative channel distributions to a reference image, but it does not understand object semantics, ICC profiles, spot colors, or brand-color intent.

Potential use:
- style/reference preview;
- batch normalization in a controlled dataset;
- research comparison.

Not suitable as an automatic DTF master correction.

### 10. RGB-to-HSV / RGB-to-gray conversions are diagnostic transforms, not lossless working states

The RGB/HSV and RGB/grayscale examples reinforce that channel conversions intentionally discard or reorganize information.

Recommended use:
- luminance/edge/noise diagnostics;
- hue/saturation classification features;
- background-color clustering.

Never overwrite the production master with a diagnostic representation.

### 11. Channel-adapted grayscale filters can be safer than applying them blindly to RGB

The adapt-RGB example shows how grayscale-oriented filters can be applied channelwise or through HSV/value logic.

For our engine:
- explicitly define whether a filter is operating on luminance, each RGB channel, alpha, or a derived feature map;
- avoid applying single-channel morphology/edge algorithms independently to RGB unless the intended visual consequence is understood.

### 12. Regional maxima can help detect isolated bright artifacts and highlight islands

Filtering regional maxima is useful for finding locally dominant bright features.

Potential DTF diagnostics:
- dust-like white islands after background removal;
- isolated high-intensity spots that may create unwanted white-underbase islands;
- highlight features that should be protected from over-smoothing.

### 13. Shape primitives and polygon simplification can support vectorization eligibility

The shape/polygon examples reinforce that raster boundaries can be approximated with fewer vertices while preserving major geometry.

Vectorization router features can include:
- contour complexity;
- simplification error;
- number of vertices needed at a fixed tolerance;
- curvature distribution.

Low-complexity boundaries are stronger candidates for vectorization than noisy photographic contours.

### 14. Radon-transform structure can help identify dominant line orientation

The Radon transform projects image intensity along angles and can reveal dominant directional structures.

Potential use:
- detect text/stripe orientation;
- classify whether a design contains strong linear structure;
- compare orientation preservation before/after processing;
- detect accidental skew in scanned artwork.

This is a diagnostic feature, not a final-image filter.

### 15. Morphology footprint shape should be selected according to defect geometry

scikit-image provides square/rectangle, disk, diamond, octagon, star and 3D variants, while footprint decomposition can accelerate large morphology.

DTF implications:
- disk: isotropic choke/spread or speck cleanup;
- line/rectangle: directional line repair;
- diamond/octagon: alternative grid approximations where desired;
- decomposed large footprints: faster large-radius morphology without changing intended geometry excessively.

Do not hard-code one 3x3 square kernel for all morphology.

### 16. Large physical morphology should use decomposed footprints when equivalent

Footprint decomposition can represent a larger morphology operation as a sequence of smaller footprints with repeated iterations.

This is useful for:
- larger physical choke/spread;
- broad background cleanup;
- server performance.

But equivalence must be validated, especially for non-Euclidean footprint approximations.

### 17. Block views can support tiled analysis without copying entire arrays

Block views are a useful conceptual tool for:
- local quality scoring;
- texture/noise maps;
- tiled inference scheduling;
- per-tile histogram/entropy analysis.

The production implementation can exploit tiled/streaming equivalents rather than holding multiple full-resolution copies.

### 18. HOG can help distinguish structured logo/text art from natural imagery

Histogram of Oriented Gradients summarizes local edge orientations.

As a classifier feature:
- strong organized orientation peaks -> text/logo/geometric art;
- broad/random orientation distributions -> photo/texture-heavy content.

HOG should supplement, not replace, entropy/color/connected-component features.

### 19. GLCM texture statistics can improve artwork routing

Gray-Level Co-occurrence Matrix features capture spatial texture relationships such as contrast, dissimilarity, homogeneity and correlation.

Potential router use:
- distinguish smooth gradients from textured photographs;
- identify repeated fabric/noise textures;
- avoid vectorizing texture-rich images;
- tune denoise strength based on texture preservation need.

### 20. Shape Index can identify local curvature classes

Shape Index maps local surface-like structures into categories such as ridges, saddles and cup/cap-like forms.

For 2D artwork it is mainly a diagnostic research feature, but could help identify:
- smooth shading/emboss-like patterns;
- ridge-heavy line art;
- locally rounded versus flat structures.

It is lower priority than edge/entropy/HOG features, but useful in the research classifier set.

### 21. Sliding-window histograms can localize tonal/color anomalies

A local histogram representation can reveal that an image has:
- a globally normal histogram but a local washed-out region;
- localized color contamination near an edge;
- different texture/contrast regimes across the design.

This supports region-specific correction rather than whole-image treatment.

### 22. Artwork classification can now use a richer, interpretable feature vector

Candidate features:
- edge density and orientation histogram;
- HOG summary;
- local entropy;
- GLCM contrast/homogeneity;
- dominant-color count;
- component count and area distribution;
- contour simplification complexity;
- long-line Hough peaks;
- circular/elliptical feature evidence;
- alpha coverage/transition statistics;
- local histogram variation.

This provides an interpretable deterministic routing layer before invoking expensive AI.

### 23. Registration should become its own defect class

Add:
REGISTRATION_SHIFT

Evidence:
- translation vector;
- confidence/peak ratio;
- direction;
- affected channel pair;
- physical offset in mm.

Suggested action should be device/print-mode calibration or X/Y layer shift—not alpha erosion.

### 24. Contrast operations need a "content-protection mask"

If local/global contrast enhancement is offered, the processing recipe should be able to protect:
- alpha;
- brand-color regions;
- very thin text;
- already-clipped highlights/shadows.

This reduces the risk of destroying intentionally flat graphics while correcting only a problematic region.

### 25. Batch 031 conclusion

The processing router should increasingly be driven by measurable structure rather than by one generic image-type label.

The engine can now distinguish:
- geometric line art;
- curved/badge geometry;
- flat/simple graphics;
- texture-rich photographs;
- scanned/uneven-background art;
- transparency-heavy soft-edge art;
- registration-related production defects.

This allows narrower, safer processing and fewer destructive “enhance everything” operations.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 032 — resampling semantics are part of the print contract

The verified corpus now contains 710 individually opened/read unique pages.

### 1. Resize correctness is not only about choosing Lanczos versus bicubic

Across PyTorch, Torchvision, ONNX, TensorFlow, Kornia, Pillow, OpenCV and libvips, the same nominal "resize" can differ because of:
- coordinate transform convention;
- align_corners behavior;
- half-pixel versus asymmetric sampling;
- antialias policy;
- border handling;
- kernel;
- dtype/clamping;
- alpha treatment.

Therefore the DTF recipe must record resize semantics, not only target width/height.

### 2. RGB, alpha, masks and trimaps must use matching geometry conventions

ONNX Resize explicitly exposes coordinate_transformation_mode such as half_pixel, align_corners and asymmetric. PyTorch/Torchvision similarly distinguish align_corners behavior.

If RGB is resized with one convention and alpha/mask with another, edge registration can shift by fractions of a pixel and become visible after underbase generation.

Rule:
- every coupled artifact in one processing step shares the same geometric mapping convention;
- mask/alpha interpolation method may differ, but coordinate transform must remain aligned.

### 3. Model preprocessing semantics must be versioned

Torchvision changed antialias defaults over time, and older documentation warns that PIL and Tensor paths could produce materially different resize outputs.

For any AI segmentation/matting/upscale model, store:
- framework/runtime version;
- input resize method;
- antialias flag;
- align_corners/coordinate convention;
- normalization;
- expected input range/dtype.

Training-time preprocessing and production inference preprocessing must match.

### 4. ONNX export can silently change behavior if resize attributes are not pinned

Newer ONNX Resize versions added antialiasing and expanded coordinate controls.

Therefore exported AI models should be contract-tested against the source framework:
- same input fixture;
- same resized/intermediate tensor;
- same alpha/mask output within tolerance.

Do not assume an ONNX-converted model is pixel-equivalent merely because inference succeeds.

### 5. Antialiasing is primarily a downsampling problem

TensorFlow and Kornia explicitly state that their antialias option affects downscaling, not upscaling. Torchvision defaults antialiasing on for bilinear/bicubic in current v2 APIs.

This supports:
- downscale/display pipeline: antialias by default;
- upscale pipeline: choose interpolation/model based on edge class; antialias is not the solution to missing source detail.

### 6. Filter choice should depend on artwork class

TensorFlow documents:
- Lanczos3/5 can ring, especially on synthetic imagery;
- Mitchell-Netravali is less sharp but can ring less;
- area is naturally suited to downsampling.

OpenCV similarly recommends INTER_AREA for shrinking and cubic/linear for enlargement.

DTF routing:
- photo downscale: high-quality antialiased filter;
- hard logo/text: compare ringing and stroke continuity, not just sharpness;
- pixel-art/grid art: special nearest/grid-preserving path;
- soft alpha/glow: alpha-safe filtered path with halo QA.

### 7. Higher-order filters can overshoot

PyTorch documentation warns bicubic/lanczos interpolation can produce values outside the nominal display range before clamping.

For production:
- process in float;
- avoid premature clipping during intermediate operations;
- clamp only where the target format requires it;
- run color/edge QA after clamp/export.

Premature clipping can alter highlight edges and saturated brand colors.

### 8. libvips recommends linear-light resampling for highest physical correctness

The libvips shrinking guide explicitly states that mixing samples should ideally happen in linear light and describes conversion to a linear working space before resize.

This is expensive, so the proposed quality ladder becomes:
- web thumbnail: optimized standard path;
- normal DTF candidate: alpha-correct high-quality resize;
- premium/reference resize: linear-light + premultiplied-alpha path, benchmarked for actual benefit.

### 9. Vector/PDF/SVG assets should be rendered at target resolution rather than raster-upscaled

The libvips guide notes that vector formats can be rendered directly at the required size.

Therefore:
- retain vector/PDF source where supported;
- compute target physical print dimensions first;
- rasterize at target production resolution;
- do not rasterize small and then AI-upscale unless unavoidable.

This is one of the safest ways to preserve text and line detail.

### 10. Multi-stage reduction can improve quality/performance

libvips recommends shrink-on-load or block reduction with headroom, then a higher-quality final resize; Pillow exposes a similar two-stage reducing_gap optimization.

This suggests a benchmarked downscale strategy:
1. coarse integer reduction while staying above target;
2. final high-quality kernel to exact target.

The exact path must remain alpha-safe.

### 11. Border handling is part of edge quality

OpenCV geometric transforms explicitly distinguish extrapolation/border behavior, including BORDER_TRANSPARENT.

For transparent art:
- border mode must be specified;
- synthetic padding should use controlled alpha/hidden RGB;
- transform/crop near canvas edges needs regression tests.

A default black border can contaminate transparent edges during filtering.

### 12. Exact-nearest modes matter for masks

OpenCV INTER_NEAREST_EXACT is documented to match nearest-neighbor semantics used by PIL/scikit-image/Matlab; PyTorch also distinguishes nearest from nearest-exact.

For binary masks/labels:
- use an exact nearest-style path when interpolation must not invent intermediate classes;
- do not use it for continuous alpha mattes.

### 13. DTF halftone settings need a survival constraint, not only an aesthetic target

The reviewed DTF halftone tools emphasize:
- LPI;
- angle;
- minimum dot percentage;
- solid threshold;
- edge-only behavior;
- DPI.

The critical engineering rule is:
a generated halftone dot must remain above the calibrated printable/choke survival threshold at the final physical size.

### 14. Small halftone dots can disappear after white choke

DTFWiz's checker highlights the interaction between thin detail and choke, while Last Mile's halftone guidance emphasizes minimum-dot controls.

Our halftone validator should compute:
- nominal dot diameter/area;
- effective white-base support after choke;
- minimum retained dot dimension;
- likely dropout risk.

Do not approve a halftone purely because the on-screen pattern looks smooth.

### 15. Minimum-stroke rules should be production-profile values, not universal constants

Vendor examples provide useful starting ranges, but they differ by equipment and process.

Therefore:
- store minPrintableStrokeMm and minPrintableDotMm per production profile;
- compare design at actual print size;
- allow calibrated operator overrides;
- record which profile approved the artifact.

### 16. Edge-only halftoning is worth testing for soft fades

The Last Mile tool exposes an edge-only percentage and solid threshold, reflecting a practical idea:
- keep stronger interior regions solid;
- screen softer/fading regions first.

This may preserve readability while reducing ink in glows/shadows.

It should be implemented as a derived white/coverage recipe, not a destructive edit of source RGB.

### 17. Pillow reducing_gap is a performance/quality knob that must be frozen if used

Pillow documents two-stage reduction controlled by reducing_gap, with larger values closer to full-quality resampling.

If Pillow is used in tests or auxiliary workers:
- pin the parameter;
- pin Pillow version;
- avoid assuming default behavior is stable forever.

### 18. Model and browser preview resizes should not define production placement geometry

A preview may use a different bounded size or framework, but placement coordinates must remain normalized to the product print area/source artifact, not derived from preview pixels.

This prevents small framework resize differences from shifting the final print.

### 19. Proposed ResampleRecipe block

Add:
- sourceWidth/sourceHeight;
- targetWidth/targetHeight;
- scaleX/scaleY;
- kernel/interpolation;
- coordinateTransformMode;
- alignCorners;
- antialias;
- borderMode;
- alphaRepresentationBefore/After;
- linearLight boolean;
- workingColorSpace;
- dtype;
- clampPolicy;
- library/runtime/version.

### 20. Batch 032 conclusion

The strongest result is that resize must become a reproducible, versioned operation.

For DTF, even a subpixel discrepancy between RGB and alpha can later become a visible white fringe because the underbase is generated from coverage. Therefore resampling semantics are part of print correctness, not a cosmetic implementation detail.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 033 — matting mode selection, transform parity, accelerated-path safeguards, and edge-local quality metrics

The verified corpus now contains 732 individually opened/read unique pages.

### 1. Matting should support multiple interaction modes, not one universal remove-background route

The reviewed matting systems cover several distinct input modes:
- automatic natural-image matting;
- trimap-guided matting;
- referring/text-guided matting.

Deep Automatic Natural Image Matting is explicitly designed for natural images where the foreground may be transparent, meticulous, or not strongly salient. Referring Image Matting targets a specific foreground selected by a language expression.

DTF implication:
- AUTO_MATTE for clear single-subject uploads;
- TRIMAP_MATTE when automatic confidence is low or the user brushes corrections;
- REFERRED_SUBJECT_SELECTION as an optional future UX when an image contains multiple objects and the user wants only one.

The selected mode must be stored in the processing recipe.

### 2. Referring matting is useful conceptually but licensing must block accidental production adoption

The RIM project is distributed under a CC BY-NC license and its dataset has noncommercial restrictions.

Therefore:
- it can inform UX/research;
- it is not automatically production-eligible;
- the model registry must keep commercial-use eligibility separate from technical quality.

### 3. Generalized trimap prediction is a strong intermediate representation

AIM predicts a generalized trimap/semantic representation and then focuses matting attention on transition areas.

This supports our current architecture:
semantic understanding -> uncertainty/transition representation -> detail matte.

Even when a different model is eventually selected, a normalized internal trimap/confidence contract remains useful across providers.

### 4. Information-Flow Alpha Matting remains a deterministic trimap baseline

OpenCV's alphamat InfoFlow API takes:
- RGB image;
- grayscale trimap with foreground/background/unknown;
- outputs grayscale alpha matte.

That makes it a useful deterministic benchmark/fallback against learned matting systems.

### 5. Geometry conventions are a direct source of RGB/alpha misregistration bugs

Kornia documents several critical conventions:
- points use (x,y), while sizes use (h,w);
- normalized grids use [-1,1];
- pixel-center conventions matter;
- align_corners defaults differ between functions;
- some warp/remap APIs currently have convention mismatches unless align_corners is explicitly selected.

For DTF this is critical because a half-pixel disagreement between RGB and alpha can later become a visible white fringe when the underbase is derived from alpha.

Rule:
- transform RGB and alpha through the exact same coordinate transform implementation and settings;
- explicitly store pixel-center and align-corners conventions;
- never rely on library defaults.

### 6. Accelerated image-processing paths are not guaranteed bit-exact

OpenCV FastCV documentation explicitly describes accelerated operations that are not bit-exact equivalents of the standard CPU path.

Therefore:
- accelerated preview/inference paths may be acceptable after tolerance testing;
- the authoritative print artifact should use a versioned reference path or a separately validated accelerated path;
- output hashes should not be assumed identical across CPU/GPU/hardware backends.

### 7. G-API feature support differs from ordinary OpenCV APIs

The reviewed G-API transformation documentation notes feature differences such as unsupported BORDER_TRANSPARENT in some graph operations.

This means pipeline migration to a graph/runtime acceleration layer cannot be done mechanically.

Each primitive needs a capability contract:
- interpolation modes;
- border modes;
- dtype;
- alpha semantics;
- deterministic/tolerance guarantees.

### 8. Guided blur can be run with a different guidance image and signal

Kornia guided_blur supports separate guidance and input tensors, and can use subsampling for fast guided filtering.

This matches the DTF matte-refinement pattern:
- guidance = original RGB/luminance;
- signal = coarse alpha;
- fast preview = subsampled guided filtering;
- quality path = full-resolution or reduced-subsample guided filtering.

### 9. Joint bilateral filtering is another useful cross-signal edge-preserving primitive

Kornia joint bilateral filtering computes its range weights from a guidance image rather than the signal itself.

This is useful for:
- smoothing alpha while respecting source-image boundaries;
- reducing noise in a derived mask without blurring across a strong RGB edge.

It should be benchmarked against guided filtering and full matting for different edge classes.

### 10. Border mode is part of the filter recipe

Kornia explicitly exposes border_type choices such as reflect, replicate, constant, and circular for guided/bilateral filtering.

For transparent DTF art:
- border mode can change edge pixels near the canvas boundary;
- circular is normally inappropriate for artwork boundaries;
- reflect/replicate may also create false support;
- explicit safe padding plus crop-back remains a strong reference strategy.

### 11. Differentiable Otsu is interesting for learned or calibrated pipelines, but ordinary Otsu remains a simple deterministic tool

Kornia offers both normal and differentiable Otsu threshold calculation.

For production:
- normal deterministic Otsu is enough for simple diagnostics;
- differentiable Otsu is useful only if thresholding becomes part of a trainable model or tuning process;
- neither replaces matting for soft transparency.

### 12. Distance transform has a GPU-friendly approximate implementation

Kornia contrib includes an approximate Euclidean distance transform using cascaded convolutions, and current export-support docs show it can be exported/compiled in supported configurations.

Potential use:
- GPU physical-distance masks;
- choke/spread preview;
- edge-band weighting;
- min-stroke/gap measurements in batched QA.

But because it is approximate, exact reference measurements for critical print thresholds should still be validated against an exact CPU distance transform.

### 13. Hausdorff-style boundary loss/metric is useful for matting and segmentation QA

Kornia provides a morphology-based differentiable approximation of Hausdorff distance.

This supports an additional QA metric:
- detect worst-case boundary displacement, not just average overlap.

For DTF thin details, a small region with a large boundary error can matter more than a strong global IoU score.

### 14. Quality metrics need local maps, not only global scores

Kornia SSIM can return a spatial map, while OpenCV Quality provides objective image-quality tooling.

For DTF:
- calculate quality over opaque foreground;
- calculate a separate edge-band quality map;
- calculate a separate alpha-transition error;
- avoid letting large empty transparent backgrounds dominate global metrics.

### 15. PSNR remains a regression metric, not a perceptual approval metric

Kornia/OpenCV expose PSNR, but it is based on pixel MSE.

Use PSNR for:
- catching unintended numerical changes;
- comparing codec/resampling regression outputs.

Do not use it alone to approve:
- edge quality;
- topology;
- color appearance;
- transparency.

### 16. Edge maps should be part of every appearance-changing operation's QA

Kornia exposes Sobel, Laplacian, Canny and spatial gradients in a GPU-batch-friendly API.

For each candidate denoise/upscale/sharpen/background-removal step, compare:
- edge energy;
- edge continuity;
- newly created double edges;
- lost thin-line components;
- edge displacement.

This can run as a batched QA stage.

### 17. Image hashing is useful for deduplication/caching, not print-quality assessment

OpenCV's img_hash module provides perceptual/image hashing algorithms.

Potential use:
- detect near-duplicate uploads;
- avoid recomputing identical/similar previews;
- group repeated customer assets.

But hashes must not be used as a quality score for a master.

### 18. Saliency is a routing/crop hint, not an authoritative foreground mask

OpenCV saliency algorithms can estimate visually salient regions.

Possible uses:
- initial subject proposal;
- smart crop suggestion;
- candidate print placement center.

Do not treat saliency as proof of foreground ownership; non-salient text/logo details can still be essential.

### 19. Exportability/runtime support must be checked before selecting a GPU processing stack

Kornia's export-support matrix shows that operator support differs across ONNX, torch.export and torch.compile.

Therefore the algorithm-selection process must include:
- quality;
- commercial license;
- memory/runtime;
- exportability;
- target hardware compatibility.

A mathematically attractive primitive is not automatically deployable in the chosen worker runtime.

### 20. Proposed TransformParityReport

Add:
- transformType;
- matrix/hash;
- sourceSize;
- destinationSize;
- coordinateConvention;
- pixelCenterConvention;
- alignCorners;
- interpolation;
- borderMode;
- alphaRepresentation;
- backend;
- backendVersion;
- maxRgbDeltaVsReference;
- maxAlphaDeltaVsReference;
- edgeBandDelta;
- acceptedTolerance.

This report becomes mandatory when a faster runtime replaces the reference implementation.

### Batch 033 conclusion

The strongest result is that image quality is not enough; **mathematical convention parity** is now part of print correctness.

For DTF, RGB, alpha, underbase, and mockup placement must share exactly the same geometry semantics. A fast backend that is visually close but shifts alpha by a fraction of a pixel can still create a visible white fringe after underbase generation.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 034 — geometry convention parity and transform-safe alpha processing

The verified corpus now contains 752 individually opened/read unique pages.

### 1. Geometric transforms must share one coordinate convention across RGB, alpha, underbase, and mockup placement
OpenCV explicitly maps destination pixels back to source coordinates and makes interpolation/border behavior part of the transform contract. Kornia similarly documents source→destination matrices, inverse sampling, pixel-center conventions, normalized coordinates and align_corners rules.

DTF rule: the same placement transform must be applied to color and alpha with identical interpolation direction, pixel-center convention, border mode, and matrix semantics. Any mismatch can create a visible white fringe after underbase generation.

### 2. align_corners is a print-correctness setting, not a minor framework flag
PyTorch affine_grid warns that the same affine grid must be consumed by grid_sample with the same align_corners value, and that align_corners=True changes sampling with resolution.

Therefore every learned or GPU warp recipe must record align_corners explicitly. Model preprocessing and production reconstruction cannot silently use different values.

### 3. Anti-aliasing defaults differ by API and must be pinned
TorchVision resize now defaults antialias=True for bilinear/bicubic, while torch.nn.functional.interpolate exposes antialias separately and supports several interpolation modes.

For DTF we should never depend on a library default. Recipe fields must include interpolation and antialias explicitly, especially when downsampling previews or model inputs.

### 4. Exact-nearest and exact-linear modes are useful for parity tests
OpenCV exposes INTER_NEAREST_EXACT and INTER_LINEAR_EXACT, while TorchVision/PyTorch have nearest-exact behavior.

These exact modes are valuable for cross-backend regression fixtures. We can compare CPU reference, GPU path, browser preview and exported artifact without confusing algorithmic changes with implementation rounding differences.

### 5. Border behavior is part of edge quality
OpenCV supports BORDER_TRANSPARENT for transforms; TorchVision pad exposes constant, edge, reflect and symmetric padding; Gaussian blur uses reflection padding.

For transparent DTF art, padding must be chosen deliberately. Constant black RGB around transparent pixels can contaminate later filtering unless alpha and hidden RGB are controlled. Reflection can also duplicate edge content in ways that are wrong for isolated artwork.

### 6. Safe transform padding should be explicit and crop-back based
Before blur, affine, perspective or guided refinement near the canvas edge:
- add controlled transparent padding;
- use a declared border mode;
- process;
- crop back to the intended production bounds.

This avoids accidental clipping and avoids letting an API's default border semantics define print output.

### 7. Distance transform remains the right primitive for physical edge operations
OpenCV distanceTransform can also return component labels. Combined with alpha thresholding, it provides distance-to-boundary information suitable for physical choke/spread bands and for preserving separate islands.

Internal edge operations should prefer physical distance converted to pixels at execution time rather than repeated binary erosions with arbitrary kernel counts.

### 8. HSV/inRange is a deterministic option for simple keyed backgrounds
OpenCV inRange demonstrates thresholding in HSV using independent H/S/V ranges.

This is useful for flat or studio-like backgrounds, especially when a user deliberately uploads art on a known key color. It is not a replacement for semantic segmentation on complex photos, but it can be a fast deterministic route with explainable thresholds.

### 9. GPU morphology is practical, but semantics must match the CPU reference
Kornia provides dilation/erosion/opening/closing/top-hat style morphology on tensors. This makes GPU mask cleanup attractive for batch processing.

However kernel origin, border type, structuring element and dtype behavior must be locked in parity tests against the reference implementation before replacing CPU morphology.

### 10. Color-space conversion and linear RGB should be explicit in learned pipelines
Kornia exposes linear-RGB conversion alongside sRGB/Lab/XYZ and other color spaces.

This supports a cleaner model interface: learned models can state whether they expect encoded sRGB, normalized sRGB tensors, or linear RGB. Production compositing/quality measurement can then avoid accidental double-gamma or wrong-space filtering.

### 11. Registration tools can diagnose color-vs-white offset
scikit-image registration APIs support subpixel registration/optical-flow style displacement estimation.

A practical future DTF diagnostic is to scan or photograph a calibration print and estimate the displacement between white and color reference marks. The resulting directional offset can be stored in the production calibration profile rather than hidden inside artwork choke.

### 12. Affine and perspective transforms should never be reimplemented independently in the mockup and print pipelines
TorchVision affine/perspective and OpenCV/Kornia warps all expose subtly different defaults for interpolation, fill and coordinate convention.

DTF Studio should therefore have one provider-neutral PlacementTransform object and one tested conversion layer per backend. Mockup preview and production render should derive from the same normalized placement data.

### 13. Model-input resize and print-artifact resize are different operations
A model input may be resized to a fixed tensor size with bilinear antialiasing; the print artifact may require alpha-aware premultiplied resampling or no resize at all.

Never promote a model-input raster to production output. The model produces masks/confidence/features that are mapped back to the immutable source coordinate system.

### 14. Transform chains should be collapsed where possible
Repeated rotate→resize→translate operations compound resampling damage. Prefer composing geometry into one affine/perspective map and sampling once when the math allows it.

This is especially important for thin text and alpha edges.

### 15. Proposed GeometrySamplingContract
Each transform node should record:
- sourceCoordinateSpace;
- destinationCoordinateSpace;
- matrixDirection;
- normalizedCoordinates;
- pixelCenterConvention;
- alignCorners;
- interpolation;
- antialias;
- borderMode;
- fillValue;
- alphaRepresentation;
- backend/version.

This contract becomes part of reproducibility and parity testing.

### Batch 034 conclusion
The strongest result is that **geometry semantics are part of print fidelity**. An image can be visually close while RGB and alpha are sampled with a subpixel mismatch that later appears as a white halo. DTF Studio therefore needs one explicit transform contract shared by every backend and every derivative.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 036 — degradation-aware super-resolution, alpha-upscale policy, no-reference quality checks, and appearance-change gates

The verified corpus now contains 789 individually opened/read unique pages.

### 1. Super-resolution must be routed by degradation type, not only by scale factor

Real-ESRGAN training documentation generates low-quality inputs on the fly from high-resolution images rather than assuming a single bicubic degradation. Its training configuration mixes resize up/down/keep, Gaussian noise, Poisson noise, JPEG compression and multiple blur kernels.

DTF implication:
- before upscale, classify likely degradation: JPEG artifacts, blur, scanner noise, screenshot resampling, genuine low-resolution vector-like art, etc.;
- a model trained for one degradation family should not be assumed optimal for another;
- the selected restoration model and its degradation assumptions belong in the processing recipe.

### 2. Real-ESRGAN exposes alpha-upsample choice as an explicit parameter

The reference inference script has a dedicated alpha upsampler option and tile/pre-padding controls. This is strong evidence that alpha cannot be treated as an incidental fourth RGB-like channel.

Recommended DTF policy:
- hard logo alpha: deterministic alpha resize plus edge QA is often safer;
- soft/photo alpha: compare Real-ESRGAN/bicubic/deterministic alpha candidates;
- never accept the RGB-upscale result automatically as the alpha-upscale result;
- store alphaUpsampler separately from rgbUpsampler.

### 3. Denoise strength is part of the restoration model, not a universal post-filter

Real-ESRGAN's general model supports interpolating between normal and weak-denoise weights. This is preferable to blindly adding a generic blur after super-resolution.

DTF rule:
- estimate noise/artifact severity first;
- choose model/denoise strength accordingly;
- rerun edge/topology/color QA after restoration;
- reject candidates that remove intended texture or thin strokes.

### 4. Tiled inference requires overlap/padding QA

Real-ESRGAN exposes tile, tile_pad and pre_pad. Tiling is necessary for large DTF masters, but it introduces seam risk if context is insufficient.

Regression suite should include:
- diagonal lines crossing tile boundaries;
- text crossing tile boundaries;
- glow/smoke crossing tile boundaries;
- large flat gradients;
- alpha transition bands at tile edges.

Tile size and padding become recipe parameters for reproducibility.

### 5. Perceptual SR and faithful SR are different objectives

ESRGAN explicitly separates perceptual-quality-oriented and PSNR-oriented models and even supports interpolation between them.

For DTF production this distinction is critical:
- a perceptually sharper image may invent texture/details;
- logos, typography and brand art require fidelity over hallucinated detail;
- photographic customer art may tolerate a more perceptual mode only with preview/approval.

Suggested modes:
- FIDELITY_SR;
- BALANCED_SR;
- PERCEPTUAL_SR_REVIEW_REQUIRED.

### 6. Training data/degradation assumptions should be visible in model governance

BasicSR and Real-ESRGAN make restoration pipelines, datasets and training options explicit.

The model registry should record:
- architecture;
- checkpoint hash;
- training/degradation assumptions;
- supported scale factors;
- alpha support;
- tile support;
- bit-depth support;
- commercial license status;
- known failure classes.

### 7. No-reference quality scores are useful only as secondary evidence

OpenCV BRISQUE is a no-reference quality estimator based on natural-scene statistics. That makes it potentially useful for photographic uploads where no clean source exists.

However it is not appropriate as a universal DTF score:
- logos/flat graphics are not natural scenes;
- a stylized design can score poorly while being perfectly correct;
- a hallucinated photo can score well while changing content.

Use BRISQUE only inside a photo/restoration branch and never as a publication gate by itself.

### 8. Full-reference PSNR/SSIM should be localized as well as global

OpenCV quality classes expose generated quality maps where supported. This is valuable because a high global average can hide a damaged small text edge.

For DTF restoration QA:
- compute global reference metrics when a trusted source/reference exists;
- compute local maps;
- weight alpha edges, text, thin structures and foreground regions more strongly;
- do not let large transparent/background areas dominate the score.

### 9. Restoration evaluation needs content-specific metrics

A candidate upscale should be judged by artwork class:
- photo: SSIM/PSNR/BRISQUE plus texture/color checks;
- logo/text: topology, stroke width, OCR/line continuity, edge overshoot;
- transparent soft art: alpha transition and multi-background compositing error;
- geometric designs: line/hull/centroid preservation.

No single metric should rank all DTF artwork.

### 10. Equalization and CLAHE are intentionally appearance-changing

Kornia exposes histogram equalization and CLAHE with explicit clip limit and grid size. This reinforces that local contrast enhancement has tunable behavior and can amplify noise/detail differently across tiles.

Policy:
- never auto-run histogram equalization on customer art;
- if low contrast is diagnosed, show candidate preview;
- preserve alpha independently;
- measure color/edge changes after the adjustment.

### 11. Adjustment conventions vary across libraries

Kornia documents that brightness/contrast conventions may differ across frameworks. Torchvision likewise has its own image-transform definitions.

Therefore the recipe must not merely store “contrast=1.2”. It should store:
- operation implementation/backend;
- exact definition/version;
- input value range;
- color space;
- parameter values.

This is required for reproducibility when the same operation can mean different math in different libraries.

### 12. Gamma correction should be color-only, never alpha correction

Kornia/Torchvision gamma operations apply nonlinear intensity transforms to image values. Alpha coverage is linear and should remain separate.

DTF rule:
- gamma/brightness/contrast operate on color/luminance channels;
- alpha is excluded unless the user explicitly invokes an alpha/coverage operation;
- underbase response curves are a separate production concept.

### 13. Gaussian blur border behavior must be part of the backend parity tests

Torchvision Gaussian blur uses reflection padding. Other libraries may replicate, constant-fill, wrap, or use their own extension rules.

A blur recipe therefore needs border semantics if outputs must match across backends.

This reinforces the existing GeometrySamplingContract and border regression fixtures.

### 14. Random/augmentation transforms belong to training and QA generation, not production correction

Torchvision/Kornia augmentation APIs are valuable for generating synthetic degradations and regression cases.

Use them to create tests for:
- blur;
- compression-like degradation;
- brightness/contrast drift;
- sharpness changes;
- resize/rotation variations.

Do not expose random augmentation as a production image-preparation step.

### 15. Synthetic degradations can become our benchmark generator

Real-ESRGAN's degradation pipeline suggests a practical way to build DTF restoration tests from clean masters:
- random blur kernel family;
- resize down/up;
- Gaussian or Poisson noise;
- JPEG compression;
- optional second degradation pass.

Then measure whether a candidate restoration improves the corrupted image without changing topology/color/alpha relative to the clean master.

### 16. Model hallucination risk should be explicit in the UI

Generative/perceptual SR approaches can synthesize plausible detail rather than recover ground truth.

For production assets:
- no silent perceptual SR on logos/text/fine graphics;
- appearance-changing SR creates a new candidate version;
- side-by-side zoomed review is required when hallucination risk is nontrivial;
- approval stores exact model/checkpoint/recipe.

### 17. Third-party SR tools are useful implementation evidence, not authority

The reviewed Real-ESRGAN wrapper and newer research repos demonstrate useful features such as RGBA support, tiling, alpha upsamplers and perceptual approaches. They should inform capability design, but official/reference implementations remain the preferred production basis.

### Batch 036 conclusion

The strongest result is that “upscale” should become a routed restoration workflow:
1. diagnose degradation and artwork class;
2. select fidelity/perceptual policy;
3. select RGB and alpha upsamplers separately;
4. choose tile/padding/precision settings;
5. run restoration;
6. evaluate content-specific global and local quality metrics;
7. compare topology, alpha edges and colors;
8. require approval for hallucination-prone appearance changes.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 039 — alpha-upscale policy and topology-preserving physical QA

The verified corpus now contains 792 individually opened/read unique pages.

### 1. Real-ESRGAN confirms alpha is a separate super-resolution decision

The reviewed Real-ESRGAN inference path exposes alpha_upsampler choices rather than assuming RGB super-resolution automatically solves transparency. Its implementation can run Real-ESRGAN on alpha or use conventional interpolation.

For DTF Studio, alpha-upscale strategy must therefore be selected independently from RGB restoration:
- deterministic interpolation for already-clean hard masks;
- learned alpha upscale only when benchmarked as beneficial;
- matte refinement after RGB upscale for uncertain/soft edges.

### 2. Tile processing needs overlap/padding and seam QA

Real-ESRGAN uses tile padding and pre-padding specifically to avoid border artifacts on large images. DTF masters can be large enough to require tiled GPU processing.

Our tiled-processing contract should record:
- tileSize;
- overlap/pad;
- modelScale;
- merge policy;
- seam-error metric.

A tile seam that is visually subtle on screen can become a repeatable print defect.

### 3. Skeleton/medial-axis measurements provide physical stroke-width evidence

scikit-image documents medial-axis skeletonization together with distance-to-background. Distance sampled along the skeleton estimates local object width.

This lets preflight measure:
- minimum stroke width;
- width percentile distribution;
- locations of critically thin strokes;
- before/after width loss.

After converting pixels to physical units at the selected placement, the system can block destructive cleanup, choke, or thresholding that collapses important details.

### 4. Topology should be protected separately from visual similarity

Skeletonization/thinning preserves connectivity while reducing components to a structural representation.

This supports a QA rule independent of PSNR/SSIM:
- compare connected branches/endpoints/components before and after processing;
- flag lost punctuation, disconnected letters, closed counters that became filled, or bridges that disappeared.

For Arabic lettering and ornamental line work this can be more meaningful than a whole-image similarity score.

### 5. Morphology supports distance-based physical operators

The reviewed morphology API includes distance-transform-based isotropic erosion/dilation and medial-axis operations. This reinforces representing choke/spread as physical distance and converting to pixels at execution time rather than hard-coding kernel sizes.

### Batch 039 conclusion

Super-resolution should never be approved only because the RGB looks sharper. For transparent DTF art, approval needs three independent checks:
1. RGB/detail quality;
2. alpha-edge quality;
3. topology and physical stroke-width retention.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 040 — mask-conditioned processing and diagnostic feature extraction

The verified corpus now contains 799 individually opened/read unique pages.

### 1. Multi-dimensional histograms can become useful routing features

libvips hist_find_ndim can build 1D, 2D, or 3D histograms from multi-band images. For DTF preflight this can support cheap descriptors such as joint color distributions or alpha-versus-luminance occupancy before deciding whether a more expensive classifier is needed.

This should remain a routing/diagnostic feature, not a destructive image operation.

### 2. Conditional pixel routing is a useful implementation primitive

libvips case/if-then-else style operations allow masks or index images to select among alternative pixel-processing outputs.

That maps directly to the architecture already emerging:
- untouched opaque interior;
- edge-decontaminated transition band;
- low-alpha cleanup band;
- protected fine-detail mask;
- manually corrected regions.

Instead of running one filter uniformly over the whole artwork, we can combine specialized outputs through explicit masks.

### 3. The processing graph should be declarative and auditable

The reviewed libvips operation surface reinforces that the production engine can be expressed as a graph of small deterministic primitives: extract bands, build masks, transform color, filter selected regions, composite, and export.

For DTF Studio, every graph node should record:
- operation;
- input artifact/version;
- mask/region;
- parameters and physical units;
- alpha representation before/after;
- color encoding before/after;
- output hash.

This makes a processed master reproducible and easier to debug than a monolithic “auto enhance” step.

### 4. Diagnostics and appearance edits must stay separate

Histogram, entropy, profile, min/max, shape and topology measurements should feed the decision engine but should not modify pixels. Appearance-changing operations such as equalization, sharpening, decontamination or thresholding should be separate recipe nodes and require their own QA.

### 5. Current corpus status correction

The GitHub ledger had already advanced asynchronously to 792 verified pages before this manual pass. This batch starts from that current repository count rather than the older count shown in the previous chat reply.

### Batch 040 conclusion

The processing architecture is converging on mask-conditioned, region-specific operations rather than global filters. That is especially important for DTF: a smoke edge, a one-pixel letter stroke, an opaque logo interior and a contaminated low-alpha fringe should not receive the same processing.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 041 — registration measurement, topology guards, and localized deterministic processing

The verified corpus now contains 826 individually opened/read unique pages.

### 1. White-plane registration can be measured instead of guessed
Phase correlation provides a direct way to estimate translational offset between two similarly structured images. OpenCV also exposes iterative phase correlation for subpixel refinement, while ECC can estimate translation, Euclidean, affine, or homography warps.

For DTF, compare normalized edge/silhouette maps of the color-coverage plane and generated white plane:
- estimate X/Y shift;
- report confidence/response;
- classify whether the mismatch is mainly translation or a more complex warp;
- do not automatically warp artwork unless the operator explicitly approves.

This turns "white is peeking on one side" into a measurable registration diagnostic.

### 2. Use ECC only after a coarse alignment
OpenCV notes that ECC alignment needs a reasonable initial transform for large displacement/rotation and can fail to converge.

Recommended sequence:
- phase correlation for initial X/Y translation;
- optional ECC translation/Euclidean refinement;
- escalate to affine only if there is strong evidence of scale/shear mismatch;
- production printer calibration remains separate from artwork correction.

### 3. Long straight and circular geometry can have dedicated QA
libvips Hough line/circle transforms provide low-cost structural signals.

For line-art/logo classes:
- compare dominant line angles and long-line peaks before/after processing;
- compare circular/ring features when the design contains them;
- flag fragmentation, unexpected rotation, or geometry loss after background removal, choke, resize, or upscale.

### 4. Connected-component QA should be staged
The scikit-image labeling example uses a useful pattern:
threshold -> morphology/closing -> border cleanup -> labeling -> region properties.

For DTF:
- threshold is diagnostic only when source alpha is continuous;
- label connected foreground components;
- track component count/area/centroid;
- protect legitimate punctuation/dots and detached logo elements using context and physical size;
- classify new tiny islands as probable residue, not automatically delete every small component.

### 5. Morphology requires an explicit foreground convention
libvips morphology assumes white objects on black background.

The recipe therefore needs a mask convention before erode/dilate/open/close. A silent inversion would turn choke into spread and vice versa.

Internal mask nodes should declare:
- foregroundValue;
- backgroundValue;
- operation;
- kernel/physical radius;
- connectivity.

### 6. Directional convolution can detect orientation-specific damage
libvips compass rotates a kernel through multiple directions and combines responses.

Potential DTF uses:
- detect broken strokes in preferred directions;
- quantify directional edge strength;
- detect asymmetric damage after denoise/sharpen;
- support orientation-aware line-art QA.

### 7. Transition density is a cheap texture/complexity signal
libvips countlines measures mean black/white transitions horizontally or vertically.

For diagnostic binary masks, directional transition density can help distinguish:
- simple logo/text;
- dense line art;
- halftone/screen texture;
- fragmented masks after processing.

It is not a quality score by itself, but a useful router feature.

### 8. Flood fill is a strong deterministic background primitive
Flood fill can isolate connected background-like regions from border or sampled seeds.

For flat/simple backgrounds:
- seed from trusted border pixels;
- flood through color-distance-compatible pixels;
- preserve enclosed holes separately;
- use the result as a coarse background prior before edge matting.

This is explainable, fast, and useful as a non-AI fallback.

### 9. Fourier spectrum can expose periodic defects and screen structure
ImageMagick's Fourier examples show the frequency spectrum as a view of frequency magnitude after log scaling.

DTF diagnostic uses:
- detect periodic halftone/screen structure;
- reveal resampling aliasing;
- detect repeated banding/noise;
- compare intended screen angle/frequency with observed digital pattern.

The spectrum is diagnostic only; it should not become a master image effect.

### 10. Crop/process/insert should be first-class graph operations
libvips crop, insert, join and band fold/unfold support localized processing.

This is important for expensive high-resolution refinement:
- crop only the uncertain tile;
- preserve exact source coordinates;
- process;
- reinsert into the same artifact coordinate system;
- verify seam/alpha continuity.

Every tile operation should store original bounds and output bounds.

### 11. Basic math primitives stay internal
Clamp, abs, sign and invert are useful for mask arithmetic, residuals, signed-distance-like diagnostics, and threshold construction. They should remain internal graph nodes rather than customer-facing "enhancement" options.

### 12. Global balance is intentionally not a default enhancement
libvips globalbalance is designed for balancing mosaics/overlapping images. It can alter contrast globally.

For ordinary DTF artwork it stays out of the default path. It is only research-relevant for potential patch/tile seam balancing, and even there it would require strict appearance-change QA.

### 13. Synthetic geometry fixtures should be generated deterministically
Exact circles and lines can be generated for regression tests.

Add fixtures covering:
- 1/2/3 px horizontal, vertical and diagonal strokes;
- concentric circles/rings;
- acute corners;
- small detached dots;
- narrow gaps;
- strokes crossing tile boundaries.

Run them through resize, matting, choke/spread, halftone, and export to quantify structural loss.

### 14. Registration diagnostic output
Proposed RegistrationReport:
- shiftXPx / shiftYPx;
- shiftXmm / shiftYmm at output resolution;
- phaseCorrelationResponse;
- eccScore;
- transformClass;
- confidence;
- colorWhiteOverlapIoU;
- directionalOvershootMm;
- recommendedAction.

Recommended actions:
- NONE;
- CHECK_PRINTER_REGISTRATION;
- APPLY_RIP_XY_SHIFT;
- REGENERATE_UNDERBASE;
- MANUAL_REVIEW.

### Batch 041 conclusion
A new distinction is now explicit: **artwork geometry correctness** and **white/color plane registration correctness** are separate. The preparation engine should measure both before recommending choke or changing alpha.

No storefront merge, deployment, or protected Home/Mockup modification.


## Research Batch 043 — multilingual DTF production evidence and language-independent rules

This batch deliberately broadens the research beyond English. Russian, Japanese, Arabic, Portuguese, Chinese, Spanish and Italian sources were individually read. Localized mirrors of already-counted English documentation were used for cross-checking terminology but not counted again.

### 1. Multilingual sources strongly reinforce that print rules are process-specific, not universal

Russian, Chinese, Japanese and Spanish production guides give different choke, minimum-line and density ranges. The important conclusion is not to choose one global number.

DTF Studio should store production thresholds in a calibration/profile object:
- printer/device;
- RIP/print mode;
- output resolution;
- film/media;
- ink set;
- calibrated choke range;
- minimum printable stroke/gap/dot;
- white-density range;
- date/test evidence.

The application can provide a conservative default but must label vendor/shop numbers as process-specific evidence.

### 2. Russian production guidance gives useful physical-detail constraints

Russian DTF workshop requirements studied in this batch specify examples such as:
- minimum line thickness around 0.6 mm;
- reverse/negative gap around 0.7 mm;
- white underbase contracted inward by a few pixels;
- small serif/non-serif text limits.

Other Russian sources use roughly 0.5 mm line guidance and different choke values.

These disagreements are valuable: they confirm the engine should measure physical stroke/gap and compare against a selected production profile rather than hard-code one threshold.

### 3. Russian sources also reinforce actual-size DPI instead of metadata-only DPI

Several Russian preparation guides explicitly require approximately 300 DPI at the real print dimensions, not merely a file tagged "300 DPI".

This directly supports effective-DPI preflight:
effectiveDPI = pixels / placedPhysicalInches

The rule is language-independent and should remain one of the first checks.

### 4. White-channel generation practices differ between shops

Some Russian workflows ask the customer to supply a dedicated spot/alpha white channel. Other shops generate white automatically in RIP from transparency.

Therefore our export/handoff model should support both:
- AUTO_WHITE_FROM_ALPHA;
- SUPPLIED_WHITE_CHANNEL;
- supplied spot-channel naming/mapping.

The presence of these distinct real workflows is a strong reason not to assume one RIP handoff format.

### 5. Japanese RIP documentation adds white-feathering as a distinct control

The Japanese Absolute White RIP manual exposes:
- White Choke;
- White Feathering;
- White Toner Volume;
- black removal.

Although this is a toner-oriented transfer workflow and not identical to inkjet DTF, it demonstrates an important control separation:
- choke changes geometry;
- feathering changes the transition profile;
- white volume changes density/material load.

Our white-plane model should keep an optional edge-feather/transition curve separate from choke and density.

### 6. Density can affect mechanical feel and durability, not just opacity

The Japanese manual warns that excessive white-toner volume can make transfers more brittle and less stretchable. Russian and other DTF sources similarly describe heavy white laydown as increasing transfer stiffness.

This reinforces a process-quality tradeoff:
white density influences opacity, hand feel, flexibility and potentially durability.

The UI should not portray "more white" as always better.

### 7. Chinese DTF sources distinguish fine-line choke from normal artwork choke

The Chinese AGP guide proposes smaller choke for fine text/lines than for standard or large solid areas. A separate Chinese fine-line guide also recommends slight white shrink and warns that too much ink blurs small strokes.

The important software rule is adaptive geometry:
- estimate local stroke width;
- cap choke so a minimum underbase core remains;
- use lower choke for topology-critical features;
- allow larger choke on broad shapes if the calibrated profile permits it.

### 8. Chinese sources tie white problems to registration and wet-ink behavior

The Chinese AGP article separates:
- white-mask width;
- mechanical feed/registration;
- wet ink / ink pooling;
- ICC/profile mismatch;
- white density.

This independently supports the HaloDiagnostic model already developed: a white edge is a symptom that can originate in several layers.

### 9. Spanish DTF halftone guidance gives concrete production observations worth testing

The Spanish DTF.pro guide reports:
- very low tonal values can become visibly isolated dots;
- stochastic screening can hide regular-pattern moiré;
- long gradients may show banding;
- creative halftone dots need a practical minimum physical size;
- fades into transparency can expose white-dot behavior on dark garments.

These are shop-specific observations, not universal standards, but they suggest benchmark cases:
- 0–20% tone ramp;
- long smooth gradient;
- gradient-to-transparency;
- dark-garment white-supported fade;
- stochastic versus ordered screening.

### 10. Halftone minimum feature size should be measured physically

The Spanish source gives a creative-dot example in the 0.3–0.4 mm range. Russian line requirements cite larger values for ordinary printable strokes.

This reinforces two separate production limits:
- minimum structural stroke/gap;
- minimum halftone dot/hole.

They should not share one threshold.

### 11. Russian white-ink production sources highlight pigment circulation

A Russian production article notes that white DTF ink contains heavy titanium-dioxide pigment and commonly requires recirculation/agitation to avoid settling and uneven opacity.

This is a machine/maintenance issue rather than an artwork-processing issue, but it should appear in diagnostic routing:
if white density varies directionally or by pass while the generated white plane is correct, recommend printer/nozzle/circulation inspection instead of modifying artwork.

### 12. Arabic prepress material adds language-specific text QA

The Arabic prepress checklist stresses:
- converting Arabic text to outlines/paths;
- preserving correct Arabic shaping before export;
- transparent backgrounds for DTF;
- explicit white-underbase instructions when required.

For DTF Studio, Arabic/RTL content needs a print-readiness check separate from UI language:
- embedded/live font dependency;
- shaping/ligature correctness;
- whether text has been rasterized/vectorized for final production;
- readability after scaling/choke.

### 13. Portuguese process documentation broadens physical-process evidence

The Portuguese DTF ink/process documentation describes DTF as a film-based pigment-ink process with white ink, powder and curing/transfer steps.

It reinforces why the software must distinguish:
- image/prepress correctness;
- ink/media/cure process;
- transfer/press process.

A visually correct file cannot compensate for incorrect physical process settings.

### 14. Localized CADlink manuals were useful for terminology validation but are duplicates

German, Japanese, Chinese, French and Italian CADlink layer-tab pages were read. They describe the same underlying controls as the already-counted English page:
- underbase/highlight;
- choke/spread;
- semi-transparent-as-opaque;
- adaptive alpha behavior;
- LPI/angle/dot shape;
- jitter/supercell;
- ICC controls.

They were not counted again because they are localized mirrors. Their value is confirming that the underlying RIP concepts are stable across locales.

### 15. Multilingual research policy going forward

From this batch onward, discovery should deliberately rotate languages and regions:
- Arabic;
- Chinese;
- Japanese;
- Korean;
- Russian;
- Spanish;
- Portuguese;
- German;
- French;
- Italian;
- Turkish and other relevant sources when available.

Priority remains source quality and technical usefulness, not language quota. Translation mirrors do not inflate the corpus.

### Batch 043 conclusion

The main benefit of multilingual research is not merely finding more pages. It exposes different shop practices, printer conventions, RIP assumptions and physical tolerances.

The architecture should therefore encode:
- calibrated production profiles;
- explicit handoff mode;
- physical-unit thresholds;
- adaptive choke/white behavior;
- machine/process diagnostics separate from artwork diagnostics;
- multilingual terminology/source provenance.

No storefront merge, deployment, or protected Home/Mockup modification.


## Multilingual research Batch 046 — alpha edges, halftone channels, restoration ordering, and print-safe preprocessing

### Engineering findings

1. **Do not globally binarize alpha.** DTF-oriented sources correctly expose the halo risk of low/partial alpha, but a hard threshold is safe only for artwork classified as hard-edge. Soft artwork such as hair, smoke, glass, glow and intentional shadows requires continuous-alpha preservation plus underbase-aware handling.
2. **Separate alpha geometry from edge RGB decontamination.** Adobe's matte-removal workflow and DTF background-removal material reinforce that an edge can have correct opacity geometry yet still carry RGB contamination from the old background. The pipeline should diagnose and repair alpha and edge color independently.
3. **Halftone must be channel-addressable.** Krita's halftone documentation supports intensity, independent-channel and alpha-only modes. DTF Smart Prepress should therefore represent halftone as a plane-specific operation, not a single image-wide effect; color, alpha and white-underbase screening require separate policies.
4. **Matting remains an ill-posed estimation problem.** The Japanese matting reference explicitly frames I = alpha*F + (1-alpha)*B and explains why segmentation alone cannot recover soft foreground boundaries. Preserve a trimap/uncertainty-band route for difficult edges.
5. **Noise reduction needs scale and color-component awareness.** darktable's profiled denoising separates luminance/chrominance behavior and supports wavelet scale-dependent control. Smart Prepress should classify noise by spatial scale and color component before choosing strength.
6. **Sharpening is not automatically beneficial.** darktable documents USM as edge-contrast enhancement and warns about undesirable behavior in its Lab implementation; thresholding can prevent noise amplification. Keep sharpening evidence-gated and compare fine-detail survival plus halo/ringing after processing.
7. **Directional blur parameters matter.** Krita exposes independent horizontal/vertical Gaussian radii and directional motion blur. Blur diagnosis should estimate anisotropy before attempting restoration rather than assuming an isotropic PSF.
8. **Surface/color smoothing can destroy local contrast.** The surface-blur reference notes channel-specific behavior and local-contrast loss. Any chroma cleanup should be masked, channel-aware and followed by edge/texture preservation checks.
9. **White-underbase defects must be classified before correction.** DTF sources distinguish insufficient white opacity, pullback/choke errors and registration errors. Density changes must not be used as a substitute for fixing geometry or registration.
10. **Mockup-safe derivatives remain separate from the print master.** Browser/client-side preparation sources reinforce that preview placement, background compositing and convenience resizing should not become authoritative print-master transformations.

### Pipeline consequences

Add/retain explicit contracts for:
- EdgeClass: hard-edge | soft-intentional | contaminated | uncertain.
- AlphaPolicy: preserve-continuous | threshold-hard-edge | refine-matte | reject-for-review.
- EdgeColorPolicy: none | remove-white-matte | remove-black-matte | local-decontaminate.
- HalftoneRecipe: targetPlane, screenFamily, dotGeometry, angle, quantization, seed, minPrintableFeature.
- RestorationEvidence: noiseScale, lumaNoise, chromaNoise, blurAnisotropy, sharpeningNeed, haloRisk, textureLoss.
- UnderbaseDiagnosis: opacityDeficit, geometrySpread, chokeRisk, registrationOffset, lowAlphaResidue.

### Corpus accounting

Batch 046 added 14 canonical, materially distinct pages that were individually opened/read. The branch ledger now explicitly contains 868 entries. Research continuity is 877 because the immediately preceding verified Batch 045 contained 9 pages whose exact URLs were not preserved in the available record; those URLs are intentionally not reconstructed or fabricated.


## Multilingual research Batch 047 — thresholding, alpha preservation, noise models and blur semantics

### Engineering findings

1. Binary thresholding is explicitly destructive to antialiasing. Use it only for artwork classified as hard-edge or for derived diagnostic/support masks, not as a universal background-removal step.
2. Alpha thresholding has an abrupt transfer function: values above the threshold become opaque and those at/below become transparent. Store the threshold and its purpose, and require soft-edge classification before destructive use.
3. Color-to-alpha is materially different from binary thresholding: it maps distance from a selected background color into transparency and attempts to preserve antialiasing. This is a strong candidate for flat/near-flat background decontamination before matting escalation.
4. Raising the transparency threshold in color-to-alpha can remove noisy background remnants, but beyond the exact-background case recomposition against the old background no longer reproduces the original exactly. Treat this as an appearance-changing repair and QA it.
5. Threshold can operate on Value, individual RGB, Alpha, Luminance or RGB-derived channels. Segmentation/background-removal routing should test informative channels rather than assuming grayscale intensity.
6. Noise modeling should distinguish additive from multiplicative/speckle noise, independent RGB noise from correlated/value noise, linear-RGB operation, and alpha noise. Synthetic degradation tests must record these semantics plus random seed.
7. Lens/blur operations can accept an auxiliary mask and may use linear mask values. Blur/deblur diagnostics should preserve mask-space and transfer-function semantics.
8. Unsharp sharpening can amplify noise and create visible edge artifacts at high radius/amount. Sharpening remains evidence-gated and should run at target derivative resolution with halo/noise QA.
9. The NL adaptive filter smooths inversely to local variance, reflecting the useful principle that low-variance regions are more likely noise while high-variance regions may be wanted structure. DTF restoration routing should use local texture/variance evidence before smoothing.

### Pipeline consequences

- Add BackgroundRemovalMode: hard_threshold | color_distance_to_alpha | segmentation | trimap_matting | manual.
- Add ThresholdRecipe: targetChannel, lower, upper, transferType, preservesAntialias=false/true.
- Add NoiseModel: additive | multiplicative_speckle | correlated_value | independent_rgb | alpha_noise.
- Add recomposition-error QA for any color-to-alpha/decontamination repair.
- Preserve soft-edge alpha unless the EdgeClass contract explicitly authorizes hardening.
- Keep diagnostic masks and print-master alpha as separate artifacts.

### Corpus accounting

Batch 047 adds nine materially distinct, individually opened/read pages. The branch ledger now contains 877 explicit entries. Research continuity is 886 / 10,000 because the earlier verified-but-unsynchronized Batch 045 contributes nine verified pages whose URLs are intentionally not fabricated.


## Multilingual research Batch 048 — blur/noise/frequency evidence integrated into the OpenCart extension

### Engineering findings
- Gaussian blur must retain independent horizontal/vertical scale when available; collapsing both axes into one scalar can hide directional degradation.
- Unsharp Mask is a local contrast operation, not evidence that lost detail was reconstructed. It remains gated by measured blur and post-process halo/noise checks.
- High-pass isolates higher-frequency structure and is useful diagnostically, but recombination strength can exaggerate noise and edges.
- Wavelet decomposition provides scale-separated detail layers plus residual, supporting scale-specific denoise/sharpen decisions instead of global filtering.
- Median/despeckle operations are suitable for impulse-like defects but should be restricted by defect/repair masks so legitimate small print features survive.
- Sobel directional responses support anisotropic edge-integrity diagnostics before/after resize, choke and restoration.
- Noise reduction is an optimization tradeoff: reduce noise while preserving edges, texture, alpha transitions and minimum printable strokes.

### Implementation consequence
The isolated OpenCart extension scaffold now records blurRadiusX/Y, derives blurAnisotropy, warns on directional blur, records noiseSigma/textureScore, and explicitly prohibits automatic deblur and evidence-free sharpening. This is decision-engine scaffolding only; it does not alter the protected storefront or production OpenCart installation.

### Corpus accounting
Batch 048 adds eight materially relevant pages. GitHub ledger: 885 explicit pages. Research continuity: 894 / 10,000 including the earlier unsynchronized nine-page Batch 045.


## Batch 049 — implementation synthesis

- Alpha estimation and foreground color estimation are separate stages. A good alpha matte does not by itself remove RGB color bleeding; soft/contaminated edges can require foreground estimation before recomposition.
- Trimap-driven matting is reserved for uncertain/soft boundaries; hard-edge art can follow a cheaper deterministic path.
- BRISQUE is retained only as a no-reference diagnostic feature and cannot independently accept/reject a DTF print master.
- Richardson-Lucy/Wiener restoration requires a PSF model; deconvolution remains evidence-gated and never automatic in the current extension.
- Boundary preservation is represented separately from perceptual quality using a Hausdorff-style boundary delta.
- J-invariant loss can support self-supervised denoiser parameter calibration when the noise assumptions are appropriate.

Implementation commits in the isolated OpenCart extension add MattingDecision, foreground-color-estimation routing, BRISQUE diagnostic-only semantics, PSF confidence, deconvolution candidacy, boundary preservation and J-invariant calibration fields. No deployment or storefront/core modification was performed.

Corpus after Batch 049: GitHub ledger 889 explicit; research continuity 898 / 10,000.


## Batch 057 — RIP handoff and directional edge integrity

- Ghostscript confirms that ICC source/destination handling, rendering intent and black-point compensation can be object-dependent for images, vectors and text. DTF Smart Prepress therefore records RIP object-class profiles rather than assuming one file-wide transform.
- Separation devices can emit component/spot outputs and apply the active screening/halftone. Preview halftone remains a proof derivative and must never substitute the RIP screen; prepress must not double-screen artwork already intended for RIP screening.
- Output intent, proof profile, device-link profile and post-render profile are separate color-management roles and should remain explicit in provenance.
- OpenCV gradient structure tensors provide local orientation plus coherency. These measurements are useful as directional preservation evidence for line art/text before and after resampling, denoise, sharpening or choke, but are diagnostic and must not directly alter the master.
- Reopened OpenCV watershed/distance-transform and ImageMagick morphology/dither references were deduplicated; localized mirrors were excluded where no materially new operation was added.

Implementation: research contract advanced to 0.5.0-research with DirectionalEdgeIntegrityReport and RipHandoffReport. No deployment, merge, Oracle or storefront change.

Corpus: GitHub explicit 954 / 10,000; research continuity 981 / 10,000.


## Batch 058 — alpha quality + underbase canvas safety

- Matting acceptance is multi-dimensional: SAD/MSE measure alpha magnitude error while gradient/connectivity capture boundary and structural failure. Smart Prepress must not accept a matte from one scalar score.
- High-resolution matting can lose useful boundary/global context under uniform downsampling. Preserve source-resolution boundary refinement and use compressed/global context only as guidance rather than replacing the full-resolution edge pass.
- Layer compositing/inherited-alpha semantics can differ from stored per-pixel alpha. Exported raster alpha must therefore be inspected after authoring-app compositing.
- DTF white halos require diagnosis across dirty alpha, underbase geometry, registration and ink/RIP behavior before choke changes.
- Some RIP spread operations cannot extend beyond the source image bounds. Transparent padding is therefore a preflight resource: requested spread must fit available physical padding.
- Choke can erase fine text/strokes; existing physical-stroke survival and topology gates remain mandatory.

Implementation: contract 0.6.0-research adds AlphaMattingQualityReport and UnderbaseCanvasSafetyReport plus regression coverage. No deployment, merge, Oracle or storefront change.

Corpus: GitHub explicit 960 / 10,000; research continuity 987 / 10,000.


## Batch 059 — multilingual precision and alpha semantics

- Bit-depth reduction is not merely a storage change: dithering can be configured independently for ordinary layers, text, and channels/masks. Alpha/mask dithering therefore requires explicit print intent and boundary QA.
- Text dithering is unsafe as a default because it can rasterize/alter text-layer semantics; Smart Prepress defaults it off.
- Alpha remains continuous data: intermediate values are partial opacity, and alpha-to-selection preserves partial membership. Selection/mask conversion must not silently binarize soft boundaries.
- Curves can operate directly on alpha; any alpha-tone operation must be recorded and compared against boundary/gradient/connectivity metrics.
- Channel-specific color-replacement thresholds reinforce that background/color decontamination should record per-channel tolerances rather than a single undocumented tolerance.
- Linear, non-linear and perceptual TRC views/operations are distinct; provenance must record the working transfer context for tone/edge processing.

Implementation: contract 0.7.0-research adds PrecisionConversionReport and an explicit ALPHA_MASK_DITHER_ON_PRECISION_REDUCTION warning plus regression coverage. No deployment, merge, Oracle or storefront change.

Corpus: GitHub explicit 966 / 10,000; research continuity 993 / 10,000.


## Batch 060 — multilingual resize, restoration and output-color integrity

- Resampling damage is multi-axis: blocking, ringing, aliasing/moire and blur must be measured separately. Filter choice alone is not proof of a safe result.
- Diffusion-based reconstruction is appropriate for diffusive/static blur classes, not motion blur. Unknown blur mechanism never authorizes automatic deconvolution.
- Denoising assumptions can fail when noise variance changes with signal/luminosity; evidence should retain the noise model rather than only a global sigma.
- Output color profile, rendering intent and profile embedding are export-handoff facts. Display/soft-proof settings cannot substitute for the actual output transform.
- Distance transforms plus connected components/stats provide a practical basis for minimum-stroke, component survival and topology checks after choke/resampling.
- Authoring precision, channel encoding/gamma, image ICC profile and soft-proof profile are independent pieces of provenance.
- Indexed conversion and dithering can synthesize apparent colors and perturb fine/alpha structures; indexed/mockup derivatives cannot become print masters without re-preflight.

Implementation: contract 0.8.0-research adds ResamplingArtifactReport, BlurMechanismReport and OutputColorHandoffReport with regression coverage. No deployment, merge, Oracle or storefront change.

Corpus: GitHub explicit 975 / 10,000; research continuity 1002 / 10,000.


## Batch 061 — multilingual matting, underbase intent and RIP halftone ownership

- Trimap matting treats unknown pixels as foreground/background mixtures and estimates continuous alpha; segmentation masks must not substitute for this on soft boundaries.
- Boundary-focused/deformable receptive fields reinforce source-resolution edge refinement after coarse/global inference.
- White underbase intent is not universally binary. Vintage, distressed, fades and soft effects can intentionally require multiple white-opacity zones. Prepress must preserve declared tonal-underbase intent rather than flattening it.
- RIP screening owns dot shape, angle and lineature. File-level creative halftones require minimum physical dot/tone checks and must not be screened a second time.
- Very low tones can resolve as isolated visible dots; printability thresholds are process-specific and should be calibrated, not treated as universal constants.
- White opacity, registration, total ink limit and ICC/color conversion are separate failure axes. Color complaints should not automatically trigger artwork edits.
- Repeated RGB/CMYK conversion can accumulate color damage; preserve source profile and make the production transform once at the controlled handoff.
- Choke requires one owner. Applying file/prepress choke and RIP choke simultaneously is a critical double-choke risk.

Implementation: contract 0.9.0-research adds UnderbaseIntentReport, HalftonePrintabilityReport and ChokeOwnershipReport plus DOUBLE_CHOKE_RISK regression coverage. No deployment, merge, Oracle or storefront change.

Corpus: GitHub explicit 982 / 10,000; research continuity 1009 / 10,000.


## Batch 062 — multilingual alpha-domain filtering, print calibration and edge-aware processing

- Transparent-image filtering and interpolation must explicitly track alpha association. Straight-alpha RGB can contain arbitrary hidden color in transparent pixels; filtering before premultiplication can leak that color into visible edges. Premultiplied-alpha filtering avoids this class of halo, while incorrect double multiplication can create dark fringes.
- Filtering/resampling should record the working transfer domain. Alpha association and compositing are safest when the intended linear-light stage is explicit rather than silently operating in gamma-encoded display values.
- Unpremultiplication requires a zero/near-zero-alpha guard. Transparent RGB handling is therefore a declared policy, not an incidental implementation detail, and recomposition QA should test multiple backgrounds.
- Color workflow provenance needs an image-state concept (scene/original/output referred) plus source/output profile roles. Generic/vendor ICC profiles can approximate but cannot prove a particular device/process; measured device profiles, dot gain and white-point evidence are stronger production inputs.
- Printing standardization is end-to-end: capture/RGB conditions, RGB-to-CMYK conversion, stabilized print process and proofing are separate controlled stages.
- Inkjet print quality couples resolution conversion, color conversion, total ink limitation, gradation conversion and halftoning. Dispersed-dot methods such as error diffusion/ordered dithering need calibrated parameters and dot placement; single-pass systems require explicit banding/streak evaluation.
- Boundary-safe segmentation benefits from a two-stage architecture: coarse/global object segmentation followed by local boundary refinement using local appearance/gradient evidence. This maps well to DTF background removal: semantic/coarse mask first, then uncertainty-band matting/refinement.
- Edge-aware interpolation can choose different interpolation behavior along an edge, across an edge and in smooth regions. Smart Prepress should therefore retain directional-edge evidence during upscaling rather than applying one kernel uniformly when a higher-quality adaptive path is available.
- Morphological erosion/dilation/opening remain useful for noise and component separation, but kernel geometry and size determine what disappears or fills. Parameters must be converted to physical/output-aware units for print decisions.
- Local adaptive thresholding can outperform one global threshold when background statistics vary spatially; window size is itself a scale parameter and must not be hard-coded independently of effective resolution.

Implementation: contract advanced to 1.0.0-research with AlphaFilteringIntegrityReport, DeviceProfileCalibrationReport, InkjetProcessReport and BoundaryRefinementReport. Added warnings ALPHA_FILTERING_HALO_RISK, NONLINEAR_RESAMPLING_COMPOSITE_RISK, GENERIC_OUTPUT_PROFILE_NEEDS_DEVICE_PROOF and HALFTONE_PROCESS_NOT_CALIBRATED, plus regression assertions. No deployment, merge, Oracle or storefront change.

Corpus: GitHub explicit 998 / 10,000; research continuity 1025 / 10,000.


## Batch 063 — open-source device code, drawing applications and RIP production handoff

This pass was synchronized with a concurrent 19-page device/RIP batch that had already moved the canonical ledger from 998 to 1017. Batch 063 then added 26 non-overlapping pages, so no concurrently written source was double-counted.

- A print-ready image is not yet a device-ready raster. CUPS/PWG raster metadata exposes hardware X/Y resolution, bits per color/pixel, color order (chunky/banded/planar), color space, number of colors, separations, bytes/row and rendering intent. Smart Prepress therefore needs a DeviceRasterContract at the RIP/driver boundary.
- CUPS filters/backends and Printer Applications are distinct pipeline stages. Application-level validation must not pretend to validate device rasterization unless the driver/RIP contract is known.
- Gutenprint and ESC/P2 documentation/source show that printer output has its own channel/plane order, dot buffers, weave/interleave, row/column step/feed and device command language. File channel order is not authority for head-plane order.
- Alpha-safe scaling remains mandatory. libvips implementation documentation explicitly separates ordinary resize from a thumbnail path that premultiplies, color-manages, resamples and unpremultiplies. Intel IPP likewise provides explicit alpha-premultiplication primitives. This supports a strict alpha-association contract around every filter/resample stage.
- RIP white/spot channels are not interchangeable with Alpha. Caldera can copy Alpha to a selected spot channel and may delete the Alpha afterward; TIFF spot channels can also require polarity inversion. Therefore the print derivative may derive a white spot from Alpha, but the immutable master must retain its original Alpha and the derivative must record spot name, polarity and conversion provenance.
- Special inks need calibration independently of process color. Caldera exposes linearization and maximum limits for white, varnish, fluorescent and metallic channels. White density is therefore a calibrated device/media variable, not a universal constant.
- Recent DTF RIP behavior reinforces defensive input handling: white-spot aliases may map differently, incomplete white data can be blended with generated white, corrupt/indexed PNG transparency can affect output, and invalid ICC profiles must not be treated as valid production profiles.
- Soft proof is not the production transform. LittleCMS, OpenColorIO, Krita, Scribus and Inkscape all reinforce separate roles for display/view transforms, proof profiles, rendering/proofing intent, gamut checks, production ICC and DeviceLink transforms. A proof preview never substitutes for the production transform recorded at handoff.
- EXR is a useful warning case: high-precision/scene-referred pixels can exist without embedded color-space metadata. Missing color metadata must remain an explicit uncertainty rather than being silently assumed from pixel precision or file format.
- Transparency flattening is a prepress transformation, not a harmless save operation. Adobe documents vector/raster splitting, stitching boundaries, spot/overprint interactions, altered thin text/strokes and rasterization-resolution effects. Any flattened derivative must be re-preflighted.
- Host-based separations and In-RIP separations have different ownership. Smart Prepress must record where separation, trapping, color management, white/spot mapping and screening occur to prevent duplicated or contradictory processing.
- Device behavior can dominate visible defects. The Arabic printhead/RIP reference traces pixels into PRN dot states, channel order, encoder timing, nozzle interleave and variable droplet states; mismatched head/channel configuration can create banding or registration errors even when the source artwork is correct.
- Fiery XF spot/process overprint controls further reinforce that overprint and dot-gain simulation are process models and should not be baked blindly into the master image.

Implementation: research contract advanced to 1.1.0-research. Added DeviceRasterContractReport, PrinterPlaneAndWeaveReport, RipSpotWhiteHandoffReport and ProductionProofTransformReport. New guards include RASTER_HANDOFF_METADATA_INCOMPLETE, DEVICE_PLANE_ORDER_UNVERIFIED, RIP_WHITE_CHANNEL_MISSING, SPOT_CHANNEL_POLARITY_UNVERIFIED and PRINT_MASTER_PHYSICAL_SIZE_METADATA_CHANGED. Regression assertions were added for these contracts. This remains research-branch code; no Oracle execution, deployment or storefront modification was performed.

Corpus: GitHub explicit 1043 / 10,000; research continuity 1070 / 10,000.


## Batch 064 — image-only pre-RIP: Adobe, Autodesk, MATLAB, AI editors and open-source implementations

This batch narrows Smart Prepress to image preparation. Printing, screening, white separation and device execution are owned by the external RIP. The image-preparation system must deliver a measurable, provenance-rich master and must not pretend that printer execution was validated.

- Adobe's selection/masking workflow supports the architecture semantic selection -> edge refinement -> multi-background visual QA. Refine Hair is a specialized boundary operation, not a reason to apply one generic edge cleanup to every subject.
- Generative Upscale must carry a detail policy. A detail-preserving/restorative model and a creative-detail model have different evidentiary meaning. Creative/generated detail cannot be accepted as original source detail, especially around typography, logos, line art and small symbols.
- Reference-guided and generative edits require provider/model/reference provenance, source comparison, outside-mask pixel-diff checks and a complete re-preflight of alpha, text, geometry, color and resolution.
- MATLAB provides deterministic fallbacks and QA primitives that are well suited to a safety layer around AI: antialiased resize; guided filtering for edge-preserving alpha refinement; GrabCut for coarse segmentation; Lucy-Richardson with a known/estimated PSF; adaptive Wiener with an explicit noise assumption; deterministic region fill; gradient magnitude/direction; adaptive threshold polarity/sensitivity; and Delta-E measurement for unwanted color shifts.
- A segmentation mask remains semantic evidence, not final soft alpha. Guided/boundary refinement can improve edge placement while retaining the original semantic decision. Intentional soft alpha should never be binarized simply because a downstream utility accepts only masks.
- Autodesk's premultiplied-alpha documentation reinforces the existing rule that alpha association must be explicit before interpolation/filtering. Bitmap alpha/dither flags and RLA alpha options reinforce recording how pixels were encoded rather than guessing from file extension.
- Autodesk denoising and imagers reinforce operation ordering: denoise should occur before sharpening, bloom, tone effects or other post operations that create high-frequency features the denoiser might erase. Deconvolution remains evidence-gated rather than automatic.
- Scene-linear processing and display/view transforms are distinct. Appearance in a display transform cannot substitute for pixel/color-space provenance of the exported master.
- Photopea and FBA-style matting reinforce that high-quality extraction can require foreground RGB estimation as well as alpha estimation. Edge decontamination/despill should be localized to the boundary; opaque subject color should be protected by before/after Delta-E checks.
- Provider mask semantics differ materially. Some APIs use white=edit/remove, some use alpha-like masks, some require strict binary masks, some resize supplied masks, and some preserve or discard existing alpha. Every AI/API mask therefore records source, polarity, dimensions, gray/binary semantics and existing-alpha policy.
- SAM2 predicted IoU and mask stability are useful automatic evidence, but neither is sufficient for Print Master acceptance. They are routing/confidence inputs for refinement and QA.
- Localized inpainting should minimize scope, retain useful context, and verify that pixels outside the intended mask were unchanged. Crop-and-stitch workflows are useful because they isolate generation while preserving the rest of the source.
- AI super-resolution is not ordinary interpolation. It can synthesize plausible high-frequency structure. The output must be compared to the source, alpha rechecked, text/logo regions checked exactly, and physical output resolution recalculated from the actual exported pixels.
- High-resolution matting benefits from specialized HR models plus deterministic full-resolution boundary refinement. A practical hybrid is coarse semantic model -> uncertainty band -> matting/guided refinement -> foreground-color reconstruction -> edge decontamination -> recomposition QA.
- Model licensing is a production gate. Open source code does not imply commercially usable weights. The pipeline records model name, revision/source, license and explicit commercial-use status. Known non-commercial weights are rejected for commercial production; unknown license status requires review.

Implementation: contract 1.2.0 added ImageOnlyRipBoundaryReport, BackgroundRemovalIntegrityReport, AiMaskSemanticsReport, AiImageEditIntegrityReport, AiUpscaleIntegrityReport and InpaintIntegrityReport. Contract 1.3.0 added AiModelLicenseReport, DeterministicImageRefinementReport, EdgeColorPreservationReport and RestorationAlgorithmEvidenceReport. New guards cover segmentation-vs-alpha confusion, AI mask polarity/dimensions, original-alpha replacement, generative re-preflight, outside-mask changes, text/logo integrity, AI-upscale alpha loss, inpaint spill, non-commercial/unknown model licensing, soft-alpha binarization, opaque-subject despill color shift, PSF-less deconvolution and unsafe denoise ordering.

Regression assertions were updated on the research branch, but execution of the PHP test suite was not verified in the current runtime. No deployment, merge, Oracle or storefront modification was performed.

Corpus: GitHub explicit 1094 / 10,000; research continuity 1121 / 10,000.


## Batch 065

Verified 9 new pages. Key findings: keep alpha cleanup separate from white-underbase generation; express choke in physical units derived from effective PPI; preserve intentional soft alpha; record morphology kernel geometry; calibrate halftone min/max tone from physical output; and rerun edge preflight after resizing.

Corpus: 1103 / 10,000 verified ledger pages; research continuity 1130 / 10,000.


## Batch 066 — multilingual white-channel calibration, alpha semantics and dithering

Eight new canonical pages were individually opened/read and deduplicated. The strongest engineering conclusion is that choke is a calibrated device/media compensation constrained by artwork survivability, not a universal pixel constant. The prepress engine should compute physical choke from the calibrated target and effective output resolution, then cap/adapt it where local stroke width or connected-component survival would otherwise remove required white support.

The RIP white preview is promoted from a convenience thumbnail to QA evidence: audit source alpha, generated white plane, color composite and expected registration together. This separates dirty-alpha halos, underbase geometry errors and directional mechanical registration faults instead of treating every white edge as the same defect.

ImageMagick reinforces continuous alpha and explicit Porter-Duff/channel-copy semantics. GIMP documentation adds two important safeguards: dithering may quantize alpha independently from RGB, and Color-to-Alpha can partially erase foreground colors that resemble the selected background. Alpha thresholding explicitly converts soft transparency to binary transparency, so it is prohibited for intentional soft edges/fades unless the artwork policy explicitly calls for binary alpha.

Research-contract direction: WhiteChokeCalibrationEvidence + WhiteMaskSurvivabilityReport + RipWhitePreviewAudit + AlphaAssociationAndComposePolicy + AlphaQuantizationPolicy. Required evidence includes physical choke target, effective PPI, local pre/post morphology width, removed components, lost white area, alpha quantization method and intentional-soft-alpha preservation.

Corpus: 1111 / 10,000 verified ledger pages; research continuity 1138 / 10,000. No merge, deployment, Oracle execution or protected-storefront modification was performed.


## Scope correction + Batch 067 — image preparation only

User clarified the architectural boundary: Smart Prepress prepares the image/master only. The external RIP owns printing. Printer administration and physical/device execution are out of scope. Future research therefore prioritizes pixel/image methods: segmentation and background removal; alpha matting; foreground reconstruction and edge decontamination; morphology on masks; denoise/restoration/deblur; alpha-safe resampling and super-resolution; selective sharpening; thresholding; image-level halftone/white representation only where required for a prepared input asset; color/profile normalization; quality metrics; printability limits; and mockup-safe preparation. RIP research is admissible only to discover constraints on the image handed to it.

Batch 067 adds three distinct opened/read pages. Spanish GIMP Threshold documentation explicitly warns that binary threshold removes original antialiasing, supporting an artwork-class gate before thresholding. Local Threshold adds neighborhood-based contrast and configurable antialiasing, useful for scanned/text/line-art cleanup but inappropriate as a universal natural-edge matte operation. Krita reinforces non-destructive filter/filter-mask workflows so source pixels remain available for before/after QA.

The target pipeline is now explicit: source decode/orientation/profile -> artwork classification -> segmentation -> soft-alpha matting -> foreground RGB reconstruction/decontamination -> alpha cleanup -> evidence-gated restoration/denoise -> alpha-safe resize/upscale -> selective sharpening -> color/profile normalization -> multi-background edge QA + feature survival + effective-PPI checks -> immutable prepared master -> external RIP. No printer-control feature is implied by prior device-level corpus material.

Corpus: 1114 / 10,000 verified ledger pages; research continuity 1141 / 10,000. No merge, deployment, Oracle execution or protected-storefront modification.


## Batch 068 — image preparation findings

Six new canonical pages were opened, read, and deduplicated. Smart Prepress should measure three edge properties separately: unwanted low-alpha contamination, intentional soft alpha, and foreground RGB fringe in partially transparent pixels. Cleanup must depend on artwork class and edge intent rather than one universal threshold.

Semantic background separation is distinct from global color knockout because knockout can remove legitimate same-colored artwork details. Effective resolution must use real pixel dimensions and final physical size. Thin-line and small-feature checks should use physical units and report threatened components before an optional protective derivative is made.

Image-level halftone preparation should record LPI, angle, tone cutoffs, minimum-dot physical size, antialias policy, and diagnostic zones for removed, transition, and solid regions. Halftone generation belongs after final sizing because later resampling changes dot geometry and requires regeneration and re-preflight.

Corpus: 1120 / 10,000 verified ledger pages; research continuity 1147 / 10,000. No merge or deployment was performed.


## Batch 069 — non-destructive preparation, multiscale detail and transfer-function safety

Six new materially distinct pages were opened/read and deduplicated against both canonical URLs and already-counted localized mirrors. The image-only architecture is strengthened in four areas.

First, corrections should be represented as reversible recipes/masks over an immutable source wherever possible. This makes before/after QA and rollback possible and prevents a sequence of small destructive edits from silently becoming the only surviving master. Second, alpha is itself an editable signal: curve operations can alter alpha just as they alter RGB/lightness, so alpha-curve edits require explicit protection for intentional soft transparency and subsequent edge QA. Third, wavelet decomposition provides a practical multiscale model: fine detail, progressively coarser scales, and residual tone/color can be inspected/modified separately. Denoising or blemish cleanup should therefore target the scale carrying the defect and verify reconstruction, text strokes and edge energy rather than globally blurring the image. Fourth, working color space, bit depth and transfer function are part of pixel semantics. Linear-light and gamma-encoded values must not be treated as interchangeable during filtering/compositing/resampling; record the domain used for each operation and the export conversion.

Research-contract direction: NonDestructiveRecipeEvidence, MultiscaleDetailIntegrityReport, AlphaCurveSafetyReport and TransferFunctionDomainEvidence. Acceptance should combine noise/detail metrics with feature survival and edge integrity; a lower noise score alone is insufficient if fine typography or artwork texture was removed.

Corpus: 1126 / 10,000 verified ledger pages; research continuity 1153 / 10,000. No merge, deployment, Oracle execution or protected-storefront modification was performed.


## Batch 070 — professional references + open-source + AI image tools + multilingual implementations

Seventeen new materially distinct pages were opened/read and canonical-deduplicated. The research deliberately combined Adobe, Autodesk/MATLAB reference behavior, inspectable open-source implementations, AI editing/background-removal systems, Chinese/Japanese/Russian implementation material, and RIP documentation only where it constrains the input image.

Architecture conclusion: do not choose one globally 'best' image program. Use a reference stack. Adobe is especially valuable for production selection/matting, fringe diagnosis, edge RGB decontamination and constrained generative edits. Autodesk is a strong reference for straight/premultiplied-alpha semantics and compositing. MATLAB is a reference for deterministic restoration/segmentation/morphology/quality mathematics, including explicit PSF/noise assumptions and objective metrics. Open-source projects such as NAFNet, SwinIR, rembg/libvips/OpenCV provide inspectable candidates that can be benchmarked and integrated where licensing permits. AI editors/models are specialized optional processors, not authoritative masters: retain source/model/version/license/mask provenance and re-preflight every output.

The matting model is strengthened from 'predict alpha' to 'reason about F, B and alpha'. Edge RGB reconstruction/decontamination is independent from alpha geometry. A good mask with contaminated foreground RGB can still halo; a clean foreground RGB estimate with a bad alpha can still jag. The system should therefore measure both alpha-boundary integrity and boundary-color contamination on multiple diagnostic backgrounds.

Restoration routing is defect-specific. Deblur requires evidence about blur/PSF/noise and must detect ringing/hallucinated detail. Denoise must preserve edge/text energy. SR must distinguish classical interpolation/restoration from real-world/generative detail synthesis. Global SSIM/PSNR/BRISQUE/NIQE/PIQE are evidence signals, not acceptance authorities; combine them with ROI/feature survival and alpha/color checks.

RIP boundary remains image-only: re-reading current Caldera/CADlink material confirms that transparency can directly drive generated white and partial opacity can influence underbase density. Therefore exported alpha is production data. RipInputAlphaSemanticsReport should validate alpha range/polarity, intentional soft transparency, near-zero contamination, fully transparent RGB, boundary continuity and optional white-preview derivation before handing the immutable prepared master to an external RIP. No printer administration/control is included.

Corpus: 1143 / 10,000 verified ledger pages; research continuity 1170 / 10,000. No merge, deployment, Oracle execution or protected-storefront modification was performed.


## Batch 071 — Adobe/Autodesk/MATLAB reference layer

Four new canonical pages were opened/read after multilingual and duplicate filtering. Adobe Defringe reinforces boundary-local foreground-color repair rather than global recoloring. Autodesk formalizes premultiplied vs nonpremultiplied alpha and fractional edge coverage, strengthening the rule that alpha association is metadata with mathematical consequences, not an implementation detail. MATLAB quality documentation establishes that QA should be an ensemble: reference-based SSIM/MS-SSIM and local maps when the original is available; no-reference BRISQUE/NIQE/PIQE only as complementary evidence. BRISQUE's trained distribution makes it unsuitable as a universal acceptance threshold.

Architecture direction: commercial tools are reference behaviors, not dependencies. Adobe informs edge/matting UX and repair semantics; Autodesk informs compositing/alpha mathematics; MATLAB supplies deterministic algorithm and measurement references. Open-source implementations are benchmarked against these behaviors, while AI tools are evaluated for provenance, mask/alpha fidelity, hallucinated detail and reproducibility. RIP documentation remains input-contract research only.

Corpus: 1159 / 10,000 verified ledger pages; research continuity 1186 / 10,000. No merge, deployment, Oracle execution or storefront modification.


## Batch 072 — edge diagnostics, decode semantics and explicit color transforms

Seven new OpenCV method/reference pages were individually read and deduplicated against version-equivalent pages already in the corpus. The important architectural distinction is diagnostic versus transformative processing. Sobel, Laplacian and Canny should primarily serve EdgeIntegrityDiagnostic: compare source and candidate edge geometry, locate ringing/halos, quantify edge displacement and detect lost thin strokes after denoise, resampling, AI restoration or sharpening. They are not alpha-matting algorithms.

Decode semantics become first-class provenance. Orientation handling, alpha-preserving/unchanged decode, numeric depth and codec flags can alter pixels before the pipeline begins, so source hash alone is insufficient; record decoder/version/options and decoded tensor properties. Color conversion similarly requires explicit source/destination representation, channel ranges and round-trip error. Background subtraction was deliberately retained as a negative distinction: temporal scene-background models must not be mislabeled as still-image semantic background removal.

Contract direction: EdgeIntegrityDiagnostic, DecodeSemanticsEvidence, ColorTransformRoundTripReport. Transform acceptance continues to require feature survival, alpha integrity and color constraints in addition to global quality metrics.

Corpus: 1166 / 10,000 verified ledger pages; research continuity 1193 / 10,000. No merge, deployment, Oracle execution or storefront modification.
