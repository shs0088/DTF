from odoo.exceptions import AccessError, ValidationError
from odoo.tests.common import TransactionCase


class TestDTFM3Catalog(TransactionCase):
    def test_native_public_category_and_product_extensions(self):
        category = self.env["product.public.category"].create({"name": "T-Shirts"})
        product = self.env["product.template"].create({
            "name": "DTF Shirt",
            "public_categ_ids": [(6, 0, [category.id])],
            "dtf_product_type": "tshirt",
            "dtf_catalog_type": "customizable",
            "dtf_print_your_dream_eligible": True,
            "is_published": False,
        })
        self.assertIn(category, product.public_categ_ids)
        self.assertTrue(product.dtf_print_your_dream_eligible)
        self.assertFalse(product.is_published)

    def test_native_variants_and_stock_are_used(self):
        attribute = self.env["product.attribute"].create({"name": "Size", "create_variant": "always"})
        value = self.env["product.attribute.value"].create({"name": "M", "attribute_id": attribute.id})
        product = self.env["product.template"].create({
            "name": "Variant Shirt",
            "attribute_line_ids": [(0, 0, {
                "attribute_id": attribute.id,
                "value_ids": [(6, 0, [value.id])],
            })],
        })
        variant = product.product_variant_ids[:1]
        self.assertTrue(variant)
        self.assertTrue(hasattr(variant, "qty_available"))
        self.assertIn(value, variant.product_template_attribute_value_ids.product_attribute_value_id)

    def test_printify_mapping_and_native_publication(self):
        product = self.env["product.template"].create({
            "name": "Supplier Shirt",
            "dtf_supplier_source": "printify",
            "dtf_printify_source_id": "bp-1",
            "is_published": False,
        })
        mapping = self.env["dtf.printify.mapping"].create({
            "shop_id": "shop-1",
            "printify_product_id": "bp-1",
            "printify_variant_id": "v-1",
            "product_tmpl_id": product.id,
            "import_key": "shop-1:v-1",
        })
        with self.assertRaises(ValidationError):
            self.env["dtf.printify.mapping"].create({
                "shop_id": "shop-1",
                "printify_product_id": "bp-1",
                "printify_variant_id": "v-1",
                "product_tmpl_id": product.id,
                "import_key": "other-key",
            })
        self.assertFalse(product.is_published)
        payload = product.dtf_public_payload(product)
        self.assertNotIn("bp-1", str(payload))
        self.assertNotIn("v-1", str(payload))
        self.assertEqual(mapping.public_payload()["product_id"], product.id)

    def test_printify_access_is_admin_only(self):
        designer_group = self.env.ref("dtf_core.group_dtf_designer")
        designer = self.env["res.users"].with_context(no_reset_password=True).create({
            "name": "Designer",
            "login": "m3-designer@example.test",
            "group_ids": [(6, 0, [designer_group.id])],
        })
        with self.assertRaises(AccessError):
            self.env["dtf.printify.mapping"].with_user(designer).search([])
