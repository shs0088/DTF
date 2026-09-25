#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ENV="$ROOT/.env.production"
COMPOSE="$ROOT/docker-compose.production.yml"
BACKUP_ROOT="$ROOT/backups/production"

test -f "$ENV" || { echo "Missing $ENV." >&2; exit 2; }
set -a
. "$ENV"
set +a

RETENTION="${BACKUP_RETENTION_DAYS:-14}"
case "$RETENTION" in
  *[!0-9]*|"") echo "BACKUP_RETENTION_DAYS must be a positive integer." >&2; exit 2 ;;
esac

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_ROOT/$STAMP"
mkdir -p "$OUT/odoo-data"

restart_odoo() {
  docker compose --env-file "$ENV" -f "$COMPOSE" start odoo >/dev/null 2>&1 || true
}
trap restart_odoo EXIT INT TERM

echo "Stopping Odoo briefly for a consistent database + filestore backup."
docker compose --env-file "$ENV" -f "$COMPOSE" stop odoo

docker compose --env-file "$ENV" -f "$COMPOSE" exec -T db   pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB" > "$OUT/postgres.dump"

docker compose --env-file "$ENV" -f "$COMPOSE" cp   odoo:/var/lib/odoo/. "$OUT/odoo-data"

restart_odoo
trap - EXIT INT TERM

tar -C "$OUT" -czf "$OUT/odoo-data.tar.gz" odoo-data
rm -rf "$OUT/odoo-data"

(
  cd "$OUT"
  sha256sum postgres.dump odoo-data.tar.gz > SHA256SUMS
)

find "$BACKUP_ROOT"   -mindepth 1 -maxdepth 1 -type d   -mtime "+$RETENTION"   -exec rm -rf {} +

printf "Production backup written to %s\n" "$OUT"
