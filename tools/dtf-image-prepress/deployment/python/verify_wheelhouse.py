#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import sys
from pathlib import Path

def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()

def contained(root: Path, target: Path) -> bool:
    try:
        target.relative_to(root)
        return True
    except ValueError:
        return False

def verify_manifest(manifest_path: Path, wheelhouse: Path):
    if not manifest_path.is_absolute() or not wheelhouse.is_absolute():
        raise ValueError("manifest and wheelhouse paths must be absolute")
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    if data.get("schemaVersion") != "dtf-wheelhouse-v1":
        raise ValueError("unsupported wheelhouse manifest schema")
    entries = data.get("entries")
    if not isinstance(entries, list) or not entries:
        raise ValueError("wheelhouse manifest must contain entries")

    root = wheelhouse.resolve(strict=True)
    seen_files = set()
    seen_packages = set()
    verified = []

    for item in entries:
        wheel_file = str(item.get("wheelFile", ""))
        package_name = str(item.get("packageName", "")).strip()
        version = str(item.get("version", "")).strip()
        expected = str(item.get("sha256", "")).lower()
        profiles = item.get("profiles", [])

        if not wheel_file.endswith(".whl"):
            raise ValueError(f"wheelFile must end with .whl: {wheel_file}")
        if not package_name or not version:
            raise ValueError("packageName and version are required")
        if not isinstance(profiles, list) or not profiles:
            raise ValueError(f"profiles are required for {package_name}")
        if len(expected) != 64 or any(ch not in "0123456789abcdef" for ch in expected):
            raise ValueError(f"invalid SHA-256 for {wheel_file}")

        rel = Path(wheel_file)
        if rel.is_absolute() or ".." in rel.parts:
            raise ValueError(f"wheel path traversal/absolute path is forbidden: {wheel_file}")
        if wheel_file in seen_files:
            raise ValueError(f"duplicate wheel file: {wheel_file}")
        key = (package_name.lower(), version)
        if key in seen_packages:
            raise ValueError(f"duplicate package/version: {package_name}=={version}")
        seen_files.add(wheel_file)
        seen_packages.add(key)

        candidate = (root / rel).resolve(strict=True)
        if not contained(root, candidate):
            raise ValueError(f"wheel escapes wheelhouse root: {wheel_file}")
        info = candidate.lstat()
        if candidate.is_symlink():
            raise ValueError(f"symlink wheel is forbidden: {wheel_file}")
        if not candidate.is_file():
            raise ValueError(f"wheel is not a regular file: {wheel_file}")
        if info.st_nlink > 1:
            raise ValueError(f"hard-linked wheel is forbidden: {wheel_file}")

        actual = sha256_file(candidate)
        if actual != expected:
            raise ValueError(
                f"wheel SHA-256 mismatch for {wheel_file}: expected {expected}, got {actual}"
            )
        verified.append({
            "packageName": package_name,
            "version": version,
            "wheelFile": str(candidate),
            "sha256": actual,
            "profiles": profiles,
        })

    return {
        "schemaVersion": data["schemaVersion"],
        "python": data.get("python"),
        "entries": verified,
    }

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--wheelhouse", required=True)
    parser.add_argument("--output-json")
    args = parser.parse_args()

    result = verify_manifest(Path(args.manifest), Path(args.wheelhouse))
    encoded = json.dumps(result, ensure_ascii=False, separators=(",", ":"))
    if args.output_json:
        output = Path(args.output_json)
        if not output.is_absolute():
            raise ValueError("output JSON path must be absolute")
        output.write_text(encoded, encoding="utf-8")
    else:
        print(encoded)
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"wheelhouse-verify-error: {exc}", file=sys.stderr)
        raise SystemExit(2)
