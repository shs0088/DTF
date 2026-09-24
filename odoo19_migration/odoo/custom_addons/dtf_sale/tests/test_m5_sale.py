from odoo.exceptions import ValidationError
from odoo.tests.common import TransactionCase


class TestDTFM5Sale(TransactionCase):
    def test_native_sale_order_is_authoritative(self):
        order = self.env["sale.order"].create({"partner_id": self.env.user.partner_id.id})
        self.assertIn(order.state, ("draft", "sent"))
        self.assertFalse(hasattr(order, "dtf_checkout_expires_at"))
        self.assertFalse(self.env["sale.order.line"]._fields.get("dtf_reservation_id"))

    def test_snapshot_requires_explicit_master_and_compatible_result(self):
        partner = self.env["res.partner"].create({"name": "M5 Customer"})
        order = self.env["sale.order"].create({"partner_id": partner.id})
        product = self.env["product.product"].create({"name": "M5 Product", "list_price": 10})
        line = self.env["sale.order.line"].create({"order_id": order.id, "product_id": product.id, "product_uom_qty": 1, "price_unit": product.list_price})
        with self.assertRaisesRegex(ValidationError, "explicit design and Ready-to-Print Master"):
            line.action_capture_dtf_snapshots()

