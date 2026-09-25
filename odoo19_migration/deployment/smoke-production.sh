#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ENV="$ROOT/.env.production"

test -f "$ENV" || { echo "Missing $ENV." >&2; exit 2; }
set -a
. "$ENV"
set +a

case "$DTF_ODOO_DOMAIN" in
  ""|CHANGE_ME*) echo "Set DTF_ODOO_DOMAIN." >&2; exit 2 ;;
  *dtf-studio-v48-safe-frontend*)
    echo "Refusing to smoke-test the protected V48 hostname as the new Odoo origin." >&2
    exit 2
    ;;
esac

command -v curl >/dev/null 2>&1 || { echo "curl is required." >&2; exit 2; }
command -v openssl >/dev/null 2>&1 || { echo "openssl is required." >&2; exit 2; }

"$ROOT/monitor-production.sh"

openssl s_client \
  -connect "$DTF_ODOO_DOMAIN:443" \
  -servername "$DTF_ODOO_DOMAIN" \
  </dev/null 2>/dev/null |
  openssl x509 -noout -checkend 604800 >/dev/null

curl --tlsv1.2 -fsS --max-time 20 \
  "https://$DTF_ODOO_DOMAIN/api/dtf/v1/health" |
  grep -q '"ok"[[:space:]]*:[[:space:]]*true'

curl -fsS --max-time 30 \
  "https://$DTF_ODOO_DOMAIN/api/dtf/v1/products" |
  grep -q '"items"[[:space:]]*:'

curl -fsS --max-time 30 \
  "https://$DTF_ODOO_DOMAIN/api/dtf/v1/categories" |
  grep -q '"items"[[:space:]]*:'

DB_MANAGER_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 \
  "https://$DTF_ODOO_DOMAIN/web/database/selector")"
[ "$DB_MANAGER_STATUS" = "404" ] || {
  echo "External Odoo database manager is not blocked (HTTP $DB_MANAGER_STATUS)." >&2
  exit 1
}

WS_STATUS="$(curl -sS --http1.1 -o /dev/null -w '%{http_code}' --max-time 8 \
  -H 'Connection: Upgrade' \
  -H 'Upgrade: websocket' \
  -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: U29ja2V0VGVzdEtleTEyMw==' \
  "https://$DTF_ODOO_DOMAIN/websocket" || true)"
case "$WS_STATUS" in
  101|400|426) ;;
  *)
    echo "Unexpected WebSocket proxy response: HTTP $WS_STATUS" >&2
    exit 1
    ;;
esac

if [ -n "$DTF_FRONTEND_URL" ]; then
  FRONTEND="$(printf '%s' "$DTF_FRONTEND_URL" | sed 's:/*$::')"
  case "$FRONTEND" in
    https://*) ;;
    *) echo "DTF_FRONTEND_URL must use HTTPS." >&2; exit 2 ;;
  esac
  case "$FRONTEND" in
    *dtf-studio-v48-safe-frontend*)
      echo "Refusing to use the protected V48 deployment as the M10 frontend." >&2
      exit 2
      ;;
  esac

  curl -fsS --max-time 30 "$FRONTEND/api/studio/products" |
    grep -q '"source"[[:space:]]*:[[:space:]]*"odoo19"'
  curl -fsS --max-time 30 "$FRONTEND/" >/dev/null
  curl -fsS --max-time 30 "$FRONTEND/gallery" >/dev/null
  curl -fsS --max-time 30 "$FRONTEND/cart" >/dev/null
  curl -fsS --max-time 30 "$FRONTEND/login" >/dev/null
fi

echo "M10 production smoke tests passed."
