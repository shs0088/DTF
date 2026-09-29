import { describe, expect, test } from "bun:test";
import { assessBorderBackground } from "../src/border-background";

const features = {
  width: 256,
  height: 256,
  borderSamples: 4000,
  dominantBorderColor: { r: 255, g: 255, b: 255 },
  dominantBorderRatio: 0.94,
  transparentBorderRatio: 0,
  cornerAgreementRatio: 0.97,
  meanDistanceFromDominant: 4,
};

describe("border background assessment", () => {
  test("never auto-labels opaque solid borders without calibrated provenance", () => {
    const result = assessBorderBackground(features);
    expect(result.status).toBe("review");
    expect(result.automaticSignalAllowed).toBe(false);
  });

  test("can emit a candidate signal with fingerprinted calibrated thresholds", () => {
    const result = assessBorderBackground(features, {
      id: "dtf-border-v1",
      sourceCorpusSha256: "a".repeat(64),
      minimumDominantBorderRatio: 0.9,
      minimumCornerAgreementRatio: 0.9,
      maximumMeanDistanceFromDominant: 8,
    });
    expect(result.status).toBe("uniform-border-candidate");
    expect(result.automaticSignalAllowed).toBe(true);
  });

  test("recognizes an already transparent border independently of color", () => {
    const result = assessBorderBackground({
      ...features,
      transparentBorderRatio: 0.99,
      dominantBorderRatio: 0,
      cornerAgreementRatio: 0,
      meanDistanceFromDominant: null,
    });
    expect(result.status).toBe("already-transparent");
  });
});
