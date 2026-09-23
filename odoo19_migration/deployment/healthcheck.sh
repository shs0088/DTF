#!/usr/bin/env sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
test -f "$ROOT/.env" || { echo "Missing $ROOT/.env." >&2; exit 2; }
set -a
. "$ROOT/.env"
set +a
docker compose --env-file "$ROOT/.env" -f "$ROOT/docker-compose.yml" ps
docker compose --env-file "$ROOT/.env" -f "$ROOT/docker-compose.yml" exec -T db pg_isready -U "${POSTGRES_USER:-odoo}" -d "${POSTGRES_DB:-odoo}"
curl -fsS --max-time 15 http://127.0.0.1/web >/dev/null
echo "M1 service health check passed for PostgreSQL and Odoo HTTP."
