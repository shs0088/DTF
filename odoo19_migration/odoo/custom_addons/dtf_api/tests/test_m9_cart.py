import json
from odoo.tests.common import HttpCase, tagged

@tagged("post_install", "-at_install")
class TestDTFM9GuestCart(HttpCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.product_template = cls.env["product.template"].create({
            "name": "M9 Guest Cart Tee",
            "list_price": 14.0,
            "sale_ok": True,
            "is_published": True,
            "dtf_catalog_type": "customizable",
        })
        cls.product = cls.product_template.product_variant_id
        cls.product.default_code = "M9-GUEST-CART"

    def _jsonrpc(self, path, params):
        response = self.url_open(
            path,
            data=json.dumps({"jsonrpc":"2.0","method":"call","params":params,"id":1}),
            headers={"Content-Type":"application/json"},
        )
        self.assertEqual(response.status_code, 200)
        payload=response.json()
        self.assertNotIn("error", payload, payload)
        return payload["result"]

    def test_public_user_can_build_and_remove_native_website_cart(self):
        added=self._jsonrpc("/api/dtf/v1/cart/add",{"product_id":self.product.id,"quantity":2})
        self.assertNotIn("error", added)
        cart=added["cart"]
        self.assertEqual(cart["lines"][0]["product_id"],self.product.id)
        self.assertEqual(cart["lines"][0]["sku"],"M9-GUEST-CART")
        self.assertEqual(cart["lines"][0]["quantity"],2)
        line_id=cart["lines"][0]["id"]

        response=self.url_open("/api/dtf/v1/cart")
        self.assertEqual(response.status_code,200)
        fetched=response.json()["cart"]
        self.assertEqual(fetched["id"],cart["id"])
        self.assertEqual(fetched["lines"][0]["id"],line_id)

        deleted=self._jsonrpc(f"/api/dtf/v1/cart/line/{line_id}",{})
        self.assertFalse(deleted.get("error"))
        self.assertFalse(deleted["cart"]["lines"])
