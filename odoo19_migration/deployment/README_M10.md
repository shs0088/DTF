# M10 Production Deployment Boundary

This directory contains the production deployment assets for the **new Odoo 19 environment**.

## Protected deployment

The existing external project/deployment named around `dtf-studio-v48-safe-frontend` is protected.

- Do not rename it.
- Do not reuse its Worker/project name.
- Do not overwrite its URL.
- Do not deploy M10 into that project.

The legacy root `wrangler.jsonc` is intentionally left unchanged for that reason.

## New preserved-frontend Worker

M9 browser QA proved the preserved React Router frontend against Odoo using a Cloudflare Worker runtime. M10 promotes that proven runtime with a separate production profile:

- Worker: `workers/odoo-frontend.ts`
- Config: `odoo19_migration/deployment/wrangler.frontend.production.jsonc`
- Worker name: `dtf-studio-odoo19-frontend`

The new Worker has **no ItemStore, Durable Object, R2, Printify connection, or legacy Admin business-authority binding**. Its backend authority is the Odoo compatibility API.

### Required binding

Configure the new HTTPS Odoo origin as a Worker secret before deployment:

```sh
npx wrangler secret put DTF_ODOO_ORIGIN \
  --config odoo19_migration/deployment/wrangler.frontend.production.jsonc
```

Then deploy only the new Worker:

```sh
sh odoo19_migration/deployment/deploy-frontend.sh
```

The deployment script refuses to continue when `DTF_ODOO_ORIGIN` is missing.

## Backend

PostgreSQL/Odoo/Nginx continue to run on the separate Ubuntu/Docker VPS.

On a new VPS/database, initialize the database with the native Odoo CLI and install all 13 DTF addons before TLS/public smoke testing:

```sh
cp odoo19_migration/deployment/.env.production.example odoo19_migration/deployment/.env.production
# Edit every CHANGE_ME value first.
sh odoo19_migration/deployment/initialize-production.sh
```

The initializer uses Docker Compose plus the native Odoo `-i` / `--stop-after-init` workflow and verifies all 13 DTF addons are installed. It does not create a parallel installer or business-data authority.

The public Odoo origin must use HTTPS before the frontend Worker is pointed at it.

M10 is not complete until initialization, domain/TLS, scheduled backups, restore drill, monitoring/logging, ARM64 runtime checks, and production smoke tests all pass.


## Backup, restore drill, monitoring, and renewal

After the production backend is online:

```sh
sh odoo19_migration/deployment/backup-production.sh
sh odoo19_migration/deployment/restore-drill.sh
sh odoo19_migration/deployment/monitor-production.sh
```

The production backup contains:

- PostgreSQL custom-format dump
- compressed Odoo data/filestore archive
- SHA-256 checksums

The restore drill is fully isolated and non-destructive: it creates temporary Docker network/PostgreSQL/Odoo volumes, restores the SQL dump and Odoo filestore into those disposable resources, starts Odoo 19 against the restored database, verifies the installed DTF modules and restored filestore, then removes all temporary resources. It never mounts or modifies the production database or production Odoo data volume.

To install host scheduling on the **new Ubuntu VPS**:

```sh
sudo sh odoo19_migration/deployment/install-host-timers.sh
```

Installed timers:

- production backup: daily
- non-destructive restore drill: weekly
- health monitor: every 5 minutes
- TLS renewal check: twice daily

Docker JSON logs are rotated by the production Compose configuration and service/timer output is retained in the systemd journal.

Host timers use the production `TZ` setting (default `Asia/Amman`) explicitly for calendar schedules.
