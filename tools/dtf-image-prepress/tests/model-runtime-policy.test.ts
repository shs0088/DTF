import { describe, expect, test } from "bun:test";
import { assertLocalModelPath } from "../src/local-adapter-policy";
import { validateModelVariant } from "../src/model-variant-qa";
import { validateTilingConfiguration } from "../src/tiling-policy";

describe("local model adapter and variant QA", () => {
  test("blocks upstream-style remote model URLs", () => {
    expect(() =>
      assertLocalModelPath("https://github.com/vendor/releases/model.pth"),
    ).toThrow("Remote model URLs are forbidden");
    expect(assertLocalModelPath("/opt/dtf/models/model.onnx")).toBe(
      "/opt/dtf/models/model.onnx",
    );
  });

  test("requires provenance for INT8/quantized variants", () => {
    const result = validateModelVariant(
      {
        id: "int8",
        providerId: "restorer",
        modelAssetId: "model-v1",
        precision: "int8",
        backendId: "openvino-cpu",
        quantized: true,
      },
      {
        id: "int8-output",
        textPreservationRatio: 1,
        topologyPreserved: true,
        edgeDisplacementPx: 0.2,
        colorDeltaE00: 0.5,
        alphaFringeScore: 0.005,
        seamScore: 0,
      },
      {
        minimumTextPreservation: 0.99,
        maximumEdgeDisplacementPx: 1.5,
        maximumColorDeltaE00: 3,
        maximumAlphaFringeScore: 0.05,
        maximumSeamScore: 0.03,
      },
    );
    expect(result.eligible).toBe(false);
    expect(result.failures.join(" ")).toContain("provenance");
  });

  test("rejects tiled settings without sufficient overlap/padding", () => {
    const failures = validateTilingConfiguration({
      tileSize: 256,
      overlapPx: 4,
      paddingPx: 2,
      blending: "weighted-overlap",
    });
    expect(failures.length).toBe(2);
  });

  test("whole-image processing needs no seam configuration", () => {
    expect(
      validateTilingConfiguration({
        tileSize: null,
        overlapPx: 0,
        paddingPx: 0,
        blending: "weighted-overlap",
      }),
    ).toEqual([]);
  });
});
