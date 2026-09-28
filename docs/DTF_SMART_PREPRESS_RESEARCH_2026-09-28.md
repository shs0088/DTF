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
