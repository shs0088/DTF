#!/usr/bin/env sh
set -eu
[ "$#" -eq 1 ] || { echo "Usage: $0 backups/<timestamp>" >&2; exit 2; }
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
test -f "$ROOT/.env" || { echo "Missing $ROOT/.env." >&2; exit 2; }
set -a
. "$ROOT/.env"
set +a
SRC="$1"
test -f "$SRC/postgres.dump" || { echo "Missing $SRC/postgres.dump" >&2; exit 2; }
test -d "$SRC/odoo-data" || { echo "Missing $SRC/odoo-data" >&2; exit 2; }

echo "WARNING: destructive restore. Run only on the intended isolated target." >&2
docker compose --env-file "$ROOT/.env" -f "$ROOT/docker-compose.yml" stop odoo
docker compose --env-file "$ROOT/.env" -f "$ROOT/docker-compose.yml" exec -T db dropdb -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB"
docker compose --env-file "$ROOT/.env" -f "$ROOT/docker-compose.yml" exec -T db createdb -U "$POSTGRES_USER" "$POSTGRES_DB"
docker compose --env-file "$ROOT/.env" -f "$ROOT/docker-compose.yml" exec -T db pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner < "$SRC/postgres.dump"
docker compose --env-file "$ROOT/.env" -f "$ROOT/docker-compose.yml" run --rm --no-deps --user 0 --entrypoint sh odoo -c "rm -rf /var/lib/odoo/* /var/lib/odoo/.[!.]* /var/lib/odoo/..?* 2>/dev/null || true"
docker compose --env-file "$ROOT/.env" -f "$ROOT/docker-compose.yml" cp "$SRC/odoo-data/." odoo:/var/lib/odoo/
docker compose --env-file "$ROOT/.env" -f "$ROOT/docker-compose.yml" run --rm --no-deps --user 0 --entrypoint sh odoo -c "chown -R odoo:odoo /var/lib/odoo"
docker compose --env-file "$ROOT/.env" -f "$ROOT/docker-compose.yml" start odoo
printf "Restore completed from %s\n" "$SRC"
