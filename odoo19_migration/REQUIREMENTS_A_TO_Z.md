# DTF Studio — Odoo 19 Migration Requirements A–Z

## Frontend
Preserve current DTF Studio customer/designer frontend, routes, Black/Dark + Electric Blue theme, Arabic/English and RTL/LTR. Do not redesign working pages merely because the backend changes.

## Designers
- Customer or Designer registration; designer may also buy.
- Designer profile and qualification lifecycle.
- Exactly 3 qualification designs; each may contain multiple assets.
- Qualification upload has no Main Display Image or Ready-to-Print Master controls.
- Automatic preflight at upload.
- Fixed 5-day admin review.
- Approve/reject with reason, replacement flow, second rejection escalation, notifications.
- Authorized state is admin controlled.

## Designs / Assets
- Mandatory Arabic Title, English Title, Arabic Description, English Description.
- Publish blocked with exact missing-field feedback.
- Multiple upload, click/drag-drop, web/mobile preview.
- Single/multiple/bulk asset delete when allowed.
- Full design delete with protected-reference checks.
- Orphan cleanup and empty unprotected design cleanup.
- Every asset may independently be Main Display Image and/or Ready-to-Print Master.
- If no Main Display Image is selected, system may select a suitable recent display image.
- Ready-to-Print Master is NEVER auto-selected.
- Exactly one explicit valid master is required before publish.

## Product type combinations
Exactly:
1. T-Shirt
2. Mug
3. Cap
4. T-Shirt + Mug
5. T-Shirt + Cap
6. Mug + Cap
7. T-Shirt + Mug + Cap

## Analyzer / Preflight
Validate and store where technically available:
format, MIME, signature, file size, pixel W/H, embedded DPI, effective DPI, physical size, transparency/alpha, color/profile, orientation, metadata, readability, previewability, aspect ratio, scaling risk, printable area, min/max, product compatibility and product-specific T-Shirt/Mug/Cap rules.
Rules must be data-driven/versioned with timestamp and reasons.
Do not impose PNG-only as the universal master rule. Production output may be a separate downstream object.

## Publish gate
Require four bilingual fields + readable/previewable asset + explicit Ready-to-Print Master + successful master preflight + valid product combination + product eligibility + no critical error.
Missing-master message: "Please select the design that will be used for final print."

## Protected deletion / history
Paid order, printing and production references protect required design/master assets. Preserve historical order/production/financial evidence. Prevent orphan records/files.

## Customer / commerce
- Browse without registration.
- Login before payment.
- Path 1: upload first -> plain product -> customization -> order.
- Path 2: product first -> gallery or upload -> customization -> order.
- Print Your Dream remains separate from Products.
- Products/variants/sizes/colors/qty/pricing/stock/cart/checkout.
- Never negative inventory.
- Delivery/store pickup.
- Bank transfer/admin confirmation, COD if enabled, architecture ready for future card/Visa provider.
- Gift wrapping/promotions where enabled.
- Immutable order snapshots.

## Reservation rule
The former custom timed checkout reservation requirement is cancelled/superseded. Use Odoo Community native stock availability and reservation behavior; do not create a separate DTF temporary-hold model or duration.

## Order / production states
New, Payment Pending, Payment Confirmed, Under Preparation, Ready for Delivery/Pickup, Given to Delivery, Under Delivery, Ready for Pickup, Completed, Cancelled.

## Printing Operator
Default least privilege: Dashboard/Orders/Production only. Can see required order/customer information, retrieve correct print master and update allowed statuses. No Settings, pricing, finance, Users/User Groups unless explicitly granted by Main Administrator.

## Admin / RBAC
Main Administrator protected/full access. Printing Operator protected/default least privilege. Support custom groups using Odoo ACLs/record rules plus DTF-specific permission controls where needed. Current DB permissions authoritative; disabled admin loses access; no client header escalation. Audit sensitive changes.

Admin functions include Dashboard, Orders, Manual Review, Production Queue, Products/Catalog, Printify Integration, Customers, Designers, Payouts, Reports, Promotions, Settings, Integrations, Audit Log, Users/Groups.

## Designer finance
Global default compensation = percentage or flat. Per-designer override. Global change affects future earnings only. Override persists. Earning created after payment_confirmed only when master/preflight rules pass. Idempotent per order item. Snapshot source/method/value/base/quantity. Ledger, balances, withdrawals, minimum withdrawal, admin withdrawal management.

## Printify
Admin/internal only. No customer-facing Printify name. Secure token server-side; never commit secrets. Catalog snapshot/import mapping into Odoo products/variants/images. Controlled first import and future refresh. Idempotent behavior and admin health/status.

## Security
Backend authentication/authorization, ACLs/record rules, upload security, MIME/signature checking, path traversal prevention, transactions, protected historical references, audit, no public PostgreSQL.

## Portability
Ubuntu 24.04 ARM64/aarch64. Oracle OCI Ampere A1 target but no Oracle-specific application dependency. Nginx reverse proxy. PostgreSQL + Odoo filestore + custom addon backup/restore. Same package must be portable to another Linux cloud.
