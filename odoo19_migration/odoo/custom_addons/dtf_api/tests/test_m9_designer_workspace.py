import json

from odoo.tests.common import HttpCase, tagged


@tagged("post_install", "-at_install")
class TestDTFM9DesignerWorkspace(HttpCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.login = "m9-workspace@example.test"
        cls.password = "M9-workspace-password"
        cls.user = cls.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M9 Workspace Designer",
            "login": cls.login,
            "password": cls.password,
            "group_ids": [(6, 0, [cls.env.ref("dtf_core.group_dtf_designer").id])],
        })
        cls.profile = cls.env["dtf.designer.profile"].create({
            "partner_id": cls.user.partner_id.id,
            "user_id": cls.user.id,
            "authorized": True,
            "qualification_state": "authorized",
        })
        cls.design = cls.env["dtf.design"].create({
            "designer_id": cls.profile.id,
            "title_en": "M9 Workspace Design",
            "title_ar": "تصميم مساحة M9",
            "description_en": "Workspace design",
            "description_ar": "تصميم لمساحة المصمم",
            "product_type": "tshirt",
        })
        cls.cover_attachment = cls.env["ir.attachment"].create({
            "name": "workspace-cover.png",
            "raw": b"workspace-cover",
            "mimetype": "image/png",
        })
        cls.cover_asset = cls.env["dtf.design.asset"].create({
            "design_id": cls.design.id,
            "attachment_id": cls.cover_attachment.id,
            "name": "workspace-cover.png",
            "file_format": "png",
            "mime_type": "image/png",
            "size_bytes": len(b"workspace-cover"),
            "previewable": True,
            "readable": True,
            "analyzable": True,
        })
        cls.master_attachment = cls.env["ir.attachment"].create({
            "name": "workspace-master.png",
            "raw": b"workspace-master",
            "mimetype": "image/png",
        })
        cls.master_asset = cls.env["dtf.design.asset"].create({
            "design_id": cls.design.id,
            "attachment_id": cls.master_attachment.id,
            "name": "workspace-master.png",
            "file_format": "png",
            "mime_type": "image/png",
            "size_bytes": len(b"workspace-master"),
            "previewable": True,
            "readable": True,
            "analyzable": True,
        })
        cls.rule = cls.env["dtf.preflight.rule.version"].create({
            "name": "M9 Workspace Rule",
            "version": "m9-workspace-v1",
            "product_type": "tshirt",
            "min_effective_dpi": 300,
        })
        cls.result = cls.env["dtf.preflight.result"].create({
            "asset_id": cls.master_asset.id,
            "rule_version_id": cls.rule.id,
            "status": "accepted",
            "analyzer_snapshot": {
                "effective_dpi": {"minimum": 320},
            },
            "locked": True,
        })

        cls.other_user = cls.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M9 Other Designer",
            "login": "m9-workspace-other@example.test",
            "password": cls.password,
            "group_ids": [(6, 0, [cls.env.ref("dtf_core.group_dtf_designer").id])],
        })
        cls.other_profile = cls.env["dtf.designer.profile"].create({
            "partner_id": cls.other_user.partner_id.id,
            "user_id": cls.other_user.id,
            "authorized": True,
            "qualification_state": "authorized",
        })

    def _jsonrpc(self, path, params=None):
        response = self.url_open(
            path,
            data=json.dumps({
                "jsonrpc": "2.0",
                "method": "call",
                "params": params or {},
                "id": 1,
            }),
            headers={"Content-Type": "application/json"},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertNotIn("error", payload, payload)
        return payload["result"]

    def test_authorized_designer_workspace_uses_native_owned_records(self):
        self.authenticate(self.login, self.password)
        response = self.url_open("/api/dtf/v1/designer/workspace")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["profile"]["qualificationState"], "authorized")
        design = next(
            item for item in payload["designs"]
            if item["designId"] == str(self.design.id)
        )
        self.assertEqual(design["titleEn"], "M9 Workspace Design")
        master = next(
            item for item in design["assets"]
            if item["assetId"] == str(self.master_asset.id)
        )
        self.assertEqual(master["preflightStatus"], "passed")
        self.assertEqual(master["effectiveDpi"], 320)
        self.assertTrue(master["protected"])

    def test_designer_can_set_own_cover_and_valid_master(self):
        self.authenticate(self.login, self.password)
        cover = self._jsonrpc(
            f"/api/dtf/v1/designer/designs/{self.design.id}/cover",
            {"asset_id": self.cover_asset.id},
        )
        self.assertTrue(cover["ok"])
        master = self._jsonrpc(
            f"/api/dtf/v1/designer/designs/{self.design.id}/master",
            {"asset_id": self.master_asset.id},
        )
        self.assertTrue(master["ok"])
        self.design.invalidate_recordset()
        self.assertEqual(self.design.main_display_asset_id, self.cover_asset)
        self.assertEqual(self.design.ready_to_print_master_asset_id, self.master_asset)

    def test_designer_asset_preview_is_owned_and_private(self):
        self.authenticate(self.login, self.password)
        response = self.url_open(
            f"/api/dtf/v1/designer/assets/{self.cover_asset.id}"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"workspace-cover")
        self.assertEqual(response.headers["Cache-Control"], "private, max-age=300")

        self.authenticate(self.other_user.login, self.password)
        denied = self.url_open(
            f"/api/dtf/v1/designer/assets/{self.cover_asset.id}"
        )
        self.assertEqual(denied.status_code, 404)

    def test_designer_can_delete_unprotected_own_asset_but_not_locked_evidence(self):
        disposable_attachment = self.env["ir.attachment"].create({
            "name": "disposable.png",
            "raw": b"disposable",
            "mimetype": "image/png",
        })
        disposable = self.env["dtf.design.asset"].create({
            "design_id": self.design.id,
            "attachment_id": disposable_attachment.id,
            "name": "disposable.png",
            "file_format": "png",
            "mime_type": "image/png",
            "size_bytes": len(b"disposable"),
            "previewable": True,
            "readable": True,
            "analyzable": True,
        })

        self.authenticate(self.login, self.password)
        deleted = self._jsonrpc(
            f"/api/dtf/v1/designer/assets/{disposable.id}/delete"
        )
        self.assertTrue(deleted["ok"])
        self.assertFalse(disposable.exists())

        protected = self._jsonrpc(
            f"/api/dtf/v1/designer/assets/{self.master_asset.id}/delete"
        )
        self.assertIn("error", protected)
        self.assertTrue(self.master_asset.exists())

    def test_non_authorized_designer_is_sent_to_qualification_state(self):
        self.profile.write({
            "authorized": False,
            "qualification_state": "draft",
        })
        self.authenticate(self.login, self.password)
        response = self.url_open("/api/dtf/v1/designer/workspace")
        self.assertEqual(response.status_code, 409)
        payload = response.json()
        self.assertEqual(payload["error"], "qualification_required")
        self.assertEqual(payload["qualificationState"], "draft")
