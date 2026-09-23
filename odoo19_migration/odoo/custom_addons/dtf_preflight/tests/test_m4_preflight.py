import base64
from odoo.exceptions import AccessError, ValidationError
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

    def test_newer_rejected_result_overrides_accepted(self):
        design = self.design(); asset = self.asset(design); design.action_set_main_display_asset(asset); design.action_set_ready_to_print_master(asset); rule = self.rule("m4-order")
        self.env["dtf.preflight.result"].create({"asset_id": asset.id, "rule_version_id": rule.id, "status": "accepted", "analyzer_snapshot": {"readable": True, "analyzable": True, "previewable": True}, "locked": True})
        self.assertEqual(asset.latest_preflight_result_id.status, "accepted")
        self.env["dtf.preflight.result"].create({"asset_id": asset.id, "rule_version_id": rule.id, "status": "rejected", "reasons_en": "newer failure", "analyzer_snapshot": {"readable": False}, "locked": True})
        asset.invalidate_recordset(["latest_preflight_result_id"])
        self.assertEqual(asset.latest_preflight_result_id.status, "rejected")
        with self.assertRaisesRegex(ValidationError, "current accepted preflight"):
            design.action_publish()

    def test_printable_area_rejects_oversized_physical_asset(self):
        product = self.env["product.template"].create({"name": "M4 T-Shirt", "dtf_product_type": "tshirt"})
        area = self.env["dtf.product.printable.area"].create({"product_tmpl_id": product.id, "name": "Front", "width_cm": 10, "height_cm": 10})
        rule = self.rule("m4-area"); rule.printable_area_ids = [(6, 0, [area.id])]
        design = self.design(); asset = self.asset(design); snapshot = self.env["dtf.preflight.engine"].inspect_bytes(base64.b64encode(b"%PDF-1.7").decode(), "art.pdf", "application/pdf", 11, 9)
        result = self.env["dtf.preflight.engine"].evaluate(asset, rule, snapshot)
        self.assertIn("printable_area", result["codes"])

    def test_analyzer_rejection_matrix(self):
        engine = self.env["dtf.preflight.engine"]
        asset = self.asset(self.design())
        rule = self.rule("m4-errors")
        for snapshot, code in [
            ({"detected_format": "tiff", "signature_valid": True, "readable": True, "analyzable": True, "previewable": True}, "unsupported_format"),
            ({"detected_format": "png", "signature_valid": True, "readable": False, "analyzable": False, "previewable": False}, "unreadable"),
            ({"detected_format": "png", "signature_valid": False, "readable": True, "analyzable": True, "previewable": True}, "signature_mismatch"),
        ]:
            result = engine.evaluate(asset, rule, snapshot)
            self.assertEqual(result["status"], "rejected")
            self.assertIn(code, result["codes"])

    def test_master_and_bilingual_publish_gates(self):
        for field, label in (("title_ar", "Arabic Title"), ("title_en", "English Title"), ("description_ar", "Arabic Description"), ("description_en", "English Description")):
            values = {"title_en": "EN", "title_ar": "AR", "description_en": "EN desc", "description_ar": "AR desc"}; values[field] = False
            with self.assertRaisesRegex(ValidationError, label): self.design(**values).action_publish()
        design = self.design(); asset = self.asset(design, readable=False)
        with self.assertRaisesRegex(ValidationError, "not readable"): design.action_set_ready_to_print_master(asset)
        design = self.design(); asset = self.asset(design); design.action_set_main_display_asset(asset)
        with self.assertRaisesRegex(ValidationError, "Please select the design that will be used for final print\\.$"): design.action_publish()
        design.action_set_ready_to_print_master(asset)
        self.assertEqual(design.main_display_asset_id, design.ready_to_print_master_asset_id)

    def test_all_seven_product_combinations_have_compatible_current_preflight(self):
        for index, product_type in enumerate(("tshirt", "mug", "cap", "tshirt_mug", "tshirt_cap", "mug_cap", "tshirt_mug_cap")):
            design = self.design(product_type=product_type); asset = self.asset(design, name="combo-%s.png" % index); design.action_set_main_display_asset(asset); design.action_set_ready_to_print_master(asset); rule = self.rule("m4-combo-%s" % index, product=product_type)
            self.env["dtf.preflight.result"].create({"asset_id": asset.id, "rule_version_id": rule.id, "status": "accepted", "analyzer_snapshot": {"readable": True, "analyzable": True, "previewable": True}, "locked": True})
            design.action_publish(); self.assertEqual(design.state, "published")

    def test_security_and_unprotected_deletion_recovery(self):
        design = self.design(); asset = self.asset(design); attachment = asset.attachment_id; design.action_set_main_display_asset(asset); design.action_set_ready_to_print_master(asset)
        rule = self.rule("m4-security"); result = self.env["dtf.preflight.result"].create({"asset_id": asset.id, "rule_version_id": rule.id, "status": "accepted", "locked": True})
        with self.assertRaises(AccessError): self.env["dtf.preflight.rule.version"].with_user(self.user).write({"name": "blocked"})
        with self.assertRaises(AccessError): result.with_user(self.user).write({"status": "rejected", "reasons_en": "blocked"})
        with self.assertRaises(ValidationError): asset.unlink()
        clean_design = self.design(); clean_asset = self.asset(clean_design); clean_attachment = clean_asset.attachment_id
        clean_design.action_set_main_display_asset(clean_asset); clean_design.action_set_ready_to_print_master(clean_asset); clean_asset.unlink()
        self.assertFalse(self.env["dtf.design.asset"].search([("id", "=", clean_asset.id)])); self.assertFalse(self.env["ir.attachment"].search([("id", "=", clean_attachment.id)]))
return 