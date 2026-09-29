import { describe, expect, test } from "bun:test";
import { writeInspectionPreviewSet } from "../src/inspection-previews";

describe("inspection preview definitions", () => {
  test("exports a callable local preview-set function", () => {
    expect(typeof writeInspectionPreviewSet).toBe("function");
  });
});
