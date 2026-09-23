# Architecture Decision — Preserve Frontend, Replace Backend

## Preferred approach
Use a headless/hybrid architecture.

**Keep our DTF Studio frontend 100% as the customer-facing presentation layer.** Do not rebuild Home, Products, Gallery, Print Your Dream, Designer pages, Cart or Checkout from scratch in Odoo unless a later targeted decision says otherwise.

Odoo 19 Community becomes the backend/ERP/source of truth. Custom Odoo modules expose the DTF business functions and a compatibility API.

## Why this is better than converting the public site to Odoo
- Preserves the visual work already approved.
- Keeps existing customer URLs and frontend flows stable.
- Avoids coupling the customer UI to QWeb/Owl and Odoo theme internals.
- Lets backend migration happen page/API-by-page/API without a visual rewrite.
- Makes future Android/iOS apps easier because they can use the same API contract.
- Still allows the Odoo backend/admin to be themed Black + Electric Blue.

## Same domain
Recommended Nginx routing:
- `/` -> preserved DTF frontend
- `/api/dtf/` -> Odoo custom controllers
- `/web` -> Odoo admin/backend
- `/websocket` -> Odoo realtime endpoint where needed

## Odoo-native responsibilities
Reuse native Odoo for contacts/customers, product templates/variants, categories, sales/orders, inventory/stock, invoicing, delivery structure, users/groups/security and MRP.

## Custom addons
- dtf_core
- dtf_designer
- dtf_design
- dtf_preflight
- dtf_customizer
- dtf_sale
- dtf_production
- dtf_finance
- dtf_printify
- dtf_notifications
- dtf_admin
- dtf_backend_theme
- dtf_api

Do not modify Odoo core and do not depend on a paid Odoo Online API plan. For self-hosted Community, use custom controllers inside our Odoo instance.
