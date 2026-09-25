#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ENV="$ROOT/.env.production"

test -f "$ENV" || {
  echo "Missing $ENV. Copy .env.production.example and set NEW production values." >&2
  exit 2
}

set -a
. "$ENV"
set +a

for command_name in docker curl openssl systemctl getent; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "Missing required host command: $command_name" >&2
    exit 2
  }
done

ARCH="$(uname -m)"
case "$ARCH" in
  aarch64|arm64) ;;
  *)
    echo "M10 target must be ARM64/aarch64; found $ARCH." >&2
    exit 2
    ;;
esac

if [ -r /etc/os-release ]; then
  . /etc/os-release
  case "$ID" in
    ubuntu) ;;
    *)
      echo "M10 production host must be Ubuntu; found $ID." >&2
      exit 2
      ;;
  esac
fi

docker info >/dev/null
docker compose version >/dev/null

case "$POSTGRES_PASSWORD" in
  ""|CHANGE_ME*) echo "Set a production PostgreSQL password." >&2; exit 2 ;;
esac
case "$ODOO_ADMIN_PASSWORD" in
  ""|CHANGE_ME*) echo "Set a production Odoo master password." >&2; exit 2 ;;
esac
case "$DTF_ODOO_DOMAIN" in
  ""|CHANGE_ME*) echo "Set the NEW Odoo backend domain." >&2; exit 2 ;;
  *dtf-studio-v48-safe-frontend*)
    echo "Refusing to use the protected V48 hostname." >&2
    exit 2
    ;;
esac
case "$DTF_TLS_EMAIL" in
  ""|CHANGE_ME*) echo "Set DTF_TLS_EMAIL." >&2; exit 2 ;;
esac

getent ahosts "$DTF_ODOO_DOMAIN" >/dev/null 2>&1 || {
  echo "The NEW Odoo domain does not resolve yet: $DTF_ODOO_DOMAIN" >&2
  exit 2
}

if [ -n "$DTF_FRONTEND_URL" ]; then
  case "$DTF_FRONTEND_URL" in
    https://*) ;;
    *) echo "DTF_FRONTEND_URL must use HTTPS." >&2; exit 2 ;;
  esac
  case "$DTF_FRONTEND_URL" in
    *dtf-studio-v48-safe-frontend*)
      echo "Refusing to use the protected V48 deployment as the M10 frontend." >&2
      exit 2
      ;;
  esac
fi

echo "M10 production host preflight passed for $ARCH / $DTF_ODOO_DOMAIN."
