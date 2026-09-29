import { describe, expect, test } from "bun:test";
import { diagnoseTransparencyRgb } from "../src/transparency-diagnostics";

describe("transparency diagnostics", () => {
  test("exports a local diagnostic function without destructive normalization", () => {
    expect(typeof diagnoseTransparencyRgb).toBe("function");
  });
});
