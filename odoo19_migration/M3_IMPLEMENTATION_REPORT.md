# M3 — Catalog + Printify Implementation Report

## START HEAD
`bc7cd6435202be4455e31816637d83533615fed8`

## Scope completed
M3 adds native Odoo catalog extensions and an admin-only deterministic Printify snapshot mapping foundation. The existing DTF frontend and old Worker/backend were not changed. No M4 work was started.

## Native Odoo models reused
- `product.template` and `product.product` for products and variants.
- Odoo product attributes/values for size/color/future variant dimensions.
- Native `qty_available` inventory values; no parallel stock counter was added.
- Native product images/image fields.
- PostgreSQL remains the single Odoo database.

## Custom models added
- `dtf.site.category` — bilingual DTF customer-facing category hierarchy, slug, publication and sort fields.
- `dtf.product.printable.area` — product printable-area foundation.
- Native `product.template` fields for DTF bilingual data, catalog type, product type, site category, Print Your Dream eligibility, design compatibility, supplier source and publication.
- `dtf.printify.mapping` — internal Printify shop/product/blueprint/provider/variant mapping and sync metadata.
- `dtf.printify.snapshot.importer` — deterministic idempotent snapshot import service.

## DTF categories
DTF categories are implemented as `dtf.site.category`; they are independent of Printify category metadata. Public category serialization exposes only DTF category fields.

## Products and variants
Products extend native Odoo templates. Variants remain native Odoo products and attribute combinations. DTF fields include bilingual content, seven product-type choices, customizable/ready-to-sell type, Print Your Dream eligibility, designer compatibility, printable areas, supplier source and publication state.

## Printify mapping/import
Printify mapping is internal-only and protected by the DTF Administrator access group. Snapshot import uses supplied snapshot-shaped data, hashes the normalized source, records version/hash/timestamps/status, uses a unique shop+variant import key, updates existing mappings/products, and does not publish imported products automatically. No live Printify request or credential was used.

## Customer-facing hiding
The public product payload contains DTF product/catalog information only. Printify IDs, provider IDs, variant metadata and mapping records are not serialized. Imported products remain ordinary DTF products and are unpublished by default.

## Security
Designer, Printing Operator and public users have no Printify mapping access by default. Only DTF Administrator has mapping read/write/create/delete access.

## Tests
Added M3 Odoo tests for bilingual categories, native products/variants, native stock visibility, Print Your Dream eligibility, mapping uniqueness, idempotent import, no automatic publication, public supplier-field hiding, category independence and role denial. CI was updated to run the M3 test tag after M1/M2 validation.

## GitHub validation
The workflow triggered from commit `84c533ffcc03d7e2e921056cd3ba80c7bbf023f2`. Final result must be recorded after that workflow completes; this report does not claim a PASS before GitHub reports success.

## Final CI failure fixes

The first M3 workflow failure was run 35921236776. M1 validation, 13-addon installation and M2 tests passed; exactly two M3 tests failed.

1. Native variant test: Odoo 19 did not include the attribute value name in `product.product.display_name` for this product setup. The test was corrected to assert the native `product.template.attribute.value` relation and verify that the variant is linked to the Size attribute value M. Implementation was not changed to force display names.
2. Printify mapping uniqueness: legacy `_sql_constraints` were not the correct Odoo 19 mechanism for this model. The mapping now uses `models.Constraint` for `UNIQUE(import_key)` and `UNIQUE(shop_id, printify_variant_id)`, retaining meaningful validation messages.

The corrected CI must rerun M1 static validation, all 13 addon installation, M2 tests, M3 tests and the Odoo/Nginx runtime check before M3 is accepted.

## Remaining M4 work
- Full file analyzer implementation.
- Product-specific, versioned preflight rules and results.
- Publishing gate completion against catalog eligibility.
- Protected order/production asset deletion behavior.

## Status
- FRONTEND FILES CHANGED: NO
- OLD BACKEND FILES CHANGED: NO
- DEPLOYED: NO
- MERGED: NO
- INVESTIGATION MODE USED: NO
