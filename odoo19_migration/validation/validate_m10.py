#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEPLOY = ROOT / "odoo19_migration" / "deployment"

def require(cond, message):
    if not cond:
        raise SystemExit(message)

root_wrangler = json.loads((ROOT / "wrangler.jsonc").read_text())
new_wrangler = json.loads((DEPLOY / "wrangler.frontend.production.jsonc").read_text())

require(root_wrangler.get("main") == "./workers/static-app.ts",
        "Protected legacy wrangler entrypoint changed.")
require(root_wrangler.get("name") == "dtf-studio",
        "Protected legacy Worker name changed.")

require(new_wrangler.get("name") == "dtf-studio-odoo19-frontend",
        "New frontend Worker name must be isolated.")
require(new_wrangler.get("main") == "./workers/odoo-frontend.ts",
        "New frontend Worker must use the Odoo-backed entrypoint.")
require("durable_objects" not in new_wrangler,
        "New Odoo-backed frontend must not bind legacy Durable Objects.")
require("r2_buckets" not in new_wrangler,
        "New Odoo-backed frontend must not bind legacy R2 business authority.")

compose = (DEPLOY / "docker-compose.production.yml").read_text()
require('5432:5432' not in compose and '"5432:5432"' not in compose,
        "Production PostgreSQL must not publish port 5432.")
require('"443:443"' in compose, "Production Nginx must publish TLS port 443.")
require("list_db = False" in compose, "Production Odoo must disable database listing.")
require("dbfilter =" in compose, "Production Odoo must restrict the database.")

nginx = (DEPLOY / "nginx.production.conf.template").read_text()
for route in ("/api/dtf/", "/odoo", "/web", "/websocket"):
    require(route in nginx, f"Production Nginx missing {route} route.")
require("ssl_certificate" in nginx and "TLSv1.3" in nginx,
        "Production Nginx TLS configuration missing.")
require("/web/database" in nginx and "return 404" in nginx,
        "Production database manager must be blocked externally.")

worker = (ROOT / "workers" / "odoo-frontend.ts").read_text()
deploy_frontend = (DEPLOY / "deploy-frontend.sh").read_text()
require("npm install" in deploy_frontend and "npm ci" not in deploy_frontend,
        "Production frontend deploy must use the repository's verified npm install workflow.")
require("DTF_ODOO_ORIGIN" in worker, "Production frontend must require Odoo origin.")
require("https:" in worker, "Production frontend must enforce HTTPS Odoo origin.")
require("ItemStore" not in worker and "DESIGN_ASSETS" not in worker,
        "Production Odoo frontend must not import legacy business authority.")
require("dtf-studio-v48-safe-frontend" in worker,
        "Production frontend must contain the protected V48 deployment guard.")

for script in (
    "deploy-frontend.sh",
    "provision-tls.sh",
    "renew-tls.sh",
    "monitor-production.sh",
    "backup-production.sh",
    "restore-drill.sh",
    "install-host-timers.sh",
):
    require((DEPLOY / script).exists(), f"Missing M10 deployment script: {script}")

installer = (DEPLOY / "install-host-timers.sh").read_text()
for unit in (
    "dtf-studio-backup.timer",
    "dtf-studio-restore-drill.timer",
    "dtf-studio-monitor.timer",
    "dtf-studio-tls-renew.timer",
):
    require(unit in installer, f"Missing host timer definition: {unit}")

backup = (DEPLOY / "backup-production.sh").read_text()
require("pg_dump -Fc" in backup and "SHA256SUMS" in backup,
        "Production backup must include compressed PostgreSQL dump and checksums.")
require("odoo-data.tar.gz" in backup,
        "Production backup must include compressed Odoo data/filestore.")

drill = (DEPLOY / "restore-drill.sh").read_text()
require("pg_restore" in drill and "DRILL_DB" in drill,
        "Restore drill must restore into a disposable database.")
require("--stop-after-init" in drill,
        "Restore drill must start Odoo against the restored database.")

require("docker network create" in drill and "docker volume create" in drill,
        "Restore drill must use isolated Docker network/volumes.")
require('PG_VOL="dtf-m10-pg-' in drill and 'ODOO_VOL="dtf-m10-odoo-' in drill,
        "Restore drill must allocate disposable PostgreSQL and Odoo volumes.")
require("odoo-data.tar.gz" in drill and "--strip-components=1" in drill,
        "Restore drill must restore the Odoo data/filestore archive.")
require("$ODOO_VOL:/var/lib/odoo" in drill,
        "Restore drill must mount the disposable Odoo data volume.")
require("docker compose" not in drill,
        "Restore drill must not use production Compose services or volumes.")

require('SCHEDULE_TZ="$TZ"' in installer,
        "Host timers must use the configured production timezone.")
require("OnCalendar=*-*-* 02:15:00 $SCHEDULE_TZ" in installer,
        "Daily backup timer must have an explicit timezone.")

print("M10 deployment static validation passed.")
