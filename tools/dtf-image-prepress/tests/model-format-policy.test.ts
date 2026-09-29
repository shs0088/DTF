import { describe, expect, test } from "bun:test";
import {
  assertRuntimeModelFormat,
  inferModelArtifactFormat,
  MODEL_FORMAT_POLICIES,
} from "../src/model-format-policy";

describe("model artifact format policy", () => {
  test("blocks pickle and TorchScript in production runtime", () => {
    expect(() => assertRuntimeModelFormat("pytorch-pickle")).toThrow(
      "not allowed in production runtime",
    );
    expect(() => assertRuntimeModelFormat("torchscript")).toThrow(
      "not allowed in production runtime",
    );
  });

  test("allows pinned sandboxed deployment formats", () => {
    for (const format of ["onnx", "safetensors", "ncnn", "paddle-inference"] as const) {
      const policy = assertRuntimeModelFormat(format);
      expect(policy.requiresHashPin).toBe(true);
      expect(policy.requiresSandbox).toBe(true);
    }
  });

  test("recognizes risky checkpoint extensions", () => {
    expect(inferModelArtifactFormat("model.pth")).toBe("pytorch-pickle");
    expect(inferModelArtifactFormat("model.pt")).toBe("torchscript");
    expect(inferModelArtifactFormat("model.safetensors")).toBe("safetensors");
    expect(inferModelArtifactFormat("model.onnx")).toBe("onnx");
  });

  test("ONNX external data is never implicitly trusted", () => {
    expect(MODEL_FORMAT_POLICIES["onnx-external-data"].requiresSandbox).toBe(true);
    expect(MODEL_FORMAT_POLICIES["onnx-external-data"].requiresHashPin).toBe(true);
  });
});
