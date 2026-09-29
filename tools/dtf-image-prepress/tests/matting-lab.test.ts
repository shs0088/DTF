import { describe, expect, test } from "bun:test";
import { evaluateMattingWithGroundTruth } from "../src/matting-lab";

const policy = {
  maximumSad: 10,
  maximumMse: 0.02,
  maximumGradientError: 8,
  maximumConnectivityError: 8,
  minimumBoundaryIou: 0.85,
};

describe("offline matting benchmark", () => {
  test("accepts a provider only when ground-truth metrics pass", () => {
    const result = evaluateMattingWithGroundTruth(
      {
        providerId: "candidate-a",
        sad: 4,
        mse: 0.005,
        gradientError: 3,
        connectivityError: 2,
        boundaryIou: 0.92,
      },
      policy,
    );
    expect(result.eligible).toBe(true);
  });

  test("rejects structurally bad mattes even with low pixel MSE", () => {
    const result = evaluateMattingWithGroundTruth(
      {
        providerId: "candidate-b",
        sad: 4,
        mse: 0.005,
        gradientError: 3,
        connectivityError: 10,
        boundaryIou: 0.75,
      },
      policy,
    );
    expect(result.eligible).toBe(false);
    expect(result.failures).toContain("connectivity error exceeds lab threshold");
    expect(result.failures).toContain("boundary IoU is below lab threshold");
  });
});
