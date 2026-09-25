#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ENV="$ROOT/.env.production"
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

test -n "$SRC" || { echo "No production backup found." >&2; exit 2; }
test -d "$SRC" || { echo "Backup directory not found: $SRC" >&2; exit 2; }
for file in postgres.dump odoo-data.tar.gz SHA256SUMS; do
  test -f "$SRC/$file" || { echo "Missing $SRC/$file" >&2; exit 2; }
done

(
  cd "$SRC"
  sha256sum -c SHA256SUMS
)
tar -tzf "$SRC/odoo-data.tar.gz" >/dev/null

# Fully isolated restore drill:
# - disposable Docker network
# - disposable PostgreSQL container + volume
# - disposable Odoo data volume
# - no production Compose database or Odoo volume is mounted or modified
SUFFIX="$(date -u +%Y%m%d%H%M%S)-$$"
NETWORK="dtf-m10-restore-$SUFFIX"
PG_VOL="dtf-m10-pg-$SUFFIX"
ODOO_VOL="dtf-m10-odoo-$SUFFIX"
DB_CONTAINER="dtf-m10-db-$SUFFIX"
DRILL_DB="dtf_restore_drill_$$"

cleanup() {
  docker rm -f "$DB_CONTAINER" >/dev/null 2>&1 || true
  docker volume rm "$PG_VOL" "$ODOO_VOL" >/dev/null 2>&1 || true
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

docker network create "$NETWORK" >/dev/null
docker volume create "$PG_VOL" >/dev/null
docker volume create "$ODOO_VOL" >/dev/null

docker run -d \
  --name "$DB_CONTAINER" \
  --network "$NETWORK" \
  -e POSTGRES_DB="$DRILL_DB" \
  -e POSTGRES_USER="$POSTGRES_USER" \
  -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  -v "$PG_VOL:/var/lib/postgresql/data" \
  "$POSTGRES_IMAGE" >/dev/null

ready=0
for i in $(seq 1 45); do
  if docker exec "$DB_CONTAINER" \
      pg_isready -U "$POSTGRES_USER" -d "$DRILL_DB" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done

[ "$ready" -eq 1 ] || {
  docker logs "$DB_CONTAINER" >&2 || true
  echo "Restore-drill PostgreSQL did not become ready." >&2
  exit 1
}

cat "$SRC/postgres.dump" | docker exec -i "$DB_CONTAINER" \
  pg_restore -U "$POSTGRES_USER" -d "$DRILL_DB" \
    --no-owner --no-privileges

docker run --rm \
  --user 0 \
  --entrypoint sh \
  -e SOURCE_DB="$POSTGRES_DB" \
  -e DRILL_DB="$DRILL_DB" \
  -v "$ODOO_VOL:/var/lib/odoo" \
  -v "$SRC:/backup:ro" \
  "$ODOO_IMAGE" -ec '
    tar -xzf /backup/odoo-data.tar.gz -C /var/lib/odoo --strip-components=1
    old="/var/lib/odoo/filestore/$SOURCE_DB"
    new="/var/lib/odoo/filestore/$DRILL_DB"
    test -d "$old"
    rm -rf "$new"
    mv "$old" "$new"
    chown -R odoo:odoo /var/lib/odoo
  '

docker run --rm \
  --network "$NETWORK" \
  -v "$ODOO_VOL:/var/lib/odoo" \
  -v "$ROOT/../odoo/custom_addons:/mnt/extra-addons:ro" \
  "$ODOO_IMAGE" \
  odoo \
    -d "$DRILL_DB" \
    --db_host="$DB_CONTAINER" \
    --db_port=5432 \
    --db_user="$POSTGRES_USER" \
    --db_password="$POSTGRES_PASSWORD" \
    --addons-path=/usr/lib/python3/dist-packages/odoo/addons,/mnt/extra-addons \
    --without-demo=all \
    --no-http \
    --stop-after-init

MODULE_ROWS="$(docker exec "$DB_CONTAINER" \
  psql -U "$POSTGRES_USER" -d "$DRILL_DB" -Atc \
  "select count(*) from ir_module_module where name like 'dtf_%' and state = 'installed';")"

case "$MODULE_ROWS" in
  ""|*[!0-9]*) echo "Restore drill could not validate installed DTF modules." >&2; exit 1 ;;
esac

[ "$MODULE_ROWS" -ge 13 ] || {
  echo "Restore drill found only $MODULE_ROWS installed DTF modules; expected at least 13." >&2
  exit 1
}

docker run --rm \
  --entrypoint sh \
  -e DRILL_DB="$DRILL_DB" \
  -v "$ODOO_VOL:/var/lib/odoo:ro" \
  "$ODOO_IMAGE" -ec '
    test -d "/var/lib/odoo/filestore/$DRILL_DB"
  '

printf "Fully isolated restore drill passed for %s (%s installed DTF modules).\n" \
  "$SRC" "$MODULE_ROWS"
