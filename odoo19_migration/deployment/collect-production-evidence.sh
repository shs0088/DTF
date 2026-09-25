#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$ROOT/../.." && pwd)"
ENV="$ROOT/.env.production"
COMPOSE="$ROOT/docker-compose.production.yml"
EVIDENCE_ROOT="$ROOT/evidence/production"

test -f "$ENV" || {
  echo "Missing $ENV." >&2
  exit 2
}

set -a
. "$ENV"
set +a

case "${DTF_ODOO_DOMAIN:-}" in
  ""|CHANGE_ME*) echo "Set the NEW DTF_ODOO_DOMAIN first." >&2; exit 2 ;;
  *dtf-studio-v48-safe-frontend*)
    echo "Refusing to collect M10 evidence against the protected V48 hostname." >&2
    exit 2
    ;;
esac

if [ -n "${DTF_FRONTEND_URL:-}" ]; then
  case "$DTF_FRONTEND_URL" in
    *dtf-studio-v48-safe-frontend*)
      echo "Refusing to use the protected V48 deployment as the M10 frontend." >&2
      exit 2
      ;;
  esac
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$EVIDENCE_ROOT/$STAMP"
mkdir -p "$OUT"
chmod 700 "$EVIDENCE_ROOT" "$OUT" 2>/dev/null || true

{
  echo "DTF Studio M10 runtime evidence"
  echo "UTC timestamp: $STAMP"
  echo "Odoo domain: $DTF_ODOO_DOMAIN"
  echo "Frontend URL: ${DTF_FRONTEND_URL:-not configured}"
  echo "Architecture: $(uname -m)"
  if [ -r /etc/os-release ]; then
    . /etc/os-release
    echo "OS: ${ID:-unknown} ${VERSION_ID:-unknown}"
  fi
  echo "Docker: $(docker --version)"
  echo "Compose: $(docker compose version)"
  if command -v git >/dev/null 2>&1 && git -C "$REPO_ROOT" rev-parse HEAD >/dev/null 2>&1; then
    echo "Git HEAD: $(git -C "$REPO_ROOT" rev-parse HEAD)"
  else
    echo "Git HEAD: unavailable"
  fi
} > "$OUT/summary.txt"

docker compose --env-file "$ENV" -f "$COMPOSE" ps > "$OUT/compose-ps.txt"

docker compose --env-file "$ENV" -f "$COMPOSE" exec -T db   psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc   "select name || ':' || state from ir_module_module where name like 'dtf_%' order by name;"   > "$OUT/dtf-modules.txt"

curl -fsS --max-time 20   "https://$DTF_ODOO_DOMAIN/api/dtf/v1/health"   > "$OUT/odoo-health.json"

curl -sS -o /dev/null -w '%{http_code}\n' --max-time 15   "https://$DTF_ODOO_DOMAIN/web/database/selector"   > "$OUT/database-manager-status.txt"

openssl s_client   -connect "$DTF_ODOO_DOMAIN:443"   -servername "$DTF_ODOO_DOMAIN"   </dev/null 2>/dev/null |
  openssl x509 -noout -subject -issuer -dates   > "$OUT/tls-certificate.txt"

for timer in   dtf-studio-backup.timer   dtf-studio-restore-drill.timer   dtf-studio-monitor.timer   dtf-studio-tls-renew.timer
do
  {
    printf '%s enabled=' "$timer"
    systemctl is-enabled "$timer" 2>/dev/null || true
    printf '%s active=' "$timer"
    systemctl is-active "$timer" 2>/dev/null || true
  } >> "$OUT/timers.txt"
done

systemctl list-timers   dtf-studio-backup.timer   dtf-studio-restore-drill.timer   dtf-studio-monitor.timer   dtf-studio-tls-renew.timer   --no-pager > "$OUT/timer-schedule.txt" 2>&1 || true

LATEST_BACKUP="$(find "$ROOT/backups/production" -mindepth 1 -maxdepth 1 -type d -print 2>/dev/null | sort | tail -n 1)"
if [ -n "$LATEST_BACKUP" ] && [ -f "$LATEST_BACKUP/SHA256SUMS" ]; then
  (
    cd "$LATEST_BACKUP"
    sha256sum -c SHA256SUMS
  ) > "$OUT/latest-backup-checksums.txt"
  printf '%s\n' "$LATEST_BACKUP" > "$OUT/latest-backup-path.txt"
else
  echo "No production backup with SHA256SUMS found." > "$OUT/latest-backup-checksums.txt"
fi

"$ROOT/smoke-production.sh" > "$OUT/smoke-production.txt" 2>&1

# Never copy or print the production environment file, credentials, tokens,
# TLS private keys, or other secret material into the evidence directory.
find "$OUT" -maxdepth 1 -type f -printf '%f\n' | sort > "$OUT/FILES.txt"

printf "Redacted M10 runtime evidence written to %s\n" "$OUT"
