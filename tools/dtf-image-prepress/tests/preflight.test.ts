import { describe, expect, test } from "bun:test";
import { runPreflight, textPreservationRatio } from "../src/preflight";
import { DEFAULT_RIP_PROFILE } from "../src/rules";

const baseFacts = {
  format: "png",
  byteSize: 2_000_000,
  pixelWidth: 4800,
  pixelHeight: 5400,
  embeddedDpi: 72,
  colorSpace: "srgb",
  hasIccProfile: true,
  alpha: {
    hasAlpha: true,
    transparentRatio: 0.4,
    semiTransparentRatio: 0.005,
    opaqueRatio: 0.595,
  },
};

describe("standalone DTF image prepress", () => {
  test("uses effective DPI instead of trusting embedded DPI", () => {
    const result = runPreflight({
      facts: baseFacts,
      intent: { widthIn: 16, heightIn: 18 },
      profile: DEFAULT_RIP_PROFILE,
    });
    expect(result.effectiveDpi?.minimum).toBe(300);
    expect(result.decision).toBe("accepted");
  });

  test("rejects critically low effective DPI", () => {
    const result = runPreflight({
      facts: { ...baseFacts, pixelWidth: 1600, pixelHeight: 1800 },
      intent: { widthIn: 16, heightIn: 18 },
      profile: DEFAULT_RIP_PROFILE,
    });
    expect(result.effectiveDpi?.minimum).toBe(100);
    expect(result.decision).toBe("rejected");
  });

  test("blocks material OCR text changes", () => {
    const result = runPreflight({
      facts: baseFacts,
      intent: { widthIn: 16, heightIn: 18 },
      profile: DEFAULT_RIP_PROFILE,
      evidence: {
        ocrBefore: { text: "PRINT YOUR DREAM" },
        ocrAfter: { text: "PRINT Y0UR DREAM" },
      },
    });
    expect(result.checks.find((x) => x.code === "text-preservation")?.status).toBe("fail");
    expect(result.decision).toBe("rejected");
  });

  test("supports Arabic text comparison", () => {
    expect(textPreservationRatio("اطبع حلمك", "اطبع حلمك")).toBe(1);
    expect(textPreservationRatio("اطبع حلمك", "اطبع حلك")).toBeLessThan(1);
  });

  test("rejects topology changes", () => {
    const result = runPreflight({
      facts: baseFacts,
      intent: { widthIn: 16, heightIn: 18 },
      profile: DEFAULT_RIP_PROFILE,
      evidence: {
        topologyBefore: { connectedComponents: 7, holes: 3 },
        topologyAfter: { connectedComponents: 7, holes: 2 },
      },
    });
    expect(result.decision).toBe("rejected");
  });
});
