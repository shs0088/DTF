#!/usr/bin/env python3
import argparse
import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps
from pymatting import estimate_foreground_ml

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
    missing = [key for key, expected in required.items() if os.environ.get(key) != expected]
    if missing:
        raise RuntimeError("Offline foreground wrapper requires: " + ", ".join(missing))

def main() -> int:
    parser = argparse.ArgumentParser(description="Local PyMatting foreground reconstruction")
    parser.add_argument("--input", required=True)
    parser.add_argument("--alpha", required=True)
    parser.add_argument("--output-rgba", required=True)
    parser.add_argument("--output-json", required=True)
    parser.add_argument("--regularization", type=float, default=1e-5)
    args = parser.parse_args()

    require_offline_environment()
    input_path = require_absolute_existing(args.input, "input image")
    alpha_path = require_absolute_existing(args.alpha, "alpha mask")
    output_rgba = require_absolute_output(args.output_rgba, "output RGBA")
    output_json = require_absolute_output(args.output_json, "output JSON")

    if args.regularization <= 0 or not np.isfinite(args.regularization):
        raise ValueError("--regularization must be a positive finite value")

    source = ImageOps.exif_transpose(Image.open(input_path)).convert("RGB")
    alpha_image = ImageOps.exif_transpose(Image.open(alpha_path)).convert("L")
    if alpha_image.size != source.size:
        raise ValueError(
            f"alpha mask size {alpha_image.size} must match source size {source.size}"
        )

    image = np.asarray(source, dtype=np.float64) / 255.0
    alpha = np.asarray(alpha_image, dtype=np.float64) / 255.0

    foreground = estimate_foreground_ml(
        image,
        alpha,
        regularization=args.regularization,
        return_background=False,
    )
    foreground = np.clip(foreground, 0.0, 1.0)

    rgb8 = np.rint(foreground * 255.0).astype(np.uint8)
    alpha8 = np.rint(np.clip(alpha, 0.0, 1.0) * 255.0).astype(np.uint8)
    rgba = np.dstack([rgb8, alpha8])

    Image.fromarray(rgba, mode="RGBA").save(output_rgba, format="PNG", optimize=True)

    semi = np.logical_and(alpha8 > 0, alpha8 < 255)
    report = {
        "engine": "pymatting-foreground-ml",
        "input": str(input_path),
        "alpha": str(alpha_path),
        "output_rgba": str(output_rgba),
        "size": list(source.size),
        "regularization": args.regularization,
        "semi_transparent_ratio": float(np.mean(semi)),
        "alpha_preserved": True,
        "foreground_rgb_reconstructed": True,
        "output_alpha_mode": "straight-unassociated",
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
        print(f"pymatting-local-error: {exc}", file=sys.stderr)
        raise SystemExit(2)
