# DTF Studio Odoo 19 — Portable M1 Deployment Foundation

Target environment: Ubuntu 24.04 on ARM64/aarch64 or AMD64. Oracle OCI Ampere A1 is a target, but this package is not Oracle-specific.

## Safety

M1 is a foundation only. It does not authorize production deployment or frontend cutover. The preserved DTF Studio customer frontend remains unchanged.

PostgreSQL has no host port mapping. Nginx is the only published service in this Compose file.

## First start

1. Install Docker Engine and the Docker Compose plugin.
2. Copy `.env.example` to `.env`.
3. Replace all `CHANGE_ME` values with strong secrets.
4. Run `sh ./start.sh`.
5. Run `sh ./healthcheck.sh`.
6. Open `/web` for the Odoo backend when a runtime environment is intentionally started.

The public root `/` deliberately returns 503 in M1. This prevents the migration foundation from accidentally replacing the approved DTF Studio storefront before the cutover milestone.

## Operations

- Start: `sh ./start.sh`
- Stop: `sh ./stop.sh`
- Update images: `sh ./update.sh`
- Health check: `sh ./healthcheck.sh`
- Backup: `sh ./backup.sh`
- Restore: `sh ./restore.sh backups/<timestamp>`

## Persistence

- PostgreSQL: Docker volume `postgres_data`.
- Odoo data and filestore: Docker volume `odoo_data`.
- Custom addons: repository directory mounted read-only at `/mnt/extra-addons`.

## Backup and restore

The backup script temporarily stops Odoo so the database dump and Odoo data copy represent one consistent point in time, then restarts Odoo. The restore script is destructive and should only be run against the intended isolated target after a separate backup has been verified.

Runtime backup/restore acceptance remains pending until exercised on an actual Odoo/PostgreSQL host.
