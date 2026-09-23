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
