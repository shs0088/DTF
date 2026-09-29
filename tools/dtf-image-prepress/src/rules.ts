import type { RipProfile } from "./contracts";

export const DEFAULT_RIP_PROFILE: RipProfile = {
  id: "generic-dtf-rgba-v2",
  targetDpi: 300,
  criticalDpi: 150,
  maxUpscaleFactor: 4,
  allowSemiTransparency: true,
  semiTransparencyReviewThreshold: 0.02,
  alphaHandlingMode: "rip-adaptive",
  preserveIntentionalSoftEffects: true,
  preferredColorSpace: "srgb",
  bakeWhiteUnderbase: false,
  underbaseStrategy: "rip-generated",
};

export const BINARY_EDGE_DTF_PROFILE: RipProfile = {
  id: "generic-dtf-binary-edge-v1",
  targetDpi: 300,
  criticalDpi: 150,
  maxUpscaleFactor: 4,
  allowSemiTransparency: false,
  semiTransparencyReviewThreshold: 0,
  alphaHandlingMode: "binary-edge",
  preserveIntentionalSoftEffects: false,
  preferredColorSpace: "srgb",
  bakeWhiteUnderbase: false,
  underbaseStrategy: "rip-generated",
};

export const CONTINUOUS_ALPHA_PROFILE: RipProfile = {
  id: "generic-dtf-continuous-alpha-v1",
  targetDpi: 300,
  criticalDpi: 150,
  maxUpscaleFactor: 4,
  allowSemiTransparency: true,
  semiTransparencyReviewThreshold: 0.08,
  alphaHandlingMode: "preserve-continuous",
  preserveIntentionalSoftEffects: true,
  preferredColorSpace: "srgb",
  bakeWhiteUnderbase: false,
  underbaseStrategy: "rip-generated",
};

export const MAX_SOURCE_BYTES = 100 * 1024 * 1024;

export const SUPPORTED_RASTER_FORMATS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "avif",
  "gif",
  "tif",
  "tiff",
]);

// V1 does not claim SVG/PDF support until dedicated, tested inspectors exist.
export const DEFERRED_SOURCE_FORMATS = new Set(["svg", "pdf"]);

export function normalizeFormat(value: string): string {
  return value.toLowerCase().replace(/^\./, "");
}
