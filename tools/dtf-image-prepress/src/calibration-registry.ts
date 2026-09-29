import { createHash } from "node:crypto";

export type CalibrationSourceType =
  | "local-print-chart"
  | "ground-truth-benchmark"
  | "model-validation-corpus";

export interface CalibrationRecord<T extends Record<string, number | string | boolean>> {
  id: string;
  sourceType: CalibrationSourceType;
  targetId: string;
  values: T;
  provenance: string;
  createdAt: string;
  datasetOrChartSha256?: string;
  approvedForAutomaticDecision: boolean;
}

export interface SignedCalibrationRecord<T extends Record<string, number | string | boolean>>
  extends CalibrationRecord<T> {
  recordSha256: string;
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function signCalibrationRecord<T extends Record<string, number | string | boolean>>(
  record: CalibrationRecord<T>,
): SignedCalibrationRecord<T> {
  if (!record.id.trim()) throw new Error("Calibration id is required.");
  if (!record.targetId.trim()) throw new Error("Calibration targetId is required.");
  if (!record.provenance.trim()) throw new Error("Calibration provenance is required.");

  if (
    record.approvedForAutomaticDecision &&
    !record.datasetOrChartSha256
  ) {
    throw new Error(
      "Automatic-decision calibration requires a SHA-256 fingerprint of the local validation dataset/chart.",
    );
  }

  if (
    record.datasetOrChartSha256 &&
    !/^[a-f0-9]{64}$/i.test(record.datasetOrChartSha256)
  ) {
    throw new Error("datasetOrChartSha256 must be a 64-character hexadecimal digest.");
  }

  const canonical = canonicalize(record);
  return {
    ...record,
    recordSha256: createHash("sha256").update(canonical).digest("hex"),
  };
}
