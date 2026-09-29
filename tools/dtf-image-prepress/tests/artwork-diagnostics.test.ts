import { describe, expect, test } from "bun:test";
import { classifyArtworkFeatures } from "../src/artwork-diagnostics";

const base = {
  entropy: 4,
  sharpness: 2,
  quantizedColorBins: 20,
  quantizedColorDiversity: 0.04,
  dominantBinRatio: 0.3,
  edgeDensity: 0.08,
  transparentRatio: 0.4,
  semiTransparentRatio: 0.01,
};

describe("conservative artwork auto-router", () => {
  test("routes strong OCR coverage to text-heavy", () => {
    const result = classifyArtworkFeatures({
      ...base,
      textDetected: true,
      ocrCoverageRatio: 0.42,
    });
    expect(result.kind).toBe("text-heavy");
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  test("routes low-color edge-heavy artwork to logo-line-art", () => {
    const result = classifyArtworkFeatures(base);
    expect(result.kind).toBe("logo-line-art");
  });

  test("routes high-entropy diverse color artwork to photo", () => {
    const result = classifyArtworkFeatures({
      ...base,
      entropy: 7.1,
      quantizedColorDiversity: 0.32,
      dominantBinRatio: 0.08,
      edgeDensity: 0.14,
    });
    expect(result.kind).toBe("photo");
  });

  test("uses mixed when evidence is ambiguous", () => {
    const result = classifyArtworkFeatures({
      ...base,
      entropy: 5,
      quantizedColorDiversity: 0.1,
      edgeDensity: 0.02,
    });
    expect(result.kind).toBe("mixed");
    expect(result.confidence).toBe(0.5);
  });
});
