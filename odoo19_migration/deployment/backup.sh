#!/usr/bin/env sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
. "$ROOT/.env"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$ROOT/backups/$STAMP"
mkdir -p "$OUT"
docker compose -f "$ROOT/docker-compose.yml" exec -T db pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB" > "$OUT/postgres.dump"
