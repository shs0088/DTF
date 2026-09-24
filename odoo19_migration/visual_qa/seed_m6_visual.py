import base64
import os

admin_password = os.environ["M6_VISUAL_ADMIN_PASSWORD"]
operator_password = os.environ["M6_VISUAL_OPERATOR_PASSWORD"]

admin_group = env.ref("dtf_core.group_dtf_admin")
operator_group = env.ref("dtf_core.group_dtf_printing_operator")
designer_group = env.ref("dtf_core.group_dtf_designer")

admin_user = env["res.users"].with_context(no_reset_password=True).create({
    "name": "M6 Visual DTF Admin",
    "login": "m6-visual-admin@example.test",
    "email": "m6-visual-admin@example.test",
    "password": admin_password,
    "group_ids": [(6, 0, [admin_group.id])],
})

operator_user = env["res.users"].with_context(no_reset_password=True).create({
    "name": "M6 Visual Printing Operator",
    "login": "m6-visual-operator@example.test",
    "email": "m6-visual-operator@example.test",
    "password": operator_password,
    "group_ids": [(6, 0, [operator_group.id])],
})

designer_partner = env["res.partner"].create({
    "name": "M6 Visual Designer",
    "email": "m6-visual-designer@example.test",
    "dtf_designer_enabled": True,
})
designer_user = env["res.users"].with_context(no_reset_password=True).create({
    "name": "M6 Visual Designer",
    "login": "m6-visual-designer@example.test",
    "partner_id": designer_partner.id,
    "group_ids": [(6, 0, [designer_group.id])],
})
profile = env["dtf.designer.profile"].create({
    "partner_id": designer_partner.id,
    "user_id": designer_user.id,
})

design = env["dtf.design"].create({
    "designer_id": profile.id,
    "title_en": "M6 Visual Design",
    "title_ar": "تصميم الفحص المرئي M6",
    "description_en": "Visual QA production design",
    "description_ar": "تصميم اختبار الإنتاج المرئي",
    "product_type": "tshirt",
})

png_bytes = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)

# QA-only storage override: this database is ephemeral and the synthetic print
# master must survive GitHub runner/container lifecycle independently of the
# production filestore configuration.
env["ir.config_parameter"].sudo().set_param("ir_attachment.location", "db")
assert env["ir.config_parameter"].sudo().get_param("ir_attachment.location") == "db"

attachment = env["ir.attachment"].create({
    "name": "m6-visual-master.png",
    "datas": base64.b64encode(png_bytes).decode(),
    "mimetype": "image/png",
})
assert not attachment.store_fname, "QA synthetic master unexpectedly used the filestore"
assert attachment.raw == png_bytes, "QA synthetic master bytes were not stored intact"

asset = env["dtf.design.asset"].with_context(dtf_preflight_migration=True).create({
    "design_id": design.id,
    "attachment_id": attachment.id,
    "name": "m6-visual-master.png",
    "file_format": "png",
    "mime_type": "image/png",
    "size_bytes": len(png_bytes),
    "pixel_width": 4500,
    "pixel_height": 5400,
    "previewable": True,
    "readable": True,
    "analyzable": True,
})
design.action_set_main_display_asset(asset)
design.action_set_ready_to_print_master(asset)

rule = env["dtf.preflight.rule.version"].create({
    "name": "M6 Visual Rule",
    "version": "m6-visual-v1",
    "product_type": "tshirt",
    "min_effective_dpi": 300,
    "allowed_formats": ["png", "jpg", "jpeg", "webp", "svg", "pdf"],
})
env["dtf.preflight.result"].create({
    "asset_id": asset.id,
    "rule_version_id": rule.id,
    "status": "accepted",
    "analyzer_snapshot": {
        "detected_format": "png",
        "readable": True,
        "analyzable": True,
        "previewable": True,
        "pixel_width": 4500,
        "pixel_height": 5400,
    },
    "locked": False,
})

customer = env["res.partner"].create({
    "name": "M6 Visual Customer",
    "phone": "+962790000006",
})
product_tmpl = env["product.template"].create({
    "name": "M6 Visual Printable Shirt",
    "list_price": 15.0,
    "is_storable": True,
    "dtf_product_type": "tshirt",
})
product = product_tmpl.product_variant_id

def make_order(quantity):
    order = env["sale.order"].create({"partner_id": customer.id})
    line = env["sale.order.line"].create({
        "order_id": order.id,
        "product_id": product.id,
        "product_uom_qty": quantity,
        "price_unit": product.list_price,
        "dtf_design_id": design.id,
        "dtf_master_asset_id": asset.id,
    })
    line.action_capture_dtf_snapshots()
    order.action_confirm()
    job = line.with_user(admin_user).action_create_dtf_production_job()
    return order, job

order1, job1 = make_order(2)
order2, job2 = make_order(1)

standard_job = env["mrp.production"].create({
    "product_id": product.id,
    "product_qty": 1,
    "product_uom_id": product.uom_id.id,
})

env.cr.commit()

print("M6_VISUAL_SEED_OK")
print("JOB_1=%s ORDER_1=%s" % (job1.id, order1.name))
print("JOB_2=%s ORDER_2=%s" % (job2.id, order2.name))
print("STANDARD_JOB=%s" % standard_job.id)
