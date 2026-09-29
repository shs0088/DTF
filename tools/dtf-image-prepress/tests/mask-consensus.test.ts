import { describe, expect, test } from "bun:test";
import {
  compareAlphaMasks,
  evaluateMaskConsensus,
} from "../src/mask-consensus";

describe("local mask consensus", () => {
  test("passes when independent local masks strongly agree", () => {
    const result = evaluateMaskConsensus([
      { providerId: "birefnet", alpha: Uint8Array.from([0, 0, 255, 255]), width: 2, height: 2 },
      { providerId: "ben", alpha: Uint8Array.from([0, 4, 252, 255]), width: 2, height: 2 },
    ]);
    expect(result.status).toBe("pass");
  });

  test("requires review when models disagree on foreground structure", () => {
    const result = evaluateMaskConsensus([
      { providerId: "birefnet", alpha: Uint8Array.from([0, 0, 255, 255]), width: 2, height: 2 },
      { providerId: "inspyrenet", alpha: Uint8Array.from([255, 255, 0, 0]), width: 2, height: 2 },
    ]);
    expect(result.status).toBe("review");
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  test("one model is uncertainty evidence, not automatic proof", () => {
    const result = evaluateMaskConsensus([
      { providerId: "birefnet", alpha: Uint8Array.from([0, 255]), width: 2, height: 1 },
    ]);
    expect(result.status).toBe("review");
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
