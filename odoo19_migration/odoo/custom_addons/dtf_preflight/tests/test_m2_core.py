import base64

from odoo.exceptions import AccessError, ValidationError
from odoo.tests.common import TransactionCase


class TestDTFM2Core(TransactionCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.designer_group = cls.env.ref("dtf_core.group_dtf_designer")
        cls.admin_group = cls.env.ref("dtf_core.group_dtf_admin")

        cls.partner_one = cls.env["res.partner"].create(
            {"name": "Designer One", "email": "designer1@example.test", "dtf_designer_enabled": True}
        )
        cls.partner_two = cls.env["res.partner"].create(
            {"name": "Designer Two", "email": "designer2@example.test", "dtf_designer_enabled": True}
        )
        cls.user_one = cls.env["res.users"].with_context(no_reset_password=True).create(
            {
                "name": "Designer One",
                "login": "designer1@example.test",
                "partner_id": cls.partner_one.id,
                "groups_id": [(6, 0, [cls.designer_group.id])],
            }
        )
        cls.user_two = cls.env["res.users"].with_context(no_reset_password=True).create(
            {
                "name": "Designer Two",
                "login": "designer2@example.test",
                "partner_id": cls.partner_two.id,
                "groups_id": [(6, 0, [cls.designer_group.id])],
            }
        )
        cls.profile_one = cls.env["dtf.designer.profile"].create(
            {"partner_id": cls.partner_one.id, "user_id": cls.user_one.id}
        )
        cls.profile_two = cls.env["dtf.designer.profile"].create(
            {"partner_id": cls.partner_two.id, "user_id": cls.user_two.id}
        )

    def _attachment(self, name, mimetype="image/png"):
        return self.env["ir.attachment"].create(
            {
                "name": name,
                "datas": base64.b64encode(b"dtf-test").decode(),
                "mimetype": mimetype,
            }
        )

    def _asset(self, design, name, preflight_state="pending"):
        return self.env["dtf.design.asset"].with_context(dtf_preflight_migration=True).create(
            {
                "design_id": design.id,
                "attachment_id": self._attachment(name).id,
                "name": name,
                "file_format": "png",
                "mime_type": "image/png",
                "size_bytes": 8,
                "pixel_width": 4500,
                "pixel_height": 5400,
                "embedded_dpi": 300,
                "has_alpha": True,
                "previewable": True,
                "readable": True,
                "analyzable": True,
                "preflight_state": preflight_state,
            }
        )

    def _design(self, profile, **extra):
        values = {
            "designer_id": profile.id,
            "title_en": "Test Design",
            "title_ar": "تصميم اختبار",
            "description_en": "English description",
            "description_ar": "وصف عربي",
            "product_type": "tshirt",
        }
        values.update(extra)
        return self.env["dtf.design"].create(values)

    def test_master_is_never_auto_selected(self):
        design = self._design(self.profile_one)
        asset = self._asset(design, "master.png")

        design._ensure_main_display_asset()

        self.assertEqual(design.main_display_asset_id, asset)
        self.assertFalse(design.ready_to_print_master_asset_id)

        design.action_set_ready_to_print_master(asset)
        self.assertEqual(design.ready_to_print_master_asset_id, asset)

    def test_master_must_belong_to_same_design(self):
        design_one = self._design(self.profile_one)
        design_two = self._design(self.profile_one)
        foreign_asset = self._asset(design_two, "foreign.png")
        with self.assertRaises(ValidationError):
            design_one.action_set_ready_to_print_master(foreign_asset)

    def test_publish_requires_accepted_preflight(self):
        design = self._design(self.profile_one)
        asset = self._asset(design, "print.png")
        design.action_set_main_display_asset(asset)
        design.action_set_ready_to_print_master(asset)

        with self.assertRaises(ValidationError):
            design.action_publish()

        rule = self.env["dtf.preflight.rule.version"].create(
            {
                "name": "T-Shirt v1",
                "version": "m2-test-v1",
                "product_type": "tshirt",
                "allowed_formats": ["png", "jpg", "jpeg", "webp", "svg", "pdf"],
            }
        )
        self.env["dtf.preflight.result"].create(
            {
                "asset_id": asset.id,
                "rule_version_id": rule.id,
                "status": "accepted",
                "analyzer_snapshot": {"effective_dpi": 300},
                "locked": True,
            }
        )
        self.assertEqual(asset.preflight_state, "accepted")
        design.action_publish()
        self.assertEqual(design.state, "published")

    def test_locked_preflight_result_is_immutable(self):
        design = self._design(self.profile_one)
        asset = self._asset(design, "locked.png")
        rule = self.env["dtf.preflight.rule.version"].create(
            {
                "name": "Mug v1",
                "version": "m2-test-locked",
                "product_type": "mug",
            }
        )
        result = self.env["dtf.preflight.result"].create(
            {
                "asset_id": asset.id,
                "rule_version_id": rule.id,
                "status": "accepted",
                "locked": True,
            }
        )
        with self.assertRaises(ValidationError):
            result.write({"status": "rejected", "reasons_en": "No longer valid"})
        with self.assertRaises(ValidationError):
            result.unlink()

    def test_exactly_three_qualification_designs(self):
        designs = self.env["dtf.design"]
        for index in range(3):
            design = self._design(
                self.profile_one,
                is_qualification_sample=True,
                title_en=f"Qualification {index + 1}",
                title_ar=f"تأهيل {index + 1}",
            )
            self._asset(design, f"qualification-{index + 1}.png")
            designs |= design

        self.profile_one.qualification_design_ids = [(6, 0, designs.ids)]
        self.profile_one.action_submit_qualification()

        self.assertEqual(self.profile_one.qualification_state, "system_qualified")
        self.assertTrue(self.profile_one.review_deadline)

    def test_qualification_design_cannot_have_master_or_publish(self):
        design = self._design(self.profile_one, is_qualification_sample=True)
        asset = self._asset(design, "qualification.png")
        with self.assertRaises(ValidationError):
            design.action_set_ready_to_print_master(asset)
        with self.assertRaises(ValidationError):
            design.action_publish()

    def test_designer_record_rule_is_owner_scoped(self):
        own_design = self._design(self.profile_one, title_en="Owned")
        other_design = self._design(self.profile_two, title_en="Other")

        visible = self.env["dtf.design"].with_user(self.user_one).search(
            [("id", "in", [own_design.id, other_design.id])]
        )
        self.assertEqual(visible, own_design)

        with self.assertRaises(AccessError):
            other_design.with_user(self.user_one).check_access("write")

    def test_seven_product_combinations_are_exact(self):
        selection = dict(self.env["dtf.design"]._fields["product_type"].selection)
        self.assertEqual(
            set(selection),
            {
                "tshirt",
                "mug",
                "cap",
                "tshirt_mug",
                "tshirt_cap",
                "mug_cap",
                "tshirt_mug_cap",
            },
        )
