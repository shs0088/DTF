# DTF Studio Odoo 19 — Addon Install Order

M1 creates the installable module foundation only. DTF business models and workflows are implemented in later milestones.

Recommended dependency order:

1. `dtf_core`
2. `dtf_designer`
3. `dtf_design`
4. `dtf_preflight`
5. `dtf_customizer`
6. `dtf_sale`
7. `dtf_production`
8. `dtf_finance`
9. `dtf_printify`
10. `dtf_notifications`
11. `dtf_admin`
12. `dtf_backend_theme`
13. `dtf_api`

All DTF addons live under `odoo19_migration/odoo/custom_addons`. No Odoo core source is vendored or modified.
