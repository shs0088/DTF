import base64

from odoo.tests.common import HttpCase, tagged


PNG_1X1 = base64.b64decode(
    b"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZpTQAAAAASUVORK5CYII="
)


@tagged("post_install", "-at_install")
class TestDTFM11Homepage(HttpCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.active_banner = cls.env["dtf.homepage.banner"].create({
            "name": "M11 Dynamic Banner",
            "sequence": 1,
            "title_en": "M11 Odoo Homepage",
            "title_ar": "واجهة M11 من أودو",
            "subtitle_en": "Controlled from Odoo",
            "subtitle_ar": "تدار من أودو",
            "image_1920": base64.b64encode(PNG_1X1),
        })
        cls.inactive_banner = cls.env["dtf.homepage.banner"].create({
            "name": "M11 Hidden Banner",
            "active": False,
            "title_en": "Hidden",
            "title_ar": "مخفي",
        })

    def test_homepage_api_returns_only_active_odoo_banners(self):
        response = self.url_open("/api/dtf/v1/homepage")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        ids = [row["id"] for row in payload["banners"]]
        self.assertIn(self.active_banner.id, ids)
        self.assertNotIn(self.inactive_banner.id, ids)
        row = next(row for row in payload["banners"] if row["id"] == self.active_banner.id)
        self.assertEqual(row["title_en"], "M11 Odoo Homepage")
        self.assertEqual(row["title_ar"], "واجهة M11 من أودو")
        self.assertEqual(
            row["image_url"],
            f"/api/dtf/v1/homepage/banners/{self.active_banner.id}/image",
        )

    def test_homepage_banner_image_is_public_and_typed(self):
        response = self.url_open(
            f"/api/dtf/v1/homepage/banners/{self.active_banner.id}/image"
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.content.startswith(b"\x89PNG"))
        self.assertEqual(response.headers["Content-Type"], "image/png")
        self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
