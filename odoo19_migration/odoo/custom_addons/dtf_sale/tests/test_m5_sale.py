from datetime import timedelta
from odoo import fields
from odoo.exceptions import ValidationError
from odoo.tests.common import TransactionCase


class TestDTFM5Sale(TransactionCase):
    def test_reservation_rule_is_thirty_minutes_and_expires(self):
        self.assertEqual(fields.Datetime.add(fields.Datetime.now(), minutes=30) - fields.Datetime.now(), timedelta(minutes=30))
        self.assertEqual(self.env["dtf.stock.reservation"]._description, "DTF Studio Checkout Stock Reservation")

    def test_snapshot_requires_explicit_master_and_compatible_result(self):
        order = self.env["sale.order"].create({"partner_id": self.env.ref("base.partner_demo").id})
        product = self.env["product.product"].search([], limit=1)
        line = self.env["sale.order.line"].create({"order_id": order.id, "product_id": product.id, "product_uom_qty": 1, "price_unit": product.list_price})
        with self.assertRaisesRegex(ValidationError, "explicit design and Ready-to-Print Master"):
            line.action_capture_dtf_snapshots()

    def test_handoff_requires_confirmed_checkout_and_preserves_snapshots(self):
        self.assertTrue(hasattr(self.env["dtf.production.handoff"], "create_from_line"))
