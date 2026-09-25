from odoo.tests.common import HttpCase, tagged


@tagged("post_install", "-at_install")
class TestDTFM9DesignerUpload(HttpCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.password = "M9-upload-password"
        cls.partner = cls.env["res.partner"].create({
            "name": "M9 Upload Designer",
            "email": "m9-upload@example.test",
            "dtf_designer_enabled": True,
        })
        cls.user = cls.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M9 Upload Designer",
            "login": "m9-upload@example.test",
            "password": cls.password,
            "partner_id": cls.partner.id,
            "group_ids": [(6, 0, [cls.env.ref("dtf_core.group_dtf_designer").id])],
        })
        cls.profile = cls.env["dtf.designer.profile"].create({
            "partner_id": cls.partner.id,
            "user_id": cls.user.id,
        })
        cls.profile.sudo().write({
            "authorized": True,
            "qualification_state": "authorized",
        })
        cls.rule = cls.env["dtf.preflight.rule.version"].create({
            "name": "M9 Upload T-Shirt",
            "version": "m9-upload-tshirt-v1",
            "product_type": "tshirt",
            "min_effective_dpi": 300,
            "max_width_cm": 40,
            "max_height_cm": 50,
            "allowed_formats": ["png", "svg"],
            "require_previewable": True,
        })

    def _svg(self):
        return (
            b'<svg xmlns="http://www.w3.org/2000/svg" '
            b'width="4800" height="6000" viewBox="0 0 4800 6000">'
            b'<rect width="4800" height="6000" fill="black"/></svg>'
        )

    def _png(self, width=1200, height=1200):
        return (
            b"\x89PNG\r\n\x1a\n"
            + b"\x00\x00\x00\rIHDR"
            + int(width).to_bytes(4, "big")
            + int(height).to_bytes(4, "big")
            + b"\x08\x06\x00\x00\x00"
        )

    def _upload(self, product_type="T-Shirt", **overrides):
        data = {
            "titleEn": "Native Upload",
            "titleAr": "رفع أصلي",
            "descriptionEn": "Native Odoo design upload",
            "descriptionAr": "رفع تصميم أصلي إلى أودو",
            "productType": product_type,
            "masterIndex": "1",
            "coverIndex": "0",
        }
        data.update(overrides)
        return self.url_open(
            "/api/dtf/v1/designer/designs/create",
            data=data,
            files=[
                ("files", ("cover.png", self._png(), "image/png")),
                ("files", ("master.svg", self._svg(), "image/svg+xml")),
            ],
        )

    def test_authorized_designer_creates_native_design_with_explicit_master(self):
        self.authenticate(self.user.login, self.password)
        response = self._upload()
        self.assertEqual(response.status_code, 201, response.text)
        payload = response.json()
        self.assertTrue(payload["ok"])

        design = self.env["dtf.design"].browse(int(payload["design"]["designId"]))
        self.assertTrue(design.exists())
        self.assertEqual(design.designer_id, self.profile)
        self.assertEqual(design.product_type, "tshirt")
        self.assertEqual(len(design.asset_ids), 2)
        self.assertTrue(design.main_display_asset_id)
        self.assertTrue(design.ready_to_print_master_asset_id)
        self.assertNotEqual(
            design.main_display_asset_id,
            design.ready_to_print_master_asset_id,
        )
        master = design.ready_to_print_master_asset_id
        latest = master.latest_preflight_result_id
        self.assertTrue(latest)
        self.assertEqual(latest.status, "accepted")
        self.assertTrue(latest.locked)
        cover = design.main_display_asset_id
        self.assertFalse(cover.preflight_result_ids)
        self.assertFalse(cover.is_ready_to_print_master)

    def test_missing_active_rule_blocks_upload_without_persistence(self):
        self.authenticate(self.user.login, self.password)
        before = self.env["dtf.design"].search_count([
            ("designer_id", "=", self.profile.id),
            ("is_qualification_sample", "=", False),
        ])
        response = self._upload(product_type="Mug")
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["error"], "preflight_rule_missing")
        after = self.env["dtf.design"].search_count([
            ("designer_id", "=", self.profile.id),
            ("is_qualification_sample", "=", False),
        ])
        self.assertEqual(after, before)

    def test_failed_master_preflight_rolls_back_design_and_assets(self):
        cap_rule = self.env["dtf.preflight.rule.version"].create({
            "name": "M9 Upload Cap Reject",
            "version": "m9-upload-cap-v1",
            "product_type": "cap",
            "min_effective_dpi": 300,
            "max_width_cm": 10,
            "max_height_cm": 6,
            "allowed_formats": ["png", "svg"],
            "require_previewable": True,
            "require_transparency": True,
        })
        self.assertTrue(cap_rule)
        self.authenticate(self.user.login, self.password)
        before_designs = self.env["dtf.design"].search_count([
            ("designer_id", "=", self.profile.id),
        ])
        before_assets = self.env["dtf.design.asset"].search_count([
            ("design_id.designer_id", "=", self.profile.id),
        ])
        response = self._upload(product_type="Cap")
        self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(response.json()["error"], "master_preflight_failed")
        self.assertEqual(
            self.env["dtf.design"].search_count([
                ("designer_id", "=", self.profile.id),
            ]),
            before_designs,
        )
        self.assertEqual(
            self.env["dtf.design.asset"].search_count([
                ("design_id.designer_id", "=", self.profile.id),
            ]),
            before_assets,
        )

    def test_master_selection_is_mandatory_and_never_auto_selected(self):
        self.authenticate(self.user.login, self.password)
        response = self._upload(masterIndex="-1")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "master_selection_required")
