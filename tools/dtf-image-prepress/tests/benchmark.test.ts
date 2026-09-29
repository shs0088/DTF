import { describe, expect, test } from "bun:test";
import { benchmarkCandidate, rankCandidates } from "../src/benchmark";

describe("candidate benchmark", () => {
  test("rejects a visually plausible candidate that changes text", () => {
    const result = benchmarkCandidate({
      id: "generative-upscale",
      effectiveDpi: 300,
      textPreservationRatio: 0.94,
      topologyPreserved: true,
      edgeDisplacementPx: 0.5,
      colorDeltaE00: 1,
      alphaFringeScore: 0.01,
    });
    expect(result.eligible).toBe(false);
    expect(result.hardFailures.join(" ")).toContain("text preservation");
  });

  test("rejects topology changes even when other metrics are excellent", () => {
    const result = benchmarkCandidate({
      id: "vector-candidate",
      effectiveDpi: 1200,
      textPreservationRatio: 1,
      topologyPreserved: false,
      edgeDisplacementPx: 0.1,
      colorDeltaE00: 0.4,
      alphaFringeScore: 0,
    });
    expect(result.eligible).toBe(false);
    expect(result.hardFailures).toContain("topology changed");
  });

  test("ranks eligible candidates before rejected candidates", () => {
    const ranked = rankCandidates([
      {
        id: "bad-text",
        effectiveDpi: 600,
        textPreservationRatio: 0.9,
        topologyPreserved: true,
      },
      {
        id: "safe",
        effectiveDpi: 300,
        textPreservationRatio: 1,
        topologyPreserved: true,
        edgeDisplacementPx: 0.2,
        colorDeltaE00: 0.6,
        alphaFringeScore: 0.005,
      },
      {
        id: "safe-but-color-shift",
        effectiveDpi: 300,
        textPreservationRatio: 1,
        topologyPreserved: true,
        edgeDisplacementPx: 0.4,
        colorDeltaE00: 3,
        alphaFringeScore: 0.01,
      },
    ]);
    expect(ranked[0].id).toBe("safe");
    expect(ranked[0].eligible).toBe(true);
    expect(ranked.at(-1)?.id).toBe("bad-text");
    expect(ranked.at(-1)?.eligible).toBe(false);
  });
});
