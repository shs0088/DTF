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
