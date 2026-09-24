from odoo.exceptions import AccessError, ValidationError
from odoo.tests.common import TransactionCase


class TestDTFM3Catalog(TransactionCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.admin_group = cls.env.ref("dtf_core.group_dtf_admin")
        cls.designer_group = cls.env.ref("dtf_core.group_dtf_designer")
        cls.operator_group = cls.env.ref("dtf_core.group_dtf_printing_operator")
        cls.admin = cls.env["res.users"].with_context(no_reset_password=True).create({"name": "Catalog Admin", "login": "catalog-admin@example.test", "group_ids": [(6, 0, [cls.admin_group.id])]})
        cls.designer = cls.env["res.users"].with_context(no_reset_password=True).create({"name": "Catalog Designer", "login": "catalog-designer@example.test", "group_ids": [(6, 0, [cls.designer_group.id])]})
        cls.operator = cls.env["res.users"].with_context(no_reset_password=True).create({"name": "Catalog Operator", "login": "catalog-operator@example.test", "group_ids": [(6, 0, [cls.operator_group.id])]})

    def test_bilingual_site_category_and_native_product(self):
        category = self.env["product.public.category"].create({"name": "T-Shirts", "website_description": "Shirts"})
        product = self.env["product.template"].create({"name": "DTF Shirt", "public_categ_ids": [(6, 0, [category.id])], "dtf_product_type": "tshirt", "dtf_catalog_type": "customizable", "dtf_print_your_dream_eligible": True, "dtf_designer_design_compatible": True, "is_published": True, "list_price": 12.5})
        self.assertIn(category, product.public_categ_ids)
        self.assertTrue(product.dtf_print_your_dream_eligible)
        self.assertTrue(product.product_variant_ids)

    def test_native_variants_and_stock_are_used(self):
        size_attribute = self.env["product.attribute"].create({"name": "Size", "create_variant": "always"})
        size_m = self.env["product.attribute.value"].create({"name": "M", "attribute_id": size_attribute.id})
        product = self.env["product.template"].create({"name": "Variant Shirt", "attribute_line_ids": [(0, 0, {"attribute_id": size_attribute.id, "value_ids": [(6, 0, [size_m.id])]})]})
        variant = product.product_variant_ids[:1]
        self.assertTrue(variant)
        self.assertTrue(hasattr(variant, "qty_available"))
        self.assertIn(size_m, variant.product_template_attribute_value_ids.product_attribute_value_id)
        self.assertEqual(variant.product_template_attribute_value_ids.product_attribute_value_id, size_m)

    def test_printify_mapping_uniqueness_and_public_hiding(self):
        product = self.env["product.template"].create({"name": "Supplier Shirt", "dtf_supplier_source": "printify", "dtf_printify_source_id": "bp-1", "dtf_public_published": True})
        mapping = self.env["dtf.printify.mapping"].create({"shop_id": "shop-1", "printify_product_id": "bp-1", "printify_variant_id": "v-1", "product_tmpl_id": product.id, "import_key": "shop-1:v-1"})
        with self.assertRaises(ValidationError):
            self.env["dtf.printify.mapping"].create({"shop_id": "shop-1", "printify_product_id": "bp-1", "printify_variant_id": "v-1", "product_tmpl_id": product.id, "import_key": "other-key"})
        payload = self.env["product.template"].dtf_public_payload(product)
        self.assertNotIn("bp-1", str(payload))
        self.assertNotIn("v-1", str(payload))
        self.assertEqual(mapping.public_payload()["product_id"], product.id)

    def test_snapshot_import_is_idempotent_and_does_not_publish(self):
        snapshot = {"schemaVersion": 1, "source": "printify-catalog-blueprints", "products": [{"blueprintId": "bp-42", "title": "Snapshot Mug", "variants": [{"id": "v-42", "provider_id": "provider-1", "title": "White"}]}]}
        importer = self.env["dtf.printify.snapshot.importer"]
        first = importer.import_snapshot(snapshot, shop_id="shop-test")
        second = importer.import_snapshot(snapshot, shop_id="shop-test")
        self.assertEqual(first["created_products"], 1)
        self.assertEqual(second["created_products"], 0)
        self.assertEqual(self.env["product.template"].search_count([("dtf_printify_source_id", "=", "bp-42")]), 1)
        self.assertEqual(self.env["dtf.printify.mapping"].search_count([("import_key", "=", "shop-test:v-42")]), 1)
        self.assertFalse(self.env["product.template"].search([("dtf_printify_source_id", "=", "bp-42")], limit=1) .is_published)

    def test_printify_access_is_admin_only(self):
        mapping_model = self.env["dtf.printify.mapping"]
        with self.assertRaises(AccessError): mapping_model.with_user(self.designer).search([])
        with self.assertRaises(AccessError): mapping_model.with_user(self.operator).search([])
        with self.assertRaises(AccessError): mapping_model.with_user(self.env.ref("base.public_user").id).search([])
