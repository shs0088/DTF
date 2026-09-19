import { describe, expect, test } from "bun:test";
import { assertExactlyThreeQualificationSlots, inspectQualificationFile, qualificationSignature } from "./qualification-upload";

const png = new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1]);

describe("qualification upload validation", () => {
  test("validates a PNG signature and rejects unsafe filenames", () => {
    expect(qualificationSignature("png", png)).toBe(true);
    expect(() => inspectQualificationFile({ name: "../escape.png", type: "image/png", bytes: png })).toThrow();
  });
  test("rejects invalid signatures and oversized files", () => {
    expect(() => inspectQualificationFile({ name: "art.png", type: "image/png", bytes: new Uint8Array([1, 2, 3]) })).toThrow();
    expect(() => inspectQualificationFile({ name: "large.png", type: "image/png", bytes: new Uint8Array(50 * 1024 * 1024 + 1) })).toThrow();
  });
  test("requires exactly three non-empty slots and permits multiple files in one slot", () => {
    const validPng = new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,12,192,0,0,12,192]);
    const checked = inspectQualificationFile({ name: "art.png", type: "image/png", bytes: validPng });
    expect(() => assertExactlyThreeQualificationSlots([{ files: [checked] }, { files: [checked] }])).toThrow();
    expect(() => assertExactlyThreeQualificationSlots([{ files: [checked, checked] }, { files: [checked] }, { files: [checked] }])).not.toThrow();
    expect(() => assertExactlyThreeQualificationSlots([{ files: [checked] }, { files: [checked] }, { files: [] }])).toThrow();
  });
});
