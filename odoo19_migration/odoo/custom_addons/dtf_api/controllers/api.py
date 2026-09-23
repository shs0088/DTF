from odoo import http
from odoo.http import request


class DTFAPI(http.Controller):
    @http.route('/api/dtf/v1/health', type='http', auth='public', methods=['GET'], csrf=False)
    def health(self, **kwargs):
        return request.make_json_response({
            'ok': True,
            'service': 'dtf-studio-odoo19',
            'api_version': 'v1',
        })

    @http.route('/api/dtf/v1/categories', type='http', auth='public', methods=['GET'], csrf=False)
    def categories(self, **kwargs):
        categories = request.env['product.public.category'].sudo().search([('parent_id', '=', False)])
        return request.make_json_response({
            'items': [
                {'id': category.id, 'name': category.name, 'parent_id': category.parent_id.id or None}
                for category in categories
            ]
        })

    @http.route('/api/dtf/v1/products', type='http', auth='public', methods=['GET'], csrf=False)
    def products(self, **kwargs):
        products = request.env['product.template'].sudo().search([('sale_ok', '=', True)], limit=100)
        return request.make_json_response({
            'items': [
                {
                    'id': product.id,
                    'name': product.name,
                    'list_price': product.list_price,
                    'currency': request.env.company.currency_id.name,
                }
                for product in products
            ]
        })
