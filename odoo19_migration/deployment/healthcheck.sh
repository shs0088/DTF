#!/usr/bin/env sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
docker compose -f "$ROOT/docker-compose.yml" ps
docker compose -f "$ROOT/docker-compose.yml" exec -T db pg_isready
