import base64

from odoo import fields
from odoo.exceptions import AccessError, ValidationError
from odoo.addons.sale.tests.common import TestSaleCommon


class TestDTFM7Finance(TestSaleCommon):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.designer_group = cls.env.ref("dtf_core.group_dtf_designer")
        cls.operator_group = cls.env.ref("dtf_core.group_dtf_printing_operator")
        cls.admin_group = cls.env.ref("dtf_core.group_dtf_admin")

        cls.admin_user = cls.env["res.users"].with_context(
            no_reset_password=True
        ).create({
            "name": "M7 DTF Administrator",
            "login": "m7-admin@example.test",
            "group_ids": [(6, 0, [cls.admin_group.id])],
        })

        cls.designer_partner = cls.env["res.partner"].create({
            "name": "M7 Designer",
            "email": "m7-designer@example.test",
            "dtf_designer_enabled": True,
        })
        cls.designer_user = cls.env["res.users"].with_context(
            no_reset_password=True
        ).create({
            "name": "M7 Designer",
            "login": "m7-designer@example.test",
            "partner_id": cls.designer_partner.id,
            "group_ids": [(6, 0, [cls.designer_group.id])],
        })
        cls.profile = cls.env["dtf.designer.profile"].with_user(
            cls.admin_user
        ).create({
            "partner_id": cls.designer_partner.id,
            "user_id": cls.designer_user.id,
            "authorized": True,
            "qualification_state": "authorized",
        })

        cls.operator_user = cls.env["res.users"].with_context(
            no_reset_password=True
        ).create({
            "name": "M7 Printing Operator",
            "login": "m7-operator@example.test",
            "group_ids": [(6, 0, [cls.operator_group.id])],
        })

        cls.design = cls.env["dtf.design"].with_user(cls.admin_user).create({
            "designer_id": cls.profile.id,
            "title_en": "M7 Design",
            "title_ar": "تصميم M7",
            "description_en": "Finance test",
            "description_ar": "اختبار التمويل",
            "product_type": "tshirt",
        })
        cls.attachment = cls.env["ir.attachment"].with_user(cls.admin_user).create({
            "name": "m7-master.png",
            "datas": base64.b64encode(
                b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
            ).decode(),
            "mimetype": "image/png",
        })
        cls.asset = cls.env["dtf.design.asset"].with_user(
            cls.admin_user
        ).with_context(
            dtf_preflight_migration=True
        ).create({
            "design_id": cls.design.id,
            "attachment_id": cls.attachment.id,
            "name": "m7-master.png",
            "file_format": "png",
            "mime_type": "image/png",
            "size_bytes": 72,
            "pixel_width": 4500,
            "pixel_height": 5400,
            "previewable": True,
            "readable": True,
            "analyzable": True,
        })
        cls.design.action_set_main_display_asset(cls.asset)
        cls.design.action_set_ready_to_print_master(cls.asset)

        cls.rule = cls.env["dtf.preflight.rule.version"].with_user(
            cls.admin_user
        ).create({
            "name": "M7 rule",
            "version": "m7-v1",
            "product_type": "tshirt",
            "min_effective_dpi": 300,
            "allowed_formats": ["png", "jpg", "jpeg", "webp", "svg", "pdf"],
        })
        cls.preflight = cls.env["dtf.preflight.result"].with_user(
            cls.admin_user
        ).create({
            "asset_id": cls.asset.id,
            "rule_version_id": cls.rule.id,
            "status": "accepted",
            "analyzer_snapshot": {
                "detected_format": "png",
                "readable": True,
                "analyzable": True,
                "previewable": True,
            },
            "locked": False,
        })

        cls.customer = cls.partner_a.copy({
            "name": "M7 Customer",
        })
        cls.product = cls._create_product(
            name="M7 Printable Shirt",
            lst_price=100.0,
            standard_price=60.0,
            is_storable=True,
            invoice_policy="order",
            dtf_product_type="tshirt",
        )
        cls.product_tmpl = cls.product.product_tmpl_id

        cls.env.company.write({
            "dtf_designer_compensation_mode": "percentage",
            "dtf_designer_commission_rate": 15.0,
            "dtf_designer_flat_royalty": 2.5,
            "dtf_minimum_withdrawal": 10.0,
        })

    def _create_order_line(self, price=100.0, quantity=2.0):
        order = self.env["sale.order"].create({
            "partner_id": self.customer.id,
        })
        line = self.env["sale.order.line"].create({
            "order_id": order.id,
            "product_id": self.product.id,
            "product_uom_qty": quantity,
            "price_unit": price,
            "dtf_design_id": self.design.id,
            "dtf_master_asset_id": self.asset.id,
        })
        line.action_capture_dtf_snapshots()
        order.action_confirm()
        return order, line

    def _invoice_and_pay(self, order, line):
        invoice = order._create_invoices()
        invoice.action_post()
        self.env["account.payment.register"].with_context(
            active_model="account.move",
            active_ids=invoice.ids,
        ).create({
            "payment_date": invoice.date or fields.Date.today(),
        })._create_payments()
        invoice.invalidate_recordset(["payment_state"])
        line.invalidate_recordset(["dtf_earning_ids"])
        self.assertEqual(invoice.payment_state, "paid")
        return invoice, line.dtf_earning_ids

    def test_native_company_settings_are_authoritative(self):
        settings = self.env["res.config.settings"].create({
            "company_id": self.env.company.id,
        })
        settings.write({
            "dtf_designer_compensation_mode": "flat",
            "dtf_designer_flat_royalty": 4.25,
            "dtf_minimum_withdrawal": 12.0,
        })
        self.env.company.invalidate_recordset([
            "dtf_designer_compensation_mode",
            "dtf_designer_flat_royalty",
            "dtf_minimum_withdrawal",
        ])
        self.assertEqual(self.env.company.dtf_designer_compensation_mode, "flat")
        self.assertEqual(self.env.company.dtf_designer_flat_royalty, 4.25)
        self.assertEqual(self.env.company.dtf_minimum_withdrawal, 12.0)

    def test_unpaid_native_sale_is_not_eligible(self):
        _order, line = self._create_order_line()
        line._dtf_create_earning_if_eligible(strict=False)
        self.assertFalse(line.dtf_earning_ids)

    def test_native_paid_invoice_hook_creates_immutable_idempotent_earning(self):
        order, line = self._create_order_line()
        invoice, earnings = self._invoice_and_pay(order, line)

        self.assertEqual(len(earnings), 1)
        earning = earnings
        self.assertEqual(earning.sale_line_id, line)
        self.assertEqual(earning.compensation_source, "company_default")
        self.assertEqual(earning.compensation_mode, "percentage")
        self.assertEqual(earning.commission_rate_snapshot, 15.0)
        self.assertEqual(earning.amount, 30.0)
        self.assertEqual(
            earning.payment_snapshot["invoices"][0]["payment_state"],
            "paid",
        )

        invoice._invoice_paid_hook()
        line.invalidate_recordset(["dtf_earning_ids"])
        self.assertEqual(len(line.dtf_earning_ids), 1)

        with self.assertRaises(ValidationError):
            earning.write({"amount": 999.0})
        with self.assertRaises(ValidationError):
            earning.unlink()

    def test_designer_override_and_company_changes_affect_future_only(self):
        order1, line1 = self._create_order_line()
        _invoice1, earning1 = self._invoice_and_pay(order1, line1)
        self.assertEqual(earning1.amount, 30.0)

        account = earning1.finance_account_id.with_user(self.admin_user)
        account.write({
            "override_enabled": True,
            "override_mode": "flat",
            "override_flat_royalty": 3.0,
        })

        order2, line2 = self._create_order_line()
        _invoice2, earning2 = self._invoice_and_pay(order2, line2)
        self.assertEqual(earning2.amount, 6.0)
        self.assertEqual(earning2.compensation_source, "designer_override")

        self.env.company.write({
            "dtf_designer_compensation_mode": "percentage",
            "dtf_designer_commission_rate": 40.0,
        })
        account.write({"override_enabled": False})

        order3, line3 = self._create_order_line()
        _invoice3, earning3 = self._invoice_and_pay(order3, line3)
        self.assertEqual(earning3.amount, 80.0)
        self.assertEqual(earning3.compensation_source, "company_default")

        earning1.invalidate_recordset()
        earning2.invalidate_recordset()
        self.assertEqual(earning1.amount, 30.0)
        self.assertEqual(earning2.amount, 6.0)

    def test_withdrawal_minimum_commitment_and_paid_ledger(self):
        order, line = self._create_order_line()
        _invoice, earning = self._invoice_and_pay(order, line)
        account = earning.finance_account_id
        self.assertEqual(account.ledger_balance, 30.0)

        with self.assertRaises(ValidationError):
            account.with_user(self.designer_user).action_request_withdrawal(5.0)

        withdrawal = account.with_user(
            self.designer_user
        ).action_request_withdrawal(
            20.0,
            {"method": "bank_transfer"},
        )
        with self.assertRaises(ValidationError):
            account.with_user(
                self.designer_user
            ).action_request_withdrawal(15.0)

        withdrawal.with_user(self.admin_user).action_approve()
        self.assertEqual(withdrawal.state, "approved")
        withdrawal.with_user(self.admin_user).action_mark_paid()
        self.assertEqual(withdrawal.state, "paid")

        account.invalidate_recordset()
        self.assertEqual(account.ledger_balance, 10.0)
        self.assertEqual(account.paid_withdrawals, 20.0)
        self.assertEqual(account.available_withdrawal, 10.0)

        paid_entries = self.env["dtf.finance.ledger"].search([
            ("withdrawal_id", "=", withdrawal.id),
            ("entry_type", "=", "withdrawal_paid"),
        ])
        self.assertEqual(len(paid_entries), 1)
        self.assertEqual(paid_entries.amount, -20.0)

    def test_rejection_requires_reason_and_is_terminal(self):
        order, line = self._create_order_line()
        _invoice, earning = self._invoice_and_pay(order, line)
        withdrawal = earning.finance_account_id.with_user(
            self.designer_user
        ).action_request_withdrawal(10.0)

        with self.assertRaises(ValidationError):
            withdrawal.with_user(self.admin_user).action_reject()

        withdrawal.with_user(self.admin_user).action_reject(
            "Payout details require correction."
        )
        self.assertEqual(withdrawal.state, "rejected")
        with self.assertRaises(ValidationError):
            withdrawal.with_user(self.admin_user).action_approve()

    def test_designer_isolation_and_operator_has_no_finance_access(self):
        order, line = self._create_order_line()
        _invoice, earning = self._invoice_and_pay(order, line)

        other_partner = self.env["res.partner"].create({
            "name": "Other M7 Designer",
            "email": "m7-other@example.test",
            "dtf_designer_enabled": True,
        })
        other_user = self.env["res.users"].with_context(
            no_reset_password=True
        ).create({
            "name": "Other M7 Designer",
            "login": "m7-other@example.test",
            "partner_id": other_partner.id,
            "group_ids": [(6, 0, [self.designer_group.id])],
        })
        self.env["dtf.designer.profile"].with_user(other_user).create({
            "partner_id": other_partner.id,
            "user_id": other_user.id,
        })

        own = self.env["dtf.designer.earning"].with_user(
            self.designer_user
        ).search([("id", "=", earning.id)])
        self.assertEqual(own.id, earning.id)

        other = self.env["dtf.designer.earning"].with_user(
            other_user
        ).search([("id", "=", earning.id)])
        self.assertFalse(other)

        with self.assertRaises(AccessError):
            self.env["dtf.designer.earning"].with_user(
                self.operator_user
            ).search([]).read(["amount"])
