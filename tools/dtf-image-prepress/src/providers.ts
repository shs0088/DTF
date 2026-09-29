export type ProviderStatus = "safe-candidate" | "review-license" | "commercial-api" | "local-core";

export interface ProviderDescriptor {
  id: string;
  role:
    | "io"
    | "ocr"
    | "vector"
    | "background-matting"
    | "edge-refinement"
    | "upscale-restoration"
    | "mockup";
  status: ProviderStatus;
  licenseNote: string;
  autoEnable: boolean;
  note: string;
}

export const PROVIDER_CATALOG: ProviderDescriptor[] = [
  {
    id: "sharp",
    role: "io",
    status: "local-core",
    licenseNote: "Apache-2.0",
    autoEnable: true,
    note: "Raster decode/metadata/alpha-safe export. Sharp internally uses premultiply/resize/unpremultiply for RGBA resize paths.",
  },
  {
    id: "paddleocr-ppocrv5-arabic",
    role: "ocr",
    status: "safe-candidate",
    licenseNote: "Check PaddleOCR code and selected model licenses at deployment time.",
    autoEnable: false,
    note: "Arabic/English OCR QA provider. OCR is evidence, never an artwork editor.",
  },
  {
    id: "vtracer",
    role: "vector",
    status: "safe-candidate",
    licenseNote: "MIT OR Apache-2.0",
    autoEnable: false,
    note: "Local raster-to-vector candidate for logos/line art; rasterize and QA-compare output before acceptance.",
  },
  {
    id: "pymatting",
    role: "background-matting",
    status: "safe-candidate",
    licenseNote: "MIT",
    autoEnable: false,
    note: "Alpha matting plus foreground estimation; useful for preventing halo/color bleeding after background removal.",
  },
  {
    id: "background-matting-v2",
    role: "background-matting",
    status: "safe-candidate",
    licenseNote: "MIT; repository states commercial use is permitted.",
    autoEnable: false,
    note: "High-resolution matting candidate. Best suited when a reference/background image is available.",
  },
  {
    id: "opencv-guided-filter",
    role: "edge-refinement",
    status: "safe-candidate",
    licenseNote: "OpenCV licensing applies; verify packaged module version at deployment.",
    autoEnable: false,
    note: "Deterministic edge-aware refinement candidate; does not invent semantic content.",
  },
  {
    id: "real-esrgan",
    role: "upscale-restoration",
    status: "safe-candidate",
    licenseNote: "BSD-3-Clause for official code; model-weight terms must still be checked.",
    autoEnable: false,
    note: "Photo/raster restoration candidate only; prohibited from silently rewriting detected text.",
  },
  {
    id: "swinir",
    role: "upscale-restoration",
    status: "safe-candidate",
    licenseNote: "Apache-2.0 for the official project; transitive/model terms must still be checked.",
    autoEnable: false,
    note: "Alternative restoration candidate for benchmark competition.",
  },
  {
    id: "restormer",
    role: "upscale-restoration",
    status: "safe-candidate",
    licenseNote: "Official repository license changed to MIT; selected weights/transitive dependencies still require verification.",
    autoEnable: false,
    note: "Deblur/denoise/restoration candidate. Use only when diagnosis indicates blur/noise rather than as a universal enhancer.",
  },
  {
    id: "birefnet",
    role: "background-matting",
    status: "review-license",
    licenseNote: "Do not enable commercially until code and selected model-weight licensing are verified.",
    autoEnable: false,
    note: "High-resolution segmentation/matting candidate; not trusted as a final authority.",
  },
  {
    id: "adobe-illustrator-image-trace",
    role: "vector",
    status: "commercial-api",
    licenseNote: "External commercial API/service terms apply.",
    autoEnable: false,
    note: "Optional external vector candidate; never required for core engine operation.",
  },
  {
    id: "adobe-photoshop-api",
    role: "mockup",
    status: "commercial-api",
    licenseNote: "External commercial API/service terms apply.",
    autoEnable: false,
    note: "Optional high-fidelity PSD Smart Object mockup path; separate from print-master processing.",
  },
];
