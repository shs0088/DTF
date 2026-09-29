import { describe, expect, test } from "bun:test";
import {
  compareAlphaMasks,
  evaluateMaskConsensus,
} from "../src/mask-consensus";

const calibrated = {
  id: "mask-consensus-local-v1",
  sourceCorpusSha256: "a".repeat(64),
  maximumPairwiseAlphaMad: 0.08,
  minimumForegroundIou: 0.9,
};

describe("local mask consensus", () => {
  test("passes only when independent local masks agree under a fingerprinted calibration", () => {
    const result = evaluateMaskConsensus([
      { providerId: "birefnet", alpha: Uint8Array.from([0, 0, 255, 255]), width: 2, height: 2 },
      { providerId: "ben2-onnx", alpha: Uint8Array.from([0, 4, 252, 255]), width: 2, height: 2 },
    ], calibrated);
    expect(result.status).toBe("pass");
    expect(result.calibrationId).toBe("mask-consensus-local-v1");
    expect(["ben2-onnx", "birefnet"]).toContain(result.representativeProviderId);
  });

  test("requires review when models disagree on foreground structure", () => {
    const result = evaluateMaskConsensus([
      { providerId: "birefnet", alpha: Uint8Array.from([0, 0, 255, 255]), width: 2, height: 2 },
      { providerId: "ben2-onnx", alpha: Uint8Array.from([255, 255, 0, 0]), width: 2, height: 2 },
    ], calibrated);
    expect(result.status).toBe("review");
    expect(result.representativeProviderId).toBeUndefined();
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  test("one model is uncertainty evidence, not automatic proof", () => {
    const result = evaluateMaskConsensus([
      { providerId: "birefnet", alpha: Uint8Array.from([0, 255]), width: 2, height: 1 },
    ], calibrated);
    expect(result.status).toBe("review");
  });

  test("multiple masks without calibration remain review-only", () => {
    const result = evaluateMaskConsensus([
      { providerId: "birefnet", alpha: Uint8Array.from([0, 255]), width: 2, height: 1 },
      { providerId: "ben2-onnx", alpha: Uint8Array.from([0, 255]), width: 2, height: 1 },
    ]);
    expect(result.status).toBe("review");
    expect(result.reasons.join(" ")).toContain("informational only");
  });

  test("dimension mismatch is rejected", () => {
    expect(() =>
      compareAlphaMasks(
        { providerId: "a", alpha: Uint8Array.from([0, 255]), width: 2, height: 1 },
        { providerId: "b", alpha: Uint8Array.from([0, 255]), width: 1, height: 2 },
      ),
    ).toThrow("dimensions");
  });
});
