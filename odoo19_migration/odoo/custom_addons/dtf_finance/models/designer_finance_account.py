from odoo import api, fields, models
from odoo.exceptions import AccessError, ValidationError

from .constants import COMPENSATION_MODES


class DTFDesignerFinanceAccount(models.Model):
    _name = "dtf.designer.finance.account"
    _description = "DTF Designer Finance Account"
    _order = "designer_id, company_id"

    designer_id = fields.Many2one(
        "dtf.designer.profile",
        required=True,
        ondelete="restrict",
        index=True,
    )
    company_id = fields.Many2one(
        "res.company",
        required=True,
        default=lambda self: self.env.company,
        ondelete="restrict",
        index=True,
    )
    currency_id = fields.Many2one(
        related="company_id.currency_id",
        store=True,
        readonly=True,
    )

    override_enabled = fields.Boolean(
        string="Use Designer-Specific Compensation",
        default=False,
        groups="dtf_core.group_dtf_admin",
    )
    override_mode = fields.Selection(
        COMPENSATION_MODES,
        string="Designer Compensation Mode",
        default="percentage",
        groups="dtf_core.group_dtf_admin",
    )
    override_commission_rate = fields.Float(
        string="Designer Commission %",
        default=0.0,
        digits=(16, 4),
        groups="dtf_core.group_dtf_admin",
    )
    override_flat_royalty = fields.Monetary(
        string="Designer Flat Royalty per Unit",
        currency_field="currency_id",
        default=0.0,
        groups="dtf_core.group_dtf_admin",
    )

    earning_ids = fields.One2many(
        "dtf.designer.earning",
        "finance_account_id",
        readonly=True,
    )
    ledger_entry_ids = fields.One2many(
        "dtf.finance.ledger",
        "finance_account_id",
        readonly=True,
    )
    withdrawal_ids = fields.One2many(
        "dtf.designer.withdrawal",
        "finance_account_id",
        readonly=True,
    )

    total_earned = fields.Monetary(
        compute="_compute_balances",
        currency_field="currency_id",
    )
    ledger_balance = fields.Monetary(
        compute="_compute_balances",
        currency_field="currency_id",
    )
    committed_withdrawals = fields.Monetary(
        compute="_compute_balances",
        currency_field="currency_id",
    )
    paid_withdrawals = fields.Monetary(
        compute="_compute_balances",
        currency_field="currency_id",
    )
    available_withdrawal = fields.Monetary(
        compute="_compute_balances",
        currency_field="currency_id",
    )

    _designer_company_unique = models.Constraint(
        "UNIQUE(designer_id, company_id)",
        "A designer can have only one DTF finance account per company.",
    )

    @api.constrains("override_commission_rate", "override_flat_royalty")
    def _check_override_values(self):
        for record in self:
            if (
                record.override_commission_rate < 0
                or record.override_commission_rate > 100
            ):
                raise ValidationError(
                    "Designer commission override must be between 0 and 100 percent."
                )
            if record.override_flat_royalty < 0:
                raise ValidationError("Designer flat royalty override cannot be negative.")

    @api.depends(
        "earning_ids.amount",
        "ledger_entry_ids.amount",
        "withdrawal_ids.amount",
        "withdrawal_ids.state",
    )
    def _compute_balances(self):
        for record in self:
            account = record.sudo()
            record.total_earned = sum(account.earning_ids.mapped("amount"))
            record.ledger_balance = sum(account.ledger_entry_ids.mapped("amount"))
            record.committed_withdrawals = sum(
                account.withdrawal_ids.filtered(
                    lambda withdrawal: withdrawal.state in ("requested", "approved")
                ).mapped("amount")
            )
            record.paid_withdrawals = sum(
                account.withdrawal_ids.filtered(
                    lambda withdrawal: withdrawal.state == "paid"
                ).mapped("amount")
            )
            record.available_withdrawal = max(
                0.0,
                record.ledger_balance - record.committed_withdrawals,
            )

    @api.model
    def _get_for_designer(self, designer, company=None):
        company = company or self.env.company
        account = self.sudo().search([
            ("designer_id", "=", designer.id),
            ("company_id", "=", company.id),
        ], limit=1)
        if not account:
            account = self.sudo().with_context(dtf_finance_internal=True).create({
                "designer_id": designer.id,
                "company_id": company.id,
            })
        return account.with_user(self.env.user)

    def _resolved_compensation(self):
        self.ensure_one()
        account = self.sudo()
        company = account.company_id.sudo()
        if account.override_enabled:
            return {
                "source": "designer_override",
                "mode": account.override_mode,
                "commission_rate": account.override_commission_rate,
                "flat_royalty": account.override_flat_royalty,
            }
        return {
            "source": "company_default",
            "mode": company.dtf_designer_compensation_mode,
            "commission_rate": company.dtf_designer_commission_rate,
            "flat_royalty": company.dtf_designer_flat_royalty,
        }

    def _available_excluding(self, withdrawal=None):
        self.ensure_one()
        account = self.sudo()
        ledger_balance = sum(account.ledger_entry_ids.mapped("amount"))
        committed = account.withdrawal_ids.filtered(
            lambda item: item.state in ("requested", "approved")
            and (not withdrawal or item.id != withdrawal.id)
        )
        return max(0.0, ledger_balance - sum(committed.mapped("amount")))

    def _lock_finance_row(self):
        self.ensure_one()
        locked = self.sudo().try_lock_for_update()
        if not locked:
            raise ValidationError(
                "Another finance operation is already in progress. Please try again."
            )
        return locked

    def action_request_withdrawal(self, amount, payout_details=None):
        self.ensure_one()
        is_admin = (
            self.env.is_superuser()
            or self.env.user.has_group("dtf_core.group_dtf_admin")
        )
        is_owner = (
            self.env.user.has_group("dtf_core.group_dtf_designer")
            and self.designer_id.partner_id == self.env.user.partner_id
        )
        if not (is_admin or is_owner):
            raise AccessError(
                "You may request a withdrawal only for your own designer finance account."
            )
        return self.env["dtf.designer.withdrawal"].create({
            "finance_account_id": self.id,
            "amount": amount,
            "payout_details": payout_details or {},
        })

    @api.model_create_multi
    def create(self, vals_list):
        if not self.env.context.get("dtf_finance_internal"):
            raise AccessError("Designer finance accounts are created automatically.")
        return super().create(vals_list)

    def write(self, vals):
        if not self.env.context.get("dtf_finance_internal") and not (
            self.env.is_superuser()
            or self.env.user.has_group("dtf_core.group_dtf_admin")
        ):
            raise AccessError(
                "Only a DTF Administrator may change designer compensation overrides."
            )
        return super().write(vals)

    def unlink(self):
        raise ValidationError("Designer finance accounts cannot be deleted.")
