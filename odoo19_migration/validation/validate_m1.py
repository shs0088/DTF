#!/usr/bin/env python3
"""Dependency-free source validation for the DTF Studio Odoo 19 M1 foundation."""
from __future__ import annotations

import ast
import re
import sys
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ADDONS = ROOT / "odoo" / "custom_addons"
EXPECTED = {
    "dtf_core", "dtf_designer", "dtf_design", "dtf_preflight",
    "dtf_customizer", "dtf_sale", "dtf_production", "dtf_finance",
    "dtf_printify", "dtf_notifications", "dtf_admin",
    "dtf_backend_theme", "dtf_api",
}
errors: list[str] = []

def fail(message: str) -> None:
    errors.append(message)

# Odoo core must not be vendored into this package.
odoo_root = ROOT / "odoo"
odoo_children = {p.name for p in odoo_root.iterdir()} if odoo_root.exists() else set()
if odoo_children != {"custom_addons"}:
    fail(f"odoo19_migration/odoo must contain only custom_addons, got {sorted(odoo_children)}")

addon_dirs = [p for p in ADDONS.iterdir() if p.is_dir()] if ADDONS.exists() else []
actual = {p.name for p in addon_dirs}
if len(addon_dirs) != len(actual):
    fail("duplicate addon technical directory names detected")
if actual != EXPECTED:
    fail(f"addon directories mismatch: expected {sorted(EXPECTED)}, got {sorted(actual)}")

manifests: dict[str, dict] = {}
for addon in sorted(actual):
    module_dir = ADDONS / addon
    init_file = module_dir / "__init__.py"
    manifest_file = module_dir / "__manifest__.py"
    if not init_file.is_file():
        fail(f"{addon}: missing __init__.py")
    if not manifest_file.is_file():
        fail(f"{addon}: missing __manifest__.py")
        continue
    try:
        manifest = ast.literal_eval(manifest_file.read_text(encoding="utf-8"))
        if not isinstance(manifest, dict):
            raise ValueError("manifest is not a dict")
        manifests[addon] = manifest
        if manifest.get("installable") is not True:
            fail(f"{addon}: installable must be True in M1")
    except Exception as exc:
        fail(f"{addon}: invalid manifest: {exc}")

# Parse every Python file in the migration package, including controllers.
for py_file in ROOT.rglob("*.py"):
    try:
        ast.parse(py_file.read_text(encoding="utf-8"), filename=str(py_file))
    except SyntaxError as exc:
        fail(f"{py_file.relative_to(ROOT)}: Python syntax error: {exc}")

# Validate local addon dependencies and detect local dependency cycles.
graph: dict[str, set[str]] = {name: set() for name in EXPECTED}
for addon, manifest in manifests.items():
    for dep in manifest.get("depends", []):
        if isinstance(dep, str) and dep.startswith("dtf_"):
            if dep not in EXPECTED:
                fail(f"{addon}: missing local dependency {dep}")
            else:
                graph[addon].add(dep)

visiting: set[str] = set()
visited: set[str] = set()
def visit(node: str) -> None:
    if node in visited:
        return
    if node in visiting:
        fail(f"local addon dependency cycle detected at {node}")
        return
    visiting.add(node)
    for dep in graph[node]:
        visit(dep)
    visiting.remove(node)
    visited.add(node)
for node in sorted(graph):
    visit(node)

for xml_file in ROOT.rglob("*.xml"):
    try:
        ET.parse(xml_file)
    except Exception as exc:
        fail(f"{xml_file.relative_to(ROOT)}: XML parse error: {exc}")

# Secret scan. .env.example is intentionally allowed and contains placeholders only.
secret_patterns = [
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(r"gh[pousr]_[A-Za-z0-9_]{20,}"),
    re.compile(r"sk-[A-Za-z0-9_-]{20,}"),
]
for file_path in ROOT.rglob("*"):
    if not file_path.is_file():
        continue
    if file_path.name == ".env":
        fail(f"committed populated .env file: {file_path.relative_to(ROOT)}")
    if file_path.name == ".env.example":
        continue
    text = file_path.read_text(encoding="utf-8", errors="ignore")
    for pattern in secret_patterns:
        if pattern.search(text):
            fail(f"possible committed secret in {file_path.relative_to(ROOT)}")
            break

compose = (ROOT / "deployment" / "docker-compose.yml").read_text(encoding="utf-8")
if re.search(r"(?m)^\s*-\s*['\"]?[^\n'\"]*:5432(?:/tcp)?['\"]?\s*$", compose):
    fail("PostgreSQL host port 5432 exposure detected")

if errors:
    print("M1 STATIC VALIDATION: FAIL")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("M1 STATIC VALIDATION: PASS")
print(f"addons: {len(EXPECTED)}")
print("Odoo/PostgreSQL runtime: NOT EXECUTED by this static validator")
