#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ENV="$ROOT/.env.production"
COMPOSE="$ROOT/docker-compose.production.yml"
MODULES='dtf_core,dtf_designer,dtf_design,dtf_preflight,dtf_customizer,dtf_sale,dtf_production,dtf_finance,dtf_printify,dtf_notifications,dtf_admin,dtf_backend_theme,dtf_api'

test -f "$ENV" || {
  echo "Missing $ENV. Copy .env.production.example and set the NEW production values." >&2
  exit 2
}

set -a
. "$ENV"
set +a

docker compose --env-file "$ENV" -f "$COMPOSE" up -d db

ready=0
for i in $(seq 1 45); do
  if docker compose --env-file "$ENV" -f "$COMPOSE" exec -T db \
      pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done

[ "$ready" -eq 1 ] || {
  docker compose --env-file "$ENV" -f "$COMPOSE" logs db >&2 || true
  echo "Production PostgreSQL did not become ready." >&2
  exit 1
}

docker compose --env-file "$ENV" -f "$COMPOSE" run --rm --no-deps odoo \
  odoo \
    -d "$POSTGRES_DB" \
    --db_host=db \
    --db_port=5432 \
    --db_user="$POSTGRES_USER" \
    --db_password="$POSTGRES_PASSWORD" \
    --addons-path=/usr/lib/python3/dist-packages/odoo/addons,/mnt/extra-addons \
    --without-demo=all \
    --stop-after-init \
    -i "$MODULES"

INSTALLED="$(docker compose --env-file "$ENV" -f "$COMPOSE" exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc \
  "select count(*) from ir_module_module where name in (
    'dtf_core','dtf_designer','dtf_design','dtf_preflight','dtf_customizer',
    'dtf_sale','dtf_production','dtf_finance','dtf_printify',
    'dtf_notifications','dtf_admin','dtf_backend_theme','dtf_api'
  ) and state = 'installed';")"

[ "$INSTALLED" = "13" ] || {
  echo "Expected 13 installed DTF addons, found $INSTALLED." >&2
  exit 1
}

docker compose --env-file "$ENV" -f "$COMPOSE" up -d odoo

echo "Production Odoo database initialized and all 13 DTF addons verified."
