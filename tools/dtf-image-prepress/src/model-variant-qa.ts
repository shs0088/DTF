export type ModelPrecision = "fp32" | "fp16" | "int8";

export interface ModelVariant {
  id: string;
  providerId: string;
  modelAssetId: string;
  precision: ModelPrecision;
  backendId: string;
  quantized: boolean;
  calibrationProvenance?: string;
}

export interface VariantQualityMetrics {
  id: string;
  textPreservationRatio?: number;
  topologyPreserved: boolean;
  edgeDisplacementPx?: number;
  colorDeltaE00?: number;
  alphaFringeScore?: number;
  seamScore?: number;
}

export interface VariantQualityPolicy {
  minimumTextPreservation: number;
  maximumEdgeDisplacementPx: number;
  maximumColorDeltaE00: number;
  maximumAlphaFringeScore: number;
  maximumSeamScore: number;
}

export interface VariantValidation {
  id: string;
  eligible: boolean;
  failures: string[];
}

export function validateModelVariant(
  variant: ModelVariant,
  metrics: VariantQualityMetrics,
  policy: VariantQualityPolicy,
): VariantValidation {
  const failures: string[] = [];

  if (variant.quantized && !variant.calibrationProvenance) {
    failures.push("quantized model variant lacks calibration/validation provenance");
  }
  if (
    metrics.textPreservationRatio != null &&
    metrics.textPreservationRatio < policy.minimumTextPreservation
  ) failures.push("model variant changed detected text");

  if (!metrics.topologyPreserved) failures.push("model variant changed artwork topology");

  if (
    metrics.edgeDisplacementPx != null &&
    metrics.edgeDisplacementPx > policy.maximumEdgeDisplacementPx
  ) failures.push("model variant displaced artwork edges");

  if (
    metrics.colorDeltaE00 != null &&
    metrics.colorDeltaE00 > policy.maximumColorDeltaE00
  ) failures.push("model variant changed colors beyond policy");

  if (
    metrics.alphaFringeScore != null &&
    metrics.alphaFringeScore > policy.maximumAlphaFringeScore
  ) failures.push("model variant created unacceptable alpha fringe");

  if (metrics.seamScore != null && metrics.seamScore > policy.maximumSeamScore) {
    failures.push("tiled inference produced unacceptable seam evidence");
  }

  return { id: metrics.id, eligible: failures.length === 0, failures };
}
