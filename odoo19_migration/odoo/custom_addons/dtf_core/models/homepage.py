from odoo import fields, models


class DTFHomepageBanner(models.Model):
    _name = "dtf.homepage.banner"
    _description = "DTF Studio Homepage Banner"
    _order = "sequence, id"

    name = fields.Char(required=True, default="Homepage Banner")
    active = fields.Boolean(default=True, index=True)
    sequence = fields.Integer(default=10, index=True)

    eyebrow_en = fields.Char()
    eyebrow_ar = fields.Char()
    title_en = fields.Char(required=True)
    title_ar = fields.Char(required=True)
    subtitle_en = fields.Text()
    subtitle_ar = fields.Text()

    image_1920 = fields.Image(
        string="Banner Image",
        max_width=2560,
        max_height=1440,
        attachment=True,
    )
    image_alt_en = fields.Char()
    image_alt_ar = fields.Char()

    primary_cta_label_en = fields.Char(default="Shop Products")
    primary_cta_label_ar = fields.Char(default="تسوق المنتجات")
    primary_cta_url = fields.Char(default="/customize")

    secondary_cta_label_en = fields.Char(default="Design Gallery")
    secondary_cta_label_ar = fields.Char(default="معرض التصاميم")
    secondary_cta_url = fields.Char(default="/designs")

    def dtf_public_payload(self):
        self.ensure_one()
        return {
            "id": self.id,
            "sequence": self.sequence,
            "eyebrow_en": self.eyebrow_en or "",
            "eyebrow_ar": self.eyebrow_ar or "",
            "title_en": self.title_en or "",
            "title_ar": self.title_ar or "",
            "subtitle_en": self.subtitle_en or "",
            "subtitle_ar": self.subtitle_ar or "",
            "image_url": (
                f"/api/dtf/v1/homepage/banners/{self.id}/image"
                if self.image_1920 else None
            ),
            "image_alt_en": self.image_alt_en or self.title_en or "",
            "image_alt_ar": self.image_alt_ar or self.title_ar or "",
            "primary_cta_label_en": self.primary_cta_label_en or "",
            "primary_cta_label_ar": self.primary_cta_label_ar or "",
            "primary_cta_url": self.primary_cta_url or "/customize",
            "secondary_cta_label_en": self.secondary_cta_label_en or "",
            "secondary_cta_label_ar": self.secondary_cta_label_ar or "",
            "secondary_cta_url": self.secondary_cta_url or "/designs",
        }
