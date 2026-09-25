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

if [ "$#" -gt 1 ]; then
  echo "Usage: $0 [backup-directory]" >&2
  exit 2
fi

if [ "$#" -eq 1 ]; then
  SRC="$1"
else
  SRC="$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -print 2>/dev/null | sort | tail -n 1)"
fi

test -n "${SRC:-}" || { echo "No production backup found." >&2; exit 2; }
test -d "$SRC" || { echo "Backup directory not found: $SRC" >&2; exit 2; }
test -f "$SRC/postgres.dump" || { echo "Missing postgres.dump" >&2; exit 2; }
test -f "$SRC/odoo-data.tar.gz" || { echo "Missing odoo-data.tar.gz" >&2; exit 2; }
test -f "$SRC/SHA256SUMS" || { echo "Missing SHA256SUMS" >&2; exit 2; }

(
  cd "$SRC"
  sha256sum -c SHA256SUMS
)
tar -tzf "$SRC/odoo-data.tar.gz" >/dev/null

DRILL_DB="dtf_restore_drill_$(date -u +%Y%m%d%H%M%S)_$$"

drop_drill_db() {
  docker compose --env-file "$ENV" -f "$COMPOSE" exec -T db     dropdb -U "$POSTGRES_USER" --if-exists "$DRILL_DB" >/dev/null 2>&1 || true
}
trap drop_drill_db EXIT INT TERM

drop_drill_db

docker compose --env-file "$ENV" -f "$COMPOSE" exec -T db   createdb -U "$POSTGRES_USER" -T template0 "$DRILL_DB"

docker compose --env-file "$ENV" -f "$COMPOSE" exec -T db   pg_restore -U "$POSTGRES_USER" -d "$DRILL_DB" --no-owner --no-privileges   < "$SRC/postgres.dump"

MODULE_ROWS="$(docker compose --env-file "$ENV" -f "$COMPOSE" exec -T db   psql -U "$POSTGRES_USER" -d "$DRILL_DB" -Atc   "select count(*) from ir_module_module where state = 'installed';")"

case "$MODULE_ROWS" in
  ""|*[!0-9]*) echo "Restore drill could not validate installed modules." >&2; exit 1 ;;
  0) echo "Restore drill restored no installed Odoo modules." >&2; exit 1 ;;
esac

docker compose --env-file "$ENV" -f "$COMPOSE" run --rm --no-deps odoo   odoo -d "$DRILL_DB"   --db_host=db --db_port=5432   --db_user="$POSTGRES_USER" --db_password="$POSTGRES_PASSWORD"   --addons-path=/usr/lib/python3/dist-packages/odoo/addons,/mnt/extra-addons   --without-demo=all --stop-after-init --no-http

drop_drill_db
trap - EXIT INT TERM

printf "Non-destructive restore drill passed for %s\n" "$SRC"
