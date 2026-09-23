from odoo import fields, models


class ResPartner(models.Model):
    _inherit = "res.partner"

    dtf_customer_enabled = fields.Boolean(
        string="DTF Customer",
        default=False,
        index=True,
        help="Marks this contact as a DTF Studio customer profile.",
    )
    dtf_designer_enabled = fields.Boolean(
        string="DTF Designer",
        default=False,
        index=True,
        help="Marks this contact as a DTF Studio designer profile.",
    )
