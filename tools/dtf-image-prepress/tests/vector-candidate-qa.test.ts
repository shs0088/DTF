import { describe, expect, test } from "bun:test";
import { validateVectorCandidate } from "../src/vector-candidate-qa";

const policy = {
  minimumTextPreservation: 0.99,
  maximumHausdorffDistancePx: 1.5,
  maximumEdgeDisplacementPx: 1.5,
  minimumStrokeRetentionRatio: 0.9,
  maximumColorDeltaE00: 3,
};

describe("vector candidate QA", () => {
  test("accepts a vector candidate only when structure/text/strokes are retained", () => {
    const result = validateVectorCandidate(
      {
        id: "vtracer-safe",
        textPreservationRatio: 1,
        topologyPreserved: true,
        hausdorffDistancePx: 0.5,
        edgeDisplacementPx: 0.4,
        minimumStrokeRetentionRatio: 0.97,
        colorDeltaE00: 0.8,
      },
      policy,
    );
    expect(result.eligible).toBe(true);
  });

  test("rejects vector artwork that loses a thin line even if text stays correct", () => {
    const result = validateVectorCandidate(
      {
        id: "vtracer-over-simplified",
        textPreservationRatio: 1,
        topologyPreserved: true,
        hausdorffDistancePx: 0.8,
        edgeDisplacementPx: 0.7,
        minimumStrokeRetentionRatio: 0.62,
        colorDeltaE00: 1,
      },
      policy,
    );
    expect(result.eligible).toBe(false);
    expect(result.failures.join(" ")).toContain("thin strokes");
  });

  test("rejects topology changes even when outline average looks close", () => {
    const result = validateVectorCandidate(
      {
        id: "missing-hole",
        textPreservationRatio: 1,
        topologyPreserved: false,
        hausdorffDistancePx: 0.4,
        edgeDisplacementPx: 0.3,
        minimumStrokeRetentionRatio: 0.99,
        colorDeltaE00: 0.5,
      },
      policy,
    );
    expect(result.eligible).toBe(false);
    expect(result.failures.join(" ")).toContain("topology");
  });
});
