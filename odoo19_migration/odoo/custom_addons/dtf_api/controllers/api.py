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


    def _cart_json(self, order):
        return {
            'id': order.id,
            'state': order.state,
            'lines': [{'id': line.id, 'product_id': line.product_id.id, 'variant': line.product_id.display_name, 'quantity': line.product_uom_qty, 'unit_price': line.price_unit, 'subtotal': line.price_subtotal, 'tax': line.price_tax, 'total': line.price_total} for line in order.website_order_line],
            'subtotal': order.amount_untaxed,
            'tax': order.amount_tax,
            'total': order.amount_total,
        }

    def _native_cart(self, force_create=False):
        if not request.website:
            return None
        return request.website.sale_get_order(force_create=force_create)

    @http.route('/api/dtf/v1/cart', type='http', auth='user', methods=['GET'], csrf=False)
    def cart_get(self, **kwargs):
        order = self._native_cart()
        return request.make_json_response({'cart': self._cart_json(order) if order else None})

    @http.route('/api/dtf/v1/cart/add', type='json', auth='user', methods=['POST'], csrf=False)
    def cart_add(self, product_id=None, quantity=1, **kwargs):
        if float(quantity or 0) <= 0:
            return request.make_json_response({'error': 'quantity_must_be_positive'}, status=400)
        order = self._native_cart(force_create=True)
        try:
            result = order._cart_add(int(product_id or 0), float(quantity), **kwargs)
        except Exception as exc:
            return request.make_json_response({'error': str(exc)}, status=400)
        return request.make_json_response({'result': result, 'cart': self._cart_json(order)})

    @http.route('/api/dtf/v1/cart/line/<int:line_id>', type='json', auth='user', methods=['PATCH'], csrf=False)
    def cart_line_update(self, line_id, quantity=None, **kwargs):
        order = self._native_cart()
        if not order or line_id not in order.order_line.ids:
            return request.make_json_response({'error': 'cart_line_not_found'}, status=404)
        result = order._cart_update_line_quantity(line_id, float(quantity or 0), **kwargs)
        return request.make_json_response({'result': result, 'cart': self._cart_json(order)})

    @http.route('/api/dtf/v1/cart/line/<int:line_id>', type='json', auth='user', methods=['DELETE'], csrf=False)
    def cart_line_delete(self, line_id, **kwargs):
        order = self._native_cart()
        if not order or line_id not in order.order_line.ids:
            return request.make_json_response({'error': 'cart_line_not_found'}, status=404)
        result = order._cart_update_line_quantity(line_id, 0, **kwargs)
        return request.make_json_response({'result': result, 'cart': self._cart_json(order)})

    @http.route('/api/dtf/v1/checkout', type='json', auth='user', methods=['POST'], csrf=False)
    def checkout(self, **kwargs):
        order = self._native_cart()
        if not order or not order.order_line:
            return request.make_json_response({'error': 'cart_not_found'}, status=404)
        return request.make_json_response({'cart': self._cart_json(order), 'checkout': 'native_website_sale'})

    @http.route('/api/dtf/v1/orders', type='http', auth='user', methods=['GET'], csrf=False)
    def orders(self, **kwargs):
        orders = request.env['sale.order'].search([('partner_id', '=', request.env.user.partner_id.id), ('state', 'in', ['sale', 'done'])], order='id desc')
        return request.make_json_response({'items': [{'id': o.id, 'name': o.name, 'state': o.state, 'total': o.amount_total, 'lines': [{'product_id': l.product_id.id, 'quantity': l.product_uom_qty, 'master_asset_id': l.dtf_master_asset_id.id, 'preflight_snapshot': l.dtf_preflight_snapshot} for l in o.order_line]} for o in orders]})
