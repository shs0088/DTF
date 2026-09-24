from odoo.addons.dtf_api.controllers.api import DTFAPI
from odoo.tests.common import TransactionCase


class TestDTFM5NativeAPI(TransactionCase):
    def test_native_cart_and_route_contract(self):
        self.assertTrue(hasattr(self.env["website"], "_create_cart"))
        self.assertTrue(hasattr(self.env["sale.order"], "_cart_add"))
        self.assertTrue(hasattr(self.env["sale.order"], "_cart_update_line_quantity"))

        self.assertEqual(getattr(DTFAPI.cart_add, "routing", {}).get("type"), "jsonrpc")
        self.assertEqual(getattr(DTFAPI.cart_line_update, "routing", {}).get("type"), "jsonrpc")
        self.assertEqual(getattr(DTFAPI.cart_line_delete, "routing", {}).get("type"), "jsonrpc")
        self.assertEqual(getattr(DTFAPI.checkout, "routing", {}).get("type"), "jsonrpc")

        self.assertEqual(getattr(DTFAPI.cart_get, "routing", {}).get("auth"), "user")
        self.assertEqual(getattr(DTFAPI.cart_add, "routing", {}).get("auth"), "user")
        self.assertEqual(getattr(DTFAPI.orders, "routing", {}).get("auth"), "user")

    def test_native_sale_models_are_authoritative(self):
        self.assertEqual(self.env["product.public.category"]._name, "product.public.category")
        self.assertIn("website_description", self.env["product.template"]._fields)
        self.assertIn("is_published", self.env["product.template"]._fields)
        self.assertNotIn("dtf_public_published", self.env["product.template"]._fields)
        self.assertNotIn("dtf.site.category", self.env)
        self.assertNotIn("dtf.stock.reservation", self.env)

    def test_native_price_tax_totals_and_customer_ownership(self):
        partner = self.env["res.partner"].create({"name": "API Customer"})
        other_partner = self.env["res.partner"].create({"name": "Other Customer"})
        product = self.env["product.product"].create({"name": "API Product", "list_price": 12.5})

        order = self.env["sale.order"].create({"partner_id": partner.id})
        line = self.env["sale.order.line"].create({
            "order_id": order.id,
            "product_id": product.id,
            "product_uom_qty": 2,
            "price_unit": 12.5,
        })
        other_order = self.env["sale.order"].create({"partner_id": other_partner.id})

        self.assertEqual(order.amount_untaxed, line.price_subtotal)
        self.assertEqual(order.amount_tax, line.price_tax)
        self.assertEqual(order.amount_total, line.price_total)

        owned_orders = self.env["sale.order"].search([("partner_id", "=", partner.id)])
        self.assertIn(order, owned_orders)
        self.assertNotIn(other_order, owned_orders)
