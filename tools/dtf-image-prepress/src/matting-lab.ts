export interface MattingGroundTruthMetrics {
  providerId: string;
  sad: number;
  mse: number;
  gradientError: number;
  connectivityError: number;
  boundaryIou?: number;
}

export interface MattingLabPolicy {
  maximumSad: number;
  maximumMse: number;
  maximumGradientError: number;
  maximumConnectivityError: number;
  minimumBoundaryIou?: number;
}

export interface MattingLabResult {
  providerId: string;
  eligible: boolean;
  normalizedScore: number;
  failures: string[];
}

// These metrics require known ground truth. They are for offline provider/model
// benchmarking only and must never be fabricated for a real customer upload.
export function evaluateMattingWithGroundTruth(
  metrics: MattingGroundTruthMetrics,
  policy: MattingLabPolicy,
): MattingLabResult {
  const failures: string[] = [];
  if (metrics.sad > policy.maximumSad) failures.push("SAD exceeds lab threshold");
  if (metrics.mse > policy.maximumMse) failures.push("MSE exceeds lab threshold");
  if (metrics.gradientError > policy.maximumGradientError) failures.push("gradient error exceeds lab threshold");
  if (metrics.connectivityError > policy.maximumConnectivityError) failures.push("connectivity error exceeds lab threshold");
  if (
    policy.minimumBoundaryIou != null &&
    metrics.boundaryIou != null &&
    metrics.boundaryIou < policy.minimumBoundaryIou
  ) {
    failures.push("boundary IoU is below lab threshold");
  }

  const inverse = (value: number, limit: number) =>
    Math.max(0, Math.min(1, 1 - value / Math.max(limit, Number.EPSILON)));
  const boundary =
    metrics.boundaryIou == null ? 1 : Math.max(0, Math.min(1, metrics.boundaryIou));

  const score =
    100 *
    (0.25 * inverse(metrics.sad, policy.maximumSad) +
      0.2 * inverse(metrics.mse, policy.maximumMse) +
      0.2 * inverse(metrics.gradientError, policy.maximumGradientError) +
      0.2 * inverse(metrics.connectivityError, policy.maximumConnectivityError) +
      0.15 * boundary);

  return {
    providerId: metrics.providerId,
    eligible: failures.length === 0,
    normalizedScore: Math.round(score * 100) / 100,
    failures,
  };
}
