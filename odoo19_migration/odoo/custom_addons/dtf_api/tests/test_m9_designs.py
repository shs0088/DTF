from odoo.tests.common import HttpCase, tagged


@tagged("post_install", "-at_install")
class TestDTFM9DesignGallery(HttpCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        partner = cls.env["res.partner"].create({"name": "M9 Gallery Designer"})
        cls.profile = cls.env["dtf.designer.profile"].create({"partner_id": partner.id})

        cls.design = cls.env["dtf.design"].create({
            "designer_id": cls.profile.id,
            "title_en": "M9 Gallery Design",
            "title_ar": "تصميم معرض M9",
            "description_en": "Published gallery design",
            "description_ar": "تصميم منشور في المعرض",
            "product_type": "tshirt",
        })
        attachment = cls.env["ir.attachment"].create({
            "name": "m9-gallery.png",
            "raw": b"m9-gallery-image",
            "mimetype": "image/png",
        })
        cls.asset = cls.env["dtf.design.asset"].create({
            "design_id": cls.design.id,
            "attachment_id": attachment.id,
            "name": "m9-gallery.png",
            "file_format": "png",
            "mime_type": "image/png",
            "size_bytes": len(b"m9-gallery-image"),
            "previewable": True,
            "readable": True,
            "analyzable": True,
        })
        cls.design.write({
            "main_display_asset_id": cls.asset.id,
            "state": "published",
        })

        cls.draft = cls.env["dtf.design"].create({
            "designer_id": cls.profile.id,
            "title_en": "M9 Hidden Draft",
            "title_ar": "مسودة مخفية",
            "description_en": "Not public",
            "description_ar": "غير منشور",
            "product_type": "tshirt",
        })

    def test_gallery_lists_only_published_designs_with_main_display_preview(self):
        response = self.url_open("/api/dtf/v1/designs")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        row = next(item for item in payload["items"] if item["id"] == self.design.id)
        self.assertEqual(row["title_en"], "M9 Gallery Design")
        self.assertEqual(row["title_ar"], "تصميم معرض M9")
        self.assertEqual(row["designer_name"], "M9 Gallery Designer")
        self.assertEqual(row["display_asset_id"], self.asset.id)
        self.assertEqual(
            row["image_url"],
            f"/api/dtf/v1/design-assets/{self.asset.id}/preview",
        )
        self.assertNotIn(self.draft.id, [item["id"] for item in payload["items"]])

    def test_public_preview_serves_only_selected_main_display_asset(self):
        response = self.url_open(
            f"/api/dtf/v1/design-assets/{self.asset.id}/preview"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"m9-gallery-image")
        self.assertEqual(response.headers["Content-Type"], "image/png")
        self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")

        other_attachment = self.env["ir.attachment"].create({
            "name": "private.png",
            "raw": b"private-image",
            "mimetype": "image/png",
        })
        other_asset = self.env["dtf.design.asset"].create({
            "design_id": self.design.id,
            "attachment_id": other_attachment.id,
            "name": "private.png",
            "file_format": "png",
            "mime_type": "image/png",
            "size_bytes": len(b"private-image"),
            "previewable": True,
            "readable": True,
            "analyzable": True,
        })
        denied = self.url_open(
            f"/api/dtf/v1/design-assets/{other_asset.id}/preview"
        )
        self.assertEqual(denied.status_code, 404)
