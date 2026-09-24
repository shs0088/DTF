import json

from odoo.tests.common import HttpCase, tagged


@tagged("post_install", "-at_install")
class TestDTFM5NativeAPI(HttpCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.login = "m5-api-user@example.test"
        cls.password = "M5-api-test-password"
        cls.api_user = cls.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M5 API User",
            "login": cls.login,
            "password": cls.password,
            "group_ids": [(6, 0, [cls.env.ref("base.group_user").id])],
        })
        cls.product_template = cls.env["product.template"].create({
            "name": "M5 API Product",
            "list_price": 12.5,
            "sale_ok": True,
            "is_published": True,
        })
        cls.product = cls.product_template.product_variant_id

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
        return payload.get("result")

    def test_public_products_route_is_website_aware(self):
        response = self.url_open("/api/dtf/v1/products")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("items", payload)

    def test_native_cart_and_jsonrpc_routes(self):
        self.assertTrue(hasattr(self.env["website"], "_create_cart"))
        self.assertTrue(hasattr(self.env["sale.order"], "_cart_add"))
        self.assertTrue(hasattr(self.env["sale.order"], "_cart_update_line_quantity"))

        self.authenticate(self.login, self.password)
        added = self._jsonrpc(
            "/api/dtf/v1/cart/add",
            {"product_id": self.product.id, "quantity": 2},
        )
        self.assertIn("cart", added)
        self.assertTrue(added["cart"]["lines"])
        self.assertEqual(added["cart"]["lines"][0]["product_id"], self.product.id)
        self.assertEqual(added["cart"]["lines"][0]["quantity"], 2)

        checkout = self._jsonrpc("/api/dtf/v1/checkout", {})
        self.assertEqual(checkout["checkout"], "native_website_sale")
        self.assertEqual(checkout["cart"]["id"], added["cart"]["id"])

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
