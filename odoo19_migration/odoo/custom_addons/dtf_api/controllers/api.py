from odoo import http
from odoo.exceptions import AccessDenied
from odoo.http import request


class DTFAPI(http.Controller):

    def _role_for_user(self, user):
        return 'designer' if user.has_group('dtf_core.group_dtf_designer') else 'customer'

    def _session_payload(self, user):
        return {
            'ok': True,
            'userId': user.id,
            'role': self._role_for_user(user),
            'displayName': user.partner_id.name or '',
            'email': user.login or '',
        }

    def _authenticate_credentials(self, identifier, password):
        credential = {'login': identifier, 'password': password, 'type': 'password'}
        auth_info = request.session.authenticate(request.env, credential)
        uid = auth_info.get('uid')
        if not uid:
            raise AccessDenied()
        request.session.db = request.db
        request._save_session(request.env)
        return request.env['res.users'].sudo().browse(uid)

    @http.route('/api/dtf/v1/auth/login', type='http', auth='public', methods=['POST'], csrf=False, readonly=False)
    def auth_login(self, **kwargs):
        body = request.httprequest.get_json(silent=True) or {}
        identifier = str(body.get('identifier') or '').strip().lower()
        password = str(body.get('password') or '')
        if not identifier or not password:
            return request.make_json_response({'ok': False, 'error': 'missing_credentials'}, status=400)
        try:
            user = self._authenticate_credentials(identifier, password)
        except AccessDenied:
            return request.make_json_response({'ok': False, 'error': 'invalid_credentials'}, status=401)
        return request.make_json_response(self._session_payload(user))

    @http.route('/api/dtf/v1/auth/register', type='http', auth='public', methods=['POST'], csrf=False, readonly=False)
    def auth_register(self, **kwargs):
        body = request.httprequest.get_json(silent=True) or {}
        role = str(body.get('role') or '')
        name = str(body.get('displayName') or '').strip()
        email = str(body.get('email') or '').strip().lower()
        password = str(body.get('password') or '')
        if role not in ('customer', 'designer'):
            return request.make_json_response({'ok': False, 'error': 'role_not_allowed'}, status=400)
        if not name or '@' not in email or len(password) < 8:
            return request.make_json_response({'ok': False, 'error': 'invalid_registration'}, status=400)
        users = request.env['res.users'].sudo()
        if users.search_count([('login', '=', email)]):
            return request.make_json_response({'ok': False, 'error': 'email_in_use'}, status=409)
        try:
            with request.env.cr.savepoint():
                partner = request.env['res.partner'].sudo().create({
                    'name': name,
                    'email': email,
                    'dtf_customer_enabled': True,
                    'dtf_designer_enabled': role == 'designer',
                })
                group = request.env.ref('dtf_core.group_dtf_designer') if role == 'designer' else request.env.ref('base.group_portal')
                user = users.with_context(no_reset_password=True).create({
                    'name': name, 'login': email, 'email': email, 'password': password,
                    'partner_id': partner.id, 'group_ids': [(6, 0, [group.id])],
                })
                if role == 'designer':
                    request.env['dtf.designer.profile'].sudo().create({'partner_id': partner.id, 'user_id': user.id})
        except Exception:
            return request.make_json_response({'ok': False, 'error': 'registration_failed'}, status=400)
        user = self._authenticate_credentials(email, password)
        return request.make_json_response(self._session_payload(user), status=201)

    @http.route('/api/dtf/v1/auth/session', type='http', auth='user', methods=['GET'], csrf=False)
    def auth_session(self, **kwargs):
        return request.make_json_response(self._session_payload(request.env.user))

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

    def _frontend_product_payload(self, products):
        payload = request.env['product.template'].dtf_public_payload(products)
        products_by_id = {product.id: product for product in products}
        for row in payload:
            product = products_by_id.get(row.get('id'))
            if not product:
                continue
            variants_by_id = {
                variant.id: variant
                for variant in product.product_variant_ids
            }
            for variant_row in row.get('variants', []):
                variant = variants_by_id.get(variant_row.get('id'))
                if not variant:
                    continue
                variant_row.update({
                    'sku': variant.default_code or '',
                    'price': variant.lst_price,
                    'attributes': [{
                        'attribute': value.attribute_id.name,
                        'value': value.product_attribute_value_id.name,
                    } for value in variant.product_template_attribute_value_ids],
                })
        return payload

    @http.route('/api/dtf/v1/products', type='http', auth='public', methods=['GET'], csrf=False, website=True)
    def products(self, **kwargs):
        products = request.env['product.template'].sudo().search(request.website.sale_product_domain(), limit=100)
        return request.make_json_response({'items': self._frontend_product_payload(products)})

    def _cart_line_payload(self, line):
        attributes = {
            value.attribute_id.name.lower(): value.product_attribute_value_id.name
            for value in line.product_id.product_template_attribute_value_ids
        }
        color = next((value for key, value in attributes.items() if key in ('color', 'colour', 'لون')), None)
        size = next((value for key, value in attributes.items() if key in ('size', 'مقاس', 'حجم')), None)
        return {
            'id': line.id,
            'product_id': line.product_id.id,
            'variant': line.product_id.display_name,
            'sku': line.product_id.default_code or '',
            'product_name': line.product_id.product_tmpl_id.name,
            'color': color,
            'size': size,
            'quantity': line.product_uom_qty,
            'unit_price': line.price_unit,
            'subtotal': line.price_subtotal,
            'tax': line.price_tax,
            'total': line.price_total,
            'design_id': line.dtf_design_id.id or None,
            'master_asset_id': line.dtf_master_asset_id.id or None,
        }

    def _cart_json(self, order):
        return {
            'id': order.id,
            'state': order.state,
            'lines': [self._cart_line_payload(line) for line in order.website_order_line],
            'subtotal': order.amount_untaxed,
            'tax': order.amount_tax,
            'total': order.amount_total,
        }

    def _native_cart(self, force_create=False):
        if not request.website:
            return None
        return request.cart or (request.website._create_cart() if force_create else None)

    @http.route('/api/dtf/v1/cart', type='http', auth='public', methods=['GET'], csrf=False, website=True)
    def cart_get(self, **kwargs):
        order = self._native_cart()
        return request.make_json_response({'cart': self._cart_json(order) if order else None})

    @http.route('/api/dtf/v1/cart/add', type='jsonrpc', auth='public', methods=['POST'], csrf=False, website=True)
    def cart_add(self, product_id=None, quantity=1, **kwargs):
        quantity = float(quantity or 0)
        if quantity <= 0:
            return {'error': 'quantity_must_be_positive'}
        order = self._native_cart(force_create=True)
        result = order._cart_add(int(product_id or 0), quantity, **kwargs)
        return {'result': result, 'cart': self._cart_json(order)}

    @http.route('/api/dtf/v1/cart/line/<int:line_id>/update', type='jsonrpc', auth='public', methods=['POST'], csrf=False, website=True)
    def cart_line_update(self, line_id, quantity=None, **kwargs):
        order = self._native_cart()
        if not order or line_id not in order.order_line.ids:
            return {'error': 'cart_line_not_found'}
        result = order._cart_update_line_quantity(line_id, float(quantity or 0), **kwargs)
        return {'result': result, 'cart': self._cart_json(order)}

    @http.route('/api/dtf/v1/cart/line/<int:line_id>/delete', type='jsonrpc', auth='public', methods=['POST'], csrf=False, website=True)
    def cart_line_delete(self, line_id, **kwargs):
        order = self._native_cart()
        if not order or line_id not in order.order_line.ids:
            return {'error': 'cart_line_not_found'}
        result = order._cart_update_line_quantity(line_id, 0, **kwargs)
        return {'result': result, 'cart': self._cart_json(order)}

    def _checkout_settings(self):
        company = request.env.company.sudo()
        bank = company.partner_id.bank_ids[:1]
        return {
            'storePickupEnabled': False,
            'codEnabled': False,
            'bankTransferEnabled': True,
            'bankDetails': {
                'bankName': bank.bank_id.name if bank and bank.bank_id else '',
                'accountName': company.name or '',
                'iban': bank.acc_number if bank else '',
                'cliqAlias': '',
            },
        }

    def _checkout_issues(self, order):
        issues = []
        for line in order.website_order_line:
            template = line.product_id.product_tmpl_id
            if template.dtf_catalog_type != 'customizable':
                continue
            if not line.dtf_design_id or not line.dtf_master_asset_id:
                issues.append(
                    'A customizable DTF item requires an explicit design and Ready-to-Print Master.'
                )
                continue
            master = line.dtf_master_asset_id
            if master.design_id != line.dtf_design_id:
                issues.append('The selected Ready-to-Print Master does not belong to the selected design.')
                continue
            latest = master.latest_preflight_result_id
            if (
                not latest
                or latest.status != 'accepted'
                or latest.rule_version_id.product_type != line.dtf_design_id.product_type
            ):
                issues.append(
                    'The Ready-to-Print Master requires a current accepted product-compatible preflight.'
                )
        return issues

    def _checkout_preview_payload(self, order):
        order._verify_cart()
        issues = self._checkout_issues(order)
        delivery = sum(order.website_order_line.filtered('is_delivery').mapped('price_subtotal'))
        return {
            'lines': [self._cart_line_payload(line) for line in order.website_order_line],
            'subtotalJod': order.amount_untaxed - delivery,
            'deliveryFeeJod': delivery,
            'taxJod': order.amount_tax,
            'discountJod': 0.0,
            'totalJod': order.amount_total,
            'issues': issues,
            'canCheckout': bool(order.website_order_line) and not issues,
            'settings': self._checkout_settings(),
        }

    def _order_payment_status(self, order):
        invoices = order.invoice_ids.filtered(
            lambda move: move.move_type == 'out_invoice' and move.state != 'cancel'
        )
        if invoices and all(move.payment_state == 'paid' for move in invoices):
            return 'paid'
        states = set(invoices.mapped('payment_state'))
        if 'partial' in states:
            return 'partial'
        if 'in_payment' in states:
            return 'in_payment'
        return 'pending'

    def _order_payload(self, order):
        translator = request.env['product.template'].sudo()
        payment_status = self._order_payment_status(order)
        return {
            'id': order.id,
            'name': order.name,
            'nativeState': order.state,
            'status': 'payment_confirmed' if payment_status == 'paid' else 'payment_pending',
            'paymentStatus': payment_status,
            'fulfillmentMode': 'delivery',
            'promotionCode': '',
            'discountJod': 0.0,
            'subtotalJod': order.amount_untaxed,
            'taxJod': order.amount_tax,
            'totalJod': order.amount_total,
            'reservationExpiresAt': None,
            'settings': self._checkout_settings(),
            'items': [{
                'id': line.id,
                'productId': line.product_id.id,
                'productNameEn': translator._dtf_translated_text(
                    line.product_id.product_tmpl_id, 'name', 'en_US'
                ) or line.product_id.display_name,
                'productNameAr': translator._dtf_translated_text(
                    line.product_id.product_tmpl_id, 'name', 'ar_001'
                ),
                'quantity': line.product_uom_qty,
                'unitPriceJod': line.price_unit,
                'masterAssetId': line.dtf_master_asset_id.id or None,
                'preflightSnapshot': line.dtf_preflight_snapshot,
            } for line in order.order_line],
        }

    @http.route('/api/dtf/v1/checkout', type='jsonrpc', auth='user', methods=['POST'], csrf=False, website=True)
    def checkout(self, **kwargs):
        """M5 compatibility endpoint retained during M9 frontend cutover."""
        order = self._native_cart()
        if not order or not order.order_line:
            return {'error': 'cart_not_found'}
        return {'cart': self._cart_json(order), 'checkout': 'native_website_sale'}

    @http.route('/api/dtf/v1/checkout/preview', type='http', auth='user', methods=['GET'], csrf=False, website=True)
    def checkout_preview(self, **kwargs):
        order = self._native_cart()
        if not order or not order.order_line:
            return request.make_json_response({'ok': False, 'error': 'cart_not_found'}, status=404)
        order._update_address(
            request.env.user.partner_id.id,
            ['partner_id', 'partner_invoice_id', 'partner_shipping_id'],
        )
        return request.make_json_response({
            'ok': True,
            'identity': self._session_payload(request.env.user),
            'preview': self._checkout_preview_payload(order),
        })

    @http.route('/api/dtf/v1/checkout/coupon', type='jsonrpc', auth='user', methods=['POST'], csrf=False, website=True)
    def checkout_coupon(self, coupon=None, **kwargs):
        order = self._native_cart()
        if not order or not order.order_line:
            return {'error': 'cart_not_found'}
        code = str(coupon or '').strip()
        if not code:
            return {'error': 'coupon_required'}
        status = order._try_apply_code(code)
        if status.get('error'):
            return {'error': str(status['error'])}
        if status.get('not_found'):
            return {'error': 'coupon_not_found'}
        return {'ok': True, 'preview': self._checkout_preview_payload(order)}

    @http.route('/api/dtf/v1/checkout/place', type='jsonrpc', auth='user', methods=['POST'], csrf=False, website=True)
    def checkout_place(
        self,
        customer_name=None,
        customer_phone=None,
        city=None,
        address=None,
        notes=None,
        payment_method='bank_transfer',
        fulfillment='delivery',
        **kwargs
    ):
        order = self._native_cart()
        if not order or not order.order_line:
            return {'error': 'cart_not_found'}
        if payment_method != 'bank_transfer':
            return {'error': 'payment_method_not_configured'}
        if fulfillment != 'delivery':
            return {'error': 'fulfillment_not_configured'}

        partner = request.env.user.partner_id.sudo()
        partner.write({
            'name': str(customer_name or partner.name or '').strip() or partner.name,
            'phone': str(customer_phone or partner.phone or '').strip(),
            'city': str(city or partner.city or '').strip(),
            'street': str(address or partner.street or '').strip(),
        })
        order._update_address(
            partner.id,
            ['partner_id', 'partner_invoice_id', 'partner_shipping_id'],
        )
        if notes:
            order.note = str(notes).strip()

        order._verify_cart()
        issues = self._checkout_issues(order)
        if issues:
            return {'error': 'checkout_blocked', 'issues': issues}

        customizable_lines = order.website_order_line.filtered(
            lambda line: line.product_id.product_tmpl_id.dtf_catalog_type == 'customizable'
        )
        if customizable_lines:
            customizable_lines.action_capture_dtf_snapshots()

        order.action_confirm()
        request.session['sale_last_order_id'] = order.id
        payload = self._order_payload(order)
        request.env['website'].get_current_website().sale_reset()
        return {'ok': True, 'order': payload}

    @http.route('/api/dtf/v1/orders', type='http', auth='user', methods=['GET'], csrf=False)
    def orders(self, **kwargs):
        orders = request.env['sale.order'].sudo().search([
            ('partner_id', '=', request.env.user.partner_id.id),
            ('state', 'in', ['sale', 'done']),
        ], order='id desc')
        return request.make_json_response({
            'items': [self._order_payload(order) for order in orders]
        })

    @http.route('/api/dtf/v1/orders/<int:order_id>', type='http', auth='user', methods=['GET'], csrf=False)
    def order_detail(self, order_id, **kwargs):
        order = request.env['sale.order'].sudo().search([
            ('id', '=', order_id),
            ('partner_id', '=', request.env.user.partner_id.id),
            ('state', 'in', ['sale', 'done']),
        ], limit=1)
        if not order:
            return request.make_json_response({'ok': False, 'error': 'order_not_found'}, status=404)
        return request.make_json_response({'ok': True, 'order': self._order_payload(order)})
