from odoo import api, fields, models
from odoo.exceptions import ValidationError


class SaleOrderLine(models.Model):
    _inherit = "sale.order.line"

    dtf_design_id = fields.Many2one("dtf.design", ondelete="restrict", index=True)
    dtf_master_asset_id = fields.Many2one("dtf.design.asset", ondelete="restrict", index=True)
    dtf_preflight_snapshot = fields.Json(default=dict, copy=False)
    dtf_customer_snapshot = fields.Json(default=dict, copy=False)
    dtf_product_snapshot = fields.Json(default=dict, copy=False)
    dtf_reservation_id = fields.Many2one("dtf.stock.reservation", ondelete="set null", copy=False)

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

    dtf_checkout_state = fields.Selection([("cart", "Cart"), ("reserved", "Reserved"), ("confirmed", "Confirmed"), ("cancelled", "Cancelled")], default="cart", index=True, copy=False)
    dtf_checkout_expires_at = fields.Datetime(copy=False, index=True)
    dtf_delivery_method = fields.Selection([("delivery", "Delivery"), ("pickup", "Pickup")], copy=False)
    dtf_payment_reference = fields.Char(copy=False)

    def action_dtf_prepare_checkout(self):
        for order in self:
            if not order.order_line:
                raise ValidationError("Checkout requires at least one order line.")
            order.order_line.action_capture_dtf_snapshots()
            order.dtf_checkout_state = "reserved"
            order.dtf_checkout_expires_at = fields.Datetime.add(fields.Datetime.now(), minutes=30)
        return True

    def action_dtf_confirm_payment(self, payment_reference=None):
        for order in self:
            if order.dtf_checkout_state != "reserved":
                raise ValidationError("Only a reserved checkout can be payment-confirmed.")
            if order.dtf_checkout_expires_at and order.dtf_checkout_expires_at < fields.Datetime.now():
                order.dtf_checkout_state = "cancelled"
                raise ValidationError("The checkout reservation has expired.")
            order.action_confirm()
            order.write({"dtf_checkout_state": "confirmed", "dtf_payment_reference": payment_reference or False})
        return True

    def action_dtf_cancel_checkout(self):
        for order in self:
            if order.dtf_checkout_state == "confirmed":
                raise ValidationError("A confirmed checkout cannot be cancelled by the cart flow.")
            order.dtf_checkout_state = "cancelled"
        return True
