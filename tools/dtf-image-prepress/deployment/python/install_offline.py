#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
import sys
import venv
from pathlib import Path

def require_absolute(path_value: str, label: str) -> Path:
    path = Path(path_value)
    if not path.is_absolute():
        raise ValueError(f"{label} must be absolute")
    return path

def main() -> int:
    parser = argparse.ArgumentParser(description="Install a pre-verified DTF Python wheelhouse without network access")
    parser.add_argument("--verified-json", required=True)
    parser.add_argument("--venv", required=True)
    parser.add_argument("--profile", action="append", required=True)
    args = parser.parse_args()

    verified_json = require_absolute(args.verified_json, "verified JSON")
    venv_path = require_absolute(args.venv, "venv")
    data = json.loads(verified_json.read_text(encoding="utf-8"))
    entries = data.get("entries", [])
    selected_profiles = set(args.profile)

    selected = [
        Path(item["wheelFile"])
        for item in entries
        if selected_profiles.intersection(item.get("profiles", []))
    ]
    if not selected:
        raise ValueError("no verified wheels match the requested profile(s)")
    for wheel in selected:
        if not wheel.is_absolute() or not wheel.exists():
            raise ValueError(f"verified wheel is unavailable: {wheel}")

    builder = venv.EnvBuilder(with_pip=True, clear=True)
    builder.create(venv_path)

    if os.name == "nt":
        python = venv_path / "Scripts" / "python.exe"
    else:
        python = venv_path / "bin" / "python"

    env = {
        **os.environ,
        "PIP_NO_INDEX": "1",
        "PIP_DISABLE_PIP_VERSION_CHECK": "1",
        "HF_HUB_OFFLINE": "1",
        "TRANSFORMERS_OFFLINE": "1",
        "HF_DATASETS_OFFLINE": "1",
        "PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK": "1",
        "NO_PROXY": "*",
        "no_proxy": "*",
    }
    for key in ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "FTP_PROXY"]:
        env.pop(key, None)

    command = [
        str(python),
        "-m",
        "pip",
        "install",
        "--no-index",
        "--no-deps",
        "--disable-pip-version-check",
        *[str(path) for path in selected],
    ]
    subprocess.run(command, check=True, env=env)
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"offline-python-install-error: {exc}", file=sys.stderr)
        raise SystemExit(2)
