from odoo import api, fields, models


PRODUCT_TYPES = [
    ("tshirt", "T-Shirt"),
    ("mug", "Mug"),
    ("cap", "Cap"),
    ("tshirt_mug", "T-Shirt + Mug"),
    ("tshirt_cap", "T-Shirt + Cap"),
    ("mug_cap", "Mug + Cap"),
    ("tshirt_mug_cap", "T-Shirt + Mug + Cap"),
]


class ProductTemplate(models.Model):
    _inherit = "product.template"

    dtf_product_type = fields.Selection(PRODUCT_TYPES, default="tshirt", index=True)
    dtf_catalog_type = fields.Selection(
        [("customizable", "Customizable"), ("ready_to_sell", "Ready to Sell")],
        default="ready_to_sell", required=True, index=True,
    )
    dtf_print_your_dream_eligible = fields.Boolean(default=False, index=True)
    dtf_designer_design_compatible = fields.Boolean(default=False)
    dtf_printable_area_ids = fields.One2many("dtf.product.printable.area", "product_tmpl_id")
    dtf_supplier_source = fields.Selection(
        [("manual", "Manual"), ("printify", "Printify")],
        default="manual", required=True, index=True,
    )
    dtf_printify_source_id = fields.Char(index=True, copy=False)

    @api.model
    def _dtf_translated_text(self, record, field_name, lang_code):
        """Read a native translated field only when that Odoo language is active."""
        lang = self.env["res.lang"].sudo().search(
            [("code", "=", lang_code), ("active", "=", True)],
            limit=1,
        )
        if not lang:
            return ""
        return record.with_context(lang=lang.code)[field_name] or ""

    @api.model
    def dtf_public_payload(self, products):
        return [{
            "id": product.id,
            "name": self._dtf_translated_text(product, "name", "en_US"),
            "name_ar": self._dtf_translated_text(product, "name", "ar_001"),
            "description": (
                self._dtf_translated_text(product, "website_description", "en_US")
                or self._dtf_translated_text(product, "description_ecommerce", "en_US")
            ),
            "description_ar": (
                self._dtf_translated_text(product, "website_description", "ar_001")
                or self._dtf_translated_text(product, "description_ecommerce", "ar_001")
            ),
            "price": product.list_price,
            "currency": product.currency_id.name,
            "active": product.active,
            "published": product.is_published,
            "category_ids": product.public_categ_ids.ids,
            "product_type": product.dtf_product_type,
            "catalog_type": product.dtf_catalog_type,
            "print_your_dream_eligible": product.dtf_print_your_dream_eligible,
            "image_1920": bool(product.image_1920),
            "variants": [{
                "id": variant.id,
                "name": variant.display_name,
                "price_extra": variant.price_extra,
                "active": variant.active,
                "stock_available": variant.qty_available,
            } for variant in product.product_variant_ids],
        } for product in products]


class DTFProductPrintableArea(models.Model):
    _name = "dtf.product.printable.area"
    _description = "DTF Product Printable Area"

    product_tmpl_id = fields.Many2one("product.template", required=True, ondelete="cascade", index=True)
    name = fields.Char(required=True)
    width_cm = fields.Float(required=True)
    height_cm = fields.Float(required=True)
    active = fields.Boolean(default=True)

    _dimensions_positive = models.Constraint(
        "CHECK(width_cm > 0 AND height_cm > 0)",
        "Printable area dimensions must be positive.",
    )
