#!/usr/bin/env sh
set -eu
[ "$#" -eq 1 ] || exit 2
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
. "$ROOT/.env"
docker compose -f "$ROOT/docker-compose.yml" exec -T db pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < "$1/postgres.dump"
