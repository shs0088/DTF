# M10 Live Go-Live Runbook

This runbook is only for the **new Odoo 19 production environment**.

## Protected V48 boundary

The existing external project/deployment named around `dtf-studio-v48-safe-frontend` is protected.

- Do not rename it.
- Do not reuse its Worker/project name.
- Do not reuse its URL as the Odoo origin or the new frontend URL.
- Do not deploy this M10 package into that project.
- Do not change the legacy root `wrangler.jsonc` during M10.

M10 uses:
- a separate Ubuntu ARM64/aarch64 VPS,
- a new Odoo HTTPS domain,
- a separate Worker named `dtf-studio-odoo19-frontend`.

## Preconditions

Before running anything on the new host:

1. The repository is checked out at the approved M10 commit.
2. The host is Ubuntu on ARM64/aarch64.
3. Docker Engine and Docker Compose are installed.
4. The **new** Odoo domain resolves to the new VPS.
5. Cloudflare/Wrangler authentication is available for the **new** Worker only.
6. No command below points at the protected V48 project or hostname.

## 1. Create the production environment file

```sh
cp odoo19_migration/deployment/.env.production.example \
  odoo19_migration/deployment/.env.production
chmod 600 odoo19_migration/deployment/.env.production
```

Populate every `CHANGE_ME` value with production secrets and the **new** domain. Never commit `.env.production`.

## 2. Run host and V48 safety preflight

```sh
sh odoo19_migration/deployment/preflight-production-host.sh
```

Do not proceed unless this passes.

## 3. Initialize PostgreSQL + Odoo and all 13 DTF addons

```sh
sh odoo19_migration/deployment/initialize-production.sh
```

Expected result: PostgreSQL healthy, Odoo started against the new production database, and all 13 DTF addons installed and verified.

## 4. Issue TLS on the new Odoo domain

```sh
sh odoo19_migration/deployment/provision-tls.sh
```

Expected result: valid Let's Encrypt certificate, HTTPS API health passes, and the external database manager remains blocked.

## 5. Configure and deploy the isolated new frontend Worker

```sh
npx wrangler secret put DTF_ODOO_ORIGIN \
  --config odoo19_migration/deployment/wrangler.frontend.production.jsonc

sh odoo19_migration/deployment/deploy-frontend.sh
```

Set `DTF_ODOO_ORIGIN` to the **new** HTTPS Odoo origin only. After deployment, set `DTF_FRONTEND_URL` in `.env.production` to the new frontend URL. Never use the protected V48 URL.

## 6. Run production health and smoke tests

```sh
sh odoo19_migration/deployment/monitor-production.sh
sh odoo19_migration/deployment/smoke-production.sh
```

The smoke gate verifies Odoo health, Products, Categories, the blocked database manager, WebSocket routing, and the new frontend routes when configured.

## 7. Create a production backup and run the isolated restore drill

```sh
sh odoo19_migration/deployment/backup-production.sh
sh odoo19_migration/deployment/restore-drill.sh
```

The restore drill must use disposable Docker resources only and must not alter production PostgreSQL or Odoo volumes.

## 8. Install host timers

```sh
sudo sh odoo19_migration/deployment/install-host-timers.sh
```

Verify the timers for daily backup, weekly isolated restore drill, five-minute health monitoring, and twice-daily TLS renewal.

## 9. Collect redacted M10 runtime evidence

```sh
sh odoo19_migration/deployment/collect-production-evidence.sh
```

The collector writes only non-secret runtime evidence under:

```text
odoo19_migration/deployment/evidence/production/<UTC timestamp>/
```

It must never copy or print `.env.production`, passwords, tokens, or private keys.

## 10. M10 close/no-close rule

Close M10 only when all of the following are proven on the **new** environment:

- Ubuntu ARM64 host preflight PASS,
- all 13 DTF addons installed,
- new domain/TLS PASS,
- isolated new frontend Worker deployed,
- backup PASS,
- isolated restore drill PASS,
- monitoring/log rotation/timers PASS,
- production smoke PASS,
- runtime evidence collected,
- protected V48 deployment remains untouched.

Do not merge to `main` merely because M10 passes. M11 acceptance remains a separate milestone.
