# Frontend -> Odoo Compatibility Strategy

The existing DTF Studio frontend remains the visual contract. Public routes and URLs stay stable. Replace backend calls behind those routes, not the pages themselves.

## Versioned compatibility API
Build `dtf_api` under `/api/dtf/v1`.
Initial target surface:
- GET /api/dtf/v1/health
- POST /api/dtf/v1/auth/login
- POST /api/dtf/v1/auth/register
- POST /api/dtf/v1/auth/logout
- GET /api/dtf/v1/navigation
- GET /api/dtf/v1/categories
- GET /api/dtf/v1/products
- GET /api/dtf/v1/products/<id>
- GET /api/dtf/v1/designs
- GET /api/dtf/v1/designs/<id>
- POST /api/dtf/v1/designer/designs
- POST /api/dtf/v1/designer/designs/<id>/assets
- DELETE /api/dtf/v1/designer/assets/<id>
- POST /api/dtf/v1/designer/designs/<id>/master
- POST /api/dtf/v1/designer/designs/<id>/publish
- POST /api/dtf/v1/preflight/<asset_id>
- GET/POST /api/dtf/v1/cart
- POST /api/dtf/v1/checkout
- GET /api/dtf/v1/orders
- GET /api/dtf/v1/orders/<id>

## Cutover method
1. Freeze current route/API inventory.
2. Map old endpoint -> Odoo controller -> Odoo model(s).
3. Add a small frontend adapter so page components do not get redesigned.
4. Migrate data entity-by-entity.
5. Run API contract and business-flow tests.
6. Cut over to Odoo only after parity passes.
7. Remove old backend only after data reconciliation and rollback evidence exist.

## Same link/domain
Use one domain. Route the preserved frontend at `/`, DTF API at `/api/dtf/`, and protected Odoo admin at `/web`. This keeps customer links unchanged while Odoo runs behind the scenes.
