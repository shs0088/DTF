import json

from odoo.tests.common import HttpCase, tagged


@tagged("post_install", "-at_install")
class TestDTFM9Checkout(HttpCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.login = "m9-checkout@example.test"
        cls.password = "M9-checkout-password"
        cls.user = cls.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M9 Checkout Customer",
            "login": cls.login,
            "password": cls.password,
            "group_ids": [(6, 0, [cls.env.ref("base.group_portal").id])],
        })
        cls.ready_template = cls.env["product.template"].create({
            "name": "M9 Ready Product",
            "list_price": 18.0,
            "sale_ok": True,
            "is_published": True,
            "dtf_catalog_type": "ready_to_sell",
        })
        cls.ready_product = cls.ready_template.product_variant_id
        cls.custom_template = cls.env["product.template"].create({
            "name": "M9 Custom Product",
            "list_price": 21.0,
            "sale_ok": True,
            "is_published": True,
            "dtf_catalog_type": "customizable",
        })
        cls.custom_product = cls.custom_template.product_variant_id

    def _jsonrpc(self, path, params):
        response = self.url_open(
            path,
            data=json.dumps({
                "jsonrpc": "2.0",
                "method": "call",
                "params": params,
                "id": 1,
            }),
            headers={"Content-Type": "application/json"},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertNotIn("error", payload, payload)
        return payload["result"]

    def test_native_checkout_confirms_owned_sale_order_and_resets_cart(self):
        self.authenticate(self.login, self.password)
        added = self._jsonrpc(
            "/api/dtf/v1/cart/add",
            {"product_id": self.ready_product.id, "quantity": 2},
        )
        cart_id = added["cart"]["id"]

        preview = self.url_open("/api/dtf/v1/checkout/preview")
        self.assertEqual(preview.status_code, 200)
        preview_payload = preview.json()
        self.assertTrue(preview_payload["preview"]["canCheckout"])
        self.assertFalse(preview_payload["preview"]["issues"])

        placed = self._jsonrpc(
            "/api/dtf/v1/checkout/place",
            {
                "customer_name": "M9 Checkout Customer",
                "customer_phone": "+962790000000",
                "city": "Amman",
                "address": "M9 Test Address",
                "notes": "M9 native checkout",
                "payment_method": "bank_transfer",
                "fulfillment": "delivery",
            },
        )
        self.assertTrue(placed["ok"])
        order_id = placed["order"]["id"]
        self.assertEqual(order_id, cart_id)
        order = self.env["sale.order"].sudo().browse(order_id)
        self.assertEqual(order.state, "sale")
        self.assertEqual(order.partner_id, self.user.partner_id)
        self.assertEqual(order.partner_id.phone, "+962790000000")
        self.assertEqual(placed["order"]["paymentStatus"], "pending")

        detail = self.url_open(f"/api/dtf/v1/orders/{order_id}")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["order"]["id"], order_id)

        current_cart = self.url_open("/api/dtf/v1/cart")
        self.assertEqual(current_cart.status_code, 200)
        self.assertIsNone(current_cart.json()["cart"])

    def test_customizable_item_cannot_bypass_design_master_preflight_gate(self):
        self.authenticate(self.login, self.password)
        self._jsonrpc(
            "/api/dtf/v1/cart/add",
            {"product_id": self.custom_product.id, "quantity": 1},
        )
        preview = self.url_open("/api/dtf/v1/checkout/preview").json()["preview"]
        self.assertFalse(preview["canCheckout"])
        self.assertTrue(preview["issues"])

        placed = self._jsonrpc(
            "/api/dtf/v1/checkout/place",
            {
                "customer_name": "M9 Checkout Customer",
                "customer_phone": "+962790000000",
                "city": "Amman",
                "address": "M9 Test Address",
                "payment_method": "bank_transfer",
                "fulfillment": "delivery",
            },
        )
        self.assertEqual(placed["error"], "checkout_blocked")
        self.assertTrue(placed["issues"])
        cart = self.url_open("/api/dtf/v1/cart").json()["cart"]
        self.assertEqual(cart["state"], "draft")
