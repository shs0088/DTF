#!/usr/bin/env python3
from pathlib import Path
import ast,re,sys
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
ADDONS=ROOT/'odoo/custom_addons'
EXPECTED=["dtf_core","dtf_designer","dtf_design","dtf_preflight","dtf_customizer","dtf_sale","dtf_production","dtf_finance","dtf_printify","dtf_notifications","dtf_admin","dtf_backend_theme","dtf_api"]
errors=[]
actual={p.name for p in ADDONS.iterdir() if p.is_dir()}
if actual != set(EXPECTED): errors.append("addon directory set mismatch")
for name in sorted(actual):
 p=ADDONS/name
 for f in (p/"__init__.py",p/"__manifest__.py"):
  if not f.is_file(): errors.append(f"{name}: missing {f.name}")
 try: ast.parse((p/"__init__.py").read_text())
 except Exception as e: errors.append(f"{name}: init syntax {e}")
 try: data=ast.literal_eval((p/"__manifest__.py").read_text())
 except Exception as e: errors.append(f"{name}: manifest {e}"); data={}
 for dep in data.get("depends",[]):
  if dep.startswith("dtf_") and dep not in EXPECTED: errors.append(f"{name}: missing local dependency {dep}")
for p in ROOT.rglob("*.xml"):
 try: ET.parse(p)
 except Exception as e: errors.append(f"{p}: XML {e}")
compose=(ROOT/"deployment/docker-compose.yml").read_text()
if re.search(r"(?m)^\s*-?\s*\"?\d+:5432",compose): errors.append("PostgreSQL host port exposed")
if errors:
 print("M1 STATIC VALIDATION: FAIL")
 print("\n".join(errors))
 sys.exit(1)
print("M1 STATIC VALIDATION: PASS")
print("runtime not executed by static validator")
