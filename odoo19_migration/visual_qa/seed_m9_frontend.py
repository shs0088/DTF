import os

customer_password = os.environ["M9_VISUAL_CUSTOMER_PASSWORD"]
designer_password = os.environ["M9_VISUAL_DESIGNER_PASSWORD"]

arabic = env["res.lang"].sudo()._activate_lang("ar_001")
english = env["res.lang"].sudo()._activate_lang("en_US")

category = env["product.public.category"].sudo().create({
    "name": "M9 Visual Apparel",
    "sequence": 10,
})
category.with_context(lang=arabic.code).write({
    "name": "ملابس مرئية M9",
})

product = env["product.template"].sudo().create({
    "name": "M9 Visual Tee",
    "list_price": 19.5,
    "sale_ok": True,
    "is_published": True,
    "is_storable": False,
    "dtf_product_type": "tshirt",
    "dtf_catalog_type": "ready_to_sell",
    "dtf_print_your_dream_eligible": True,
    "public_categ_ids": [(6, 0, [category.id])],
})
product.with_context(lang=arabic.code).write({
    "name": "تيشيرت مرئي M9",
})
product.product_variant_id.default_code = "M9-VISUAL-TEE"

customer_partner_vals = {
    "name": "M9 Visual Customer",
    "email": "m9-visual-customer@example.test",
}
if "dtf_customer_enabled" in env["res.partner"]._fields:
    customer_partner_vals["dtf_customer_enabled"] = True
customer_partner = env["res.partner"].sudo().create(customer_partner_vals)
customer_user = env["res.users"].sudo().with_context(no_reset_password=True).create({
    "name": "M9 Visual Customer",
    "login": "m9-visual-customer@example.test",
    "email": "m9-visual-customer@example.test",
    "password": customer_password,
    "partner_id": customer_partner.id,
    "group_ids": [(6, 0, [env.ref("base.group_portal").id])],
})

designer_partner_vals = {
    "name": "M9 Visual Designer",
    "email": "m9-visual-designer@example.test",
}
if "dtf_designer_enabled" in env["res.partner"]._fields:
    designer_partner_vals["dtf_designer_enabled"] = True
designer_partner = env["res.partner"].sudo().create(designer_partner_vals)
designer_user = env["res.users"].sudo().with_context(no_reset_password=True).create({
    "name": "M9 Visual Designer",
    "login": "m9-visual-designer@example.test",
    "email": "m9-visual-designer@example.test",
    "password": designer_password,
    "partner_id": designer_partner.id,
    "group_ids": [(6, 0, [env.ref("dtf_core.group_dtf_designer").id])],
})
profile = env["dtf.designer.profile"].sudo().create({
    "partner_id": designer_partner.id,
    "user_id": designer_user.id,
})
profile.sudo().write({
    "authorized": True,
    "qualification_state": "authorized",
})

if not env["dtf.preflight.rule.version"].sudo().search_count([
    ("active", "=", True),
    ("product_type", "=", "tshirt"),
]):
    env["dtf.preflight.rule.version"].sudo().create({
        "name": "M9 Visual T-Shirt",
        "version": "m9-visual-tshirt-v1",
        "product_type": "tshirt",
        "min_effective_dpi": 300,
        "max_width_cm": 40,
        "max_height_cm": 50,
        "allowed_formats": ["png", "svg"],
        "require_previewable": True,
    })

gallery_design = env["dtf.design"].sudo().create({
    "designer_id": profile.id,
    "title_en": "M9 Visual Gallery",
    "title_ar": "معرض M9 المرئي",
    "description_en": "M9 preserved frontend gallery verification",
    "description_ar": "تحقق مرئي من معرض الواجهة المحفوظة في M9",
    "product_type": "tshirt",
    "is_qualification_sample": False,
})
svg = (
    b'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" '
    b'viewBox="0 0 1200 1200"><rect width="1200" height="1200" fill="#05080d"/>'
    b'<text x="600" y="610" text-anchor="middle" fill="#00a8ff" '
    b'font-size="120">M9 DTF</text></svg>'
)
attachment = env["ir.attachment"].sudo().create({
    "name": "m9-gallery.svg",
    "raw": svg,
    "mimetype": "image/svg+xml",
})
asset = env["dtf.design.asset"].sudo().create({
    "design_id": gallery_design.id,
    "attachment_id": attachment.id,
    "name": "m9-gallery.svg",
    "file_format": "svg",
    "mime_type": "image/svg+xml",
    "size_bytes": len(svg),
    "pixel_width": 1200,
    "pixel_height": 1200,
    "embedded_dpi": 300,
    "previewable": True,
    "readable": True,
    "analyzable": True,
})
attachment.sudo().write({
    "res_model": "dtf.design.asset",
    "res_id": asset.id,
})
gallery_design.action_set_main_display_asset(asset)
gallery_design.sudo().write({"state": "published"})

env.cr.commit()

print("M9_FRONTEND_VISUAL_SEED_OK")
print("CUSTOMER_USER_ID=%s" % customer_user.id)
print("DESIGNER_USER_ID=%s" % designer_user.id)
print("PRODUCT_TEMPLATE_ID=%s" % product.id)
print("PRODUCT_VARIANT_ID=%s" % product.product_variant_id.id)
print("GALLERY_DESIGN_ID=%s" % gallery_design.id)
