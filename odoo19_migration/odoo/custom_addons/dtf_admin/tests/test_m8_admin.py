from odoo.tests.common import TransactionCase


class TestDTFM8Admin(TransactionCase):
    def test_admin_root_is_restricted_to_dtf_admin(self):
        root = self.env.ref("dtf_admin.menu_dtf_admin_root")
        admin_group = self.env.ref("dtf_core.group_dtf_admin")
        operator_group = self.env.ref("dtf_core.group_dtf_printing_operator")

        self.assertIn(admin_group, root.group_ids)
        self.assertNotIn(operator_group, root.group_ids)

    def test_native_admin_actions_reuse_existing_authority_models(self):
        expected = {
            "dtf_admin.action_dtf_admin_dashboard": "sale.order",
            "dtf_admin.action_dtf_admin_designers": "dtf.designer.profile",
            "dtf_admin.action_dtf_admin_qualification_review": "dtf.designer.profile",
            "dtf_admin.action_dtf_admin_designs": "dtf.design",
            "dtf_admin.action_dtf_admin_design_review": "dtf.design",
            "dtf_admin.action_dtf_admin_products": "product.template",
            "dtf_admin.action_dtf_admin_orders": "sale.order",
            "dtf_admin.action_dtf_admin_reports": "sale.order",
            "dtf_admin.action_dtf_admin_supplier_mappings": "dtf.printify.mapping",
            "dtf_admin.action_dtf_admin_settings": "res.config.settings",
        }
        for xmlid, model_name in expected.items():
            action = self.env.ref(xmlid)
            self.assertEqual(action.res_model, model_name)

    def test_m6_and_m7_native_menus_are_nested_under_dtf_admin(self):
        root = self.env.ref("dtf_admin.menu_dtf_admin_root")
        operations = self.env.ref("dtf_production.menu_dtf_operations_root")
        finance = self.env.ref("dtf_finance.menu_dtf_finance_root")

        self.assertEqual(operations.parent_id, root)
        self.assertEqual(finance.parent_id, root)

    def test_design_admin_view_separates_content_direction_locally(self):
        view = self.env.ref("dtf_admin.view_dtf_admin_design_form")
        arch = view.arch_db

        self.assertIn('name="title_en"', arch)
        self.assertIn('name="description_en"', arch)
        self.assertIn('name="title_ar"', arch)
        self.assertIn('name="description_ar"', arch)
        self.assertIn('dir="ltr"', arch)
        self.assertIn('dir="rtl"', arch)

    def test_admin_shell_does_not_grant_operator_finance_or_settings_menu(self):
        operator = self.env.ref("dtf_core.group_dtf_printing_operator")
        finance_root = self.env.ref("dtf_finance.menu_dtf_finance_root")
        settings = self.env.ref("dtf_admin.menu_dtf_admin_settings")

        self.assertNotIn(operator, finance_root.group_ids)
        self.assertNotIn(operator, settings.group_ids)
