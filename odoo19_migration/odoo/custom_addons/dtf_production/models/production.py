from odoo import api, fields, models
from odoo.exceptions import AccessError, ValidationError


DTF_OPERATOR_STAGES = [
    ("new", "New"),
    ("under_preparation", "Under Preparation"),
    ("ready", "Ready for Delivery/Pickup"),
    ("completed", "Completed"),
    ("cancelled", "Cancelled"),
]

DTF_STAGE_TRANSITIONS = {
    "new": {"under_preparation", "cancelled"},
    "under_preparation": {"ready", "cancelled"},
    "ready": {"under_preparation", "completed", "cancelled"},
    "completed": set(),
    "cancelled": set(),
}


class MrpProduction(models.Model):
    _inherit = "mrp.production"

    dtf_is_print_job = fields.Boolean(default=False, index=True, copy=False)
    dtf_sale_line_id = fields.Many2one(
        "sale.order.line",
        string="DTF Order Item",
        ondelete="restrict",
        index=True,
        copy=False,
    )
    dtf_design_id = fields.Many2one(
        "dtf.design",
        string="DTF Design",
        ondelete="restrict",
        index=True,
        copy=False,
    )
    dtf_master_asset_id = fields.Many2one(
        "dtf.design.asset",
        string="Ready-to-Print Master",
        ondelete="restrict",
        index=True,
        copy=False,
    )
    dtf_master_attachment_id = fields.Many2one(
        "ir.attachment",
        string="Master Attachment",
        ondelete="restrict",
        index=True,
        copy=False,
    )
    dtf_preflight_result_id = fields.Many2one(
        "dtf.preflight.result",
        string="Accepted Preflight",
        ondelete="restrict",
        index=True,
        copy=False,
    )
    dtf_operator_stage = fields.Selection(
        DTF_OPERATOR_STAGES,
        string="Printing Status",
        index=True,
        tracking=True,
        copy=False,
    )

    dtf_order_name = fields.Char(readonly=True, copy=False)
    dtf_customer_name = fields.Char(readonly=True, copy=False)
    dtf_customer_phone = fields.Char(readonly=True, copy=False)
    dtf_product_name = fields.Char(readonly=True, copy=False)
    dtf_master_name = fields.Char(readonly=True, copy=False)
    dtf_customer_snapshot = fields.Json(default=dict, readonly=True, copy=False)
    dtf_product_snapshot = fields.Json(default=dict, readonly=True, copy=False)
    dtf_preflight_snapshot = fields.Json(default=dict, readonly=True, copy=False)

    dtf_master_filename = fields.Char(
        related="dtf_master_attachment_id.name",
        readonly=True,
    )
    dtf_master_file = fields.Binary(
        related="dtf_master_attachment_id.datas",
        readonly=True,
    )

    _dtf_sale_line_unique = models.Constraint(
        "UNIQUE(dtf_sale_line_id)",
        "A DTF order item can have only one primary printing job.",
    )

    def _dtf_user_is_operator_or_admin(self):
        return (
            self.env.is_superuser()
            or self.env.user.has_group("dtf_core.group_dtf_admin")
            or self.env.user.has_group("dtf_core.group_dtf_printing_operator")
        )

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get("dtf_is_print_job"):
                if not (
                    self.env.is_superuser()
                    or self.env.user.has_group("dtf_core.group_dtf_admin")
                ):
                    raise AccessError("Only a DTF Administrator may create printing jobs.")
                vals.setdefault("dtf_operator_stage", "new")
        return super().create(vals_list)

    @api.constrains(
        "dtf_is_print_job",
        "dtf_sale_line_id",
        "dtf_design_id",
        "dtf_master_asset_id",
        "dtf_master_attachment_id",
        "dtf_preflight_result_id",
        "dtf_operator_stage",
        "product_id",
    )
    def _check_dtf_production_evidence(self):
        for production in self.filtered("dtf_is_print_job"):
            if not all([
                production.dtf_sale_line_id,
                production.dtf_design_id,
                production.dtf_master_asset_id,
                production.dtf_master_attachment_id,
                production.dtf_preflight_result_id,
                production.dtf_operator_stage,
            ]):
                raise ValidationError("A DTF printing job requires complete immutable production evidence.")

            line = production.dtf_sale_line_id.sudo()
            design = production.dtf_design_id.sudo()
            master = production.dtf_master_asset_id.sudo()
            preflight = production.dtf_preflight_result_id.sudo()

            if line.dtf_design_id != design:
                raise ValidationError("The production design must match the DTF order item.")
            if line.dtf_master_asset_id != master:
                raise ValidationError("The production master must match the DTF order item.")
            if master.design_id != design:
                raise ValidationError("The production master must belong to the production design.")
            if master.attachment_id != production.dtf_master_attachment_id:
                raise ValidationError("The production master attachment does not match the selected asset.")
            if preflight.asset_id != master or preflight.status != "accepted":
                raise ValidationError("The production job requires the accepted preflight for its exact master.")
            if production.product_id != line.product_id:
                raise ValidationError("The production product must match the DTF order item.")

            snapshot_result_id = (production.dtf_preflight_snapshot or {}).get("result_id")
            if snapshot_result_id and snapshot_result_id != preflight.id:
                raise ValidationError("The production preflight reference must match the immutable snapshot.")

    def _dtf_validate_stage_transition(self, target):
        for production in self.filtered("dtf_is_print_job"):
            current = production.dtf_operator_stage or "new"
            if target == current:
                continue
            if target not in DTF_STAGE_TRANSITIONS.get(current, set()):
                raise ValidationError(
                    "Invalid DTF printing status transition: %s -> %s." % (current, target)
                )

    def write(self, vals):
        dtf_jobs = self.filtered("dtf_is_print_job")
        if dtf_jobs:
            is_operator_only = (
                self.env.user.has_group("dtf_core.group_dtf_printing_operator")
                and not self.env.user.has_group("dtf_core.group_dtf_admin")
                and not self.env.is_superuser()
            )
            if is_operator_only:
                disallowed = set(vals) - {"dtf_operator_stage"}
                if disallowed:
                    raise AccessError("Printing Operators may update only the DTF printing status.")

            protected = {
                "dtf_is_print_job",
                "dtf_sale_line_id",
                "dtf_design_id",
                "dtf_master_asset_id",
                "dtf_master_attachment_id",
                "dtf_preflight_result_id",
                "dtf_order_name",
                "dtf_customer_name",
                "dtf_customer_phone",
                "dtf_product_name",
                "dtf_master_name",
                "dtf_customer_snapshot",
                "dtf_product_snapshot",
                "dtf_preflight_snapshot",
                "product_id",
                "product_uom_id",
            }
            if protected & set(vals):
                raise ValidationError("DTF production evidence is immutable after the printing job is created.")

            if "dtf_operator_stage" in vals:
                if not self._dtf_user_is_operator_or_admin():
                    raise AccessError("Only DTF production staff may update the printing status.")
                dtf_jobs._dtf_validate_stage_transition(vals["dtf_operator_stage"])

        return super().write(vals)

    def unlink(self):
        if self.filtered("dtf_is_print_job"):
            raise ValidationError("DTF printing jobs are protected production evidence and cannot be deleted.")
        return super().unlink()

    def action_dtf_start_preparation(self):
        self.write({"dtf_operator_stage": "under_preparation"})
        return True

    def action_dtf_mark_ready(self):
        self.write({"dtf_operator_stage": "ready"})
        return True

    def action_dtf_mark_completed(self):
        self.write({"dtf_operator_stage": "completed"})
        return True

    def action_dtf_cancel(self):
        self.write({"dtf_operator_stage": "cancelled"})
        return True

    def action_dtf_download_master(self):
        self.ensure_one()
        if not self.dtf_is_print_job or not self._dtf_user_is_operator_or_admin():
            raise AccessError("Only DTF production staff may download the print master.")
        attachment = self.dtf_master_attachment_id.sudo().exists()
        if not attachment:
            raise ValidationError("The Ready-to-Print Master attachment is unavailable.")
        return {
            "type": "ir.actions.act_url",
            "url": "/api/dtf/v1/production/%s/master" % self.id,
            "target": "self",
        }


class SaleOrderLine(models.Model):
    _inherit = "sale.order.line"

    dtf_production_ids = fields.One2many(
        "mrp.production",
        "dtf_sale_line_id",
        string="DTF Printing Jobs",
        readonly=True,
    )

    def _dtf_production_actor_is_admin(self):
        return self.env.is_superuser() or self.env.user.has_group("dtf_core.group_dtf_admin")

    def action_create_dtf_production_job(self):
        if not self._dtf_production_actor_is_admin():
            raise AccessError("Only a DTF Administrator may create a printing job.")

        productions = self.env["mrp.production"]
        for source_line in self.sudo():
            if source_line.order_id.state not in ("sale", "done"):
                raise ValidationError("DTF production can start only from a confirmed native Odoo sale order.")
            if not source_line.dtf_design_id or not source_line.dtf_master_asset_id:
                raise ValidationError("The DTF order item requires an explicit design and Ready-to-Print Master.")
            if not source_line.dtf_preflight_snapshot:
                raise ValidationError("The DTF order item requires its immutable preflight snapshot before production.")

            existing = self.env["mrp.production"].sudo().search([
                ("dtf_sale_line_id", "=", source_line.id),
            ], limit=1)
            if existing:
                productions |= existing.with_user(self.env.user)
                continue

            result_id = (source_line.dtf_preflight_snapshot or {}).get("result_id")
            preflight = self.env["dtf.preflight.result"].sudo().browse(result_id).exists()
            master = source_line.dtf_master_asset_id

            if not preflight or preflight.asset_id != master or preflight.status != "accepted":
                raise ValidationError("The snapshotted accepted preflight no longer matches the exact print master.")

            partner = source_line.order_id.partner_id
            customer_phone = partner.phone or ""
            product_snapshot = dict(source_line.dtf_product_snapshot or {})
            product_snapshot.setdefault("ordered_quantity", source_line.product_uom_qty)
            product_snapshot.setdefault("uom_id", source_line.product_uom_id.id)

            vals = {
                "product_id": source_line.product_id.id,
                "product_qty": source_line.product_uom_qty,
                "product_uom_id": source_line.product_uom_id.id,
                "origin": source_line.order_id.name,
                "company_id": source_line.order_id.company_id.id,
                "dtf_is_print_job": True,
                "dtf_sale_line_id": source_line.id,
                "dtf_design_id": source_line.dtf_design_id.id,
                "dtf_master_asset_id": master.id,
                "dtf_master_attachment_id": master.attachment_id.id,
                "dtf_preflight_result_id": preflight.id,
                "dtf_operator_stage": "new",
                "dtf_order_name": source_line.order_id.name,
                "dtf_customer_name": partner.display_name,
                "dtf_customer_phone": customer_phone,
                "dtf_product_name": source_line.product_id.display_name,
                "dtf_master_name": master.name,
                "dtf_customer_snapshot": dict(source_line.dtf_customer_snapshot or {}),
                "dtf_product_snapshot": product_snapshot,
                "dtf_preflight_snapshot": dict(source_line.dtf_preflight_snapshot or {}),
            }
            # The caller is already explicitly restricted to DTF Administrators above.
            # Native Odoo MRP creation also creates mrp.production.group, whose ACL is
            # limited to Manufacturing/User. Use controlled elevation only for the
            # native creation chain rather than granting broad Manufacturing access
            # to the DTF Administrator role.
            production = self.env["mrp.production"].sudo().create(vals).with_user(self.env.user)
            productions |= production

        return productions

    def write(self, vals):
        protected = {
            "dtf_design_id",
            "dtf_master_asset_id",
            "dtf_preflight_snapshot",
            "dtf_customer_snapshot",
            "dtf_product_snapshot",
            "product_id",
            "product_uom_id",
            "product_uom_qty",
        }
        if protected & set(vals):
            protected_lines = self.sudo().filtered(
                lambda line: bool(self.env["mrp.production"].sudo().search_count([
                    ("dtf_sale_line_id", "=", line.id),
                    ("dtf_is_print_job", "=", True),
                ]))
            )
            if protected_lines:
                raise ValidationError(
                    "DTF order-item production evidence cannot be changed after a printing job exists."
                )
        return super().write(vals)

    def unlink(self):
        if self.sudo().filtered(
            lambda line: bool(self.env["mrp.production"].sudo().search_count([
                ("dtf_sale_line_id", "=", line.id),
                ("dtf_is_print_job", "=", True),
            ]))
        ):
            raise ValidationError("A DTF order item linked to production evidence cannot be deleted.")
        return super().unlink()


class DTFDesign(models.Model):
    _inherit = "dtf.design"

    def unlink(self):
        if self.env["mrp.production"].sudo().search_count([
            ("dtf_design_id", "in", self.ids),
            ("dtf_is_print_job", "=", True),
        ]):
            raise ValidationError("A design referenced by DTF production evidence cannot be deleted.")
        return super().unlink()


class DTFDesignAsset(models.Model):
    _inherit = "dtf.design.asset"

    def unlink(self):
        if self.env["mrp.production"].sudo().search_count([
            ("dtf_master_asset_id", "in", self.ids),
            ("dtf_is_print_job", "=", True),
        ]):
            raise ValidationError("A Ready-to-Print Master referenced by production evidence cannot be deleted.")
        return super().unlink()


class IrAttachment(models.Model):
    _inherit = "ir.attachment"

    def unlink(self):
        if self.env["mrp.production"].sudo().search_count([
            ("dtf_master_attachment_id", "in", self.ids),
            ("dtf_is_print_job", "=", True),
        ]):
            raise ValidationError("A print-master attachment referenced by production evidence cannot be deleted.")
        return super().unlink()
