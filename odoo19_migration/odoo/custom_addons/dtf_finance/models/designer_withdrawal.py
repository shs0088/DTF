from odoo import api, fields, models
from odoo.exceptions import AccessError, ValidationError

from .constants import WITHDRAWAL_STATES


class DTFDesignerWithdrawal(models.Model):
    _name = "dtf.designer.withdrawal"
    _description = "DTF Designer Withdrawal"
    _inherit = ["mail.thread", "mail.activity.mixin"]
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
    amount = fields.Monetary(
        currency_field="currency_id",
        required=True,
        tracking=True,
    )
    state = fields.Selection(
        WITHDRAWAL_STATES,
        required=True,
        default="requested",
        index=True,
        tracking=True,
    )
    payout_details = fields.Json(default=dict, readonly=True)
    rejection_reason = fields.Text(tracking=True)
    requested_at = fields.Datetime(readonly=True)
    approved_at = fields.Datetime(readonly=True)
    rejected_at = fields.Datetime(readonly=True)
    paid_at = fields.Datetime(readonly=True)
    approved_by_id = fields.Many2one("res.users", readonly=True)
    rejected_by_id = fields.Many2one("res.users", readonly=True)
    paid_by_id = fields.Many2one("res.users", readonly=True)

    def _require_admin(self):
        if not (
            self.env.is_superuser()
            or self.env.user.has_group("dtf_core.group_dtf_admin")
        ):
            raise AccessError("DTF Administrator permission is required.")

    @api.model_create_multi
    def create(self, vals_list):
        prepared = []
        for incoming in vals_list:
            vals = dict(incoming)
            account = self.env["dtf.designer.finance.account"].browse(
                vals.get("finance_account_id")
            ).exists()
            if not account:
                raise ValidationError("A valid designer finance account is required.")

            is_admin = (
                self.env.is_superuser()
                or self.env.user.has_group("dtf_core.group_dtf_admin")
            )
            is_owner = (
                self.env.user.has_group("dtf_core.group_dtf_designer")
                and account.designer_id.partner_id == self.env.user.partner_id
            )
            if not (is_admin or is_owner):
                raise AccessError(
                    "Designers may request withdrawals only from their own finance account."
                )

            account.sudo()._lock_finance_row()
            amount = float(vals.get("amount") or 0.0)
            currency = account.currency_id
            minimum = account.company_id.sudo().dtf_minimum_withdrawal

            if currency.compare_amounts(amount, 0.0) <= 0:
                raise ValidationError("Withdrawal amount must be greater than zero.")
            if currency.compare_amounts(amount, minimum) < 0:
                raise ValidationError(
                    "Withdrawal amount is below the company minimum withdrawal of %s."
                    % minimum
                )
            if currency.compare_amounts(
                amount,
                account.sudo()._available_excluding(),
            ) > 0:
                raise ValidationError(
                    "Withdrawal exceeds the designer's available balance."
                )

            vals.update({
                "finance_account_id": account.id,
                "state": "requested",
                "requested_at": fields.Datetime.now(),
                "payout_details": dict(vals.get("payout_details") or {}),
            })
            prepared.append(vals)
        return super().create(prepared)

    def write(self, vals):
        if self.env.context.get("dtf_finance_transition"):
            return super().write(vals)

        if (
            set(vals) <= {"rejection_reason"}
            and (
                self.env.is_superuser()
                or self.env.user.has_group("dtf_core.group_dtf_admin")
            )
            and all(record.state == "requested" for record in self)
        ):
            return super().write(vals)

        raise AccessError(
            "Withdrawal records may be changed only through the approved finance transitions."
        )

    def unlink(self):
        raise ValidationError("Withdrawal history is protected and cannot be deleted.")

    def action_approve(self):
        self._require_admin()
        for withdrawal in self:
            if withdrawal.state != "requested":
                raise ValidationError("Only a requested withdrawal can be approved.")
            account = withdrawal.finance_account_id.sudo()
            account._lock_finance_row()
            available = account._available_excluding(withdrawal)
            if withdrawal.currency_id.compare_amounts(
                withdrawal.amount,
                available,
            ) > 0:
                raise ValidationError(
                    "Withdrawal exceeds the designer's currently payoutable balance."
                )
            withdrawal.with_context(dtf_finance_transition=True).write({
                "state": "approved",
                "approved_at": fields.Datetime.now(),
                "approved_by_id": self.env.user.id,
            })
        return True

    def action_reject(self, reason=None):
        self._require_admin()
        for withdrawal in self:
            if withdrawal.state != "requested":
                raise ValidationError("Only a requested withdrawal can be rejected.")
            clean_reason = (reason or withdrawal.rejection_reason or "").strip()
            if not clean_reason:
                raise ValidationError("A rejection reason is required.")
            withdrawal.with_context(dtf_finance_transition=True).write({
                "state": "rejected",
                "rejection_reason": clean_reason,
                "rejected_at": fields.Datetime.now(),
                "rejected_by_id": self.env.user.id,
            })
        return True

    def action_mark_paid(self):
        self._require_admin()
        ledger_model = self.env["dtf.finance.ledger"]
        for withdrawal in self:
            if withdrawal.state != "approved":
                raise ValidationError("Only an approved withdrawal can be marked paid.")
            account = withdrawal.finance_account_id.sudo()
            account._lock_finance_row()
            ledger_model._create_entry(
                finance_account=account,
                entry_type="withdrawal_paid",
                amount=-abs(withdrawal.amount),
                reference_key="withdrawal:%s" % withdrawal.id,
                withdrawal=withdrawal,
            )
            withdrawal.with_context(dtf_finance_transition=True).write({
                "state": "paid",
                "paid_at": fields.Datetime.now(),
                "paid_by_id": self.env.user.id,
            })
        return True
