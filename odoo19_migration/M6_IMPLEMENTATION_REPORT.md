# M6 Implementation Report — Production + Printing Operator

## Start

START HEAD: `23b5aa611cfb0ea516229e618f10e82edd945c91`

M5 handoff workflow: `35976534734` — SUCCESS.

## M6 scope

M6 introduces the production/operator layer only. It does not start M7 finance, M8 final Admin theme, Fabric.js, frontend cutover, deployment, or merge.

### Architecture

- Native Odoo `mrp.production` is the authoritative printing-job record.
- No parallel `dtf.production.handoff` table is restored.
- A DTF production job links one confirmed native `sale.order.line` to:
  - exact DTF design
  - exact Ready-to-Print Master asset
  - exact `ir.attachment`
  - exact accepted preflight result
  - immutable M5 customer/product/preflight snapshots
- One primary DTF printing job is allowed per DTF sale-order line.

### Printing Operator

- Existing `dtf_core.group_dtf_printing_operator` is reused.
- Operator receives a dedicated DTF Operations -> Orders / Printing Jobs page.
- Operator may read DTF printing jobs and update only the DTF printing status.
- Operator cannot create/delete jobs or alter product/master/customer/evidence fields.
- The operator page exposes customer name/phone, product/quantity, exact master file download, and allowed stage actions.
- DTF Administrator may create jobs from confirmed sale-order lines.

### Protected evidence

Once a DTF production job exists:

- the job cannot be deleted
- the linked sale-order line cannot change its DTF design/master/snapshots/product/quantity
- referenced design cannot be deleted
- referenced Ready-to-Print Master cannot be deleted
- referenced master attachment cannot be deleted
- DTF production references/snapshots are immutable

### Status

DTF operator stages are application-specific production stages while native `mrp.production` remains the Odoo manufacturing authority:

- New
- Under Preparation
- Ready for Delivery/Pickup
- Completed
- Cancelled

## Validation

M6 tests and full regression workflow have been added. Final HEAD and Actions run will be recorded only after the complete workflow finishes SUCCESS.

Frontend files changed: **NO**.  
Old Worker/backend files changed: **NO**.  
M7 started: **NO**.  
Deployment: **NO**.  
Merge: **NO**.
