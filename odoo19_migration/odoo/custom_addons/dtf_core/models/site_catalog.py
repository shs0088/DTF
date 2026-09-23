from odoo import api, fields, models
from odoo.exceptions import ValidationError


class DTFSiteCategory(models.Model):
    _name = "dtf.site.category"
    _description = "DTF Studio Customer Site Category"
    _order = "sort_order, name_en, id"
    name_en = fields.Char(required=True, translate=True)
    name_ar = fields.Char(required=True)
    description_en = fields.Text(translate=True)
    description_ar = fields.Text()
    slug = fields.Char(required=True, index=True)
    active = fields.Boolean(default=True, index=True)
    published = fields.Boolean(default=True, index=True)
    sort_order = fields.Integer(default=0, index=True)
    image_1920 = fields.Image(max_width=1920, max_height=1920)
    parent_id = fields.Many2one("dtf.site.category", ondelete="restrict", index=True)
    child_ids = fields.One2many("dtf.site.category", "parent_id")
    product_tmpl_ids = fields.One2many("product.template", "dtf_site_category_id")
    _sql_constraints = [("dtf_site_category_slug_unique", "unique(slug)", "DTF site category slugs must be unique.")]
    @api.constrains("parent_id")
    def _check_parent_cycle(self):
        for record in self:
            if record.parent_id and record.parent_id == record: raise ValidationError("A DTF site category cannot be its own parent.")


class ProductTemplate(models.Model):
    _inherit = "product.template"
    dtf_name_en = fields.Char(translate=True)
    dtf_name_ar = fields.Char()
    dtf_description_en = fields.Text(translate=True)
    dtf_description_ar = fields.Text()
    dtf_site_category_id = fields.Many2one("dtf.site.category", ondelete="restrict", index=True)
    dtf_product_type = fields.Selection([(x, label) for x, label in [("tshirt", "T-Shirt"), ("mug", "Mug"), ("cap", "Cap"), ("tshirt_mug", "T-Shirt + Mug"), ("tshirt_cap", "T-Shirt + Cap"), ("mug_cap", "Mug + Cap"), ("tshirt_mug_cap", "T-Shirt + Mug + Cap")]], default="tshirt", index=True)
    dtf_catalog_type = fields.Selection([("customizable", "Customizable"), ("ready_to_sell", "Ready to Sell")], default="ready_to_sell", required=True, index=True)
    dtf_print_your_dream_eligible = fields.Boolean(default=False, index=True)
    dtf_designer_design_compatible = fields.Boolean(default=False)
    dtf_printable_area_ids = fields.One2many("dtf.product.printable.area", "product_tmpl_id")
    dtf_supplier_source = fields.Selection([("manual", "Manual"), ("printify", "Printify")], default="manual", required=True, index=True)
    dtf_printify_source_id = fields.Char(index=True, copy=False)
    dtf_public_published = fields.Boolean(default=False, index=True)
    @api.model
    def dtf_public_payload(self, products):
        return [{"id": p.id, "name": p.dtf_name_en or p.name, "name_ar": p.dtf_name_ar or p.name, "description": p.dtf_description_en or p.description_sale or "", "description_ar": p.dtf_description_ar or "", "price": p.list_price, "currency": p.currency_id.name, "active": p.active, "published": p.dtf_public_published, "category_id": p.dtf_site_category_id.id or None, "product_type": p.dtf_product_type, "catalog_type": p.dtf_catalog_type, "print_your_dream_eligible": p.dtf_print_your_dream_eligible, "image_1920": bool(p.image_1920), "variants": [{"id": v.id, "name": v.display_name, "price_extra": v.price_extra, "active": v.active, "stock_available": v.qty_available} for v in p.product_variant_ids]} for p in products]


class DTFProductPrintableArea(models.Model):
    _name = "dtf.product.printable.area"
    _description = "DTF Product Printable Area"
    product_tmpl_id = fields.Many2one("product.template", required=True, ondelete="cascade", index=True)
    name = fields.Char(required=True)
    width_cm = fields.Float(required=True)
    height_cm = fields.Float(required=True)
    active = fields.Boolean(default=True)
    _sql_constraints = [("dtf_printable_area_dimensions_positive", "check(width_cm > 0 and height_cm > 0)", "Printable area dimensions must be positive.")]
