export interface CandidateBenchmarkMetrics {
  id: string;
  effectiveDpi: number;
  textPreservationRatio?: number;
  topologyPreserved?: boolean;
  edgeDisplacementPx?: number;
  colorDeltaE00?: number;
  alphaFringeScore?: number;
  outsideLeakRatio?: number;
  lostOpaqueRatio?: number;
}

export interface BenchmarkPolicy {
  criticalDpi: number;
  targetDpi: number;
  minimumTextPreservation: number;
  maximumEdgeDisplacementPx: number;
  maximumColorDeltaE00: number;
  maximumAlphaFringeScore: number;
  maximumOutsideLeakRatio?: number;
  maximumLostOpaqueRatio?: number;
}

export interface CandidateBenchmarkResult {
  id: string;
  eligible: boolean;
  score: number;
  hardFailures: string[];
  warnings: string[];
}

export const DEFAULT_BENCHMARK_POLICY: BenchmarkPolicy = {
  criticalDpi: 150,
  targetDpi: 300,
  minimumTextPreservation: 0.98,
  maximumEdgeDisplacementPx: 2,
  maximumColorDeltaE00: 5,
  maximumAlphaFringeScore: 0.05,
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const round = (value: number) => Math.round(value * 100) / 100;

export function benchmarkCandidate(
  metrics: CandidateBenchmarkMetrics,
  policy: BenchmarkPolicy = DEFAULT_BENCHMARK_POLICY,
): CandidateBenchmarkResult {
  const hardFailures: string[] = [];
  const warnings: string[] = [];

  if (metrics.effectiveDpi < policy.criticalDpi) {
    hardFailures.push(`effective DPI ${metrics.effectiveDpi} is below critical ${policy.criticalDpi}`);
  } else if (metrics.effectiveDpi < policy.targetDpi) {
    warnings.push(`effective DPI ${metrics.effectiveDpi} is below target ${policy.targetDpi}`);
  }

  if (
    metrics.textPreservationRatio != null &&
    metrics.textPreservationRatio < policy.minimumTextPreservation
  ) {
    hardFailures.push(
      `text preservation ${round(metrics.textPreservationRatio * 100)}% is below required ${round(policy.minimumTextPreservation * 100)}%`,
    );
  }

  if (metrics.topologyPreserved === false) {
    hardFailures.push("topology changed");
  }

  if (
    metrics.edgeDisplacementPx != null &&
    metrics.edgeDisplacementPx > policy.maximumEdgeDisplacementPx
  ) {
    hardFailures.push(
      `edge displacement ${metrics.edgeDisplacementPx}px exceeds ${policy.maximumEdgeDisplacementPx}px`,
    );
  }

  if (
    metrics.colorDeltaE00 != null &&
    metrics.colorDeltaE00 > policy.maximumColorDeltaE00
  ) {
    hardFailures.push(
      `color change ΔE00 ${metrics.colorDeltaE00} exceeds ${policy.maximumColorDeltaE00}`,
    );
  }

  if (
    metrics.alphaFringeScore != null &&
    metrics.alphaFringeScore > policy.maximumAlphaFringeScore
  ) {
    hardFailures.push(
      `alpha fringe score ${metrics.alphaFringeScore} exceeds ${policy.maximumAlphaFringeScore}`,
    );
  }

  if (metrics.outsideLeakRatio != null && metrics.outsideLeakRatio > 0) {
    if (policy.maximumOutsideLeakRatio == null) {
      warnings.push(
        `outside alpha leakage ${round(metrics.outsideLeakRatio * 100)}% requires a calibrated acceptance threshold`,
      );
    } else if (metrics.outsideLeakRatio > policy.maximumOutsideLeakRatio) {
      hardFailures.push(
        `outside alpha leakage ${round(metrics.outsideLeakRatio * 100)}% exceeds calibrated ${round(policy.maximumOutsideLeakRatio * 100)}%`,
      );
    }
  }

  if (metrics.lostOpaqueRatio != null && metrics.lostOpaqueRatio > 0) {
    if (policy.maximumLostOpaqueRatio == null) {
      warnings.push(
        `lost original opacity ${round(metrics.lostOpaqueRatio * 100)}% requires a calibrated acceptance threshold`,
      );
    } else if (metrics.lostOpaqueRatio > policy.maximumLostOpaqueRatio) {
      hardFailures.push(
        `lost original opacity ${round(metrics.lostOpaqueRatio * 100)}% exceeds calibrated ${round(policy.maximumLostOpaqueRatio * 100)}%`,
      );
    }
  }

  const dpiScore = clamp01(metrics.effectiveDpi / policy.targetDpi);
  const textScore =
    metrics.textPreservationRatio == null ? 1 : clamp01(metrics.textPreservationRatio);
  const topologyScore = metrics.topologyPreserved === false ? 0 : 1;
  const edgeScore =
    metrics.edgeDisplacementPx == null
      ? 1
      : clamp01(1 - metrics.edgeDisplacementPx / Math.max(policy.maximumEdgeDisplacementPx, 0.01));
  const colorScore =
    metrics.colorDeltaE00 == null
      ? 1
      : clamp01(1 - metrics.colorDeltaE00 / Math.max(policy.maximumColorDeltaE00, 0.01));
  const alphaScore =
    metrics.alphaFringeScore == null
      ? 1
      : clamp01(1 - metrics.alphaFringeScore / Math.max(policy.maximumAlphaFringeScore, 0.001));

  // V1 benchmark weights are intentionally deterministic and configurable.
  // Text/topology dominate because small glyph/shape changes can ruin printable artwork.
  const score =
    100 *
    (0.2 * dpiScore +
      0.25 * textScore +
      0.2 * topologyScore +
      0.15 * edgeScore +
      0.1 * colorScore +
      0.1 * alphaScore);

  return {
    id: metrics.id,
    eligible: hardFailures.length === 0,
    score: round(score),
    hardFailures,
    warnings,
  };
}

export function rankCandidates(
  candidates: CandidateBenchmarkMetrics[],
  policy: BenchmarkPolicy = DEFAULT_BENCHMARK_POLICY,
): CandidateBenchmarkResult[] {
  return candidates
    .map((candidate) => benchmarkCandidate(candidate, policy))
    .sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return b.score - a.score;
    });
}
