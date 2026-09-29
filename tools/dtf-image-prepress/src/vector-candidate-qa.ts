export interface VectorCandidateMetrics {
  id: string;
  textPreservationRatio?: number;
  topologyPreserved: boolean;
  hausdorffDistancePx?: number;
  edgeDisplacementPx?: number;
  minimumStrokeRetentionRatio?: number;
  colorDeltaE00?: number;
}

export interface VectorValidationPolicy {
  minimumTextPreservation: number;
  maximumHausdorffDistancePx: number;
  maximumEdgeDisplacementPx: number;
  minimumStrokeRetentionRatio: number;
  maximumColorDeltaE00: number;
}

export interface VectorCandidateValidation {
  id: string;
  eligible: boolean;
  failures: string[];
  warnings: string[];
}

export function validateVectorCandidate(
  metrics: VectorCandidateMetrics,
  policy: VectorValidationPolicy,
): VectorCandidateValidation {
  const failures: string[] = [];
  const warnings: string[] = [];

  if (
    metrics.textPreservationRatio != null &&
    metrics.textPreservationRatio < policy.minimumTextPreservation
  ) {
    failures.push("vector candidate changed detected text");
  }
  if (!metrics.topologyPreserved) {
    failures.push("vector candidate changed connected-component/hole topology");
  }
  if (
    metrics.hausdorffDistancePx != null &&
    metrics.hausdorffDistancePx > policy.maximumHausdorffDistancePx
  ) {
    failures.push("vector outline Hausdorff distance exceeds calibrated limit");
  }
  if (
    metrics.edgeDisplacementPx != null &&
    metrics.edgeDisplacementPx > policy.maximumEdgeDisplacementPx
  ) {
    failures.push("vector rasterization displaced source edges beyond calibrated limit");
  }
  if (
    metrics.minimumStrokeRetentionRatio != null &&
    metrics.minimumStrokeRetentionRatio < policy.minimumStrokeRetentionRatio
  ) {
    failures.push("thin strokes were lost or materially reduced by vectorization");
  }
  if (
    metrics.colorDeltaE00 != null &&
    metrics.colorDeltaE00 > policy.maximumColorDeltaE00
  ) {
    failures.push("vector candidate color shift exceeds calibrated limit");
  }

  if (metrics.hausdorffDistancePx == null) {
    warnings.push("Hausdorff outline evidence is missing.");
  }
  if (metrics.minimumStrokeRetentionRatio == null) {
    warnings.push("Minimum-stroke retention evidence is missing.");
  }

  return { id: metrics.id, eligible: failures.length === 0, failures, warnings };
}
