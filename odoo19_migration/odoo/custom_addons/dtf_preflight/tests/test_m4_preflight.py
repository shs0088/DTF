import base64
from odoo.exceptions import ValidationError
from odoo.tests.common import TransactionCase

class TestDTFM4Preflight(TransactionCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.admin_group = cls.env.ref("dtf_core.group_dtf_admin")
        cls.designer_group = cls.env.ref("dtf_core.group_dtf_designer")
        cls.partner = cls.env["res.partner"].create({"name": "M4 Designer", "email": "m4-designer@example.test", "dtf_designer_enabled": True})
        cls.user = cls.env["res.users"].with_context(no_reset_password=True).create({"name": "M4 Designer", "login": "m4-designer@example.test", "partner_id": cls.partner.id, "group_ids": [(6, 0, [cls.designer_group.id])]})
        cls.profile = cls.env["dtf.designer.profile"].create({"partner_id": cls.partner.id, "user_id": cls.user.id})
    def design(self, **values):
        base={"designer_id": self.profile.id, "title_en":"Test", "title_ar":"اختبار", "description_en":"Description", "description_ar":"وصف", "product_type":"tshirt"}; base.update(values); return self.env["dtf.design"].create(base)
    def asset(self, design, name="art.png", data=None, preview=True, readable=True, analyzable=True):
        data=data or b"\x89PNG\r\n\x1a\n"+b"\x00"*40
        attachment=self.env["ir.attachment"].create({"name":name,"datas":base64.b64encode(data).decode(),"mimetype":"image/png"})
        return self.env["dtf.design.asset"].with_context(dtf_preflight_migration=True).create({"design_id":design.id,"attachment_id":attachment.id,"name":name,"file_format":"png","mime_type":"image/png","size_bytes":len(data),"pixel_width":4500,"pixel_height":5400,"previewable":preview,"readable":readable,"analyzable":analyzable})
    def rule(self, version="m4-v1", product="tshirt", dpi=300):
        return self.env["dtf.preflight.rule.version"].create({"name":version,"version":version,"product_type":product,"min_effective_dpi":dpi,"allowed_formats":["png","jpg","jpeg","webp","svg","pdf"]})
    def test_effective_dpi_and_rejection_are_structured(self):
        engine=self.env["dtf.preflight.engine"]; snapshot=engine.inspect_bytes(base64.b64encode(b"%PDF-1.7").decode(),"art.pdf","application/pdf",10,10); self.assertEqual(snapshot["detected_format"],"pdf"); self.assertIsNone(snapshot["effective_dpi"]["minimum"]); self.assertFalse(snapshot["previewable"])
    def test_publish_requires_current_accepted_master(self):
        design=self.design(); asset=self.asset(design); design.action_set_main_display_asset(asset); design.action_set_ready_to_print_master(asset)
        with self.assertRaisesRegex(ValidationError,"current accepted preflight"): design.action_publish()
        rule=self.rule(); self.env["dtf.preflight.result"].create({"asset_id":asset.id,"rule_version_id":rule.id,"status":"accepted","analyzer_snapshot":{"detected_format":"png","readable":True,"analyzable":True,"previewable":True},"locked":True}); design.action_publish(); self.assertEqual(design.state,"published")
    def test_master_never_auto_selects_and_locked_asset_cannot_delete(self):
        design=self.design(); asset=self.asset(design); design._ensure_main_display_asset(); self.assertEqual(design.main_display_asset_id,asset); self.assertFalse(design.ready_to_print_master_asset_id); rule=self.rule("m4-lock"); self.env["dtf.preflight.result"].create({"asset_id":asset.id,"rule_version_id":rule.id,"status":"rejected","reasons_en":"bad","locked":True})
        with self.assertRaises(ValidationError):
            asset.unlink()
