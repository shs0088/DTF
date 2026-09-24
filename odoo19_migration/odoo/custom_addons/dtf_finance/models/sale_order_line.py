from odoo import fields, models
from odoo.exceptions import ValidationError
from odoo.tools.float_utils import float_compare


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
            lambda invoice_line:
                invoice_line.move_id.state == "posted"
                and invoice_line.move_id.move_type == "out_invoice"
        )
        if not invoice_lines:
            return False

        posted_refunds = self.invoice_lines.filtered(
            lambda invoice_line:
                invoice_line.move_id.state == "posted"
                and invoice_line.move_id.move_type == "out_refund"
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
        result = earnings.browse()
        for line in self:
            existing = earnings.sudo().search([
                ("sale_line_id", "=", line.id),
            ], limit=1)
            if existing:
                result |= existing.with_user(self.env.user)
                continue

            def fail(message):
                if strict:
                    raise ValidationError(message)
                return False

            if not line.dtf_design_id or not line.dtf_master_asset_id:
                fail(
                    "A DTF earning requires an explicit design and Ready-to-Print Master."
                )
                continue

            snapshot = dict(line.dtf_preflight_snapshot or {})
            result_id = snapshot.get("result_id")
            if snapshot.get("status") != "accepted" or not result_id:
                fail(
                    "A DTF earning requires the immutable accepted preflight snapshot."
                )
                continue

            preflight = self.env["dtf.preflight.result"].sudo().browse(
                result_id
            ).exists()
            if (
                not preflight
                or preflight.asset_id != line.dtf_master_asset_id
                or preflight.status != "accepted"
            ):
                fail(
                    "The earning preflight evidence does not match the exact Ready-to-Print Master."
                )
                continue

            payment_evidence = line._dtf_finance_payment_evidence()
            if not payment_evidence:
                fail(
                    "Designer earning requires native Odoo paid invoice evidence."
                )
                continue

            designer = line.sudo().dtf_design_id.designer_id
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
            result |= earning.with_user(self.env.user)
        return result
