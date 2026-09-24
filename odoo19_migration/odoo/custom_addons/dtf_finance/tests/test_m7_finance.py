import base64
from unittest.mock import patch

from odoo.exceptions import AccessError, ValidationError
from odoo.tests.common import TransactionCase


class TestDTFM7Finance(TransactionCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.designer_group = cls.env.ref("dtf_core.group_dtf_designer")
        cls.operator_group = cls.env.ref("dtf_core.group_dtf_printing_operator")

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
        cls.profile = cls.env["dtf.designer.profile"].create({
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

        cls.design = cls.env["dtf.design"].create({
            "designer_id": cls.profile.id,
            "title_en": "M7 Design",
            "title_ar": "تصميم M7",
            "description_en": "Finance test",
            "description_ar": "اختبار التمويل",
            "product_type": "tshirt",
        })
        cls.attachment = cls.env["ir.attachment"].create({
            "name": "m7-master.png",
            "datas": base64.b64encode(
                b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
            ).decode(),
            "mimetype": "image/png",
        })
        cls.asset = cls.env["dtf.design.asset"].with_context(
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

        cls.rule = cls.env["dtf.preflight.rule.version"].create({
            "name": "M7 rule",
            "version": "m7-v1",
            "product_type": "tshirt",
            "min_effective_dpi": 300,
            "allowed_formats": ["png", "jpg", "jpeg", "webp", "svg", "pdf"],
        })
        cls.preflight = cls.env["dtf.preflight.result"].create({
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

        cls.customer = cls.env["res.partner"].create({
            "name": "M7 Customer",
        })
        cls.product_tmpl = cls.env["product.template"].create({
            "name": "M7 Printable Shirt",
            "list_price": 100.0,
            "is_storable": True,
            "dtf_product_type": "tshirt",
        })
        cls.product = cls.product_tmpl.product_variant_id

        cls.policy = cls.env["dtf.finance.policy"]._get_for_company(
            cls.env.company
        )
        cls.policy.write({
            "compensation_mode": "percentage",
            "commission_rate": 15.0,
            "flat_royalty": 2.5,
            "minimum_withdrawal": 10.0,
        })

    def _create_paid_candidate(self, price=100.0, quantity=2.0):
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

    def _capture_with_paid_evidence(self, line):
        evidence = {
            "invoice_ids": [900001],
            "invoices": [{
                "id": 900001,
                "name": "M7-PAID-INVOICE",
                "state": "posted",
                "payment_state": "paid",
                "amount_total": line.price_total,
                "currency_id": line.currency_id.id,
            }],
            "captured_at": "2026-09-24 12:00:00",
        }
        with patch.object(
            type(line),
            "_dtf_finance_payment_evidence",
            autospec=True,
            return_value=evidence,
        ):
            return line.action_create_dtf_earning()

    def test_unpaid_native_sale_is_not_eligible(self):
        _order, line = self._create_paid_candidate()
        with self.assertRaisesRegex(
            ValidationError,
            "fully paid native Odoo customer-invoice evidence",
        ):
            line.action_create_dtf_earning()

    def test_percentage_earning_is_immutable_and_idempotent(self):
        order, line = self._create_paid_candidate(price=100.0, quantity=2.0)
        earning = self._capture_with_paid_evidence(line)
        again = self._capture_with_paid_evidence(line)

        self.assertEqual(earning, again)
        self.assertEqual(earning.sale_order_id, order)
        self.assertEqual(earning.sale_line_id, line)
        self.assertEqual(earning.preflight_result_id, self.preflight)
        self.assertEqual(earning.compensation_source, "global_policy")
        self.assertEqual(earning.compensation_mode, "percentage")
        self.assertEqual(earning.commission_rate_snapshot, 15.0)
        self.assertEqual(earning.amount, 30.0)

        ledger = self.env["dtf.finance.ledger"].search([
            ("earning_id", "=", earning.id),
        ])
        self.assertEqual(len(ledger), 1)
        self.assertEqual(ledger.amount, 30.0)

        with self.assertRaisesRegex(ValidationError, "immutable"):
            earning.write({"amount": 1.0})
        with self.assertRaisesRegex(ValidationError, "immutable"):
            ledger.unlink()

    def test_designer_override_and_policy_changes_affect_future_only(self):
        _order1, line1 = self._create_paid_candidate(
            price=100.0,
            quantity=2.0,
        )
        first = self._capture_with_paid_evidence(line1)
        account = first.finance_account_id

        account.write({
            "override_enabled": True,
            "override_mode": "flat",
            "override_flat_royalty": 2.5,
        })
        _order2, line2 = self._create_paid_candidate(
            price=50.0,
            quantity=3.0,
        )
        second = self._capture_with_paid_evidence(line2)
        self.assertEqual(second.compensation_source, "designer_override")
        self.assertEqual(second.compensation_mode, "flat")
        self.assertEqual(second.amount, 7.5)

        self.policy.write({"commission_rate": 20.0})
        self.assertEqual(first.amount, 30.0)
        self.assertEqual(first.commission_rate_snapshot, 15.0)

        account.write({"override_enabled": False})
        _order3, line3 = self._create_paid_candidate(
            price=50.0,
            quantity=1.0,
        )
        third = self._capture_with_paid_evidence(line3)
        self.assertEqual(third.compensation_source, "global_policy")
        self.assertEqual(third.commission_rate_snapshot, 20.0)
        self.assertEqual(third.amount, 10.0)

    def test_withdrawal_minimum_commitment_and_paid_ledger(self):
        _order, line = self._create_paid_candidate(
            price=100.0,
            quantity=2.0,
        )
        earning = self._capture_with_paid_evidence(line)
        account = earning.finance_account_id

        with self.assertRaisesRegex(ValidationError, "minimum withdrawal"):
            account.with_user(self.designer_user).action_request_withdrawal(
                5.0,
                {"method": "cliq", "alias": "m7"},
            )

        withdrawal = account.with_user(
            self.designer_user
        ).action_request_withdrawal(
            20.0,
            {"method": "cliq", "alias": "m7"},
        )
        self.assertEqual(withdrawal.state, "requested")

        with self.assertRaisesRegex(ValidationError, "available balance"):
            account.with_user(self.designer_user).action_request_withdrawal(
                15.0,
                {"method": "cliq", "alias": "m7"},
            )

        withdrawal.action_approve()
        self.assertEqual(withdrawal.state, "approved")
        withdrawal.action_mark_paid()
        self.assertEqual(withdrawal.state, "paid")

        debit = self.env["dtf.finance.ledger"].search([
            ("withdrawal_id", "=", withdrawal.id),
        ])
        self.assertEqual(len(debit), 1)
        self.assertEqual(debit.amount, -20.0)

        account.invalidate_recordset()
        self.assertEqual(account.ledger_balance, 10.0)
        self.assertEqual(account.paid_withdrawals, 20.0)

        with self.assertRaisesRegex(
            ValidationError,
            "Only an approved withdrawal",
        ):
            withdrawal.action_mark_paid()

    def test_rejection_requires_reason_and_is_terminal(self):
        _order, line = self._create_paid_candidate()
        earning = self._capture_with_paid_evidence(line)
        withdrawal = earning.finance_account_id.with_user(
            self.designer_user
        ).action_request_withdrawal(10.0, {})

        with self.assertRaisesRegex(ValidationError, "rejection reason"):
            withdrawal.action_reject()

        withdrawal.action_reject("Bank details could not be verified.")
        self.assertEqual(withdrawal.state, "rejected")
        self.assertEqual(
            withdrawal.rejection_reason,
            "Bank details could not be verified.",
        )

        with self.assertRaisesRegex(
            ValidationError,
            "Only a requested withdrawal",
        ):
            withdrawal.action_approve()

    def test_designer_isolation_and_operator_has_no_finance_access(self):
        _order, line = self._create_paid_candidate()
        earning = self._capture_with_paid_evidence(line)
        own_account = earning.finance_account_id

        other_partner = self.env["res.partner"].create({
            "name": "M7 Other Designer",
            "email": "m7-other@example.test",
            "dtf_designer_enabled": True,
        })
        other_user = self.env["res.users"].with_context(
            no_reset_password=True
        ).create({
            "name": "M7 Other Designer",
            "login": "m7-other@example.test",
            "partner_id": other_partner.id,
            "group_ids": [(6, 0, [self.designer_group.id])],
        })
        other_profile = self.env["dtf.designer.profile"].create({
            "partner_id": other_partner.id,
            "user_id": other_user.id,
            "authorized": True,
            "qualification_state": "authorized",
        })
        self.env["dtf.designer.finance.account"]._get_for_designer(
            other_profile,
            self.env.company,
        )

        designer_accounts = self.env[
            "dtf.designer.finance.account"
        ].with_user(self.designer_user).search([])
        self.assertEqual(designer_accounts, own_account.with_user(self.designer_user))

        designer_earnings = self.env[
            "dtf.designer.earning"
        ].with_user(self.designer_user).search([])
        self.assertEqual(designer_earnings, earning.with_user(self.designer_user))

        with self.assertRaises(AccessError):
            self.env["dtf.designer.earning"].with_user(
                self.operator_user
            ).search([])
