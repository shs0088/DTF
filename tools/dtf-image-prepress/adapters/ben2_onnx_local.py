#!/usr/bin/env python3
import argparse
import json
import os
import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps

EXPECTED_SIZE = 1024

def require_absolute_existing(value: str, label: str) -> Path:
    path = Path(value)
    if not path.is_absolute():
        raise ValueError(f"{label} must be an absolute local path")
    if not path.exists():
        raise ValueError(f"{label} does not exist: {path}")
    return path

def require_absolute_output(value: str, label: str) -> Path:
    path = Path(value)
    if not path.is_absolute():
        raise ValueError(f"{label} must be an absolute local path")
    path.parent.mkdir(parents=True, exist_ok=True)
    return path

def require_offline_environment() -> None:
    required = {
        "HF_HUB_OFFLINE": "1",
        "TRANSFORMERS_OFFLINE": "1",
        "HF_DATASETS_OFFLINE": "1",
    }
    missing = [k for k, v in required.items() if os.environ.get(k) != v]
    if missing:
        raise RuntimeError("Offline BEN2 wrapper requires: " + ", ".join(missing))

def providers_for(device: str):
    available = set(ort.get_available_providers())
    if device == "cpu":
        if "CPUExecutionProvider" not in available:
            raise RuntimeError("CPUExecutionProvider is unavailable")
        return ["CPUExecutionProvider"]
    if device == "cuda":
        if "CUDAExecutionProvider" not in available:
            raise RuntimeError("CUDAExecutionProvider is unavailable")
        providers = ["CUDAExecutionProvider"]
        if "CPUExecutionProvider" in available:
            providers.append("CPUExecutionProvider")
        return providers
    raise ValueError("--device must be cpu or cuda")

def preprocess(image: Image.Image):
    oriented = ImageOps.exif_transpose(image).convert("RGB")
    original_size = oriented.size
    resized = oriented.resize((EXPECTED_SIZE, EXPECTED_SIZE), Image.Resampling.BILINEAR)
    array = np.asarray(resized, dtype=np.float32) / 255.0
    tensor = np.transpose(array, (2, 0, 1))[None, :, :, :]
    return tensor, original_size

def normalize_mask(output: np.ndarray, original_size):
    result = np.asarray(output, dtype=np.float32)
    result = np.squeeze(result)
    if result.ndim != 2:
        raise RuntimeError(f"BEN2 output must squeeze to 2D, got shape {result.shape}")

    minimum = float(np.min(result))
    maximum = float(np.max(result))
    delta = maximum - minimum
    if not np.isfinite(minimum) or not np.isfinite(maximum):
        raise RuntimeError("BEN2 output contains non-finite values")
    if delta <= 1e-12:
        normalized = np.zeros_like(result, dtype=np.float32)
    else:
        normalized = (result - minimum) / delta

    alpha = np.clip(np.rint(normalized * 255.0), 0, 255).astype(np.uint8)
    mask = Image.fromarray(alpha, mode="L")
    if mask.size != original_size:
        mask = mask.resize(original_size, Image.Resampling.BILINEAR)
    return mask, minimum, maximum

def main() -> int:
    parser = argparse.ArgumentParser(description="Offline local BEN2 ONNX inference")
    parser.add_argument("--model", required=True)
    parser.add_argument("--input", required=True)
    parser.add_argument("--output-mask", required=True)
    parser.add_argument("--output-json", required=True)
    parser.add_argument("--device", choices=["cpu", "cuda"], default="cpu")
    args = parser.parse_args()

    require_offline_environment()
    model_path = require_absolute_existing(args.model, "BEN2 ONNX model")
    input_path = require_absolute_existing(args.input, "input image")
    output_mask = require_absolute_output(args.output_mask, "output mask")
    output_json = require_absolute_output(args.output_json, "output JSON")

    if model_path.suffix.lower() != ".onnx":
        raise ValueError("BEN2 production wrapper accepts ONNX models only")

    session = ort.InferenceSession(str(model_path), providers=providers_for(args.device))
    inputs = session.get_inputs()
    if len(inputs) != 1:
        raise RuntimeError(f"Expected one BEN2 ONNX input, found {len(inputs)}")

    input_meta = inputs[0]
    shape = list(input_meta.shape)
    if len(shape) != 4:
        raise RuntimeError(f"Expected NCHW BEN2 input, got shape {shape}")

    image = Image.open(input_path)
    tensor, original_size = preprocess(image)

    outputs = session.run(None, {input_meta.name: tensor})
    if len(outputs) < 1:
        raise RuntimeError("BEN2 ONNX returned no outputs")

    mask, output_min, output_max = normalize_mask(outputs[0], original_size)
    mask.save(output_mask, format="PNG", optimize=True)

    report = {
        "engine": "ben2-onnx",
        "model_path": str(model_path),
        "input_path": str(input_path),
        "output_mask": str(output_mask),
        "input_name": input_meta.name,
        "declared_input_shape": shape,
        "runtime_input_shape": list(tensor.shape),
        "output_shape": list(np.asarray(outputs[0]).shape),
        "original_size": list(original_size),
        "preprocess": {
            "resize": [EXPECTED_SIZE, EXPECTED_SIZE],
            "rgb": True,
            "scale": "uint8/255",
            "mean_std_normalization": False,
        },
        "postprocess": {
            "min": output_min,
            "max": output_max,
            "normalization": "min-max",
            "resize_to_original": True,
        },
        "providers": session.get_providers(),
    }
    output_json.write_text(
        json.dumps(report, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ben2-onnx-local-error: {exc}", file=sys.stderr)
        raise SystemExit(2)
