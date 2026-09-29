import { describe, expect, test } from "bun:test";
import { decideDegradationRouting } from "../src/degradation-calibration";

const calibrated = {
  id: "fixture-calibration-v1",
  blurEffectReviewThreshold: 0.42,
  jpegBlockinessReviewThreshold: 0.35,
  provenance: "validated local benchmark fixture",
};

describe("calibrated degradation routing", () => {
  test("uses explicit calibration rather than hidden router constants", () => {
    const result = decideDegradationRouting(
      { blurEffect: 0.5, jpegBlockiness: 0.2, brisqueScore: 31 },
      calibrated,
    );
    expect(result.requiresDeblurCandidate).toBe(true);
    expect(result.requiresArtifactReductionCandidate).toBe(false);
    expect(result.calibrationId).toBe("fixture-calibration-v1");
  });

  test("rejects invalid normalized calibration ranges", () => {
    expect(() =>
      decideDegradationRouting(
        { blurEffect: 0.5 },
        { ...calibrated, blurEffectReviewThreshold: 1.2 },
      ),
    ).toThrow("0..1");
  });
});
