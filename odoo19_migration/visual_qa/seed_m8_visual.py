import os

admin_password = os.environ["M8_VISUAL_ADMIN_PASSWORD"]
arabic_password = os.environ["M8_VISUAL_ARABIC_PASSWORD"]

admin_group = env.ref("dtf_core.group_dtf_admin")

arabic = env["res.lang"].sudo().search([("iso_code", "=", "ar")], limit=1)
assert arabic, "Arabic language record was not found"
if not arabic.active:
    arabic.active = True

english = env["res.lang"].sudo().search([("iso_code", "=", "en")], limit=1)
if not english:
    english = env["res.lang"].sudo().search([("code", "=", "en_US")], limit=1)
assert english, "English language record was not found"

english_admin = env["res.users"].with_context(no_reset_password=True).create({
    "name": "M8 Visual English Admin",
    "login": "m8-visual-admin@example.test",
    "email": "m8-visual-admin@example.test",
    "password": admin_password,
    "lang": english.code,
    "group_ids": [(6, 0, [admin_group.id])],
})

arabic_admin = env["res.users"].with_context(no_reset_password=True).create({
    "name": "M8 Visual Arabic Admin",
    "login": "m8-visual-arabic@example.test",
    "email": "m8-visual-arabic@example.test",
    "password": arabic_password,
    "lang": arabic.code,
    "group_ids": [(6, 0, [admin_group.id])],
})

designer_partner = env["res.partner"].create({
    "name": "M8 Visual Designer",
    "email": "m8-visual-designer@example.test",
    "dtf_designer_enabled": True,
})
profile = env["dtf.designer.profile"].create({
    "partner_id": designer_partner.id,
})
profile.action_mark_system_qualified()

design = env["dtf.design"].create({
    "designer_id": profile.id,
    "title_en": "M8 Visual Design",
    "title_ar": "تصميم الفحص المرئي M8",
    "description_en": "Native Odoo M8 visual QA design",
    "description_ar": "تصميم لاختبار واجهة الإدارة الأصلية في أودو",
    "product_type": "tshirt",
})

customer = env["res.partner"].create({
    "name": "M8 Visual Customer",
    "phone": "+962790000008",
})
product_tmpl = env["product.template"].create({
    "name": "M8 Visual Shirt",
    "list_price": 18.0,
    "is_storable": True,
    "dtf_product_type": "tshirt",
})
order = env["sale.order"].create({"partner_id": customer.id})
env["sale.order.line"].create({
    "order_id": order.id,
    "product_id": product_tmpl.product_variant_id.id,
    "product_uom_qty": 1,
    "price_unit": product_tmpl.list_price,
    "dtf_design_id": design.id,
})

env.cr.commit()

print("M8_VISUAL_SEED_OK")
print("ARABIC_LANG_CODE=%s" % arabic.code)
print("DESIGN_ID=%s" % design.id)
print("DESIGNER_ID=%s" % profile.id)
