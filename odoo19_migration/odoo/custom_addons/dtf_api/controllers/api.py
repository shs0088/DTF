from odoo import http
from odoo.http import request


class DTFAPI(http.Controller):
    @http.route('/api/dtf/v1/health', type='http', auth='public', methods=['GET'], csrf=False)
    def health(self, **kwargs):
        return request.make_json_response({'ok': True, 'service': 'dtf-studio-odoo19', 'api_version': 'v1'})

    @http.route('/api/dtf/v1/categories', type='http', auth='public', methods=['GET'], csrf=False)
    def categories(self, **kwargs):
        categories = request.env['dtf.site.category'].sudo().search([('active', '=', True), ('published', '=', True)])
        return request.make_json_response({'items': [{'id': c.id, 'name': c.name_en, 'name_ar': c.name_ar, 'slug': c.slug, 'parent_id': c.parent_id.id or None, 'sort_order': c.sort_order} for c in categories]})

    @http.route('/api/dtf/v1/products', type='http', auth='public', methods=['GET'], csrf=False)
    def products(self, **kwargs):
        products = request.env['product.template'].sudo().search([('sale_ok', '=', True), ('active', '=', True), ('dtf_public_published', '=', True)], limit=100)
        return request.make_json_response({'items': request.env['product.template'].dtf_public_payload(products)})


    def _customer(self):
        if request.env.user._is_public():
            return None
        return request.env.user.partner_id

    def _cart_json(self, order):
        return {
            'id': order.id,
            'state': order.dtf_checkout_state,
            'expires_at': order.dtf_checkout_expires_at.isoformat() if order.dtf_checkout_expires_at else None,
            'lines': [{'id': line.id, 'product_id': line.product_id.id, 'variant': line.product_id.display_name, 'quantity': line.product_uom_qty, 'unit_price': line.price_unit, 'subtotal': line.price_subtotal} for line in order.order_line],
            'subtotal': order.amount_untaxed, 'tax': order.amount_tax, 'total': order.amount_total,
        }

    @http.route('/api/dtf/v1/cart', type='http', auth='user', methods=['GET'], csrf=False)
    def cart_get(self, **kwargs):
        partner = self._customer()
        order = request.env['sale.order'].search([('partner_id', '=', partner.id), ('dtf_checkout_state', 'in', ['cart', 'reserved'])], order='id desc', limit=1)
        return request.make_json_response({'cart': self._cart_json(order) if order else None})

    @http.route('/api/dtf/v1/cart/add', type='json', auth='user', methods=['POST'], csrf=False)
    def cart_add(self, product_id=None, quantity=1, **kwargs):
        partner = self._customer()
        if not partner: return request.make_json_response({'error': 'authenticated_customer_required'}, status=401)
        product = request.env['product.product'].browse(int(product_id or 0)).exists()
        if not product or not product.active or not product.sale_ok or not product.product_tmpl_id.dtf_public_published:
            return request.make_json_response({'error': 'invalid_or_unpurchasable_variant'}, status=400)
        if float(quantity or 0) <= 0: return request.make_json_response({'error': 'quantity_must_be_positive'}, status=400)
        order = request.env['sale.order'].search([('partner_id', '=', partner.id), ('dtf_checkout_state', '=', 'cart')], order='id desc', limit=1)
        if not order: order = request.env['sale.order'].create({'partner_id': partner.id})
        line = order.order_line.filtered(lambda l: l.product_id == product)[:1]
        if line: line.product_uom_qty += float(quantity)
        else: request.env['sale.order.line'].create({'order_id': order.id, 'product_id': product.id, 'product_uom_qty': float(quantity), 'price_unit': product.lst_price})
        return request.make_json_response({'cart': self._cart_json(order)})

    @http.route('/api/dtf/v1/cart/line/<int:line_id>', type='json', auth='user', methods=['PATCH'], csrf=False)
    def cart_line_update(self, line_id, quantity=None, **kwargs):
        line = request.env['sale.order.line'].search([('id', '=', line_id), ('order_id.partner_id', '=', request.env.user.partner_id.id), ('order_id.dtf_checkout_state', '=', 'cart')], limit=1)
        if not line: return request.make_json_response({'error': 'cart_line_not_found'}, status=404)
        if float(quantity or 0) <= 0: return request.make_json_response({'error': 'quantity_must_be_positive'}, status=400)
        line.product_uom_qty = float(quantity)
        return request.make_json_response({'cart': self._cart_json(line.order_id)})

    @http.route('/api/dtf/v1/cart/line/<int:line_id>', type='json', auth='user', methods=['DELETE'], csrf=False)
    def cart_line_delete(self, line_id, **kwargs):
        line = request.env['sale.order.line'].search([('id', '=', line_id), ('order_id.partner_id', '=', request.env.user.partner_id.id), ('order_id.dtf_checkout_state', '=', 'cart')], limit=1)
        if not line: return request.make_json_response({'error': 'cart_line_not_found'}, status=404)
        order = line.order_id; line.unlink()
        if not order.order_line: order.action_dtf_cancel_checkout(); order.unlink()
        return request.make_json_response({'cart': self._cart_json(order) if order.exists() else None})

    @http.route('/api/dtf/v1/checkout', type='json', auth='user', methods=['POST'], csrf=False)
    def checkout_prepare(self, delivery_method=None, **kwargs):
        partner = self._customer()
        order = request.env['sale.order'].search([('partner_id', '=', partner.id), ('dtf_checkout_state', '=', 'cart')], order='id desc', limit=1)
        if not order: return request.make_json_response({'error': 'cart_not_found'}, status=404)
        if delivery_method not in ('delivery', 'pickup'): return request.make_json_response({'error': 'delivery_method_required'}, status=400)
        order.dtf_delivery_method = delivery_method; order.action_dtf_prepare_checkout()
        return request.make_json_response({'cart': self._cart_json(order)})

    @http.route('/api/dtf/v1/orders', type='http', auth='user', methods=['GET'], csrf=False)
    def orders(self, **kwargs):
        orders = request.env['sale.order'].search([('partner_id', '=', request.env.user.partner_id.id), ('dtf_checkout_state', '=', 'confirmed')], order='id desc')
        return request.make_json_response({'items': [{'id': o.id, 'name': o.name, 'state': o.dtf_checkout_state, 'total': o.amount_total, 'lines': [{'product_id': l.product_id.id, 'quantity': l.product_uom_qty, 'master_asset_id': l.dtf_master_asset_id.id, 'preflight_snapshot': l.dtf_preflight_snapshot} for l in o.order_line]} for o in orders]})
