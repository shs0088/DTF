# M5 Implementation Report — Native Sales / Cart / API Reconciliation

## Correction scope

Correction-pass starting HEAD: `90ed07a52d367a58d6542c4adb4bd59e8f58e470`.

This report supersedes the earlier custom 30-minute reservation and premature production-handoff implementation notes. Those custom mechanisms were removed because native Odoo 19 Community sales, website cart, stock, payment, delivery and order behavior are the authoritative foundation.

## Current M5 architecture

### Native Odoo authority

- `sale.order` and `sale.order.line`
- native website cart state via `request.cart`
- cart creation via `request.website._create_cart()`
- cart mutation via `sale.order._cart_add()`
- cart quantity/remove behavior via `sale.order._cart_update_line_quantity()`
- native product/publication/category fields
- native price, tax, subtotal and total computation
- native website product domain
- native customer/partner ownership and sale-order history

### DTF-specific extensions retained

Native `sale.order.line` keeps only the DTF evidence required for printing continuity:

- `dtf_design_id`
- `dtf_master_asset_id`
- `dtf_preflight_snapshot`
- `dtf_customer_snapshot`
- `dtf_product_snapshot`

Snapshot capture requires an explicit design/master relationship and a current accepted product-compatible preflight result.

### Removed from M5

- custom 30-minute reservation model and timed-hold logic
- custom reservation ACLs/tests
- duplicate checkout/payment/delivery state fields associated with that hold flow
- duplicate `dtf.site.category`
- duplicate product publication/bilingual catalog authority
- `dtf.production.handoff`
- M5 production-handoff ACL/test/model

Production/MRP/operator work remains deferred to M6.

## API reconciliation

- Product API uses `request.website.sale_product_domain()`.
- Native `product.public.category`, `public_categ_ids`, `is_published`, translated product names/descriptions and native variants are authoritative.
- Website-dependent routes declare `website=True`.
- Cart/checkout mutations use `type="jsonrpc"`.
- The adapter no longer uses `sale_get_order`.
- Internal pricing/tax totals are not client-authored.

## Tests added/corrected

`TestDTFM5NativeAPI` now verifies:

- native cart method availability
- real authenticated HTTP JSON-RPC add-to-cart and checkout calls
- website-aware public products endpoint
- native product/category/publication authority
- removal of duplicate custom catalog/reservation models
- native price/tax/total relationships
- customer order ownership filtering

Existing M5 sale tests continue to verify DTF master/preflight snapshot requirements.

## Final implementation evidence

Code-verified HEAD: `be298dad8312120593065939aa3a3903559073fe`.

GitHub Actions run: `35975667331` — **SUCCESS**.

- M1 static validation: PASS
- Docker Compose validation: PASS
- ARM64 manifest probe: PASS
- PostgreSQL startup: PASS
- all 13 DTF addon installation: PASS
- M2 tests: PASS
- M3 native catalog + Printify tests: PASS
- M4 tests: PASS
- M5 native sales + API reconciliation tests: PASS
- Odoo/Nginx `/web`: PASS

Failures corrected during reconciliation included stale imports/tests, duplicate catalog/publication assumptions, inactive-language translation handling, invalid route-metadata introspection, and missing Odoo website request context on custom product/cart/checkout routes.

## Boundary

This closes the **native-reconciliation correction pass** with runtime evidence. It does not claim that every future payment-provider, delivery/pickup, security/concurrency, deployment, or production/operator requirement is implemented.

Frontend files changed: **NO**.  
Old Worker/backend files changed: **NO**.  
Odoo core modified: **NO**.  
M6 started: **NO**.  
Deployment: **NO**.  
Merge: **NO**.
