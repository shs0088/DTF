export type HardwareClass =
  | "cpu"
  | "nvidia-gpu"
  | "intel-gpu"
  | "intel-npu"
  | "vulkan-gpu";

export interface InferenceBackendDescriptor {
  id: string;
  runtime: "onnxruntime" | "openvino" | "ncnn" | "tensorrt";
  localOnly: true;
  networkRequired: false;
  hardware: HardwareClass[];
  modelFormats: string[];
  priority: number;
  note: string;
}

export const INFERENCE_BACKENDS: InferenceBackendDescriptor[] = [
  {
    id: "onnxruntime-cpu",
    runtime: "onnxruntime",
    localOnly: true,
    networkRequired: false,
    hardware: ["cpu"],
    modelFormats: ["onnx"],
    priority: 50,
    note: "Portable default local backend. No network is required for inference once model files are installed.",
  },
  {
    id: "onnxruntime-cuda",
    runtime: "onnxruntime",
    localOnly: true,
    networkRequired: false,
    hardware: ["nvidia-gpu"],
    modelFormats: ["onnx"],
    priority: 80,
    note: "NVIDIA CUDA Execution Provider; local GPU acceleration.",
  },
  {
    id: "onnxruntime-tensorrt",
    runtime: "onnxruntime",
    localOnly: true,
    networkRequired: false,
    hardware: ["nvidia-gpu"],
    modelFormats: ["onnx"],
    priority: 90,
    note: "TensorRT Execution Provider with CUDA fallback; local NVIDIA acceleration.",
  },
  {
    id: "openvino-cpu",
    runtime: "openvino",
    localOnly: true,
    networkRequired: false,
    hardware: ["cpu"],
    modelFormats: ["onnx", "openvino-ir"],
    priority: 60,
    note: "Local Intel-optimized CPU backend.",
  },
  {
    id: "openvino-intel-gpu",
    runtime: "openvino",
    localOnly: true,
    networkRequired: false,
    hardware: ["intel-gpu"],
    modelFormats: ["onnx", "openvino-ir"],
    priority: 85,
    note: "Local Intel GPU backend when driver/runtime support is present.",
  },
  {
    id: "openvino-intel-npu",
    runtime: "openvino",
    localOnly: true,
    networkRequired: false,
    hardware: ["intel-npu"],
    modelFormats: ["onnx", "openvino-ir"],
    priority: 85,
    note: "Local Intel NPU backend; requires compatible NPU driver/runtime.",
  },
  {
    id: "ncnn-cpu",
    runtime: "ncnn",
    localOnly: true,
    networkRequired: false,
    hardware: ["cpu"],
    modelFormats: ["ncnn-param-bin"],
    priority: 55,
    note: "Lightweight local C++ inference backend with low runtime dependency footprint.",
  },
  {
    id: "ncnn-vulkan",
    runtime: "ncnn",
    localOnly: true,
    networkRequired: false,
    hardware: ["vulkan-gpu"],
    modelFormats: ["ncnn-param-bin"],
    priority: 75,
    note: "Local Vulkan backend suitable for supported Intel/AMD/NVIDIA/other Vulkan devices.",
  },
  {
    id: "tensorrt-native",
    runtime: "tensorrt",
    localOnly: true,
    networkRequired: false,
    hardware: ["nvidia-gpu"],
    modelFormats: ["onnx", "tensorrt-engine"],
    priority: 95,
    note: "Native TensorRT backend for explicitly validated NVIDIA deployments.",
  },
];

export interface BackendSelectionInput {
  availableHardware: HardwareClass[];
  modelFormat: string;
  allowedRuntimeIds?: string[];
}

export function selectLocalInferenceBackends(
  input: BackendSelectionInput,
): InferenceBackendDescriptor[] {
  const hardware = new Set(input.availableHardware);
  const allowed = input.allowedRuntimeIds ? new Set(input.allowedRuntimeIds) : null;

  return INFERENCE_BACKENDS
    .filter((backend) => backend.localOnly && backend.networkRequired === false)
    .filter((backend) => backend.hardware.some((item) => hardware.has(item)))
    .filter((backend) => backend.modelFormats.includes(input.modelFormat))
    .filter((backend) => !allowed || allowed.has(backend.id))
    .sort((a, b) => b.priority - a.priority);
}
