import type { RipProfile } from "./contracts";

export const DEFAULT_RIP_PROFILE: RipProfile = {
  id: "generic-dtf-rgba-v1",
  targetDpi: 300,
  criticalDpi: 150,
  maxUpscaleFactor: 4,
  allowSemiTransparency: true,
  semiTransparencyReviewThreshold: 0.02,
  preferredColorSpace: "srgb",
  bakeWhiteUnderbase: false,
};

export const MAX_SOURCE_BYTES = 100 * 1024 * 1024;

export const SUPPORTED_RASTER_FORMATS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "tif",
  "tiff",
]);

export const SUPPORTED_VECTOR_OR_DOCUMENT_FORMATS = new Set(["svg", "pdf"]);

export function normalizeFormat(value: string): string {
  return value.toLowerCase().replace(/^\./, "");
}
