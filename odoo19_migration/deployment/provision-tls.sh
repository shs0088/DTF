#!/usr/bin/env sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ENV="$ROOT/.env.production"
COMPOSE="$ROOT/docker-compose.production.yml"

test -f "$ENV" || {
  echo "Missing $ENV. Copy .env.production.example and set NEW production values." >&2
  exit 2
}

set -a
. "$ENV"
set +a

case "${DTF_ODOO_DOMAIN:-}" in
  ""|CHANGE_ME*) echo "Set DTF_ODOO_DOMAIN to the NEW Odoo origin domain." >&2; exit 2 ;;
esac
case "${DTF_TLS_EMAIL:-}" in
  ""|CHANGE_ME*) echo "Set DTF_TLS_EMAIL." >&2; exit 2 ;;
esac

case "$DTF_ODOO_DOMAIN" in
  *dtf-studio-v48-safe-frontend*)
    echo "Refusing to use the protected V48 hostname." >&2
    exit 2
    ;;
esac

docker compose --env-file "$ENV" -f "$COMPOSE" up -d db odoo

for i in $(seq 1 40); do
  if docker compose --env-file "$ENV" -f "$COMPOSE" exec -T db       pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

docker compose --env-file "$ENV" -f "$COMPOSE" stop nginx >/dev/null 2>&1 || true

docker compose --env-file "$ENV" -f "$COMPOSE" --profile tls-bootstrap run   --rm --service-ports certbot certonly   --standalone   --non-interactive   --agree-tos   --no-eff-email   --email "$DTF_TLS_EMAIL"   -d "$DTF_ODOO_DOMAIN"

docker compose --env-file "$ENV" -f "$COMPOSE" up -d nginx

for i in $(seq 1 40); do
  if curl -fsS --max-time 10 "https://$DTF_ODOO_DOMAIN/api/dtf/v1/health" |       grep -q '"ok"[[:space:]]*:[[:space:]]*true'; then
    echo "TLS and Odoo API health verified for https://$DTF_ODOO_DOMAIN"
    exit 0
  fi
  sleep 3
done

docker compose --env-file "$ENV" -f "$COMPOSE" logs odoo nginx
exit 1
