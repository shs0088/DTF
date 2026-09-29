import { describe, expect, test } from "bun:test";
import { compareRgbaBuffers } from "../src/candidate-diff";

function rgba(pixels: number[][]): Uint8Array {
  return Uint8Array.from(pixels.flat());
}

describe("candidate RGBA diff", () => {
  test("identical candidate has zero structural edge error", () => {
    const image = rgba([
      [255, 0, 0, 0],
      [255, 0, 0, 128],
      [255, 0, 0, 255],
    ]);
    const result = compareRgbaBuffers({
      reference: image,
      candidate: image,
      width: 3,
      height: 1,
    });
    expect(result.alphaMae).toBe(0);
    expect(result.edgeAlphaMae).toBe(0);
    expect(result.edgeRgbMae).toBe(0);
    expect(result.outsideLeakRatio).toBe(0);
    expect(result.lostOpaqueRatio).toBe(0);
  });

  test("detects alpha leakage outside original artwork", () => {
    const reference = rgba([
      [0, 0, 0, 0],
      [255, 255, 255, 255],
      [0, 0, 0, 0],
    ]);
    const candidate = rgba([
      [0, 0, 0, 64],
      [255, 255, 255, 255],
      [0, 0, 0, 64],
    ]);
    const result = compareRgbaBuffers({
      reference,
      candidate,
      width: 3,
      height: 1,
    });
    expect(result.outsideLeakRatio).toBe(1);
    expect(result.alphaMae).toBeGreaterThan(0);
  });

  test("detects lost opacity in originally solid artwork", () => {
    const reference = rgba([[10, 20, 30, 255]]);
    const candidate = rgba([[10, 20, 30, 128]]);
    const result = compareRgbaBuffers({
      reference,
      candidate,
      width: 1,
      height: 1,
    });
    expect(result.lostOpaqueRatio).toBe(1);
  });
});
