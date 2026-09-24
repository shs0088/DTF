from odoo import api, fields, models
from odoo.exceptions import ValidationError


class SaleOrderLine(models.Model):
    _inherit = "sale.order.line"

    dtf_design_id = fields.Many2one("dtf.design", ondelete="restrict", index=True)
    dtf_master_asset_id = fields.Many2one("dtf.design.asset", ondelete="restrict", index=True)
    dtf_preflight_snapshot = fields.Json(default=dict, copy=False)
    dtf_customer_snapshot = fields.Json(default=dict, copy=False)
    dtf_product_snapshot = fields.Json(default=dict, copy=False)

    @api.constrains("dtf_master_asset_id", "dtf_design_id")
    def _check_master_design(self):
        for line in self:
            if line.dtf_master_asset_id and line.dtf_master_asset_id.design_id != line.dtf_design_id:
                raise ValidationError("The selected Ready-to-Print Master must belong to the selected design.")

    def action_capture_dtf_snapshots(self):
        for line in self:
            if not line.dtf_design_id or not line.dtf_master_asset_id:
                raise ValidationError("A DTF order line requires an explicit design and Ready-to-Print Master.")
            latest = line.dtf_master_asset_id.latest_preflight_result_id
            if not latest or latest.status != "accepted" or latest.rule_version_id.product_type != line.dtf_design_id.product_type:
                raise ValidationError("The DTF order line requires a current accepted product-compatible preflight.")
            line.write({
                "dtf_customer_snapshot": {"partner_id": line.order_id.partner_id.id, "name": line.order_id.partner_id.display_name},
                "dtf_product_snapshot": {"product_id": line.product_id.id, "name": line.product_id.display_name, "product_type": line.product_id.dtf_product_type},
                "dtf_preflight_snapshot": {"result_id": latest.id, "rule_version": latest.rule_version_id.version, "status": latest.status, "evidence": latest.analyzer_snapshot},
            })
        return True


class SaleOrder(models.Model):
    _inherit = "sale.order"


