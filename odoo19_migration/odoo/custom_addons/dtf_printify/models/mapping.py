import hashlib
import json
from odoo import api, fields, models
from odoo.exceptions import ValidationError


class DTFPrintifyMapping(models.Model):
    _name = "dtf.printify.mapping"
    _description = "Internal Printify to Odoo Mapping"
    _order = "write_date desc, id desc"

    shop_id = fields.Char(required=True, index=True)
    printify_product_id = fields.Char(required=True, index=True)
    blueprint_id = fields.Char(index=True)
    provider_id = fields.Char(index=True)
    printify_variant_id = fields.Char(required=True, index=True)
    product_tmpl_id = fields.Many2one("product.template", required=True, ondelete="restrict", index=True)
    product_id = fields.Many2one("product.product", ondelete="restrict", index=True)
    supplier_variant_metadata = fields.Json(default=dict)
    source_snapshot_hash = fields.Char(index=True)
    source_snapshot_version = fields.Char(index=True)
    last_sync_at = fields.Datetime()
    last_sync_state = fields.Selection([("success", "Success"), ("error", "Error"), ("pending", "Pending")], default="pending", required=True)
    last_sync_error = fields.Text()
    active = fields.Boolean(default=True, index=True)
    import_key = fields.Char(required=True, index=True)

    _import_key_unique = models.Constraint(
        "UNIQUE(import_key)",
        "A Printify mapping import key must be unique.",
    )
    _shop_variant_unique = models.Constraint(
        "UNIQUE(shop_id, printify_variant_id)",
        "A Printify shop variant can have only one mapping.",
    )

    def _validate_unique_values(self, vals, exclude_ids=None):
        exclude_ids = list(exclude_ids or [])
        import_key = vals.get("import_key")
        shop_id = vals.get("shop_id")
        printify_variant_id = vals.get("printify_variant_id")

        if import_key:
            domain = [("import_key", "=", import_key)]
            if exclude_ids:
                domain.append(("id", "not in", exclude_ids))
            if self.search_count(domain):
                raise ValidationError("A Printify mapping import key must be unique.")

        if shop_id and printify_variant_id:
            domain = [
                ("shop_id", "=", shop_id),
                ("printify_variant_id", "=", printify_variant_id),
            ]
            if exclude_ids:
                domain.append(("id", "not in", exclude_ids))
            if self.search_count(domain):
                raise ValidationError("A Printify shop variant can have only one mapping.")

    @api.model_create_multi
    def create(self, vals_list):
        seen_import_keys = set()
        seen_shop_variants = set()
        for vals in vals_list:
            import_key = vals.get("import_key")
            pair = (vals.get("shop_id"), vals.get("printify_variant_id"))
            if import_key:
                if import_key in seen_import_keys:
                    raise ValidationError("A Printify mapping import key must be unique.")
                seen_import_keys.add(import_key)
            if pair[0] and pair[1]:
                if pair in seen_shop_variants:
                    raise ValidationError("A Printify shop variant can have only one mapping.")
                seen_shop_variants.add(pair)
            self._validate_unique_values(vals)
        return super().create(vals_list)

    def write(self, vals):
        for record in self:
            candidate = {
                "import_key": vals.get("import_key", record.import_key),
                "shop_id": vals.get("shop_id", record.shop_id),
                "printify_variant_id": vals.get("printify_variant_id", record.printify_variant_id),
            }
            self._validate_unique_values(candidate, exclude_ids=record.ids)
        return super().write(vals)

    def public_payload(self):
        return {"id": self.id, "product_id": self.product_tmpl_id.id}


class DTFPrintifySnapshotImporter(models.AbstractModel):
    _name = "dtf.printify.snapshot.importer"
    _description = "Deterministic Printify Snapshot Importer"

    @api.model
    def import_snapshot(self, snapshot, shop_id="snapshot"):
        if not isinstance(snapshot, dict) or not isinstance(snapshot.get("products"), list):
            raise ValidationError("Printify snapshot must contain a products list.")
        snapshot_hash = hashlib.sha256(json.dumps(snapshot, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        version = str(snapshot.get("schemaVersion", "unknown"))
        imported = 0
        mappings = 0
        for row in snapshot["products"]:
            supplier_product_id = str(row.get("blueprintId") or row.get("blueprint_id") or row.get("id") or "").strip()
            if not supplier_product_id:
                continue
            title = str(row.get("title") or "Printify Product").strip()
            product = self.env["product.template"].search([("dtf_supplier_source", "=", "printify"), ("dtf_printify_source_id", "=", supplier_product_id)], limit=1)
            values = {"name": title, "dtf_name_en": title, "dtf_supplier_source": "printify", "dtf_printify_source_id": supplier_product_id, "dtf_public_published": False}
            if product: product.write(values)
            else: product = self.env["product.template"].create(values); imported += 1
            variants = row.get("variants") if isinstance(row.get("variants"), list) else []
            for variant in variants:
                variant_id = str(variant.get("id") or variant.get("variant_id") or "").strip()
                if not variant_id: continue
                key = "%s:%s" % (shop_id, variant_id)
                mapping = self.env["dtf.printify.mapping"].search([("import_key", "=", key)], limit=1)
                vals = {"shop_id": shop_id, "printify_product_id": supplier_product_id, "blueprint_id": supplier_product_id, "provider_id": str(variant.get("provider_id") or ""), "printify_variant_id": variant_id, "product_tmpl_id": product.id, "supplier_variant_metadata": variant, "source_snapshot_hash": snapshot_hash, "source_snapshot_version": version, "last_sync_at": fields.Datetime.now(), "last_sync_state": "success", "last_sync_error": False, "active": True, "import_key": key}
                if mapping: mapping.write(vals)
                else: self.env["dtf.printify.mapping"].create(vals)
                mappings += 1
        return {"created_products": imported, "processed_mappings": mappings, "snapshot_hash": snapshot_hash, "snapshot_version": version}
