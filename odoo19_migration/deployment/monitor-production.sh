#!/usr/bin/env sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ENV="$ROOT/.env.production"
COMPOSE="$ROOT/docker-compose.production.yml"
test -f "$ENV" || { echo "Missing $ENV." >&2; exit 2; }

set -a
. "$ENV"
set +a

docker compose --env-file "$ENV" -f "$COMPOSE" ps

docker compose --env-file "$ENV" -f "$COMPOSE" exec -T db   pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null

curl -fsS --max-time 15 "https://$DTF_ODOO_DOMAIN/api/dtf/v1/health" |   grep -q '"ok"[[:space:]]*:[[:space:]]*true'

curl -fsS --max-time 15 "https://$DTF_ODOO_DOMAIN/odoo" >/dev/null

if [ -n "${DTF_FRONTEND_URL:-}" ]; then
  curl -fsS --max-time 15 "${DTF_FRONTEND_URL%/}/api/studio/products" |     grep -q '"source"[[:space:]]*:[[:space:]]*"odoo19"'
fi

echo "M10 production health check passed."
