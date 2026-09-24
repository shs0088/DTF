# M5 Implementation Report — Sales, Checkout, Inventory Reservation, and Order Snapshots

## Scope completed in this M5 batch

- Added native Odoo sale-order-line DTF fields for explicit design/master linkage and immutable customer, product, and preflight snapshots.
- Added current accepted product-compatible preflight enforcement before snapshot capture.
- Added native 30-minute checkout state and expiry fields on `sale.order`.
- Added `dtf.stock.reservation` with active/released/consumed/expired states, positive-quantity validation, expiry handling, and the authoritative 30-minute reservation duration.
- Added payment-confirmation and checkout-cancellation guards.
- Added `dtf.production.handoff` historical master/preflight/product snapshot foundation gated on confirmed checkout.
- Added focused M5 sale, reservation, and production model tests.
- Preserved the existing M1–M4 workflow checks and added a dedicated M5 test step.

## Validation evidence

Implementation HEAD validated: `45de2c4028f6be05b9e6b6c8c1041bc43f75be75`.
GitHub Actions run `35933694605` completed SUCCESS.

- M1 static validation: PASS
- Docker Compose validation: PASS
- ARM64 image manifest probe: PASS
- PostgreSQL startup: PASS
- All 13 addon installation: PASS
- M2 tests: PASS
- M3 tests: PASS
- M4 tests: PASS
- M5 sales/reservation/production snapshot tests: PASS
- Odoo/Nginx `/web` runtime: PASS

## Boundary

This is the first M5 implementation batch, not a claim that all M5 work is complete. Payment-provider integration, delivery/pickup operational configuration, complete stock deduction/release transactions, cart/API compatibility, and full checkout business-flow coverage remain M5 work. M6 and later milestones were not started. No deployment or merge was performed.


## Native reconciliation correction

The custom 30-minute reservation requirement was explicitly cancelled. The reservation model, timed checkout fields, custom hold accounting, lock logic, and ACLs were removed. Standard sales/cart/order behavior is delegated to native Odoo Community website-sale, sale, stock, payment, and delivery mechanisms. Remaining DTF M5 code is limited to sale-line snapshots, DTF linkage, production evidence, and a thin compatibility envelope.
