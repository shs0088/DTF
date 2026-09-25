# M10 Production Deployment Boundary

This directory contains the production deployment assets for the **new Odoo 19 environment**.

## Protected deployment

The existing external project/deployment named around `dtf-studio-v48-safe-frontend` is protected.

- Do not rename it.
- Do not reuse its Worker/project name.
- Do not overwrite its URL.
- Do not deploy M10 into that project.

The legacy root `wrangler.jsonc` is intentionally left unchanged for that reason.

## New preserved-frontend Worker

M9 browser QA proved the preserved React Router frontend against Odoo using a Cloudflare Worker runtime. M10 promotes that proven runtime with a separate production profile:

- Worker: `workers/odoo-frontend.ts`
- Config: `odoo19_migration/deployment/wrangler.frontend.production.jsonc`
- Worker name: `dtf-studio-odoo19-frontend`

The new Worker has **no ItemStore, Durable Object, R2, Printify connection, or legacy Admin business-authority binding**. Its backend authority is the Odoo compatibility API.

### Required binding

Configure the new HTTPS Odoo origin as a Worker secret before deployment:

```sh
npx wrangler secret put DTF_ODOO_ORIGIN \
  --config odoo19_migration/deployment/wrangler.frontend.production.jsonc
```

Then deploy only the new Worker:

```sh
sh odoo19_migration/deployment/deploy-frontend.sh
```

The deployment script refuses to continue when `DTF_ODOO_ORIGIN` is missing.

## Backend

PostgreSQL/Odoo/Nginx continue to run on the separate Ubuntu/Docker VPS. The public Odoo origin must use HTTPS before the frontend Worker is pointed at it.

M10 is not complete until domain/TLS, scheduled backups, restore drill, monitoring/logging, ARM64 runtime checks, and production smoke tests all pass.
