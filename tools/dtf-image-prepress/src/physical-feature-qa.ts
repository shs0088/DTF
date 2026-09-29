export interface PhysicalFeatureCalibration {
  id: string;
  printerProfileId: string;
  minimumPrintableStrokeMm: number;
  minimumPrintableGapMm?: number;
  provenance: string;
}

export interface PhysicalFeatureMeasurement {
  minimumStrokePx?: number;
  minimumGapPx?: number;
  effectiveDpi: number;
}

export interface PhysicalFeatureResult {
  strokeMm?: number;
  gapMm?: number;
  warnings: string[];
  calibrationId: string;
}

export function pixelsToMillimeters(pixels: number, dpi: number): number {
  if (pixels < 0 || dpi <= 0) throw new Error("pixels must be non-negative and dpi must be positive");
  return (pixels / dpi) * 25.4;
}

export function evaluatePhysicalFeatures(
  measurement: PhysicalFeatureMeasurement,
  calibration: PhysicalFeatureCalibration,
): PhysicalFeatureResult {
  if (calibration.minimumPrintableStrokeMm <= 0) {
    throw new Error("minimumPrintableStrokeMm must come from a positive printer calibration value");
  }

  const warnings: string[] = [];
  const strokeMm =
    measurement.minimumStrokePx == null
      ? undefined
      : pixelsToMillimeters(measurement.minimumStrokePx, measurement.effectiveDpi);
  const gapMm =
    measurement.minimumGapPx == null
      ? undefined
      : pixelsToMillimeters(measurement.minimumGapPx, measurement.effectiveDpi);

  if (strokeMm != null && strokeMm < calibration.minimumPrintableStrokeMm) {
    warnings.push(
      `Detected stroke ${strokeMm.toFixed(3)} mm is below calibrated printable stroke ${calibration.minimumPrintableStrokeMm.toFixed(3)} mm.`,
    );
  }

  if (
    gapMm != null &&
    calibration.minimumPrintableGapMm != null &&
    gapMm < calibration.minimumPrintableGapMm
  ) {
    warnings.push(
      `Detected gap ${gapMm.toFixed(3)} mm is below calibrated printable gap ${calibration.minimumPrintableGapMm.toFixed(3)} mm.`,
    );
  }

  return {
    strokeMm,
    gapMm,
    warnings,
    calibrationId: calibration.id,
  };
}
