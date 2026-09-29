import { describe, expect, test } from "bun:test";
import {
  MASTER_COLOR_POLICY,
  validateLocalSoftProofRequest,
} from "../src/color-management";

describe("local color management policy", () => {
  test("keeps RGBA master in sRGB and excludes alpha from ICC transforms", () => {
    expect(MASTER_COLOR_POLICY.masterColorSpace).toBe("srgb");
    expect(MASTER_COLOR_POLICY.allowCmykMaster).toBe(false);
    expect(MASTER_COLOR_POLICY.masterAlpha).toBe("unassociated-linear");
    expect(MASTER_COLOR_POLICY.alphaParticipatesInIccTransform).toBe(false);
    expect(MASTER_COLOR_POLICY.preservePrivateMetadata).toBe(false);
  });

  test("rejects remote ICC URLs", () => {
    const result = validateLocalSoftProofRequest({
      targetIccPath: "https://example.com/printer.icc",
      renderingIntent: "relative-colorimetric",
      blackPointCompensation: true,
    });
    expect(result.allowed).toBe(false);
    expect(result.failures.join(" ")).toContain("URLs are forbidden");
  });

  test("accepts an absolute local ICC path", () => {
    const result = validateLocalSoftProofRequest({
      targetIccPath: "/opt/dtf-profiles/printer.icc",
      renderingIntent: "relative-colorimetric",
      blackPointCompensation: true,
    });
    expect(result.allowed).toBe(true);
  });
});
