export const DESIGN_PRODUCT_TYPES = [
  "T-Shirt",
  "Mug",
  "Cap",
  "T-Shirt + Mug",
  "T-Shirt + Cap",
  "Mug + Cap",
  "T-Shirt + Mug + Cap",
] as const;

export type DesignProductType = (typeof DESIGN_PRODUCT_TYPES)[number];

export interface AnalyzerInput {
  format: string;
  mime: string;
  signatureValid: boolean;
  byteSize: number;
  pixelWidth: number;
  pixelHeight: number;
  intendedWidthIn: number;
  intendedHeightIn: number;
  embeddedDpi?: number | null;
  hasAlpha?: boolean | null;
  previewable: boolean;
  productType?: string | null;
  placeholderWidthPx?: number | null;
  placeholderHeightPx?: number | null;
}

export interface AnalyzerResult {
  ruleVersion: "dtf-preflight-v1.0";
  readable: boolean;
  analyzable: boolean;
  previewable: boolean;
  effectiveDpi: { x: number; y: number; minimum: number } | null;
  physicalSizeIn: { width: number; height: number } | null;
  scalingRisk: "none" | "warning" | "critical";
  productTypeValid: boolean;
  placeholderCheck: { status: "not_available" | "passed" | "warning"; required?: string; actual?: string };
  errors: string[];
  warnings: string[];
  passed: boolean;
}

const ALLOWED_FORMATS = new Set(["png", "jpg", "jpeg", "webp", "svg", "pdf"]);
const MAX_BYTES = 50 * 1024 * 1024;
const MIN_DPI = 300;

export function effectiveDpi(pixelWidth: number, pixelHeight: number, physicalWidthIn: number, physicalHeightIn: number) {
  if (pixelWidth <= 0 || pixelHeight <= 0 || physicalWidthIn <= 0 || physicalHeightIn <= 0) return null;
  const x = pixelWidth / physicalWidthIn;
  const y = pixelHeight / physicalHeightIn;
  return { x: round(x), y: round(y), minimum: round(Math.min(x, y)) };
}

function round(value: number) { return Math.round(value * 100) / 100; }

export function analyzeAsset(input: AnalyzerInput): AnalyzerResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const normalizedFormat = input.format.toLowerCase().replace(".", "");
  const dpi = effectiveDpi(input.pixelWidth, input.pixelHeight, input.intendedWidthIn, input.intendedHeightIn);
  const physicalSizeIn = input.intendedWidthIn > 0 && input.intendedHeightIn > 0 ? { width: round(input.intendedWidthIn), height: round(input.intendedHeightIn) } : null;
  const readable = input.signatureValid && input.byteSize > 0 && input.byteSize <= MAX_BYTES;
  const analyzable = readable && input.pixelWidth > 0 && input.pixelHeight > 0;
  const productTypeValid = !input.productType || DESIGN_PRODUCT_TYPES.includes(input.productType as DesignProductType);

  if (!ALLOWED_FORMATS.has(normalizedFormat)) errors.push(`Unsupported format: ${input.format}.`);
  if (!input.signatureValid) errors.push("File signature does not match the declared format.");
  if (input.byteSize <= 0) errors.push("File is empty.");
  if (input.byteSize > MAX_BYTES) errors.push("File exceeds the 50 MB upload limit.");
  if (!input.previewable) errors.push("Asset cannot produce a preview.");
  if (!analyzable) errors.push("Asset is not readable/analyzable for preflight.");
  if (!productTypeValid) errors.push("Selected product type is not one of the 7 supported combinations.");
  if (dpi && dpi.minimum < MIN_DPI) warnings.push(`Effective DPI is ${dpi.minimum}; minimum recommended DPI is ${MIN_DPI}.`);
  if (!dpi) errors.push("Physical print size and pixel dimensions are required to calculate effective DPI.");

  let placeholderCheck: AnalyzerResult["placeholderCheck"] = { status: "not_available" };
  if (input.placeholderWidthPx && input.placeholderHeightPx) {
    const required = `${input.placeholderWidthPx} × ${input.placeholderHeightPx} px`;
    const actual = `${input.pixelWidth} × ${input.pixelHeight} px`;
    if (input.pixelWidth < input.placeholderWidthPx || input.pixelHeight < input.placeholderHeightPx) {
      placeholderCheck = { status: "warning", required, actual };
      warnings.push(`Artwork is smaller than the mapped print-area target (${required}).`);
    } else placeholderCheck = { status: "passed", required, actual };
  }

  const scalingRisk: AnalyzerResult["scalingRisk"] = !dpi ? "critical" : dpi.minimum < 150 ? "critical" : dpi.minimum < MIN_DPI ? "warning" : "none";
  if (scalingRisk === "critical" && dpi) errors.push("Scaling risk is critical for the requested physical size.");
  return { ruleVersion: "dtf-preflight-v1.0", readable, analyzable, previewable: input.previewable, effectiveDpi: dpi, physicalSizeIn, scalingRisk, productTypeValid, placeholderCheck, errors, warnings, passed: errors.length === 0 };
}
