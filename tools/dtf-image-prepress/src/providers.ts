export type ProviderStatus =
  | "safe-candidate"
  | "conversion-only"
  | "review-license"
  | "commercial-api"
  | "local-core";
export type DeploymentMode = "local" | "external-api" | "reference-only";

export interface ProviderDescriptor {
  id: string;
  role:
    | "io"
    | "ocr"
    | "vector"
    | "segmentation"
    | "background-matting"
    | "edge-refinement"
    | "color-management"
    | "vector-rasterizer"
    | "quality-metric"
    | "upscale-restoration"
    | "mockup";
  status: ProviderStatus;
  deploymentModes: DeploymentMode[];
  licenseNote: string;
  autoEnable: boolean;
  note: string;
}

export const PROVIDER_CATALOG: ProviderDescriptor[] = [
  {
    id: "sharp",
    role: "io",
    status: "local-core",
    deploymentModes: ["local"],
    licenseNote: "Apache-2.0",
    autoEnable: true,
    note: "Raster decode/metadata/alpha-safe export. Sharp internally uses premultiply/resize/unpremultiply for RGBA resize paths.",
  },
  {
    id: "paddleocr-ppocrv5-arabic",
    role: "ocr",
    status: "safe-candidate",
    deploymentModes: ["local"],
    licenseNote: "Official PaddleOCR repository is Apache-2.0; selected downloaded model assets and transitive dependencies are still recorded explicitly.",
    autoEnable: false,
    note: "Arabic/English OCR QA provider. OCR is evidence, never an artwork editor.",
  },
  {
    id: "tesseract-ocr-arabic",
    role: "ocr",
    status: "safe-candidate",
    deploymentModes: ["local"],
    licenseNote: "Apache-2.0 for Tesseract code; installed Arabic traineddata provenance is recorded separately.",
    autoEnable: false,
    note: "Secondary local OCR cross-check for Arabic/English text preservation; never edits artwork.",
  },
  {
    id: "easyocr-arabic",
    role: "ocr",
    status: "safe-candidate",
    deploymentModes: ["local"],
    licenseNote: "Apache-2.0 for EasyOCR code; packaged recognition weights are recorded separately.",
    autoEnable: false,
    note: "Secondary local multilingual OCR cross-check. EasyOCR documents Arabic-script support.",
  },
  {
    id: "vtracer",
    role: "vector",
    status: "safe-candidate",
    deploymentModes: ["local"],
    licenseNote: "MIT OR Apache-2.0",
    autoEnable: false,
    note: "Local raster-to-vector candidate for logos/line art; rasterize and QA-compare output before acceptance.",
  },
  {
    id: "pymatting",
    role: "background-matting",
    status: "safe-candidate",
    deploymentModes: ["local"],
    licenseNote: "MIT",
    autoEnable: false,
    note: "Alpha matting plus foreground estimation; useful for preventing halo/color bleeding after background removal.",
  },
  {
    id: "background-matting-v2",
    role: "background-matting",
    status: "safe-candidate",
    deploymentModes: ["local"],
    licenseNote: "MIT; repository states commercial use is permitted.",
    autoEnable: false,
    note: "High-resolution matting candidate. Best suited when a reference/background image is available.",
  },
  {
    id: "sam2",
    role: "segmentation",
    status: "safe-candidate",
    deploymentModes: ["local"],
    licenseNote: "Apache-2.0 for SAM 2 code/checkpoints according to the official repository.",
    autoEnable: false,
    note: "Useful as an interactive/prompts-assisted segmentation candidate, not as automatic final alpha matting.",
  },
  {
    id: "rembg",
    role: "segmentation",
    status: "safe-candidate",
    deploymentModes: ["local"],
    licenseNote: "Official rembg application is MIT; every bundled/downloaded model weight has its own independent license/provenance record.",
    autoEnable: false,
    note: "Useful model orchestrator. Provider selection must inspect the chosen model license rather than inheriting rembg's license.",
  },
  {
    id: "opencv-guided-filter",
    role: "edge-refinement",
    status: "safe-candidate",
    deploymentModes: ["local"],
    licenseNote: "OpenCV licensing applies; verify packaged module version at deployment.",
    autoEnable: false,
    note: "Deterministic edge-aware refinement candidate; does not invent semantic content.",
  },
  {
    id: "littlecms",
    role: "color-management",
    status: "safe-candidate",
    deploymentModes: ["local"],
    licenseNote: "MIT",
    autoEnable: false,
    note: "ICC V2/V4 color transform engine candidate for explicit profile conversion and soft-proof support.",
  },
  {
    id: "resvg",
    role: "vector-rasterizer",
    status: "safe-candidate",
    deploymentModes: ["local"],
    licenseNote: "MIT OR Apache-2.0",
    autoEnable: false,
    note: "Deterministic SVG rasterizer candidate used to compare vectorized artwork against the source at target print resolution.",
  },
  {
    id: "lpips",
    role: "quality-metric",
    status: "safe-candidate",
    deploymentModes: ["local"],
    licenseNote: "BSD-style license in the official PerceptualSimilarity repository.",
    autoEnable: false,
    note: "Supplementary perceptual similarity metric only. It never overrides OCR, topology, edge, alpha, or color hard gates.",
  },
  {
    id: "scikit-image-blur-effect",
    role: "quality-metric",
    status: "safe-candidate",
    deploymentModes: ["local"],
    licenseNote: "BSD-3-Clause project licensing; packaged dependencies recorded separately.",
    autoEnable: false,
    note: "Local no-reference blur metric returning a normalized 0..1 blur-effect measure; thresholds must be calibrated on the DTF corpus.",
  },
  {
    id: "opencv-brisque",
    role: "quality-metric",
    status: "safe-candidate",
    deploymentModes: ["local"],
    licenseNote: "OpenCV 4.5+ is Apache-2.0; BRISQUE model/range assets must be preinstalled and hash-verified.",
    autoEnable: false,
    note: "Supplementary no-reference image-quality signal. Never a standalone acceptance or rejection authority.",
  },
  {
    id: "real-esrgan",
    role: "upscale-restoration",
    status: "safe-candidate",
    deploymentModes: ["local"],
    licenseNote: "BSD-3-Clause for official code; model-weight terms must still be checked.",
    autoEnable: false,
    note: "Photo/raster restoration candidate only; prohibited from silently rewriting detected text.",
  },
  {
    id: "swinir",
    role: "upscale-restoration",
    status: "safe-candidate",
    deploymentModes: ["local"],
    licenseNote: "Apache-2.0 for the official project; transitive/model terms must still be checked.",
    autoEnable: false,
    note: "Alternative restoration candidate for benchmark competition.",
  },
  {
    id: "restormer",
    role: "upscale-restoration",
    status: "safe-candidate",
    deploymentModes: ["local"],
    licenseNote: "Official repository license changed to MIT; selected weights/transitive dependencies still require verification.",
    autoEnable: false,
    note: "Deblur/denoise/restoration candidate. Use only when diagnosis indicates blur/noise rather than as a universal enhancer.",
  },
  {
    id: "waifu2x-ncnn-vulkan",
    role: "upscale-restoration",
    status: "safe-candidate",
    deploymentModes: ["local"],
    licenseNote: "MIT for the official ncnn-vulkan implementation; included model/dependency terms still require packaging review.",
    autoEnable: false,
    note: "Candidate for illustration/anime/line-art-like raster images; not the default for photographs.",
  },
  {
    id: "upscayl",
    role: "upscale-restoration",
    status: "review-license",
    deploymentModes: ["reference-only"],
    licenseNote: "Current project/backend is AGPL-3.0; do not embed into a proprietary service without legal architecture review.",
    autoEnable: false,
    note: "Useful benchmark/reference application around Real-ESRGAN/Vulkan, not a default embedded dependency.",
  },
  {
    id: "birefnet",
    role: "background-matting",
    status: "safe-candidate",
    deploymentModes: ["local"],
    licenseNote: "Official GitHub code and official Hugging Face BiRefNet model card are MIT. Exact preinstalled model revision remains SHA-256/provenance pinned.",
    autoEnable: false,
    note: "General high-resolution dichotomous segmentation candidate; output remains subject to local matting/edge QA.",
  },
  {
    id: "birefnet-hr-matting",
    role: "background-matting",
    status: "safe-candidate",
    deploymentModes: ["local"],
    licenseNote: "Official BiRefNet_HR-matting model card is MIT; local model bytes and accompanying code are revision-pinned and hash-verified.",
    autoEnable: false,
    note: "2048-class high-resolution matting candidate for difficult fine boundaries; benchmark before default enablement.",
  },
  {
    id: "inspyrenet",
    role: "segmentation",
    status: "conversion-only",
    deploymentModes: ["reference-only"],
    licenseNote: "Official InSPyReNet code is MIT, but the common local inference path uses PyTorch .pth checkpoints; production runtime blocks pickle/TorchScript model formats.",
    autoEnable: false,
    note: "Benchmark/conversion candidate only until an approved local deployment artifact is produced and validated.",
  },
  {
    id: "ben",
    role: "background-matting",
    status: "conversion-only",
    deploymentModes: ["reference-only"],
    licenseNote: "BEN code/model access is permissive, but the common cloned-repo inference path loads BEN_Base.pth; production runtime blocks pickle checkpoints.",
    autoEnable: false,
    note: "Legacy/research BEN path. Convert or use the separately published BEN2 ONNX deployment artifact instead.",
  },
  {
    id: "ben2-onnx",
    role: "background-matting",
    status: "safe-candidate",
    deploymentModes: ["local"],
    licenseNote: "Official PramaLLC/BEN2 repository/model card is MIT and publishes an ONNX deployment artifact; exact local bytes remain SHA-256/provenance pinned.",
    autoEnable: false,
    note: "Local ONNX background/matting candidate. Benchmark against BiRefNet variants before default enablement.",
  },
  {
    id: "bria-rmbg-2",
    role: "background-matting",
    status: "review-license",
    deploymentModes: ["reference-only"],
    licenseNote: "Public RMBG-2.0 weights are CC BY-NC 4.0/non-commercial. Commercial self-hosting requires a separate BRIA agreement; external API use is forbidden by local-only policy.",
    autoEnable: false,
    note: "Research/quality comparison only under current project licensing. Do not load public weights in commercial runtime.",
  },
  {
    id: "cloudinary-background-removal",
    role: "background-matting",
    status: "commercial-api",
    deploymentModes: ["reference-only"],
    licenseNote: "External commercial API/service terms and transformation pricing apply.",
    autoEnable: false,
    note: "Optional cloud candidate with fine-edge mode and derived-asset workflow; 6144×6144 input processing limit is documented.",
  },
  {
    id: "stability-remove-background",
    role: "background-matting",
    status: "commercial-api",
    deploymentModes: ["reference-only"],
    licenseNote: "External Stability API terms and credit pricing apply.",
    autoEnable: false,
    note: "Optional cloud background-removal candidate; output still passes local alpha/edge QA.",
  },
  {
    id: "stability-esrgan-upscale",
    role: "upscale-restoration",
    status: "commercial-api",
    deploymentModes: ["reference-only"],
    licenseNote: "External Stability API terms and pricing apply.",
    autoEnable: false,
    note: "Optional ESRGAN-based cloud upscale candidate; generative/latent upscalers remain separate because text fidelity risk differs.",
  },
  {
    id: "adobe-illustrator-image-trace",
    role: "vector",
    status: "commercial-api",
    deploymentModes: ["reference-only"],
    licenseNote: "External commercial API/service terms apply.",
    autoEnable: false,
    note: "Optional external vector candidate; never required for core engine operation.",
  },
  {
    id: "adobe-photoshop-api",
    role: "mockup",
    status: "commercial-api",
    deploymentModes: ["reference-only"],
    licenseNote: "External commercial API/service terms apply.",
    autoEnable: false,
    note: "Optional high-fidelity PSD Smart Object mockup path; separate from print-master processing.",
  },
];
