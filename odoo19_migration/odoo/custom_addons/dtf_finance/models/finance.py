from odoo import api, fields, models
from odoo.exceptions import AccessError, ValidationError
from odoo.tools.float_utils import float_compare


COMPENSATION_MODES = [
    ("percentage", "Percentage"),
    ("flat", "Flat Royalty per Unit"),
]

WITHDRAWAL_STATES = [
    ("requested", "Requested"),
    ("approved", "Approved"),
    ("rejected", "Rejected"),
    ("paid", "Paid"),
]


class DTFFinancePolicy(models.Model):
    _name = "dtf.finance.policy"
    _description = "DTF Studio Finance Policy"
    _order = "company_id, id"

    company_id = fields.Many2one(
        "res.company",
        required=True,
        default=lambda self: self.env.company,
        ondelete="cascade",
        index=True,
    )
    currency_id = fields.Many2one(
        related="company_id.currency_id",
        store=True,
        readonly=True,
    )
    compensation_mode = fields.Selection(
        COMPENSATION_MODES,
        required=True,
        default="percentage",
    )
    commission_rate = fields.Float(
        string="Default Designer Commission %",
        default=15.0,
        digits=(16, 4),
    )
    flat_royalty = fields.Monetary(
        string="Default Flat Royalty per Unit",
        currency_field="currency_id",
        default=2.5,
    )
    minimum_withdrawal = fields.Monetary(
        string="Minimum Withdrawal",
        currency_field="currency_id",
        default=10.0,
    )

    _company_unique = models.Constraint(
        "UNIQUE(company_id)",
        "Only one DTF finance policy is allowed per company.",
    )

    @api.constrains("commission_rate", "flat_royalty", "minimum_withdrawal")
    def _check_values(self):
        for record in self:
            if record.commission_rate < 0 or record.commission_rate > 100:
                raise ValidationError("Designer commission must be between 0 and 100 percent.")
            if record.flat_royalty < 0:
                raise ValidationError("Designer flat royalty cannot be negative.")
            if record.minimum_withdrawal < 0:
                raise ValidationError("Minimum withdrawal cannot be negative.")

    @api.model
    def _get_for_company(self, company):
        company = company or self.env.company
        policy = self.sudo().search([("company_id", "=", company.id)], limit=1)
        if not policy:
            policy = self.sudo().with_context(dtf_finance_internal=True).create({
                "company_id": company.id,
            })
        return policy

    def _require_admin(self):
        if not (
            self.env.is_superuser()
            or self.env.user.has_group("dtf_core.group_dtf_admin")
        ):
            raise AccessError("DTF Administrator permission is required.")

    @api.model_create_multi
    def create(self, vals_list):
        if not self.env.context.get("dtf_finance_internal"):
            self._require_admin()
        return super().create(vals_list)

    def write(self, vals):
        if not self.env.context.get("dtf_finance_internal"):
            self._require_admin()
        return super().write(vals)

    def unlink(self):
        raise ValidationError("DTF finance policy records cannot be deleted.")


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
            if record.override_commission_rate < 0 or record.override_commission_rate > 100:
                raise ValidationError("Designer commission override must be between 0 and 100 percent.")
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
                    lambda w: w.state in ("requested", "approved")
                ).mapped("amount")
            )
            record.paid_withdrawals = sum(
                account.withdrawal_ids.filtered(
                    lambda w: w.state == "paid"
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
        policy = self.env["dtf.finance.policy"]._get_for_company(account.company_id)
        if account.override_enabled:
            return {
                "source": "designer_override",
                "mode": account.override_mode,
                "commission_rate": account.override_commission_rate,
                "flat_royalty": account.override_flat_royalty,
                "policy_id": policy.id,
            }
        return {
            "source": "global_policy",
            "mode": policy.compensation_mode,
            "commission_rate": policy.commission_rate,
            "flat_royalty": policy.flat_royalty,
            "policy_id": policy.id,
        }

    def _available_excluding(self, withdrawal=None):
        self.ensure_one()
        account = self.sudo()
        ledger_balance = sum(account.ledger_entry_ids.mapped("amount"))
        committed = account.withdrawal_ids.filtered(
            lambda w: w.state in ("requested", "approved")
            and (not withdrawal or w.id != withdrawal.id)
        )
        return max(0.0, ledger_balance - sum(committed.mapped("amount")))

    def _lock_finance_row(self):
        self.ensure_one()
        self.env.cr.execute(
            "SELECT id FROM dtf_designer_finance_account WHERE id = %s FOR UPDATE",
            [self.id],
        )

    def action_request_withdrawal(self, amount, payout_details=None):
        self.ensure_one()
        if not (
            self.env.is_superuser()
            or self.env.user.has_group("dtf_core.group_dtf_admin")
            or (
                self.env.user.has_group("dtf_core.group_dtf_designer")
                and self.designer_id.partner_id == self.env.user.partner_id
            )
        ):
            raise AccessError("You may request a withdrawal only for your own designer finance account.")
        return self.env["dtf.designer.withdrawal"].create({
            "finance_account_id": self.id,
            "amount": amount,
            "payout_details": payout_details or {},
        })

    @api.model_create_multi
    def create(self, vals_list):
        if not self.env.context.get("dtf_finance_internal") and not (
            self.env.is_superuser()
            or self.env.user.has_group("dtf_core.group_dtf_admin")
        ):
            raise AccessError("Only a DTF Administrator may create finance accounts.")
        return super().create(vals_list)

    def write(self, vals):
        if not self.env.context.get("dtf_finance_internal") and not (
            self.env.is_superuser()
            or self.env.user.has_group("dtf_core.group_dtf_admin")
        ):
            raise AccessError("Only a DTF Administrator may change finance-account policy.")
        return super().write(vals)

    def unlink(self):
        raise ValidationError("Designer finance accounts cannot be deleted.")


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
            ("global_policy", "Global Policy"),
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
            raise AccessError("Designer earnings are created only by the DTF finance engine.")
        records = super().create(vals_list)
        ledger = self.env["dtf.finance.ledger"].sudo()
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
        raise ValidationError("Designer earning snapshots are immutable and cannot be deleted.")

    @api.model
    def _cron_capture_paid_sales(self):
        lines = self.env["sale.order.line"].sudo().search([
            ("dtf_design_id", "!=", False),
            ("dtf_master_asset_id", "!=", False),
            ("dtf_earning_ids", "=", False),
            ("order_id.state", "in", ("sale", "done")),
        ], limit=200)
        for line in lines:
            line._dtf_create_earning_if_eligible(strict=False)
        return True


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
            raise AccessError("Finance ledger entries are created only by the DTF finance engine.")
        return super().create(vals_list)

    def write(self, vals):
        raise ValidationError("Finance ledger entries are immutable.")

    def unlink(self):
        raise ValidationError("Finance ledger entries are immutable and cannot be deleted.")


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
        records = self.browse()
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
            if not is_admin:
                if not (
                    self.env.user.has_group("dtf_core.group_dtf_designer")
                    and account.designer_id.partner_id == self.env.user.partner_id
                ):
                    raise AccessError("Designers may request withdrawals only from their own finance account.")

            account.sudo()._lock_finance_row()
            policy = self.env["dtf.finance.policy"]._get_for_company(account.company_id)
            amount = float(vals.get("amount") or 0.0)
            currency = account.currency_id

            if currency.compare_amounts(amount, 0.0) <= 0:
                raise ValidationError("Withdrawal amount must be greater than zero.")
            if currency.compare_amounts(amount, policy.minimum_withdrawal) < 0:
                raise ValidationError(
                    "Withdrawal amount is below the minimum withdrawal of %s."
                    % policy.minimum_withdrawal
                )
            if currency.compare_amounts(
                amount,
                account.sudo()._available_excluding(),
            ) > 0:
                raise ValidationError("Withdrawal exceeds the designer's available balance.")

            vals.update({
                "finance_account_id": account.id,
                "state": "requested",
                "requested_at": fields.Datetime.now(),
                "payout_details": dict(vals.get("payout_details") or {}),
            })
            records |= super(DTFDesignerWithdrawal, self).create(vals)
        return records

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

        raise AccessError("Withdrawal records may be changed only through the approved finance transitions.")

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
            if withdrawal.currency_id.compare_amounts(withdrawal.amount, available) > 0:
                raise ValidationError("Withdrawal exceeds the designer's currently payoutable balance.")
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


class SaleOrderLine(models.Model):
    _inherit = "sale.order.line"

    dtf_earning_ids = fields.One2many(
        "dtf.designer.earning",
        "sale_line_id",
        string="DTF Designer Earnings",
        readonly=True,
    )

    def _dtf_finance_payment_evidence(self):
        self.ensure_one()
        if self.order_id.state not in ("sale", "done"):
            return False

        invoice_lines = self.invoice_lines.filtered(
            lambda inv_line:
                inv_line.move_id.state == "posted"
                and inv_line.move_id.move_type == "out_invoice"
        )
        if not invoice_lines:
            return False

        posted_refunds = self.invoice_lines.filtered(
            lambda inv_line:
                inv_line.move_id.state == "posted"
                and inv_line.move_id.move_type == "out_refund"
        )
        if posted_refunds:
            return False

        if float_compare(
            self.qty_invoiced_posted,
            self.product_uom_qty,
            precision_rounding=self.product_uom_id.rounding,
        ) < 0:
            return False

        invoices = invoice_lines.mapped("move_id")
        if any(invoice.payment_state != "paid" for invoice in invoices):
            return False

        return {
            "invoice_ids": invoices.ids,
            "invoices": [
                {
                    "id": invoice.id,
                    "name": invoice.name,
                    "state": invoice.state,
                    "payment_state": invoice.payment_state,
                    "amount_total": invoice.amount_total,
                    "currency_id": invoice.currency_id.id,
                }
                for invoice in invoices
            ],
            "captured_at": fields.Datetime.to_string(fields.Datetime.now()),
        }

    def _dtf_create_earning_if_eligible(self, strict=False):
        earnings = self.env["dtf.designer.earning"]
        for line in self:
            existing = earnings.sudo().search([
                ("sale_line_id", "=", line.id),
            ], limit=1)
            if existing:
                earnings |= existing.with_user(self.env.user)
                continue

            def fail(message):
                if strict:
                    raise ValidationError(message)
                return False

            if not line.dtf_design_id or not line.dtf_master_asset_id:
                fail("A DTF earning requires an explicit design and Ready-to-Print Master.")
                continue

            snapshot = dict(line.dtf_preflight_snapshot or {})
            result_id = snapshot.get("result_id")
            if snapshot.get("status") != "accepted" or not result_id:
                fail("A DTF earning requires the immutable accepted preflight snapshot.")
                continue

            preflight = self.env["dtf.preflight.result"].sudo().browse(result_id).exists()
            if (
                not preflight
                or preflight.asset_id != line.dtf_master_asset_id
                or preflight.status != "accepted"
            ):
                fail("The earning preflight evidence does not match the exact Ready-to-Print Master.")
                continue

            payment_evidence = line._dtf_finance_payment_evidence()
            if not payment_evidence:
                fail("Designer earning requires fully paid native Odoo customer-invoice evidence.")
                continue

            designer = line.dtf_design_id.designer_id
            if not designer:
                fail("The DTF design has no designer finance owner.")
                continue

            company = line.company_id
            finance_account = self.env[
                "dtf.designer.finance.account"
            ]._get_for_designer(designer, company)
            compensation = finance_account._resolved_compensation()

            conversion_date = (
                fields.Date.to_date(line.order_id.date_order)
                or fields.Date.context_today(line)
            )
            source_amount = line.price_subtotal
            source_in_company_currency = line.currency_id._convert(
                source_amount,
                company.currency_id,
                company,
                conversion_date,
            )

            if compensation["mode"] == "percentage":
                amount = company.currency_id.round(
                    source_in_company_currency
                    * compensation["commission_rate"]
                    / 100.0
                )
            else:
                amount = company.currency_id.round(
                    compensation["flat_royalty"] * line.product_uom_qty
                )

            earning = earnings.sudo().with_context(
                dtf_finance_internal=True
            ).create({
                "finance_account_id": finance_account.id,
                "sale_order_id": line.order_id.id,
                "sale_line_id": line.id,
                "design_id": line.dtf_design_id.id,
                "master_asset_id": line.dtf_master_asset_id.id,
                "preflight_result_id": preflight.id,
                "quantity": line.product_uom_qty,
                "source_amount": source_amount,
                "source_currency_id": line.currency_id.id,
                "compensation_source": compensation["source"],
                "compensation_mode": compensation["mode"],
                "commission_rate_snapshot": compensation["commission_rate"],
                "flat_royalty_snapshot": compensation["flat_royalty"],
                "amount": amount,
                "preflight_snapshot": snapshot,
                "payment_snapshot": payment_evidence,
            })
            earnings |= earning.with_user(self.env.user)
        return earnings

    def action_create_dtf_earning(self):
        if not (
            self.env.is_superuser()
            or self.env.user.has_group("dtf_core.group_dtf_admin")
        ):
            raise AccessError("Only a DTF Administrator may capture designer earnings manually.")
        return self._dtf_create_earning_if_eligible(strict=True)
