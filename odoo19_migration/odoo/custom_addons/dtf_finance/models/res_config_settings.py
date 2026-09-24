from odoo import fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = "res.config.settings"

    dtf_designer_compensation_mode = fields.Selection(
        related="company_id.dtf_designer_compensation_mode",
        readonly=False,
    )
    dtf_designer_commission_rate = fields.Float(
        related="company_id.dtf_designer_commission_rate",
        readonly=False,
    )
    dtf_designer_flat_royalty = fields.Monetary(
        related="company_id.dtf_designer_flat_royalty",
        readonly=False,
        currency_field="currency_id",
    )
    dtf_minimum_withdrawal = fields.Monetary(
        related="company_id.dtf_minimum_withdrawal",
        readonly=False,
        currency_field="currency_id",
    )
