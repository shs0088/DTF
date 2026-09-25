#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
CONFIG="$ROOT/odoo19_migration/deployment/wrangler.frontend.production.jsonc"
GENERATED_CONFIG="$ROOT/build/server/wrangler.json"

command -v npm >/dev/null 2>&1 || { echo "npm is required." >&2; exit 2; }
command -v npx >/dev/null 2>&1 || { echo "npx is required." >&2; exit 2; }

if ! npx wrangler secret list --config "$CONFIG" 2>/dev/null | grep -q '"name": "DTF_ODOO_ORIGIN"'; then
  cat >&2 <<'EOF'
DTF_ODOO_ORIGIN is not configured for the new Odoo-backed frontend Worker.

Set it first with:
  npx wrangler secret put DTF_ODOO_ORIGIN     --config odoo19_migration/deployment/wrangler.frontend.production.jsonc

Use the NEW HTTPS Odoo origin. Do not use or overwrite the protected V48 project.
EOF
  exit 2
fi

cd "$ROOT"
npm install
npm run build
node "$ROOT/scripts/build-manifest.mjs" "$CONFIG"
npx wrangler deploy --config "$GENERATED_CONFIG"
