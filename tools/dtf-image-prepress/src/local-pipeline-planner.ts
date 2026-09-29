import type { ArtworkKind, RoutingSignals } from "./contracts";
import { getRuntimeProviders } from "./execution-policy";
import {
  selectLocalInferenceBackends,
  type HardwareClass,
  type InferenceBackendDescriptor,
} from "./inference-backends";

export type PipelineRole =
  | "ocr"
  | "mask-proposal"
  | "matting-refinement"
  | "vectorize"
  | "vector-rasterize-qa"
  | "deblur-denoise"
  | "upscale"
  | "edge-refinement"
  | "color-management"
  | "qa";

export interface InstalledLocalCapability {
  providerId: string;
  modelFormat?: string;
  verified: boolean;
}

export interface PlannedProviderStep {
  role: PipelineRole;
  providerId: string;
  required: boolean;
  backendCandidates: string[];
  reason: string;
}

export interface LocalPipelinePlan {
  artworkKind: ArtworkKind;
  steps: PlannedProviderStep[];
  blockedReasons: string[];
  requiresMaskConsensus: boolean;
  localOnly: true;
}

const MODEL_PROVIDERS = new Set([
  "paddleocr-ppocrv5-arabic",
  "easyocr-arabic",
  "birefnet",
  "birefnet-hr-matting",
  "inspyrenet",
  "ben",
  "real-esrgan",
  "swinir",
  "restormer",
  "waifu2x-ncnn-vulkan",
  "opencv-brisque",
]);

function availableProviders(
  installed: InstalledLocalCapability[],
): Map<string, InstalledLocalCapability> {
  const runtimeAllowed = new Set(getRuntimeProviders().map((p) => p.id));
  return new Map(
    installed
      .filter((item) => item.verified && runtimeAllowed.has(item.providerId))
      .map((item) => [item.providerId, item]),
  );
}

function backendIdsFor(
  capability: InstalledLocalCapability | undefined,
  hardware: HardwareClass[],
): string[] {
  if (!capability?.modelFormat) return [];
  return selectLocalInferenceBackends({
    availableHardware: hardware,
    modelFormat: capability.modelFormat,
  }).map((item: InferenceBackendDescriptor) => item.id);
}

function pushIfAvailable(
  steps: PlannedProviderStep[],
  available: Map<string, InstalledLocalCapability>,
  hardware: HardwareClass[],
  input: Omit<PlannedProviderStep, "backendCandidates">,
) {
  const capability = available.get(input.providerId);
  if (!capability) return false;
  if (MODEL_PROVIDERS.has(input.providerId) && !capability.verified) return false;
  steps.push({
    ...input,
    backendCandidates: backendIdsFor(capability, hardware),
  });
  return true;
}

export function planLocalPipeline(input: {
  routing: RoutingSignals;
  installed: InstalledLocalCapability[];
  hardware: HardwareClass[];
}): LocalPipelinePlan {
  const steps: PlannedProviderStep[] = [];
  const blockedReasons: string[] = [];
  const available = availableProviders(input.installed);
  const routing = input.routing;

  const textSensitive =
    routing.textDetected ||
    routing.kind === "text-heavy" ||
    routing.kind === "mixed";

  if (textSensitive) {
    const ocrProviders = [
      "paddleocr-ppocrv5-arabic",
      "tesseract-ocr-arabic",
      "easyocr-arabic",
    ];
    let count = 0;
    for (const providerId of ocrProviders) {
      if (
        pushIfAvailable(steps, available, input.hardware, {
          role: "ocr",
          providerId,
          required: providerId === "paddleocr-ppocrv5-arabic",
          reason: "Establish independent local OCR evidence before any text-sensitive processing.",
        })
      ) {
        count++;
      }
    }
    if (count < 2) {
      blockedReasons.push(
        "Text-sensitive artwork needs at least two verified local OCR engines for automatic text consensus; otherwise require review.",
      );
    }
  }

  const difficultBoundary = Boolean(
    routing.foregroundSharesBackgroundColor ||
      routing.lowContrastBoundary ||
      routing.intentionalGlowOrShadow,
  );

  let maskCount = 0;
  if (routing.backgroundPresent) {
    const maskProviders = difficultBoundary
      ? ["birefnet-hr-matting", "ben", "birefnet", "inspyrenet"]
      : ["birefnet", "inspyrenet", "ben", "birefnet-hr-matting"];

    for (const providerId of maskProviders) {
      if (
        pushIfAvailable(steps, available, input.hardware, {
          role: "mask-proposal",
          providerId,
          required: maskCount === 0,
          reason: difficultBoundary
            ? "Difficult boundary: generate independent local mask/matte proposals for consensus."
            : "Generate a local foreground proposal that will still pass alpha/edge QA.",
        })
      ) {
        maskCount++;
      }
      if (maskCount >= (difficultBoundary ? 3 : 2)) break;
    }

    pushIfAvailable(steps, available, input.hardware, {
      role: "matting-refinement",
      providerId: "pymatting",
      required: difficultBoundary,
      reason: "Refine uncertain alpha and estimate foreground colors to reduce halo/color bleeding.",
    });

    pushIfAvailable(steps, available, input.hardware, {
      role: "edge-refinement",
      providerId: "opencv-guided-filter",
      required: false,
      reason: "Deterministic edge-aware refinement candidate for the uncertainty band.",
    });

    if (maskCount === 0) {
      blockedReasons.push("No verified local background/matting model is installed.");
    } else if (difficultBoundary && maskCount < 2) {
      blockedReasons.push(
        "Difficult foreground/background boundaries require at least two independent local mask proposals before automatic acceptance.",
      );
    }
  }

  if (routing.kind === "logo-line-art" || routing.kind === "text-heavy") {
    pushIfAvailable(steps, available, input.hardware, {
      role: "vectorize",
      providerId: "vtracer",
      required: false,
      reason: "Create a local vector candidate for flat/logo artwork without generative reconstruction.",
    });
    pushIfAvailable(steps, available, input.hardware, {
      role: "vector-rasterize-qa",
      providerId: "resvg",
      required: false,
      reason: "Rasterize vector candidate deterministically at print size for source-vs-vector QA.",
    });
  }

  if (routing.kind === "photo" || routing.kind === "mixed") {
    if ((routing.blurScore ?? 0) > 0.5) {
      pushIfAvailable(steps, available, input.hardware, {
        role: "deblur-denoise",
        providerId: "restormer",
        required: false,
        reason: "Blur/noise diagnosis is high enough to justify a dedicated restoration candidate.",
      });
    }

    const upscaleProviders =
      routing.kind === "photo"
        ? ["real-esrgan", "swinir"]
        : ["swinir", "real-esrgan"];

    for (const providerId of upscaleProviders) {
      pushIfAvailable(steps, available, input.hardware, {
        role: "upscale",
        providerId,
        required: false,
        reason: "Generate a local upscale candidate; OCR/topology/edge/color QA remains authoritative.",
      });
    }
  }

  pushIfAvailable(steps, available, input.hardware, {
    role: "color-management",
    providerId: "littlecms",
    required: false,
    reason: "Local ICC conversion/soft-proof support; alpha is excluded from the ICC transform.",
  });

  steps.push({
    role: "qa",
    providerId: "sharp",
    required: true,
    backendCandidates: [],
    reason: "Deterministic local image facts, alpha inspection and derived export.",
  });

  return {
    artworkKind: routing.kind,
    steps,
    blockedReasons,
    requiresMaskConsensus: Boolean(routing.backgroundPresent && difficultBoundary),
    localOnly: true,
  };
}
