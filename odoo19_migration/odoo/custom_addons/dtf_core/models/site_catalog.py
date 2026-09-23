from odoo import api, fields, models
from odoo.exceptions import ValidationError


class DTFSiteCategory(models.Model):
    _name = "dtf.site.category"
    _description = "DTF Studio Customer Site Category"
    _order = "sort_order, name_en, id"

    name_en = fields.Char(string="English Name", required=True, translate=True)
    name_ar = fields.Char(string="Arabic Name", required=True)
    description_en = fields.Text(string="English Description", translate=True)
    description_ar = fields.Text(string="Arabic Description")
    slug = fields.Char(required=True, index=True)
    active = fields.Boolean(default=True, index=True)
    published = fields.Boolean(default=True, index=True)
    sort_order = fields.Integer(default=0, index=True)
    image_1920 = fields.Image(string="Category Image", max_width=1920, max_height=1920)
    parent_id = fields.Many2one("dtf.site.category", ondelete="restrict", index=True)
    child_ids = fields.One2many("dtf.site.category", "parent_id")
    product_tmpl_ids = fields.One2many("product.template", "dtf_site_category_id")

    _sql_constraints = [("dtf_site_category_slug_unique", "unique(slug)", "DTF site category slugs must be unique.")]

    @api.constrains("parent_id")
    def _check_parent_cycle(self):
        for record in self:
            if record.parent_id and record.parent_id == record:
                raise ValidationError("A DTF site category cannot be its own parent.")


class ProductTemplate(models.Model):
    _inherit = "product.template"

    dtf_name_en = fields.Char(string="DTF English Name", translate=True)
    dtf_name_ar = fields.Char(string="DTF Arabic Name")
    dtf_description_en = fields.Text(string="DTF English Description", translate=True)
    dtf_description_ar = fields.Text(string="DTF Arabic Description")
    dtf_site_category_id = fields.Many2one("dtf.site.category", string="DTF Site Category", ondelete="restrict", index=True)
    dtf_product_type = fields.Selection([
        ("tshirt", "T-Shirt"), ("mug", "Mug"), ("cap", "Cap"),
        ("tshirt_mug", "T-Shirt + Mug"), ("tshirt_cap", "T-Shirt + Cap"),
        ("mug_cap", "Mug + Cap"), ("tshirt_mug_cap", "T-Shirt + Mug + Cap"),
    ], default="tshirt", index=True)
    dtf_catalog_type = fields.Selection([("customizable", "Customizable"), ("ready_to_sell", "Ready to Sell")], default="ready_to_sell", required=True, index=True)
    dtf_print_your_dream_eligible = fields.Boolean(string="Print Your Dream Eligible", default=False, index=True)
    dtf_designer_design_compatible = fields.Boolean(string="Designer Design Compatible", default=False)
    dtf_printable_area_ids = fields.One2many("dtf.product.printable.area", "product_tmpl_id")
    dtf_supplier_source = fields.Selection([("manual", "Manual"), ("printify", "Printify")], default="manual", required=True, index=True)
    dtf_public_published = fields.Boolean(string="DTF Published", default=False, index=True)

    @api.model
    def dtf_public_payload(self, products):
        return [{
            "id": product.id,
            "name": product.dtf_name_en or product.name,
            "name_ar": product.dtf_name_ar or product.name,
            "description": product.dtf_description_en or product.description_sale or "",
            "description_ar": product.dtf_description_ar or "",
            "price": product.list_price,
            "currency": product.currency_id.name,
            "active": product.active,
            "published": product.dtf_public_published,
            "category_id": product.dtf_site_category_id.id or None,
            "product_type": product.dtf_product_type,
            "catalog_type": product.dtf_catalog_type,
            "print_your_dream_eligible": product.dtf_print_your_dream_eligible,
            "image_1920": bool(product.image_1920),
            "variants": [{"id": variant.id, "name": variant.display_name, "price_extra": variant.price_extra, "active": variant.active, "stock_available": variant.qty_available} for variant in product.product_variant_ids],
        } for product in products]


class DTFProductPrintableArea(models.Model):
    _name = "dtf.product.printable.area"
    _description = "DTF Product Printable Area"

    product_tmpl_id = fields.Many2one("product.template", required=True, ondelete="cascade", index=True)
    name = fields.Char(required=True)
    width_cm = fields.Float(required=True)
    height_cm = fields.Float(required=True)
    active = fields.Boolean(default=True)

    _sql_constraints = [("dtf_printable_area_dimensions_positive", "check(width_cm > 0 and height_cm > 0)", "Printable area dimensions must be positive.")]
