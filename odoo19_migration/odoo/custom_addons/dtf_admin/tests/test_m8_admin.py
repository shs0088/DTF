from odoo import fields
from odoo.exceptions import AccessError, ValidationError
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

    def test_qualification_review_schedules_native_deadline_activity(self):
        admin_group = self.env.ref("dtf_core.group_dtf_admin")
        admin_user = self.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M8 Review Admin",
            "login": "m8-review-admin@example.test",
            "group_ids": [(6, 0, [admin_group.id])],
        })
        partner = self.env["res.partner"].create({
            "name": "M8 Review Designer",
            "email": "m8-review-designer@example.test",
        })
        designer_user = self.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M8 Review Designer",
            "login": "m8-review-designer@example.test",
            "partner_id": partner.id,
        })
        profile = self.env["dtf.designer.profile"].create({
            "partner_id": partner.id,
            "user_id": designer_user.id,
        })
        profile.action_mark_system_qualified()
        profile.with_user(admin_user).action_start_admin_review()

        review_type = self.env.ref(
            "dtf_notifications.mail_activity_type_dtf_admin_review"
        )
        activity = self.env["mail.activity"].search([
            ("res_model", "=", "dtf.designer.profile"),
            ("res_id", "=", profile.id),
            ("activity_type_id", "=", review_type.id),
            ("user_id", "=", admin_user.id),
        ])
        self.assertEqual(len(activity), 1)
        self.assertEqual(activity.date_deadline, fields.Date.to_date(profile.review_deadline))

    def test_first_rejection_schedules_replacement_and_second_rejection_escalates(self):
        admin_group = self.env.ref("dtf_core.group_dtf_admin")
        admin_user = self.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M8 Escalation Admin",
            "login": "m8-escalation-admin@example.test",
            "group_ids": [(6, 0, [admin_group.id])],
        })
        partner = self.env["res.partner"].create({
            "name": "M8 Escalation Designer",
            "email": "m8-escalation-designer@example.test",
        })
        designer_user = self.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M8 Escalation Designer",
            "login": "m8-escalation-designer@example.test",
            "partner_id": partner.id,
        })
        profile = self.env["dtf.designer.profile"].create({
            "partner_id": partner.id,
            "user_id": designer_user.id,
        })

        profile.action_mark_system_qualified()
        profile.with_user(admin_user).action_start_admin_review()
        wizard = self.env["dtf.admin.qualification.reject.wizard"].with_user(admin_user).create({
            "profile_id": profile.id,
            "reason": "Replace the first submission.",
        })
        wizard.action_confirm()
        profile.invalidate_recordset()

        replacement_type = self.env.ref(
            "dtf_notifications.mail_activity_type_dtf_designer_replacement"
        )
        replacement = self.env["mail.activity"].search([
            ("res_model", "=", "dtf.designer.profile"),
            ("res_id", "=", profile.id),
            ("activity_type_id", "=", replacement_type.id),
            ("user_id", "=", designer_user.id),
        ])
        self.assertEqual(profile.qualification_state, "replacement_required")
        self.assertEqual(len(replacement), 1)
        self.assertEqual(
            replacement.date_deadline,
            fields.Date.to_date(profile.replacement_deadline),
        )

        profile.action_mark_system_qualified()
        profile.with_user(admin_user).action_start_admin_review()
        wizard2 = self.env["dtf.admin.qualification.reject.wizard"].with_user(admin_user).create({
            "profile_id": profile.id,
            "reason": "Second qualification rejection.",
        })
        wizard2.action_confirm()
        profile.invalidate_recordset()

        escalation_type = self.env.ref(
            "dtf_notifications.mail_activity_type_dtf_qualification_escalation"
        )
        escalation = self.env["mail.activity"].search([
            ("res_model", "=", "dtf.designer.profile"),
            ("res_id", "=", profile.id),
            ("activity_type_id", "=", escalation_type.id),
            ("user_id", "=", admin_user.id),
        ])
        self.assertEqual(profile.qualification_state, "escalated")
        self.assertEqual(profile.rejection_count, 2)
        self.assertEqual(len(escalation), 1)

    def test_admin_design_form_uses_admin_publish_wrapper(self):
        arch = self.env.ref("dtf_admin.view_dtf_admin_design_form").arch_db
        self.assertIn('name="action_admin_publish"', arch)
        self.assertNotIn('name="action_publish"', arch)

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

    def test_operational_dashboard_is_native_database_backed(self):
        admin_group = self.env.ref("dtf_core.group_dtf_admin")
        admin_user = self.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M8 Dashboard Admin",
            "login": "m8-dashboard-admin@example.test",
            "group_ids": [(6, 0, [admin_group.id])],
        })
        dashboard = self.env["dtf.admin.dashboard"].with_user(admin_user)
        before = dashboard.get_dashboard()
        self.assertEqual(len(before["kpis"]), 7)
        self.assertEqual(len(before["series"]), 7)
        before_review = next(
            item["value"] for item in before["kpis"] if item["key"] == "designer_review"
        )
        partner = self.env["res.partner"].create({"name": "M8 Dashboard Review"})
        profile = self.env["dtf.designer.profile"].create({"partner_id": partner.id})
        profile.action_mark_system_qualified()
        after = dashboard.get_dashboard()
        after_review = next(
            item["value"] for item in after["kpis"] if item["key"] == "designer_review"
        )
        self.assertEqual(after_review, before_review + 1)

    def test_operational_dashboard_requires_dtf_admin(self):
        plain_user = self.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M8 Dashboard Plain User",
            "login": "m8-dashboard-plain@example.test",
            "group_ids": [(6, 0, [self.env.ref("base.group_user").id])],
        })
        with self.assertRaises(AccessError):
            self.env["dtf.admin.dashboard"].with_user(plain_user).get_dashboard()

    def test_dashboard_menu_uses_odoo19_client_action(self):
        action = self.env.ref("dtf_admin.action_dtf_admin_dashboard_client")
        menu = self.env.ref("dtf_admin.menu_dtf_admin_dashboard")
        self.assertEqual(action._name, "ir.actions.client")
        self.assertEqual(action.tag, "dtf_admin.dashboard")
        self.assertEqual(menu.action, action)

    def test_dashboard_rejects_unknown_metric(self):
        admin_group = self.env.ref("dtf_core.group_dtf_admin")
        admin_user = self.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M8 Dashboard Metric Admin",
            "login": "m8-dashboard-metric@example.test",
            "group_ids": [(6, 0, [admin_group.id])],
        })
        with self.assertRaises(ValidationError):
            self.env["dtf.admin.dashboard"].with_user(admin_user).get_metric_action("not-a-metric")

    def test_promotions_reuse_native_odoo_loyalty(self):
        menu = self.env.ref("dtf_admin.menu_dtf_admin_promotions")
        action = self.env.ref("loyalty.loyalty_program_discount_loyalty_action")
        self.assertEqual(menu.action, action)
        self.assertEqual(action.res_model, "loyalty.program")

        admin_group = self.env.ref("dtf_core.group_dtf_admin")
        operator_group = self.env.ref("dtf_core.group_dtf_printing_operator")
        admin_user = self.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M8 Promotions Admin",
            "login": "m8-promotions-admin@example.test",
            "group_ids": [(6, 0, [admin_group.id])],
        })
        operator_user = self.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M8 Promotions Operator",
            "login": "m8-promotions-operator@example.test",
            "group_ids": [(6, 0, [operator_group.id])],
        })

        self.env["loyalty.program"].with_user(admin_user).check_access("write")
        with self.assertRaises(AccessError):
            self.env["loyalty.program"].with_user(operator_user).check_access("write")

    def test_users_and_groups_reuse_native_odoo_access_rights(self):
        users_menu = self.env.ref("dtf_admin.menu_dtf_admin_users")
        groups_menu = self.env.ref("dtf_admin.menu_dtf_admin_user_groups")
        users_action = self.env.ref("base.action_res_users")
        groups_action = self.env.ref("base.action_res_groups")

        self.assertEqual(users_menu.action, users_action)
        self.assertEqual(groups_menu.action, groups_action)
        self.assertEqual(users_action.res_model, "res.users")
        self.assertEqual(groups_action.res_model, "res.groups")

        admin_group = self.env.ref("dtf_core.group_dtf_admin")
        operator_group = self.env.ref("dtf_core.group_dtf_printing_operator")
        access_rights = self.env.ref("base.group_erp_manager")
        technical_settings = self.env.ref("base.group_system")

        self.assertIn(access_rights, admin_group.implied_ids)
        self.assertNotIn(technical_settings, admin_group.implied_ids)
        self.assertNotIn(access_rights, operator_group.implied_ids)

        admin_user = self.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M8 User Management Admin",
            "login": "m8-user-management-admin@example.test",
            "group_ids": [(6, 0, [admin_group.id])],
        })
        operator_user = self.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M8 User Management Operator",
            "login": "m8-user-management-operator@example.test",
            "group_ids": [(6, 0, [operator_group.id])],
        })

        self.env["res.users"].with_user(admin_user).check_access("write")
        self.env["res.groups"].with_user(admin_user).check_access("write")
        with self.assertRaises(AccessError):
            self.env["res.users"].with_user(operator_user).check_access("write")
        with self.assertRaises(AccessError):
            self.env["res.groups"].with_user(operator_user).check_access("write")

    def test_categories_reuse_native_odoo_public_categories(self):
        menu = self.env.ref("dtf_admin.menu_dtf_admin_categories")
        action = self.env.ref("website_sale.product_public_category_action")
        self.assertEqual(menu.action, action)
        self.assertEqual(action.res_model, "product.public.category")

        admin_group = self.env.ref("dtf_core.group_dtf_admin")
        operator_group = self.env.ref("dtf_core.group_dtf_printing_operator")
        admin_user = self.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M8 Category Admin",
            "login": "m8-category-admin@example.test",
            "group_ids": [(6, 0, [admin_group.id])],
        })
        operator_user = self.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M8 Category Operator",
            "login": "m8-category-operator@example.test",
            "group_ids": [(6, 0, [operator_group.id])],
        })

        self.env["product.public.category"].with_user(admin_user).check_access("write")
        with self.assertRaises(AccessError):
            self.env["product.public.category"].with_user(operator_user).check_access("write")

    def test_extended_reports_reuse_existing_authority_models(self):
        expected = {
            "dtf_admin.action_dtf_admin_report_products": "product.template",
            "dtf_admin.action_dtf_admin_report_designers": "dtf.designer.profile",
            "dtf_admin.action_dtf_admin_report_payouts": "dtf.designer.withdrawal",
            "dtf_admin.action_dtf_admin_report_stock_moves": "stock.move",
        }
        for xmlid, model_name in expected.items():
            self.assertEqual(self.env.ref(xmlid).res_model, model_name)

    def test_protected_dtf_groups_cannot_be_deleted_or_renamed(self):
        admin_group = self.env.ref("dtf_core.group_dtf_admin")
        operator_group = self.env.ref("dtf_core.group_dtf_printing_operator")

        for group in (admin_group, operator_group):
            with self.assertRaises(ValidationError):
                group.write({"name": "Do Not Rename"})
            with self.assertRaises(ValidationError):
                group.unlink()

    def test_last_active_dtf_administrator_is_protected(self):
        admin_group = self.env.ref("dtf_core.group_dtf_admin")
        admin_user = self.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M8 Protected Last Admin",
            "login": "m8-protected-last-admin@example.test",
            "group_ids": [(6, 0, [admin_group.id])],
        })

        active_admins = self.env["res.users"].sudo().search([
            ("active", "=", True),
            ("group_ids", "in", admin_group.id),
        ])
        self.assertIn(admin_user, active_admins)

        with self.assertRaises(ValidationError):
            active_admins.write({"active": False})
        with self.assertRaises(ValidationError):
            active_admins.write({"group_ids": [(3, admin_group.id)]})

        admin_user.invalidate_recordset()
        self.assertTrue(admin_user.active)
        self.assertIn(admin_group, admin_user.group_ids)
