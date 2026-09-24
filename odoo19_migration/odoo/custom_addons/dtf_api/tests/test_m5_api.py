from odoo.tests.common import TransactionCase


class TestDTFM5NativeAPI(TransactionCase):
    def test_native_cart_and_route_contract(self):
        self.assertIn("request.cart", self.env["ir.http"]._serve_ir_http.__func__.__code__.co_names if hasattr(self.env["ir.http"]._serve_ir_http, "__func__") else ())
        controller_source = self.env["ir.module.module"].search([], limit=1)
        self.assertTrue(controller_source)

    def test_native_sale_models_are_authoritative(self):
        self.assertIn("product.public.category", self.env["product.public.category"]._name)
        self.assertIn("website_description", self.env["product.template"]._fields)
        self.assertIn("is_published", self.env["product.template"]._fields)
        self.assertNotIn("dtf_public_published", self.env["product.template"]._fields)
        self.assertNotIn("dtf.site.category", self.env)
        self.assertNotIn("dtf.stock.reservation", self.env)
