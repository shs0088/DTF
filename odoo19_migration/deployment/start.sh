#!/usr/bin/env sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
test -f "$ROOT/.env" || { echo "Missing $ROOT/.env. Copy .env.example and set secrets first." >&2; exit 2; }
docker compose --env-file "$ROOT/.env" -f "$ROOT/docker-compose.yml" up -d
docker compose --env-file "$ROOT/.env" -f "$ROOT/docker-compose.yml" ps
