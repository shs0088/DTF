from odoo import api, fields, models
from odoo.exceptions import ValidationError

from .constants import COMPENSATION_MODES


class ResCompany(models.Model):
    _inherit = "res.company"

    dtf_designer_compensation_mode = fields.Selection(
        COMPENSATION_MODES,
        string="DTF Designer Compensation Mode",
        required=True,
        default="percentage",
    )
    dtf_designer_commission_rate = fields.Float(
        string="DTF Default Designer Commission %",
        default=15.0,
        digits=(16, 4),
    )
    dtf_designer_flat_royalty = fields.Monetary(
        string="DTF Default Flat Royalty per Unit",
        currency_field="currency_id",
        default=2.5,
    )
    dtf_minimum_withdrawal = fields.Monetary(
        string="DTF Minimum Withdrawal",
        currency_field="currency_id",
        default=10.0,
    )

    @api.constrains(
        "dtf_designer_commission_rate",
        "dtf_designer_flat_royalty",
        "dtf_minimum_withdrawal",
    )
    def _check_dtf_finance_values(self):
        for company in self:
            if (
                company.dtf_designer_commission_rate < 0
                or company.dtf_designer_commission_rate > 100
            ):
                raise ValidationError(
                    "Designer commission must be between 0 and 100 percent."
                )
            if company.dtf_designer_flat_royalty < 0:
                raise ValidationError("Designer flat royalty cannot be negative.")
            if company.dtf_minimum_withdrawal < 0:
                raise ValidationError("Minimum withdrawal cannot be negative.")
