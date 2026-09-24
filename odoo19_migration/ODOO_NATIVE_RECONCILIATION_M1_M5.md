# Odoo Native Reconciliation — M1–M5

Starting HEAD: d9994df03e9bbebb9514d9b1dbd76f0a7a8fb5f7.

The former custom 30-minute checkout stock hold is cancelled/superseded. Odoo Community native behavior remains authoritative for identity, catalog, sales, cart, prices, taxes, stock, payment, delivery, and order history. DTF addons retain only DTF-specific metadata, validation, historical evidence, and integrations.

## Classification table

| AREA | CURRENT CUSTOM IMPLEMENTATION | ODOO 19 NATIVE EQUIVALENT | CLASSIFICATION | ACTION TAKEN | FILES REMOVED | FILES KEPT | DTF-SPECIFIC REASON | TEST EVIDENCE |
|---|---|---|---|---|---|---|---|---|
| M1 foundation | Odoo/PostgreSQL/Nginx/addon validation | Odoo Community, PostgreSQL, filestore, addon registry | ODOO NATIVE | Kept foundation; no parallel database/storage/order authority | None | Deployment and validation scaffolding | Portability | Existing M1 workflow |
| M2 identity/security | Partner flags, native groups, ACLs, record rules, DTF profiles/designs/assets | res.users, res.partner, res.groups, ACLs, record rules, ir.attachment | DTF EXTENSION REQUIRED | Kept Odoo identity/security as authority | None | dtf_core, dtf_designer, dtf_design security | Qualification, ownership, explicit master, protected evidence | M2/M4 workflow tests |
| M3 catalog | product.template/product.product inheritance, native public categories, printable areas, Printify mapping | Native products, variants, attributes, pricelists, images, public categories | DTF EXTENSION plus REVIEW | Kept only DTF metadata; no parallel product or variant model | None | site_catalog.py and Printify mapping | Product type, printable areas, eligibility, Printify metadata | M3 workflow tests |
| M4 preflight | Versioned rules, analyzer evidence, preflight results, publishing gates | Native attachments, products, users/security | DTF EXTENSION REQUIRED | Kept DTF-specific preflight and publication requirements | None | dtf_preflight and dtf_design | DPI, printable area, compatibility, explicit master, historical evidence | M4 workflow tests |
| M5 sales/order | DTF fields on native sale.order.line, snapshots, production handoff | sale.order, sale.order.line, native confirmation and order history | DTF EXTENSION REQUIRED | Retained DTF linkage/snapshots and native sale-state handoff gate | None | dtf_sale sale_order.py and dtf_production production.py | Immutable DTF evidence and print-master linkage | M5 tests |
| M5 cart/API | Native request.cart/request.website._create_cart, _cart_add, _cart_update_line_quantity, computed totals | Odoo 19 request.cart, website._create_cart, _cart_add, _cart_update_line_quantity, computed totals | DUPLICATE CUSTOM LOGIC | Replaced business logic with thin native website-sale adapter | None | dtf_api/controllers/api.py | Frontend JSON envelope only | Source inspection plus workflow |
| M5 timed reservation | dtf.stock.reservation, expiry, active holds, PostgreSQL lock | Native Odoo stock availability/reservation and confirmed-order flow | DUPLICATE CUSTOM LOGIC | Removed model, fields, lock/accounting logic, ACLs and tests | reservation.py and reservation ACL CSV | Native Odoo stock modules | No remaining timed-hold requirement | Static/source verification |
| M5 payment/delivery | DTF checkout/payment/delivery fields | Native payment, website checkout, delivery/carrier mechanisms | ODOO NATIVE / REVIEW | Removed duplicate fields; native flow remains authoritative | None beyond sale_order.py changes | Odoo native modules | No proven DTF-specific difference | Official Odoo source comparison |

## Removed objects

- dtf_sale/models/reservation.py
- dtf_sale/security/ir.model.access.csv
- dtf.stock.reservation and its import
- dtf_reservation_id, dtf_checkout_expires_at, dtf_checkout_state, dtf_delivery_method, dtf_payment_reference
- Custom expiry, active-hold accounting, consume/release/expire methods, and PostgreSQL lock

## Kept DTF extensions

- Designer/profile/qualification workflow
- Design/assets backed by Odoo attachments
- Explicit Ready-to-Print Master and accepted preflight gates
- Versioned analyzer evidence and protected historical asset behavior
- Printify mapping/import metadata
- Native sale-line DTF linkage and immutable snapshots
- Production handoff historical snapshot gated by native sale state
- Thin API response compatibility envelope

## Uncertain or deferred

- Full runtime proof for every headless website-sale/payment/delivery route (controller tests now registered in CI; final run pending)
- Resolved: dtf.site.category was removed and native product.public.category is authoritative
- Payment provider configuration and delivery/pickup operational setup
- Complete headless API security/concurrency matrix
- Database migration procedure for pre-existing removed reservation tables/columns

Odoo core modified: NO. M6 started: NO. Deployment: NO. Merge: NO.

## Correction pass

- Native cart adapter uses `request.cart` and `request.website._create_cart()`; no `sale_get_order` remains.
- DTF API cart mutations use `type="jsonrpc"` and native sale-order cart methods.
- `dtf.site.category` and duplicate bilingual/publication fields were removed/replaced by native website category, translated product, website description, `public_categ_ids`, and `is_published` fields.
- The premature `dtf.production.handoff` model was removed/deferred; M6 native MRP integration is not implemented.
- CI now runs `TestDTFM5NativeAPI` on the M5 database.
