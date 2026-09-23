#!/usr/bin/env sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
test -f "$ROOT/.env" || { echo "Missing $ROOT/.env." >&2; exit 2; }
set -a
. "$ROOT/.env"
set +a
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$ROOT/backups/$STAMP"
mkdir -p "$OUT"

restart_odoo() {
  docker compose --env-file "$ROOT/.env" -f "$ROOT/docker-compose.yml" start odoo >/dev/null 2>&1 || true
}
trap restart_odoo EXIT INT TERM

docker compose --env-file "$ROOT/.env" -f "$ROOT/docker-compose.yml" stop odoo
docker compose --env-file "$ROOT/.env" -f "$ROOT/docker-compose.yml" exec -T db pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB" > "$OUT/postgres.dump"
docker compose --env-file "$ROOT/.env" -f "$ROOT/docker-compose.yml" cp odoo:/var/lib/odoo "$OUT/odoo-data"

restart_odoo
trap - EXIT INT TERM
printf "Backup written to %s\n" "$OUT"
