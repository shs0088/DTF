from odoo import api, fields, models
from odoo.exceptions import ValidationError


class DTFProductionHandoff(models.Model):
    _name = "dtf.production.handoff"
    _description = "DTF Studio Production Handoff Snapshot"
    _order = "create_date desc, id desc"

    sale_order_id = fields.Many2one("sale.order", required=True, ondelete="restrict", index=True)
    sale_order_line_id = fields.Many2one("sale.order.line", required=True, ondelete="restrict", index=True)
    master_asset_id = fields.Many2one("dtf.design.asset", required=True, ondelete="restrict", index=True)
    preflight_snapshot = fields.Json(required=True, copy=False)
    product_snapshot = fields.Json(required=True, copy=False)
    state = fields.Selection([("queued", "Queued"), ("printing", "Printing"), ("completed", "Completed"), ("cancelled", "Cancelled")], default="queued", required=True, index=True)

    @api.model
    def create_from_line(self, line):
        if line.order_id.dtf_checkout_state != "confirmed":
            raise ValidationError("Production handoff requires a payment-confirmed checkout.")
        if not line.dtf_master_asset_id or not line.dtf_preflight_snapshot:
            raise ValidationError("Production handoff requires the historical master and preflight snapshots.")
        return self.create({"sale_order_id": line.order_id.id, "sale_order_line_id": line.id, "master_asset_id": line.dtf_master_asset_id.id, "preflight_snapshot": line.dtf_preflight_snapshot, "product_snapshot": line.dtf_product_snapshot or {}})
