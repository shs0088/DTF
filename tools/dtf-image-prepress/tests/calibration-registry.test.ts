import { describe, expect, test } from "bun:test";
import { signCalibrationRecord } from "../src/calibration-registry";

describe("calibration registry", () => {
  test("requires a locally fingerprinted validation corpus for automatic thresholds", () => {
    expect(() =>
      signCalibrationRecord({
        id: "blur-cal-v1",
        sourceType: "model-validation-corpus",
        targetId: "blur-router",
        values: { blurEffectReviewThreshold: 0.42 },
        provenance: "local DTF degradation corpus",
        createdAt: "2026-09-29T00:00:00Z",
        approvedForAutomaticDecision: true,
      }),
    ).toThrow("requires a SHA-256");
  });

  test("produces deterministic record fingerprint", () => {
    const record = {
      id: "stroke-cal-v1",
      sourceType: "local-print-chart" as const,
      targetId: "printer-a-film-b-mode-1",
      values: { minimumPrintableStrokeMm: 0.25 },
      provenance: "locally printed detail chart",
      createdAt: "2026-09-29T00:00:00Z",
      datasetOrChartSha256: "a".repeat(64),
      approvedForAutomaticDecision: true,
    };
    expect(signCalibrationRecord(record).recordSha256).toBe(
      signCalibrationRecord(record).recordSha256,
    );
  });

  test("allows research-only calibration notes without automatic authority", () => {
    const signed = signCalibrationRecord({
      id: "reference-only",
      sourceType: "ground-truth-benchmark",
      targetId: "matting-research",
      values: { maximumSad: 10 },
      provenance: "literature comparison only",
      createdAt: "2026-09-29T00:00:00Z",
      approvedForAutomaticDecision: false,
    });
    expect(signed.recordSha256).toHaveLength(64);
  });
});
