# Odoo Native Reconciliation — M1–M5

Reconciliation baseline: `d9994df03e9bbebb9514d9b1dbd76f0a7a8fb5f7`.

Correction-pass starting HEAD: `90ed07a52d367a58d6542c4adb4bd59e8f58e470`.

The former custom 30-minute checkout stock hold is cancelled/superseded. Odoo 19 Community remains authoritative for identity, catalog, website cart, sales, prices, taxes, stock, payment, delivery, publication, and customer order history. DTF addons retain only DTF-specific metadata, validation, immutable evidence, and integrations.

## Classification table

| AREA | CURRENT DTF IMPLEMENTATION | ODOO 19 NATIVE AUTHORITY | CLASSIFICATION | ACTION |
|---|---|---|---|---|
| M1 foundation | Portable deployment/validation scaffolding | Odoo Community + PostgreSQL + filestore + Nginx | ODOO NATIVE | Kept portable foundation; no parallel DB/storage authority |
| M2 identity/security | DTF profile/design/asset ownership extensions | res.users, res.partner, res.groups, ACLs, record rules, ir.attachment | DTF EXTENSION REQUIRED | Kept only DTF workflow/security extensions |
| M3 catalog | DTF product-type, printable-area and Printify metadata | product.template, product.product, product.public.category, native translations, public_categ_ids, is_published | DTF EXTENSION REQUIRED | Removed duplicate site-category/publication/bilingual product authority |
| M4 preflight | Versioned rules/results and protected historical evidence | Native attachments/products/security | DTF EXTENSION REQUIRED | Kept DTF-specific analyzer, master and publishing gates |
| M5 sales/order | DTF design/master/preflight/customer/product snapshots on native sale.order.line | sale.order, sale.order.line, native totals/states/order history | DTF EXTENSION REQUIRED | Kept only DTF linkage and immutable snapshot evidence |
| M5 cart/API | Thin DTF compatibility API | request.cart, website._create_cart(), sale.order._cart_add(), sale.order._cart_update_line_quantity(), website.sale_product_domain() | THIN ADAPTER | Removed duplicate cart/order pricing logic; routes use website context and JSON-RPC where applicable |
| M5 reservation | None | Native Odoo stock/sale flow | REMOVED DUPLICATE | Removed custom 30-minute reservation model, fields, ACLs, tests and lock/accounting logic |
| M5 production handoff | None in M5 | Deferred native MRP/production work | DEFERRED TO M6 | Removed premature dtf.production.handoff model, ACLs and tests |

## Removed objects/files

- `odoo19_migration/odoo/custom_addons/dtf_sale/models/reservation.py`
- `odoo19_migration/odoo/custom_addons/dtf_sale/security/ir.model.access.csv`
- `dtf.stock.reservation` and timed reservation/expiry/hold logic
- duplicate checkout/payment/delivery state fields previously added for the custom reservation flow
- duplicate `dtf.site.category` authority
- duplicate DTF product publication/bilingual catalog authority
- `odoo19_migration/odoo/custom_addons/dtf_production/models/production.py`
- `odoo19_migration/odoo/custom_addons/dtf_production/security/ir.model.access.csv`
- `odoo19_migration/odoo/custom_addons/dtf_production/tests/test_m5_production.py`
- premature `dtf.production.handoff`

## Kept DTF extensions

- Designer/profile/qualification workflow
- Design/assets backed by Odoo attachments
- Explicit Ready-to-Print Master and accepted-preflight gates
- Versioned analyzer evidence and protected historical asset behavior
- Printify mapping/import metadata
- DTF design/master linkage and immutable customer/product/preflight snapshots on native `sale.order.line`
- Thin headless API response compatibility envelope

## Native API alignment

- Product discovery uses `request.website.sale_product_domain()`.
- Product/category authority uses native `product.template`, `product.product`, `product.public.category`, translated fields, `public_categ_ids`, and `is_published`.
- Cart access uses `request.cart`; creation uses `request.website._create_cart()`.
- Cart line mutations use native `sale.order._cart_add()` and `sale.order._cart_update_line_quantity()`.
- Routes that depend on website state declare `website=True`.
- Cart mutations/checkout use `type="jsonrpc"`.
- Native computed sale prices, taxes and totals remain authoritative.

## Verified correction evidence

Code-verified HEAD: `be298dad8312120593065939aa3a3903559073fe`.

GitHub Actions run: `35975667331` — **SUCCESS**.

Verified in that run:

- M1 static validation: PASS
- Docker Compose validation: PASS
- ARM64 image manifest probe: PASS
- PostgreSQL startup: PASS
- all 13 DTF addons install: PASS
- M2 tests: PASS
- M3 native catalog + Printify tests: PASS
- M4 preflight/publishing/protected-asset tests: PASS
- M5 native sales + API reconciliation tests: PASS
- authenticated JSON-RPC cart/checkout runtime test: PASS
- website-aware public products endpoint test: PASS
- Odoo/Nginx `/web` runtime: PASS

## Deferred / not claimed

- Payment-provider operational configuration
- Delivery/store-pickup operational configuration
- Broader headless API security/concurrency matrix beyond current tests
- Production/MRP/operator implementation — M6 only
- Database migration procedure for any pre-existing removed reservation schema on a deployed database
- Deployment or merge

Odoo core modified: **NO**.  
M6 started: **NO**.  
Deployment: **NO**.  
Merge: **NO**.
