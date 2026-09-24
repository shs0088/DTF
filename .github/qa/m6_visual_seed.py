import base64
import json
import os

ADMIN_LOGIN = "m6-admin@example.test"
OPERATOR_LOGIN = "m6-operator@example.test"
ADMIN_PASSWORD = os.environ["M6_ADMIN_PASSWORD"]
OPERATOR_PASSWORD = os.environ["M6_OPERATOR_PASSWORD"]


def ensure_user(login, name, group, password):
    user = env["res.users"].sudo().search([("login", "=", login)], limit=1)
    vals = {
        "name": name,
        "login": login,
        "group_ids": [(6, 0, [group.id])],
        "password": password,
    }
    if user:
        user.write(vals)
    else:
        user = env["res.users"].with_context(no_reset_password=True).sudo().create(vals)
    return user


admin_group = env.ref("dtf_core.group_dtf_admin")
operator_group = env.ref("dtf_core.group_dtf_printing_operator")
designer_group = env.ref("dtf_core.group_dtf_designer")

admin_user = ensure_user(ADMIN_LOGIN, "M6 DTF Admin", admin_group, ADMIN_PASSWORD)
operator_user = ensure_user(OPERATOR_LOGIN, "M6 Printing Operator", operator_group, OPERATOR_PASSWORD)

designer_partner = env["res.partner"].sudo().search([("email", "=", "m6-designer@example.test")], limit=1)
if not designer_partner:
    designer_partner = env["res.partner"].sudo().create({
        "name": "M6 Designer",
        "email": "m6-designer@example.test",
        "dtf_designer_enabled": True,
    })

designer_user = env["res.users"].sudo().search([("login", "=", "m6-designer@example.test")], limit=1)
if not designer_user:
    designer_user = env["res.users"].with_context(no_reset_password=True).sudo().create({
        "name": "M6 Designer",
        "login": "m6-designer@example.test",
        "partner_id": designer_partner.id,
        "group_ids": [(6, 0, [designer_group.id])],
    })

profile = env["dtf.designer.profile"].sudo().search([("user_id", "=", designer_user.id)], limit=1)
if not profile:
    profile = env["dtf.designer.profile"].sudo().create({
        "partner_id": designer_partner.id,
        "user_id": designer_user.id,
    })

design = env["dtf.design"].sudo().search([
    ("designer_id", "=", profile.id),
    ("title_en", "=", "M6 Visual QA Design"),
], limit=1)
if not design:
    design = env["dtf.design"].sudo().create({
        "designer_id": profile.id,
        "title_en": "M6 Visual QA Design",
        "title_ar": "تصميم فحص M6",
        "description_en": "M6 browser visual QA fixture",
        "description_ar": "بيانات فحص مرئي للمرحلة M6",
        "product_type": "tshirt",
    })

asset = env["dtf.design.asset"].sudo().search([
    ("design_id", "=", design.id),
    ("name", "=", "m6-master.png"),
], limit=1)
if not asset:
    attachment = env["ir.attachment"].sudo().create({
        "name": "m6-master.png",
        "datas": base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"\x00" * 64).decode(),
        "mimetype": "image/png",
    })
    asset = env["dtf.design.asset"].with_context(dtf_preflight_migration=True).sudo().create({
        "design_id": design.id,
        "attachment_id": attachment.id,
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
    design.action_set_main_display_asset(asset)
    design.action_set_ready_to_print_master(asset)
else:
    attachment = asset.attachment_id

rule = env["dtf.preflight.rule.version"].sudo().search([("version", "=", "m6-visual-v1")], limit=1)
if not rule:
    rule = env["dtf.preflight.rule.version"].sudo().create({
        "name": "M6 visual QA rule",
        "version": "m6-visual-v1",
        "product_type": "tshirt",
        "min_effective_dpi": 300,
        "allowed_formats": ["png", "jpg", "jpeg", "webp", "svg", "pdf"],
    })

preflight = env["dtf.preflight.result"].sudo().search([
    ("asset_id", "=", asset.id),
    ("rule_version_id", "=", rule.id),
    ("status", "=", "accepted"),
], limit=1)
if not preflight:
    preflight = env["dtf.preflight.result"].sudo().create({
        "asset_id": asset.id,
        "rule_version_id": rule.id,
        "status": "accepted",
        "analyzer_snapshot": {
            "detected_format": "png",
            "readable": True,
            "analyzable": True,
            "previewable": True,
        },
        "locked": False,
    })

customer = env["res.partner"].sudo().search([("phone", "=", "+962790000006")], limit=1)
if not customer:
    customer = env["res.partner"].sudo().create({
        "name": "M6 Customer",
        "phone": "+962790000006",
    })

product_tmpl = env["product.template"].sudo().search([("name", "=", "M6 Printable Shirt")], limit=1)
if not product_tmpl:
    product_tmpl = env["product.template"].sudo().create({
        "name": "M6 Printable Shirt",
        "list_price": 15.0,
        "is_storable": True,
        "dtf_product_type": "tshirt",
    })
product = product_tmpl.product_variant_id

order = env["sale.order"].sudo().search([
    ("partner_id", "=", customer.id),
    ("client_order_ref", "=", "M6-VISUAL-QA"),
], limit=1)
if not order:
    order = env["sale.order"].sudo().create({
        "partner_id": customer.id,
        "client_order_ref": "M6-VISUAL-QA",
    })
    line = env["sale.order.line"].sudo().create({
        "order_id": order.id,
        "product_id": product.id,
        "product_uom_qty": 2,
        "price_unit": product.list_price,
        "dtf_design_id": design.id,
        "dtf_master_asset_id": asset.id,
    })
    line.action_capture_dtf_snapshots()
    order.action_confirm()
else:
    line = order.order_line.filtered(lambda l: l.dtf_design_id == design)[:1]
    if not line:
        line = env["sale.order.line"].sudo().create({
            "order_id": order.id,
            "product_id": product.id,
            "product_uom_qty": 2,
            "price_unit": product.list_price,
            "dtf_design_id": design.id,
            "dtf_master_asset_id": asset.id,
        })
        line.action_capture_dtf_snapshots()
    if order.state not in ("sale", "done"):
        order.action_confirm()

job = env["mrp.production"].sudo().search([("dtf_sale_line_id", "=", line.id)], limit=1)
if not job:
    job = line.with_user(admin_user).action_create_dtf_production_job().sudo()

env.cr.commit()

print(json.dumps({
    "admin_login": ADMIN_LOGIN,
    "operator_login": OPERATOR_LOGIN,
    "order_id": order.id,
    "order_name": order.name,
    "sale_line_id": line.id,
    "job_id": job.id,
    "job_name": job.name,
    "action_id": env.ref("dtf_production.action_dtf_print_jobs").id,
    "master_filename": job.dtf_master_filename,
    "stage": job.dtf_operator_stage,
}, ensure_ascii=False))
