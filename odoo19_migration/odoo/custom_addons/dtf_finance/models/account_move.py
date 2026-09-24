from odoo import models


class AccountMove(models.Model):
    _inherit = "account.move"

    def _invoice_paid_hook(self):
        result = super()._invoice_paid_hook()
        sale_lines = self.mapped("invoice_line_ids.sale_line_ids").filtered(
            lambda line: line.dtf_design_id and line.dtf_master_asset_id
        )
        if sale_lines:
            sale_lines._dtf_create_earning_if_eligible(strict=False)
        return result
