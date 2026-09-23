# Required Custom Odoo Addons

1. **dtf_core** — common configuration, shared business primitives, audit helpers.
2. **dtf_designer** — designer profiles, qualification, exactly-three submissions, authorization/review.
3. **dtf_design** — designs/assets, bilingual fields, Main Display Image, explicit Ready-to-Print Master, protected deletion.
4. **dtf_preflight** — analyzer, versioned rules, validation results and reasons.
5. **dtf_customizer** — printable areas, placements, customization metadata and order snapshots.
6. **dtf_sale** — cart/checkout bridge, design/master snapshots, order states/reservation logic.
7. **dtf_production** — printing jobs, MRP bridge, operator workflow and master retrieval.
8. **dtf_finance** — compensation defaults/overrides, immutable earning snapshots, ledger, withdrawals.
9. **dtf_printify** — secure admin-only Printify connector, catalog snapshot/import/mapping.
10. **dtf_notifications** — internal traceable notifications/messages and event hooks.
11. **dtf_admin** — DTF operational menus, dashboards, manual review, reports, settings, audit views.
12. **dtf_backend_theme** — Black + Electric Blue backend styling without modifying Odoo core.
13. **dtf_api** — versioned JSON compatibility API for the preserved frontend and future mobile apps.

Every addon must include manifest, Python models/services/controllers where needed, ACLs/record rules, views, tests, migrations where needed, and no committed secrets.
