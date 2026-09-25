#!/usr/bin/env python3
import argparse
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ACCEPT = ROOT / "odoo19_migration" / "acceptance"
DEPLOY = ROOT / "odoo19_migration" / "deployment"

def require(condition, message):
    if not condition:
        raise SystemExit(message)

parser = argparse.ArgumentParser()
parser.add_argument("--require-live", action="store_true")
parser.add_argument(
    "--live-evidence",
    default=os.environ.get(
        "M11_LIVE_EVIDENCE_FILE",
        str(ACCEPT / "m11-live-evidence.json"),
    ),
)
args = parser.parse_args()

matrix = ACCEPT / "M11_ACCEPTANCE_MATRIX.md"
source_path = ACCEPT / "m11-source-evidence.json"
example_path = ACCEPT / "m11-live-evidence.example.json"

for path in (matrix, source_path, example_path):
    require(path.exists(), f"Missing M11 acceptance file: {path}")

source = json.loads(source_path.read_text())
require(source.get("schema_version") == 1, "Unsupported M11 source evidence schema.")
require(source.get("branch") == "odoo19/headless-backend-migration-prep",
        "M11 source evidence points to the wrong branch.")

for milestone in ("m6", "m7", "m8", "m9", "m10"):
    require(milestone in source, f"M11 source evidence missing {milestone}.")

require(source["m6"].get("status") == "complete_ci_visual", "M6 evidence not closed.")
require(source["m7"].get("status") == "complete_ci", "M7 evidence not closed.")
require(source["m8"].get("status") == "complete_ci_visual", "M8 evidence not closed.")
require(source["m9"].get("status") == "complete_ci_visual", "M9 evidence not closed.")
require(
    source["m10"].get("status") == "closed_repository_deployment_package_boundary",
    "M10 package-boundary closure evidence missing.",
)
require(source["m10"].get("live_execution_claimed") is False,
        "M10 source evidence must not fabricate live execution.")
require(source["protected_v48"].get("must_remain_untouched") is True,
        "Protected V48 boundary is missing.")

m11_source = source.get("m11", {})
require(m11_source.get("source_acceptance_status") == "pass",
        "M11 source acceptance is not PASS.")
accepted_source_head = m11_source.get("source_acceptance_head")
require(accepted_source_head,
        "M11 source evidence is missing source_acceptance_head.")

for path in (
    DEPLOY / "M10_GO_LIVE_RUNBOOK.md",
    DEPLOY / "collect-production-evidence.sh",
    DEPLOY / "backup-production.sh",
    DEPLOY / "restore-drill.sh",
    DEPLOY / "monitor-production.sh",
    DEPLOY / "install-host-timers.sh",
    DEPLOY / "smoke-production.sh",
):
    require(path.exists(), f"Missing prerequisite deployment artifact: {path.name}")

milestones = (ROOT / "odoo19_migration" / "04_MIGRATION_MILESTONES.md").read_text()
require("M10 formal closure" in milestones, "Milestones do not contain formal M10 closure.")
require("M11 is now **ACTIVE**" in milestones, "Milestones do not mark M11 active.")

for name in (
    "01_To_Do.txt",
    "02_Implemented.txt",
    "03_Not_Implemented.txt",
    "04_Rules.txt",
    "05_Checking_List.txt",
):
    text = (ROOT / name).read_text()
    require("M10 FORMAL CLOSURE / M11 HANDOFF" in text,
            f"{name} missing M10/M11 handoff evidence.")

live_path = Path(args.live_evidence)
if not live_path.exists():
    if args.require_live:
        raise SystemExit(
            "M11 STRICT ACCEPTANCE FAILED: live production evidence is missing."
        )
    print("M11_SOURCE_ACCEPTANCE=PASS")
    print("M11_ACCEPTANCE_STATUS=EXTERNAL_EVIDENCE_REQUIRED")
    print("M11_PRODUCTION_READY=NO")
    raise SystemExit(0)

live = json.loads(live_path.read_text())
require(live.get("schema_version") == 1, "Unsupported M11 live evidence schema.")
require(live.get("source_head"), "Live evidence missing source_head.")
require(
    live.get("source_head") == accepted_source_head,
    "M11 STRICT ACCEPTANCE FAILED: live source_head does not match the accepted M11 source head.",
)
require(live.get("collected_at_utc"), "Live evidence missing collected_at_utc.")

checks = [
    ("host.preflight_pass", live.get("host", {}).get("preflight_pass") is True),
    ("host.arch", live.get("host", {}).get("arch") in ("aarch64", "arm64")),
    ("dns.backend_resolves", live.get("dns", {}).get("backend_resolves") is True),
    ("dns.frontend_resolves", live.get("dns", {}).get("frontend_resolves") is True),
    ("tls.issuance_pass", live.get("tls", {}).get("issuance_pass") is True),
    ("tls.renewal_pass", live.get("tls", {}).get("renewal_pass") is True),
    ("odoo.addons_installed", live.get("odoo", {}).get("addons_installed") == 13),
    ("odoo.backend_https_pass", live.get("odoo", {}).get("backend_https_pass") is True),
    ("odoo.database_manager_blocked", live.get("odoo", {}).get("database_manager_blocked") is True),
    ("odoo.websocket_pass", live.get("odoo", {}).get("websocket_pass") is True),
    ("frontend.isolated_worker_live", live.get("frontend", {}).get("isolated_worker_live") is True),
    ("frontend.new_odoo_origin_https", live.get("frontend", {}).get("new_odoo_origin_https") is True),
    ("frontend.protected_v48_untouched", live.get("frontend", {}).get("protected_v48_untouched") is True),
    ("backup_restore.production_backup_pass", live.get("backup_restore", {}).get("production_backup_pass") is True),
    ("backup_restore.checksums_pass", live.get("backup_restore", {}).get("checksums_pass") is True),
    ("backup_restore.isolated_restore_drill_pass", live.get("backup_restore", {}).get("isolated_restore_drill_pass") is True),
    ("operations.monitoring_pass", live.get("operations", {}).get("monitoring_pass") is True),
    ("operations.logging_pass", live.get("operations", {}).get("logging_pass") is True),
    ("operations.timers_pass", live.get("operations", {}).get("timers_pass") is True),
    ("operations.production_smoke_pass", live.get("operations", {}).get("production_smoke_pass") is True),
]
for label, ok in checks:
    require(ok, f"M11 STRICT ACCEPTANCE FAILED: {label} is not PASS.")

print("M11_SOURCE_ACCEPTANCE=PASS")
print("M11_LIVE_PRODUCTION_EVIDENCE=PASS")
print("M11_ACCEPTANCE_STATUS=PASS")
print("M11_PRODUCTION_READY=YES")
