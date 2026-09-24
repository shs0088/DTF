import base64

from odoo.exceptions import AccessError, ValidationError
from odoo.tests.common import TransactionCase


class TestDTFM6Production(TransactionCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.admin_group = cls.env.ref("dtf_core.group_dtf_admin")
        cls.operator_group = cls.env.ref("dtf_core.group_dtf_printing_operator")
        cls.designer_group = cls.env.ref("dtf_core.group_dtf_designer")

        cls.admin_user = cls.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M6 DTF Admin",
            "login": "m6-admin@example.test",
            "group_ids": [(6, 0, [cls.admin_group.id])],
        })
        cls.operator_user = cls.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M6 Printing Operator",
            "login": "m6-operator@example.test",
            "group_ids": [(6, 0, [cls.operator_group.id])],
        })

        designer_partner = cls.env["res.partner"].create({
            "name": "M6 Designer",
            "email": "m6-designer@example.test",
            "dtf_designer_enabled": True,
        })
        designer_user = cls.env["res.users"].with_context(no_reset_password=True).create({
            "name": "M6 Designer",
            "login": "m6-designer@example.test",
            "partner_id": designer_partner.id,
            "group_ids": [(6, 0, [cls.designer_group.id])],
        })
        cls.profile = cls.env["dtf.designer.profile"].create({
            "partner_id": designer_partner.id,
            "user_id": designer_user.id,
        })

        cls.design = cls.env["dtf.design"].create({
            "designer_id": cls.profile.id,
            "title_en": "M6 Design",
            "title_ar": "تصميم M6",
            "description_en": "Production test",
            "description_ar": "اختبار الإنتاج",
            "product_type": "tshirt",
        })
        cls.attachment = cls.env["ir.attachment"].create({
            "name": "m6-master.png",
            "datas": base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"\x00" * 64).decode(),
            "mimetype": "image/png",
        })
        cls.asset = cls.env["dtf.design.asset"].with_context(dtf_preflight_migration=True).create({
            "design_id": cls.design.id,
            "attachment_id": cls.attachment.id,
            "name": "m6-master.png",
            "file_format": "png",
            "mime_type": "image/png",
            "size_bytes": 72,
            "pixel_width": 4500,
            "pixel_height": 5400,
            "previewable": True,
            "readable": True,
            "analyzable": True,
        })
        cls.design.action_set_main_display_asset(cls.asset)
        cls.design.action_set_ready_to_print_master(cls.asset)

        cls.rule = cls.env["dtf.preflight.rule.version"].create({
            "name": "M6 rule",
            "version": "m6-v1",
            "product_type": "tshirt",
            "min_effective_dpi": 300,
            "allowed_formats": ["png", "jpg", "jpeg", "webp", "svg", "pdf"],
        })
        cls.preflight = cls.env["dtf.preflight.result"].create({
            "asset_id": cls.asset.id,
            "rule_version_id": cls.rule.id,
            "status": "accepted",
            "analyzer_snapshot": {
                "detected_format": "png",
                "readable": True,
                "analyzable": True,
                "previewable": True,
            },
            "locked": False,
        })

        cls.customer = cls.env["res.partner"].create({
            "name": "M6 Customer",
            "phone": "+962790000006",
        })
        cls.product_tmpl = cls.env["product.template"].create({
            "name": "M6 Printable Shirt",
            "list_price": 15.0,
            "is_storable": True,
            "dtf_product_type": "tshirt",
        })
        cls.product = cls.product_tmpl.product_variant_id
        cls.order = cls.env["sale.order"].create({
            "partner_id": cls.customer.id,
        })
        cls.line = cls.env["sale.order.line"].create({
            "order_id": cls.order.id,
            "product_id": cls.product.id,
            "product_uom_qty": 2,
            "price_unit": cls.product.list_price,
            "dtf_design_id": cls.design.id,
            "dtf_master_asset_id": cls.asset.id,
        })
        cls.line.action_capture_dtf_snapshots()
        cls.order.action_confirm()

    def create_job(self):
        return self.line.with_user(self.admin_user).action_create_dtf_production_job()

    def test_exact_order_master_and_preflight_become_native_mrp_job(self):
        job = self.create_job()
        self.assertEqual(job._name, "mrp.production")
        self.assertTrue(job.dtf_is_print_job)
        self.assertEqual(job.dtf_sale_line_id, self.line)
        self.assertEqual(job.dtf_design_id, self.design)
        self.assertEqual(job.dtf_master_asset_id, self.asset)
        self.assertEqual(job.dtf_master_attachment_id, self.attachment)
        self.assertEqual(job.dtf_preflight_result_id, self.preflight)
        self.assertEqual(job.product_id, self.product)
        self.assertEqual(job.product_qty, 2)
        self.assertEqual(job.dtf_customer_name, self.customer.display_name)
        self.assertEqual(job.dtf_customer_phone, self.customer.phone)
        self.assertEqual(job.dtf_operator_stage, "new")
        self.assertEqual(job.dtf_preflight_snapshot["result_id"], self.preflight.id)

    def test_creation_is_admin_only_confirmed_order_only_and_idempotent(self):
        first = self.create_job()
        second = self.create_job()
        self.assertEqual(first, second)

        with self.assertRaises(AccessError):
            self.line.with_user(self.operator_user).action_create_dtf_production_job()

        draft_order = self.env["sale.order"].create({"partner_id": self.customer.id})
        draft_line = self.env["sale.order.line"].create({
            "order_id": draft_order.id,
            "product_id": self.product.id,
            "product_uom_qty": 1,
            "price_unit": self.product.list_price,
            "dtf_design_id": self.design.id,
            "dtf_master_asset_id": self.asset.id,
            "dtf_customer_snapshot": dict(self.line.dtf_customer_snapshot),
            "dtf_product_snapshot": dict(self.line.dtf_product_snapshot),
            "dtf_preflight_snapshot": dict(self.line.dtf_preflight_snapshot),
        })
        with self.assertRaisesRegex(ValidationError, "confirmed native Odoo sale order"):
            draft_line.with_user(self.admin_user).action_create_dtf_production_job()

    def test_operator_is_limited_to_dtf_jobs_and_status_updates(self):
        job = self.create_job()
        operator_job = job.with_user(self.operator_user)
        self.assertEqual(operator_job.dtf_order_name, self.order.name)

        standard = self.env["mrp.production"].create({
            "product_id": self.product.id,
            "product_qty": 1,
            "product_uom_id": self.product.uom_id.id,
        })
        self.assertFalse(
            self.env["mrp.production"].with_user(self.operator_user).search([
                ("id", "=", standard.id)
            ])
        )

        operator_job.action_dtf_start_preparation()
        self.assertEqual(job.dtf_operator_stage, "under_preparation")
        operator_job.action_dtf_mark_ready()
        self.assertEqual(job.dtf_operator_stage, "ready")
        operator_job.action_dtf_mark_completed()
        self.assertEqual(job.dtf_operator_stage, "completed")

        with self.assertRaises(AccessError):
            operator_job.write({"dtf_customer_name": "Tampered"})
        with self.assertRaises(ValidationError):
            operator_job.action_dtf_start_preparation()

    def test_production_evidence_is_protected_from_destructive_change(self):
        job = self.create_job()

        with self.assertRaisesRegex(ValidationError, "production evidence"):
            self.asset.unlink()
        with self.assertRaisesRegex(ValidationError, "production evidence"):
            self.design.unlink()
        with self.assertRaisesRegex(ValidationError, "production evidence"):
            self.attachment.unlink()
        with self.assertRaisesRegex(ValidationError, "protected production evidence"):
            job.unlink()
        with self.assertRaisesRegex(ValidationError, "production evidence"):
            self.line.write({"dtf_master_asset_id": False})

    def test_master_file_is_exposed_through_the_authorized_job_record(self):
        job = self.create_job().with_user(self.operator_user)
        self.assertEqual(job.dtf_master_filename, "m6-master.png")
        self.assertTrue(job.dtf_master_file)
