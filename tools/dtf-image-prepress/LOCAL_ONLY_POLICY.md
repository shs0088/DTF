# Local-only runtime policy

Customer artwork processing is local/on-site only.

Runtime rules:

1. No image bytes or image metadata may be sent to an external website, SaaS API, cloud model endpoint, telemetry endpoint, or hosted inference provider.
2. Research references to Adobe, Cloudinary, Stability and other services remain documentation/reference material only. They are not runtime providers.
3. Runtime model files must be installed before processing and verified by SHA-256. The runtime does not download a model when a customer image is submitted.
4. Runtime TypeScript is CI-scanned for outbound network primitives such as fetch, axios, HTTP(S) request, WebSocket and socket-connect APIs.
5. Models execute through local backends only: CPU, local NVIDIA GPU, Intel GPU/NPU or local Vulkan backends.
6. A model/provider license and provenance record is required independently of the framework used to execute it.
7. The original artwork is preserved locally. All processing outputs are derived candidates.
8. White underbase and printer choke remain RIP/printer/media-profile concerns; the image master remains RGBA artwork.

For stronger deployment isolation, the image worker should additionally be run under an operating-system/container egress-deny policy. CI source scanning is a defense-in-depth check, not a substitute for OS-level network isolation.
