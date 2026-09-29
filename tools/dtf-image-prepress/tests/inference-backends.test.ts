import { describe, expect, test } from "bun:test";
import {
  INFERENCE_BACKENDS,
  selectLocalInferenceBackends,
} from "../src/inference-backends";

describe("local inference backends", () => {
  test("all declared inference backends are local and network-free", () => {
    for (const backend of INFERENCE_BACKENDS) {
      expect(backend.localOnly).toBe(true);
      expect(backend.networkRequired).toBe(false);
    }
  });

  test("prefers TensorRT-class local backend on NVIDIA for ONNX", () => {
    const selected = selectLocalInferenceBackends({
      availableHardware: ["cpu", "nvidia-gpu"],
      modelFormat: "onnx",
    });
    expect(selected[0]?.id).toBe("tensorrt-native");
    expect(selected.some((item) => item.id === "onnxruntime-cuda")).toBe(true);
    expect(selected.some((item) => item.id === "onnxruntime-cpu")).toBe(true);
  });

  test("offers Vulkan ncnn only for ncnn-formatted local models", () => {
    const selected = selectLocalInferenceBackends({
      availableHardware: ["vulkan-gpu"],
      modelFormat: "ncnn-param-bin",
    });
    expect(selected.map((item) => item.id)).toEqual(["ncnn-vulkan"]);
  });

  test("never invents an external fallback", () => {
    const selected = selectLocalInferenceBackends({
      availableHardware: [],
      modelFormat: "onnx",
    });
    expect(selected).toEqual([]);
  });
});
