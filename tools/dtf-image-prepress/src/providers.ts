export type ProviderStatus = "safe-candidate" | "review-license" | "commercial-api" | "local-core";

export interface ProviderDescriptor {
  id: string;
  role: "io" | "ocr" | "vector" | "background-matting" | "upscale-restoration" | "mockup";
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
    note: "Raster decode/metadata/alpha-safe export. Not a semantic background remover.",
  },
  {
    id: "paddleocr-ppocrv5-arabic",
    role: "ocr",
    status: "safe-candidate",
    licenseNote: "Check PaddleOCR code/model licenses at deployment time.",
    autoEnable: false,
    note: "Arabic/English OCR QA provider. OCR is evidence, never an artwork editor.",
  },
  {
    id: "vtracer",
    role: "vector",
    status: "safe-candidate",
    licenseNote: "MIT OR Apache-2.0",
    autoEnable: false,
    note: "Local raster-to-vector candidate for logos/line art; output must be rasterized and QA-compared before acceptance.",
  },
  {
    id: "real-esrgan",
    role: "upscale-restoration",
    status: "safe-candidate",
    licenseNote: "BSD-3-Clause for the code; model-weight terms must still be checked.",
    autoEnable: false,
    note: "Photo/raster restoration candidate only; prohibited from silently rewriting detected text.",
  },
  {
    id: "swinir",
    role: "upscale-restoration",
    status: "safe-candidate",
    licenseNote: "Apache-2.0 for the project; transitive/model terms must still be checked.",
    autoEnable: false,
    note: "Alternative restoration candidate for benchmark competition.",
  },
  {
    id: "birefnet",
    role: "background-matting",
    status: "review-license",
    licenseNote: "Do not enable commercially until code and selected model-weight licensing are verified.",
    autoEnable: false,
    note: "High-quality segmentation/matting candidate; not trusted as a final authority.",
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
    note: "Optional high-fidelity PSD mockup path; separate from print-master processing.",
  },
];
