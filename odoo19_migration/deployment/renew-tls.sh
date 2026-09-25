#!/usr/bin/env sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ENV="$ROOT/.env.production"
COMPOSE="$ROOT/docker-compose.production.yml"
test -f "$ENV" || { echo "Missing $ENV." >&2; exit 2; }

docker compose --env-file "$ENV" -f "$COMPOSE" --profile tls-bootstrap run --rm certbot   renew --webroot -w /var/www/certbot --quiet

docker compose --env-file "$ENV" -f "$COMPOSE" exec -T nginx nginx -s reload
echo "TLS renewal check completed."
