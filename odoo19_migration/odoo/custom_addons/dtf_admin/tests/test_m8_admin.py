from odoo.tests.common import TransactionCase


class TestDTFM8Admin(TransactionCase):
    def test_admin_root_is_shared_without_exposing_admin_children(self):
        root = self.env.ref("dtf_admin.menu_dtf_admin_root")
        admin_group = self.env.ref("dtf_core.group_dtf_admin")
        operator_group = self.env.ref("dtf_core.group_dtf_printing_operator")
        settings = self.env.ref("dtf_admin.menu_dtf_admin_settings")
        finance_root = self.env.ref("dtf_finance.menu_dtf_finance_root")

        self.assertIn(admin_group, root.group_ids)
        self.assertIn(operator_group, root.group_ids)
        self.assertIn(admin_group, settings.group_ids)
        self.assertNotIn(operator_group, settings.group_ids)
        self.assertIn(admin_group, finance_root.group_ids)
        self.assertNotIn(operator_group, finance_root.group_ids)

    def test_native_admin_actions_reuse_existing_authority_models(self):
        expected = {
            "dtf_admin.action_dtf_admin_dashboard": "sale.order",
            "dtf_admin.action_dtf_admin_designers": "dtf.designer.profile",
            "dtf_admin.action_dtf_admin_qualification_review": "dtf.designer.profile",
            "dtf_admin.action_dtf_admin_designs": "dtf.design",
            "dtf_admin.action_dtf_admin_design_review": "dtf.design",
            "dtf_admin.action_dtf_admin_products": "product.template",
            "dtf_admin.action_dtf_admin_orders": "sale.order",
            "dtf_admin.action_dtf_admin_customers": "res.partner",
            "dtf_admin.action_dtf_admin_inventory": "stock.quant",
            "dtf_admin.action_dtf_admin_reports": "sale.order",
            "dtf_admin.action_dtf_admin_supplier_mappings": "dtf.printify.mapping",
            "dtf_admin.action_dtf_admin_settings": "res.config.settings",
            "dtf_admin.action_dtf_admin_history": "mail.message",
            "dtf_admin.action_dtf_admin_activities": "mail.activity",
            "dtf_admin.action_dtf_admin_integrations": "dtf.printify.mapping",
            "dtf_admin.action_dtf_admin_report_sales": "sale.order",
            "dtf_admin.action_dtf_admin_report_production": "mrp.production",
            "dtf_admin.action_dtf_admin_report_earnings": "dtf.designer.earning",
            "dtf_admin.action_dtf_admin_report_inventory": "stock.quant",
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

    def test_admin_uses_native_functional_manager_groups_without_granting_operator(self):
        admin_group = self.env.ref("dtf_core.group_dtf_admin")
        operator_group = self.env.ref("dtf_core.group_dtf_printing_operator")
        native_groups = [
            self.env.ref("sales_team.group_sale_manager"),
            self.env.ref("product.group_product_manager"),
            self.env.ref("stock.group_stock_manager"),
        ]
        for native_group in native_groups:
            self.assertIn(native_group, admin_group.implied_ids)
            self.assertNotIn(native_group, operator_group.implied_ids)

        admin_user = self.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M8 Native Access Admin",
            "login": "m8-native-access-admin@example.test",
            "group_ids": [(6, 0, [admin_group.id])],
        })
        self.env["sale.order"].with_user(admin_user).check_access("read")
        self.env["product.template"].with_user(admin_user).check_access("write")
        self.env["stock.quant"].with_user(admin_user).check_access("read")
        self.env["res.config.settings"].with_user(admin_user).check_access("read")

    def test_native_history_is_read_only_and_scoped_to_dtf_models(self):
        history = self.env.ref("dtf_admin.view_dtf_admin_history_list").arch_db
        action = self.env.ref("dtf_admin.action_dtf_admin_history")

        self.assertIn('create="0"', history)
        self.assertIn('edit="0"', history)
        self.assertIn('delete="0"', history)
        self.assertIn("dtf.designer.profile", action.domain)
        self.assertIn("dtf.design", action.domain)
        self.assertIn("dtf.designer.withdrawal", action.domain)
        self.assertIn("mrp.production", action.domain)
        self.assertIn("sale.order", action.domain)

    def test_notifications_use_native_mail_activity_and_generic_dtf_review_type(self):
        action = self.env.ref("dtf_admin.action_dtf_admin_activities")
        activity_type = self.env.ref(
            "dtf_notifications.mail_activity_type_dtf_admin_review"
        )

        self.assertEqual(action.res_model, "mail.activity")
        self.assertFalse(activity_type.res_model)
        self.assertEqual(activity_type.category, "default")

    def test_reports_and_integrations_reuse_native_authority_models(self):
        expected = {
            "dtf_admin.action_dtf_admin_report_sales": "sale.order",
            "dtf_admin.action_dtf_admin_report_production": "mrp.production",
            "dtf_admin.action_dtf_admin_report_earnings": "dtf.designer.earning",
            "dtf_admin.action_dtf_admin_report_inventory": "stock.quant",
            "dtf_admin.action_dtf_admin_integrations": "dtf.printify.mapping",
        }
        for xmlid, model_name in expected.items():
            self.assertEqual(self.env.ref(xmlid).res_model, model_name)

    def test_native_rejection_wizards_delegate_to_existing_business_rules(self):
        admin_group = self.env.ref("dtf_core.group_dtf_admin")
        admin_user = self.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M8 Wizard Admin",
            "login": "m8-wizard-admin@example.test",
            "group_ids": [(6, 0, [admin_group.id])],
        })

        partner = self.env["res.partner"].create({"name": "M8 Wizard Designer"})
        profile = self.env["dtf.designer.profile"].create({"partner_id": partner.id})
        profile.action_mark_system_qualified()

        qualification_wizard = self.env[
            "dtf.admin.qualification.reject.wizard"
        ].with_user(admin_user).create({
            "profile_id": profile.id,
            "reason": "Qualification artwork needs replacement.",
        })
        qualification_wizard.action_confirm()

        profile.invalidate_recordset()
        self.assertEqual(profile.qualification_state, "replacement_required")
        self.assertEqual(profile.rejection_count, 1)
        self.assertEqual(
            profile.last_rejection_reason,
            "Qualification artwork needs replacement.",
        )

        design = self.env["dtf.design"].create({
            "designer_id": profile.id,
            "title_en": "M8 Review Design",
            "title_ar": "تصميم مراجعة M8",
            "description_en": "Review",
            "description_ar": "مراجعة",
            "product_type": "tshirt",
        })
        design_wizard = self.env["dtf.admin.design.reject.wizard"].with_user(
            admin_user
        ).create({
            "design_id": design.id,
            "reason": "Please correct the artwork before publishing.",
        })
        design_wizard.action_confirm()

        design.invalidate_recordset()
        self.assertEqual(design.state, "rejected")
        self.assertEqual(
            design.admin_rejection_reason,
            "Please correct the artwork before publishing.",
        )
        self.assertEqual(design.admin_rejected_by_id, admin_user)

    def test_reject_buttons_use_native_odoo_object_actions(self):
        designer_arch = self.env.ref("dtf_admin.view_dtf_admin_designer_form").arch_db
        design_arch = self.env.ref("dtf_admin.view_dtf_admin_design_form").arch_db

        self.assertIn('name="action_open_qualification_reject_wizard"', designer_arch)
        self.assertIn('type="object"', designer_arch)
        self.assertIn('name="action_open_admin_reject_wizard"', design_arch)
        self.assertIn('type="object"', design_arch)
        self.assertIn("<chatter", designer_arch)
        self.assertIn("<chatter", design_arch)
