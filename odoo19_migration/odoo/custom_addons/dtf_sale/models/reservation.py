from odoo import api, fields, models
from odoo.exceptions import ValidationError


class DTFStockReservation(models.Model):
    _name = "dtf.stock.reservation"
    _description = "DTF Studio Checkout Stock Reservation"
    _order = "expires_at asc, id asc"

    sale_order_id = fields.Many2one("sale.order", required=True, ondelete="cascade", index=True)
    sale_order_line_id = fields.Many2one("sale.order.line", required=True, ondelete="cascade", index=True)
    product_id = fields.Many2one("product.product", required=True, ondelete="restrict", index=True)
    quantity = fields.Float(required=True)
    state = fields.Selection([("active", "Active"), ("released", "Released"), ("consumed", "Consumed"), ("expired", "Expired")], default="active", required=True, index=True)
    reserved_at = fields.Datetime(default=fields.Datetime.now, required=True)
    expires_at = fields.Datetime(required=True, index=True)
    snapshot = fields.Json(default=dict, copy=False)

    _order_product_unique = models.Constraint("UNIQUE(sale_order_line_id, state)", "A checkout line may have one reservation in a given state.")

    @api.constrains("quantity", "expires_at", "reserved_at")
    def _check_values(self):
        for record in self:
            if record.quantity <= 0:
                raise ValidationError("A stock reservation quantity must be positive.")
            if record.expires_at <= record.reserved_at:
                raise ValidationError("A stock reservation must expire after it is created.")

    @api.model
    def create_for_line(self, line, quantity=None):
        quantity = quantity or line.product_uom_qty
        if quantity <= 0 or quantity > line.product_id.with_context(location=line.order_id.warehouse_id.lot_stock_id.id).qty_available:
            raise ValidationError("Insufficient stock for checkout reservation.")
        expires = fields.Datetime.add(fields.Datetime.now(), minutes=30)
        return self.create({"sale_order_id": line.order_id.id, "sale_order_line_id": line.id, "product_id": line.product_id.id, "quantity": quantity, "expires_at": expires, "snapshot": line.dtf_product_snapshot or {}})

    def action_release(self):
        self.filtered(lambda r: r.state == "active").write({"state": "released"})
        return True

    def action_expire_stale(self):
        stale = self.search([("state", "=", "active"), ("expires_at", "<", fields.Datetime.now())])
        stale.write({"state": "expired"})
        return stale
