from odoo import api, fields, models
from odoo.exceptions import AccessError, ValidationError


class DTFFinanceLedger(models.Model):
    _name = "dtf.finance.ledger"
    _description = "DTF Designer Finance Ledger"
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
    entry_type = fields.Selection(
        [
            ("earning", "Earning Credit"),
            ("withdrawal_paid", "Withdrawal Paid"),
        ],
        required=True,
        index=True,
    )
    amount = fields.Monetary(
        currency_field="currency_id",
        required=True,
        help="Signed amount: earning credits are positive and paid withdrawals are negative.",
    )
    reference_key = fields.Char(required=True, index=True)
    earning_id = fields.Many2one(
        "dtf.designer.earning",
        ondelete="restrict",
        index=True,
    )
    withdrawal_id = fields.Many2one(
        "dtf.designer.withdrawal",
        ondelete="restrict",
        index=True,
    )

    _reference_unique = models.Constraint(
        "UNIQUE(reference_key)",
        "A DTF finance ledger reference can be posted only once.",
    )

    @api.model
    def _create_entry(
        self,
        finance_account,
        entry_type,
        amount,
        reference_key,
        earning=None,
        withdrawal=None,
    ):
        existing = self.sudo().search([("reference_key", "=", reference_key)], limit=1)
        if existing:
            return existing
        return self.sudo().with_context(dtf_finance_internal=True).create({
            "finance_account_id": finance_account.id,
            "entry_type": entry_type,
            "amount": amount,
            "reference_key": reference_key,
            "earning_id": earning.id if earning else False,
            "withdrawal_id": withdrawal.id if withdrawal else False,
        })

    @api.model_create_multi
    def create(self, vals_list):
        if not self.env.context.get("dtf_finance_internal"):
            raise AccessError(
                "Finance ledger entries are created only by DTF finance events."
            )
        return super().create(vals_list)

    def write(self, vals):
        raise ValidationError("Finance ledger entries are immutable.")

    def unlink(self):
        raise ValidationError(
            "Finance ledger entries are immutable and cannot be deleted."
        )
