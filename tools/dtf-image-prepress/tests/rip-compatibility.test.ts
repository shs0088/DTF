import { describe, expect, test } from "bun:test";
import { buildRipCompatibilityAdvice } from "../src/rip-compatibility";
import { DEFAULT_RIP_PROFILE } from "../src/rules";

const facts = {
  format: "png",
  byteSize: 1_000_000,
  pixelWidth: 4800,
  pixelHeight: 5400,
  colorSpace: "srgb",
  hasIccProfile: true,
  alpha: {
    hasAlpha: true,
    transparentRatio: 0.4,
    semiTransparentRatio: 0.08,
    opaqueRatio: 0.52,
  },
};

describe("RIP compatibility advice", () => {
  test("never bakes white or invents a universal choke value", () => {
    const advice = buildRipCompatibilityAdvice({
      facts,
      profile: DEFAULT_RIP_PROFILE,
      routing: { kind: "logo-line-art", backgroundPresent: false },
    });
    expect(advice.whiteUnderbaseAction).toBe("defer-to-rip");
    expect(advice.chokeAction).toBe("calibrate-in-rip");
    expect(advice.chokeDefaultApplied).toBe(false);
    expect(advice.protectWhiteOnlyThinContent).toBe(true);
  });

  test("preserves intentional soft effects", () => {
    const advice = buildRipCompatibilityAdvice({
      facts,
      profile: DEFAULT_RIP_PROFILE,
      routing: {
        kind: "mixed",
        backgroundPresent: true,
        intentionalGlowOrShadow: true,
      },
    });
    expect(advice.warnings.join(" ")).toContain("glow/shadow");
    expect(advice.notes.join(" ")).toContain("Retain source opacity");
  });
});
