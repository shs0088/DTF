# M1 Validation Contract

The dedicated GitHub workflow validates the portable Odoo migration foundation without production secrets.

Static/structure checks include:

- Python syntax.
- Odoo manifest parsing.
- Expected 13 DTF addon directories.
- Local `dtf_*` dependency existence.
- XML well-formedness for XML added to the migration package.
- Forbidden committed secret/private-key patterns.
- No committed populated `.env`.
- PostgreSQL port 5432 is not published to the host.
- The migration Odoo tree contains only `custom_addons`; Odoo core is not vendored or modified.
- Docker Compose syntax via `docker compose config`.
- Container-image manifest checks for `linux/arm64` for Odoo, PostgreSQL, and Nginx.

Runtime status is separate. Odoo/PostgreSQL runtime may only be marked PASS after containers actually start and module discovery/installability is exercised in a compatible environment. ARM64 image-manifest support is not the same as a successful ARM64 runtime test.
