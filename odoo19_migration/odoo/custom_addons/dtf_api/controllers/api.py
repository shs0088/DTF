from odoo import http
from odoo.http import request


class DTFAPI(http.Controller):
    @http.route('/api/dtf/v1/health', type='http', auth='public', methods=['GET'], csrf=False)
    def health(self, **kwargs):
        return request.make_json_response({'ok': True, 'service': 'dtf-studio-odoo19', 'api_version': 'v1'})

    @http.route('/api/dtf/v1/categories', type='http', auth='public', methods=['GET'], csrf=False)
    def categories(self, **kwargs):
        categories = request.env['product.public.category'].sudo().search([], order='sequence, name, id')
        translator = request.env['product.template'].sudo()
        return request.make_json_response({
            'items': [{
                'id': category.id,
                'name': translator._dtf_translated_text(category, 'name', 'en_US'),
                'name_ar': translator._dtf_translated_text(category, 'name', 'ar_001'),
                'parent_id': category.parent_id.id or None,
                'sequence': category.sequence,
                'website_description': translator._dtf_translated_text(category, 'website_description', 'en_US'),
                'website_description_ar': translator._dtf_translated_text(category, 'website_description', 'ar_001'),
            } for category in categories]
        })

    @http.route('/api/dtf/v1/products', type='http', auth='public', methods=['GET'], csrf=False, website=True)
    def products(self, **kwargs):
        products = request.env['product.template'].sudo().search(request.website.sale_product_domain(), limit=100)
        return request.make_json_response({'items': request.env['product.template'].dtf_public_payload(products)})

    def _cart_json(self, order):
        return {
            'id': order.id,
            'state': order.state,
            'lines': [{
                'id': line.id,
                'product_id': line.product_id.id,
                'variant': line.product_id.display_name,
                'quantity': line.product_uom_qty,
                'unit_price': line.price_unit,
                'subtotal': line.price_subtotal,
                'tax': line.price_tax,
                'total': line.price_total,
            } for line in order.website_order_line],
            'subtotal': order.amount_untaxed,
            'tax': order.amount_tax,
            'total': order.amount_total,
        }

    def _native_cart(self, force_create=False):
        if not request.website:
            return None
        return request.cart or (request.website._create_cart() if force_create else None)

    @http.route('/api/dtf/v1/cart', type='http', auth='user', methods=['GET'], csrf=False, website=True)
    def cart_get(self, **kwargs):
        order = self._native_cart()
        return request.make_json_response({'cart': self._cart_json(order) if order else None})

    @http.route('/api/dtf/v1/cart/add', type='jsonrpc', auth='user', methods=['POST'], csrf=False, website=True)
    def cart_add(self, product_id=None, quantity=1, **kwargs):
        quantity = float(quantity or 0)
        if quantity <= 0:
            return {'error': 'quantity_must_be_positive'}
        order = self._native_cart(force_create=True)
        result = order._cart_add(int(product_id or 0), quantity, **kwargs)
        return {'result': result, 'cart': self._cart_json(order)}

    @http.route('/api/dtf/v1/cart/line/<int:line_id>', type='jsonrpc', auth='user', methods=['PATCH'], csrf=False, website=True)
    def cart_line_update(self, line_id, quantity=None, **kwargs):
        order = self._native_cart()
        if not order or line_id not in order.order_line.ids:
            return {'error': 'cart_line_not_found'}
        result = order._cart_update_line_quantity(line_id, float(quantity or 0), **kwargs)
        return {'result': result, 'cart': self._cart_json(order)}

    @http.route('/api/dtf/v1/cart/line/<int:line_id>', type='jsonrpc', auth='user', methods=['DELETE'], csrf=False, website=True)
    def cart_line_delete(self, line_id, **kwargs):
        order = self._native_cart()
        if not order or line_id not in order.order_line.ids:
            return {'error': 'cart_line_not_found'}
        result = order._cart_update_line_quantity(line_id, 0, **kwargs)
        return {'result': result, 'cart': self._cart_json(order)}

    @http.route('/api/dtf/v1/checkout', type='jsonrpc', auth='user', methods=['POST'], csrf=False, website=True)
    def checkout(self, **kwargs):
        order = self._native_cart()
        if not order or not order.order_line:
            return {'error': 'cart_not_found'}
        return {'cart': self._cart_json(order), 'checkout': 'native_website_sale'}

    @http.route('/api/dtf/v1/orders', type='http', auth='user', methods=['GET'], csrf=False)
    def orders(self, **kwargs):
        orders = request.env['sale.order'].search([
            ('partner_id', '=', request.env.user.partner_id.id),
            ('state', 'in', ['sale', 'done']),
        ], order='id desc')
        return request.make_json_response({
            'items': [{
                'id': order.id,
                'name': order.name,
                'state': order.state,
                'total': order.amount_total,
                'lines': [{
                    'product_id': line.product_id.id,
                    'quantity': line.product_uom_qty,
                    'master_asset_id': line.dtf_master_asset_id.id,
                    'preflight_snapshot': line.dtf_preflight_snapshot,
                } for line in order.order_line],
            } for order in orders]
        })
