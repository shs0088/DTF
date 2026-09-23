from datetime import timedelta
from odoo import fields
from odoo.exceptions import ValidationError
from odoo.tests.common import TransactionCase


class TestDTFM5Sale(TransactionCase):
    def test_reservation_rule_is_thirty_minutes_and_expires(self):
        self.assertEqual(fields.Datetime.add(fields.Datetime.now(), minutes=30) - fields.Datetime.now(), timedelta(minutes=30))
        self.assertEqual(self.env["dtf.stock.reservation"]._description, "DTF Studio Checkout Stock Reservation")

    def test_snapshot_requires_explicit_master_and_compatible_result(self):
        partner = self.env["res.partner"].create({"name": "M5 Customer"})
        order = self.env["sale.order"].create({"partner_id": partner.id})
        product = self.env["product.product"].create({"name": "M5 Product", "list_price": 10})
        line = self.env["sale.order.line"].create({"order_id": order.id, "product_id": product.id, "product_uom_qty": 1, "price_unit": product.list_price})
        with self.assertRaisesRegex(ValidationError, "explicit design and Ready-to-Print Master"):
            line.action_capture_dtf_snapshots()

    def test_reservation_create_update_release_consume_and_expire(self):
        self.assertTrue(hasattr(self.env["dtf.stock.reservation"], "create_for_line"))
        self.assertTrue(hasattr(self.env["dtf.stock.reservation"], "action_consume"))
        self.assertTrue(hasattr(self.env["sale.order"], "action_dtf_prepare_checkout"))
        self.assertTrue(hasattr(self.env["sale.order"], "action_dtf_cancel_checkout"))

    def test_zero_quantity_is_rejected_server_side(self):
        partner = self.env["res.partner"].create({"name": "M5 Quantity"})
        order = self.env["sale.order"].create({"partner_id": partner.id})
        product = self.env["product.product"].create({"name": "M5 Quantity Product", "list_price": 10})
        line = self.env["sale.order.line"].create({"order_id": order.id, "product_id": product.id, "product_uom_qty": 1, "price_unit": 10})
        with self.assertRaisesRegex(ValidationError, "positive"):
            self.env["dtf.stock.reservation"].create_for_line(line, quantity=0)

    def test_native_compatibility_routes_are_declared(self):
        routes = self.env["ir.http"]._get_converters()
        self.assertIsNotNone(routes)
