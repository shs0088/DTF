from odoo import api, fields, models
from odoo.exceptions import AccessError, ValidationError

from .constants import COMPENSATION_MODES


class DTFDesignerEarning(models.Model):
    _name = "dtf.designer.earning"
    _description = "DTF Designer Earning Snapshot"
    _order = "create_date desc, id desc"

    finance_account_id = fields.Many2one(
        "dtf.designer.finance.account",
        required=True,
        ondelete="restrict",
        index=True,
    )
    designer_id = fields.Many2one(
        related="finance_account_id.designer_id",
        store=True,
        readonly=True,
        index=True,
    )
    company_id = fields.Many2one(
        related="finance_account_id.company_id",
        store=True,
        readonly=True,
        index=True,
    )
    currency_id = fields.Many2one(
        related="finance_account_id.currency_id",
        store=True,
        readonly=True,
    )
    sale_order_id = fields.Many2one(
        "sale.order",
        required=True,
        ondelete="restrict",
        index=True,
    )
    sale_line_id = fields.Many2one(
        "sale.order.line",
        required=True,
        ondelete="restrict",
        index=True,
    )
    design_id = fields.Many2one(
        "dtf.design",
        required=True,
        ondelete="restrict",
        index=True,
    )
    master_asset_id = fields.Many2one(
        "dtf.design.asset",
        required=True,
        ondelete="restrict",
        index=True,
    )
    preflight_result_id = fields.Many2one(
        "dtf.preflight.result",
        required=True,
        ondelete="restrict",
        index=True,
    )
    quantity = fields.Float(required=True)
    source_amount = fields.Monetary(
        currency_field="source_currency_id",
        required=True,
    )
    source_currency_id = fields.Many2one(
        "res.currency",
        required=True,
        ondelete="restrict",
    )
    compensation_source = fields.Selection(
        [
            ("company_default", "Company Default"),
            ("designer_override", "Designer Override"),
        ],
        required=True,
    )
    compensation_mode = fields.Selection(
        COMPENSATION_MODES,
        required=True,
    )
    commission_rate_snapshot = fields.Float(digits=(16, 4), readonly=True)
    flat_royalty_snapshot = fields.Monetary(
        currency_field="currency_id",
        readonly=True,
    )
    amount = fields.Monetary(
        currency_field="currency_id",
        required=True,
    )
    preflight_snapshot = fields.Json(readonly=True)
    payment_snapshot = fields.Json(readonly=True)

    _sale_line_unique = models.Constraint(
        "UNIQUE(sale_line_id)",
        "A DTF sale-order line can produce only one designer earning snapshot.",
    )

    @api.model_create_multi
    def create(self, vals_list):
        if not self.env.context.get("dtf_finance_internal"):
            raise AccessError(
                "Designer earnings are created only from native Odoo payment events."
            )
        records = super().create(vals_list)
        ledger = self.env["dtf.finance.ledger"]
        for earning in records:
            ledger._create_entry(
                finance_account=earning.finance_account_id,
                entry_type="earning",
                amount=earning.amount,
                reference_key="earning:%s" % earning.id,
                earning=earning,
            )
        return records

    def write(self, vals):
        raise ValidationError("Designer earning snapshots are immutable.")

    def unlink(self):
        raise ValidationError(
            "Designer earning snapshots are immutable and cannot be deleted."
        )
