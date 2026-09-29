import { describe, expect, test } from "bun:test";
import {
  getFormatProcessingPolicy,
  PNG_COLOR_METADATA_PRECEDENCE,
} from "../src/format-policy";

describe("format processing policy", () => {
  test("treats PNG alpha as linear rather than gamma-encoded color", () => {
    const png = getFormatProcessingPolicy("png");
    expect(png?.alphaTransfer).toBe("linear");
    expect(png?.masterOutputAllowed).toBe(true);
  });

  test("uses PNG color metadata precedence from the current PNG specification", () => {
    expect(PNG_COLOR_METADATA_PRECEDENCE).toEqual(["cICP", "iCCP", "sRGB", "cHRM+gAMA"]);
  });

  test("does not allow lossy source formats to become master without derivation", () => {
    expect(getFormatProcessingPolicy("jpg")?.masterOutputAllowed).toBe(false);
    expect(getFormatProcessingPolicy("webp")?.masterOutputAllowed).toBe(false);
  });
});
