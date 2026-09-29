export type ModelArtifactFormat =
  | "onnx"
  | "onnx-external-data"
  | "safetensors"
  | "ncnn"
  | "paddle-inference"
  | "pytorch-pickle"
  | "torchscript";

export interface ModelFormatPolicy {
  format: ModelArtifactFormat;
  runtimeAllowed: boolean;
  requiresSandbox: boolean;
  requiresHashPin: true;
  allowExternalFileReferences: boolean;
  note: string;
}

export const MODEL_FORMAT_POLICIES: Record<ModelArtifactFormat, ModelFormatPolicy> = {
  onnx: {
    format: "onnx",
    runtimeAllowed: true,
    requiresSandbox: true,
    requiresHashPin: true,
    allowExternalFileReferences: false,
    note: "Single-file ONNX is allowed only after provenance/hash verification and resource-limited sandbox validation.",
  },
  "onnx-external-data": {
    format: "onnx-external-data",
    runtimeAllowed: true,
    requiresSandbox: true,
    requiresHashPin: true,
    allowExternalFileReferences: true,
    note: "External tensor data is allowed only as a separately validated local bundle contained under one trusted model root.",
  },
  safetensors: {
    format: "safetensors",
    runtimeAllowed: true,
    requiresSandbox: true,
    requiresHashPin: true,
    allowExternalFileReferences: false,
    note: "Preferred tensor-only serialization when the local provider supports it; still validate model architecture/code and resource usage.",
  },
  ncnn: {
    format: "ncnn",
    runtimeAllowed: true,
    requiresSandbox: true,
    requiresHashPin: true,
    allowExternalFileReferences: true,
    note: "NCNN param/bin bundles are local-only, hash-pinned and executed inside the offline runtime.",
  },
  "paddle-inference": {
    format: "paddle-inference",
    runtimeAllowed: true,
    requiresSandbox: true,
    requiresHashPin: true,
    allowExternalFileReferences: true,
    note: "Paddle inference directories are preinstalled locally; every required artifact is pinned in the local bundle manifest.",
  },
  "pytorch-pickle": {
    format: "pytorch-pickle",
    runtimeAllowed: false,
    requiresSandbox: true,
    requiresHashPin: true,
    allowExternalFileReferences: false,
    note: "Pickle-based PyTorch checkpoints are conversion/research inputs only and are not loaded by the production runtime.",
  },
  torchscript: {
    format: "torchscript",
    runtimeAllowed: false,
    requiresSandbox: true,
    requiresHashPin: true,
    allowExternalFileReferences: false,
    note: "TorchScript is treated as executable model code and is not loaded by the production image-prepress runtime.",
  },
};

export function assertRuntimeModelFormat(format: ModelArtifactFormat): ModelFormatPolicy {
  const policy = MODEL_FORMAT_POLICIES[format];
  if (!policy.runtimeAllowed) {
    throw new Error(
      `Model format ${format} is not allowed in production runtime; convert it offline to an approved deployment format first.`,
    );
  }
  return policy;
}

export function inferModelArtifactFormat(fileName: string): ModelArtifactFormat | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".safetensors")) return "safetensors";
  if (lower.endsWith(".onnx")) return "onnx";
  if (lower.endsWith(".pth") || lower.endsWith(".ckpt")) return "pytorch-pickle";
  if (lower.endsWith(".pt") || lower.endsWith(".ptl")) return "torchscript";
  if (lower.endsWith(".param") || lower.endsWith(".bin")) return "ncnn";
  if (
    lower.endsWith(".pdmodel") ||
    lower.endsWith(".pdiparams") ||
    lower.endsWith("inference.json")
  ) {
    return "paddle-inference";
  }
  return null;
}
