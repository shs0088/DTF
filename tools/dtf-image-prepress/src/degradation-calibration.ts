export interface DegradationMeasurements {
  blurEffect?: number;
  brisqueScore?: number;
  jpegBlockiness?: number;
}

export interface DegradationCalibration {
  id: string;
  blurEffectReviewThreshold: number;
  jpegBlockinessReviewThreshold: number;
  provenance: string;
}

export interface DegradationDecision {
  requiresDeblurCandidate: boolean;
  requiresArtifactReductionCandidate: boolean;
  measurements: DegradationMeasurements;
  calibrationId: string;
  notes: string[];
}

export function decideDegradationRouting(
  measurements: DegradationMeasurements,
  calibration: DegradationCalibration,
): DegradationDecision {
  if (
    calibration.blurEffectReviewThreshold < 0 ||
    calibration.blurEffectReviewThreshold > 1 ||
    calibration.jpegBlockinessReviewThreshold < 0 ||
    calibration.jpegBlockinessReviewThreshold > 1
  ) {
    throw new Error("Normalized degradation thresholds must be within 0..1.");
  }

  const notes: string[] = [];
  const requiresDeblurCandidate =
    measurements.blurEffect != null &&
    measurements.blurEffect >= calibration.blurEffectReviewThreshold;
  const requiresArtifactReductionCandidate =
    measurements.jpegBlockiness != null &&
    measurements.jpegBlockiness >= calibration.jpegBlockinessReviewThreshold;

  if (measurements.brisqueScore != null) {
    notes.push(
      "BRISQUE is recorded as supplementary no-reference evidence only; this V1 router does not convert it into a universal hard threshold.",
    );
  }
  if (requiresDeblurCandidate) {
    notes.push("Calibrated blur evidence requests a deblur candidate before super-resolution.");
  }
  if (requiresArtifactReductionCandidate) {
    notes.push("Calibrated JPEG/blocking evidence requests artifact reduction before super-resolution.");
  }

  return {
    requiresDeblurCandidate,
    requiresArtifactReductionCandidate,
    measurements,
    calibrationId: calibration.id,
    notes,
  };
}
