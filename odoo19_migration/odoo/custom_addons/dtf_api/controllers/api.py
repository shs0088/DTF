import base64
from odoo import http
from odoo.exceptions import AccessDenied, AccessError, ValidationError
from odoo.http import request


class DTFAPI(http.Controller):

    def _public_image_response(self, encoded):
        content = base64.b64decode(encoded or b"")
        if not content:
            return request.not_found()
        if content.startswith(b"\x89PNG\r\n\x1a\n"):
            mimetype = "image/png"
        elif content.startswith(b"\xff\xd8\xff"):
            mimetype = "image/jpeg"
        elif content.startswith(b"RIFF") and content[8:12] == b"WEBP":
            mimetype = "image/webp"
        else:
            mimetype = "application/octet-stream"
        return request.make_response(content, [
            ("Content-Type", mimetype),
            ("Content-Length", len(content)),
            ("Cache-Control", "public, max-age=300"),
            ("X-Content-Type-Options", "nosniff"),
        ])

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

    @http.route('/api/dtf/v1/homepage', type='http', auth='public', methods=['GET'], csrf=False)
    def homepage(self, **kwargs):
        banners = request.env['dtf.homepage.banner'].sudo().search(
            [('active', '=', True)],
            order='sequence, id',
        )
        return request.make_json_response({
            'banners': [banner.dtf_public_payload() for banner in banners],
        })

    @http.route(
        '/api/dtf/v1/homepage/banners/<int:banner_id>/image',
        type='http',
        auth='public',
        methods=['GET'],
        csrf=False,
    )
    def homepage_banner_image(self, banner_id, **kwargs):
        banner = request.env['dtf.homepage.banner'].sudo().search([
            ('id', '=', banner_id),
            ('active', '=', True),
        ], limit=1)
        if not banner or not banner.image_1920:
            return request.not_found()
        return self._public_image_response(banner.image_1920)

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

    @http.route(
        '/api/dtf/v1/products/<int:product_id>/image',
        type='http',
        auth='public',
        methods=['GET'],
        csrf=False,
        website=True,
    )
    def product_image(self, product_id, **kwargs):
        domain = request.website.sale_product_domain() + [('id', '=', product_id)]
        product = request.env['product.template'].sudo().search(domain, limit=1)
        if not product or not product.image_1920:
            return request.not_found()
        return self._public_image_response(product.image_1920)

    @http.route('/api/dtf/v1/products', type='http', auth='public', methods=['GET'], csrf=False, website=True)
    def products(self, **kwargs):
        products = request.env['product.template'].sudo().search(request.website.sale_product_domain(), limit=100)
        return request.make_json_response({'items': self._frontend_product_payload(products)})


    def _public_design_payload(self, designs):
        return [{
            'id': design.id,
            'title_en': design.title_en or '',
            'title_ar': design.title_ar or '',
            'description_en': design.description_en or '',
            'description_ar': design.description_ar or '',
            'product_type': design.product_type,
            'designer_id': design.designer_id.id,
            'designer_name': design.designer_id.partner_id.display_name or '',
            'display_asset_id': design.main_display_asset_id.id or None,
            'image_url': (
                '/api/dtf/v1/design-assets/%s/preview' % design.main_display_asset_id.id
                if design.main_display_asset_id else None
            ),
            'status': design.state,
            'visibility': 'public',
        } for design in designs]

    @http.route('/api/dtf/v1/designs', type='http', auth='public', methods=['GET'], csrf=False)
    def designs(self, **kwargs):
        designs = request.env['dtf.design'].sudo().search([
            ('active', '=', True),
            ('state', '=', 'published'),
            ('is_qualification_sample', '=', False),
            ('main_display_asset_id', '!=', False),
        ], order='create_date desc, id desc', limit=100)
        return request.make_json_response({'items': self._public_design_payload(designs)})

    @http.route(
        '/api/dtf/v1/design-assets/<int:asset_id>/preview',
        type='http',
        auth='public',
        methods=['GET'],
        csrf=False,
    )
    def design_asset_preview(self, asset_id, **kwargs):
        asset = request.env['dtf.design.asset'].sudo().search([
            ('id', '=', asset_id),
            ('design_id.active', '=', True),
            ('design_id.state', '=', 'published'),
            ('design_id.is_qualification_sample', '=', False),
        ], limit=1)
        if (
            not asset
            or asset.design_id.main_display_asset_id != asset
            or not asset.previewable
            or not (asset.mime_type or '').startswith('image/')
        ):
            return request.not_found()
        content = asset.attachment_id.raw or b''
        if not content:
            return request.not_found()
        filename = (asset.name or 'design').replace('"', '_').replace('\r', '_').replace('\n', '_')
        return request.make_response(content, [
            ('Content-Type', asset.mime_type or asset.attachment_id.mimetype or 'application/octet-stream'),
            ('Content-Length', len(content)),
            ('Content-Disposition', 'inline; filename="%s"' % filename),
            ('Cache-Control', 'public, max-age=300'),
            ('X-Content-Type-Options', 'nosniff'),
        ])


    def _designer_profile(self):
        user = request.env.user
        if not user.has_group('dtf_core.group_dtf_designer'):
            return request.env['dtf.designer.profile']
        return request.env['dtf.designer.profile'].search([
            ('user_id', '=', user.id),
            ('active', '=', True),
        ], limit=1)

    def _designer_asset_protected(self, asset):
        if request.env['dtf.preflight.result'].sudo().search_count([
            ('asset_id', '=', asset.id),
            ('locked', '=', True),
        ]):
            return True
        if request.env['sale.order.line'].sudo().search_count([
            ('dtf_master_asset_id', '=', asset.id),
        ]):
            return True
        return bool(request.env['mrp.production'].sudo().search_count([
            ('dtf_master_asset_id', '=', asset.id),
            ('dtf_is_print_job', '=', True),
        ]))

    def _designer_asset_payload(self, asset):
        latest = asset.latest_preflight_result_id
        snapshot = (latest.analyzer_snapshot or {}) if latest else {}
        effective = snapshot.get('effective_dpi') or {}
        effective_dpi = (
            effective.get('minimum')
            if isinstance(effective, dict)
            else None
        )
        status = {
            'accepted': 'passed',
            'rejected': 'failed',
            'pending': 'pending',
        }.get(asset.preflight_state or 'pending', 'pending')
        return {
            'assetId': str(asset.id),
            'filename': asset.name or '',
            'mimeType': asset.mime_type or asset.attachment_id.mimetype or '',
            'byteSize': asset.size_bytes or asset.attachment_id.file_size or 0,
            'pixelWidth': asset.pixel_width or None,
            'pixelHeight': asset.pixel_height or None,
            'embeddedDpi': asset.embedded_dpi or None,
            'effectiveDpi': effective_dpi,
            'previewable': bool(asset.previewable),
            'readable': bool(asset.readable),
            'analyzable': bool(asset.analyzable),
            'isCover': bool(asset.is_main_display_image),
            'isMaster': bool(asset.is_ready_to_print_master),
            'preflightStatus': status,
            'preflightSummary': asset.preflight_summary or '',
            'protected': self._designer_asset_protected(asset),
        }

    def _designer_design_payload(self, design):
        return {
            'designId': str(design.id),
            'titleAr': design.title_ar or '',
            'titleEn': design.title_en or '',
            'descriptionAr': design.description_ar or '',
            'descriptionEn': design.description_en or '',
            'productType': design.product_type,
            'status': design.state,
            'assets': [
                self._designer_asset_payload(asset)
                for asset in design.asset_ids.sorted(key=lambda item: item.id)
            ],
        }

    @http.route(
        '/api/dtf/v1/designer/workspace',
        type='http',
        auth='user',
        methods=['GET'],
        csrf=False,
    )
    def designer_workspace(self, **kwargs):
        profile = self._designer_profile()
        if not profile:
            return request.make_json_response(
                {'ok': False, 'error': 'designer_profile_not_found'},
                status=403,
            )
        if not profile.authorized or profile.qualification_state != 'authorized':
            return request.make_json_response({
                'ok': False,
                'error': 'qualification_required',
                'qualificationState': profile.qualification_state,
            }, status=409)
        designs = request.env['dtf.design'].search([
            ('designer_id', '=', profile.id),
            ('is_qualification_sample', '=', False),
        ], order='create_date desc, id desc')
        return request.make_json_response({
            'ok': True,
            'profile': {
                'id': str(profile.id),
                'authorized': bool(profile.authorized),
                'qualificationState': profile.qualification_state,
            },
            'designs': [
                self._designer_design_payload(design)
                for design in designs
            ],
        })

    @http.route(
        '/api/dtf/v1/designer/assets/<int:asset_id>',
        type='http',
        auth='user',
        methods=['GET'],
        csrf=False,
    )
    def designer_asset(self, asset_id, **kwargs):
        profile = self._designer_profile()
        if not profile:
            return request.not_found()
        asset = request.env['dtf.design.asset'].search([
            ('id', '=', asset_id),
            ('design_id.designer_id', '=', profile.id),
        ], limit=1)
        if not asset:
            return request.not_found()
        attachment = asset.attachment_id.sudo().exists()
        content = attachment.raw or b''
        if not content:
            return request.not_found()
        mime = asset.mime_type or attachment.mimetype or 'application/octet-stream'
        filename = (asset.name or attachment.name or 'asset').replace('"', '_').replace('\r', '_').replace('\n', '_')
        headers = [
            ('Content-Type', mime),
            ('Content-Length', len(content)),
            ('Content-Disposition', ('attachment' if mime == 'application/pdf' else 'inline') + '; filename="%s"' % filename),
            ('Cache-Control', 'private, max-age=300'),
            ('X-Content-Type-Options', 'nosniff'),
        ]
        if mime == 'image/svg+xml':
            headers.append(('Content-Security-Policy', "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:"))
        return request.make_response(content, headers)

    @http.route(
        '/api/dtf/v1/designer/assets/<int:asset_id>/delete',
        type='jsonrpc',
        auth='user',
        methods=['POST'],
        csrf=False,
    )
    def designer_asset_delete(self, asset_id, **kwargs):
        profile = self._designer_profile()
        asset = request.env['dtf.design.asset'].search([
            ('id', '=', asset_id),
            ('design_id.designer_id', '=', profile.id if profile else 0),
        ], limit=1)
        if not asset:
            return {'error': 'asset_not_found'}
        try:
            asset.unlink()
        except (ValidationError, AccessError) as error:
            return {'error': str(error)}
        return {'ok': True}

    def _designer_design_protected(self, design):
        asset_ids = design.asset_ids.ids
        if asset_ids and request.env['dtf.preflight.result'].sudo().search_count([
            ('asset_id', 'in', asset_ids),
            ('locked', '=', True),
        ]):
            return True
        if request.env['sale.order.line'].sudo().search_count([
            '|',
            ('dtf_design_id', '=', design.id),
            ('dtf_master_asset_id', 'in', asset_ids or [0]),
        ]):
            return True
        return bool(request.env['mrp.production'].sudo().search_count([
            ('dtf_is_print_job', '=', True),
            '|',
            ('dtf_design_id', '=', design.id),
            ('dtf_master_asset_id', 'in', asset_ids or [0]),
        ]))

    @http.route(
        '/api/dtf/v1/designer/designs/<int:design_id>/delete',
        type='jsonrpc',
        auth='user',
        methods=['POST'],
        csrf=False,
    )
    def designer_design_delete(self, design_id, **kwargs):
        profile = self._designer_profile()
        design = request.env['dtf.design'].search([
            ('id', '=', design_id),
            ('designer_id', '=', profile.id if profile else 0),
            ('is_qualification_sample', '=', False),
        ], limit=1)
        if not design:
            return {'error': 'design_not_found'}
        if self._designer_design_protected(design):
            return {'error': 'design_protected'}
        try:
            design.unlink()
        except (ValidationError, AccessError) as error:
            return {'error': str(error)}
        return {'ok': True}

    def _designer_role_records(self, design_id, asset_id):
        profile = self._designer_profile()
        design = request.env['dtf.design'].search([
            ('id', '=', design_id),
            ('designer_id', '=', profile.id if profile else 0),
            ('is_qualification_sample', '=', False),
        ], limit=1)
        asset = request.env['dtf.design.asset'].search([
            ('id', '=', asset_id),
            ('design_id', '=', design.id if design else 0),
        ], limit=1)
        return design, asset

    @http.route(
        '/api/dtf/v1/designer/designs/<int:design_id>/cover',
        type='jsonrpc',
        auth='user',
        methods=['POST'],
        csrf=False,
    )
    def designer_set_cover(self, design_id, asset_id=None, **kwargs):
        design, asset = self._designer_role_records(
            design_id,
            int(asset_id or 0),
        )
        if not design or not asset:
            return {'error': 'design_asset_not_found'}
        try:
            design.action_set_main_display_asset(asset)
        except (ValidationError, AccessError) as error:
            return {'error': str(error)}
        return {'ok': True}

    @http.route(
        '/api/dtf/v1/designer/designs/<int:design_id>/master',
        type='jsonrpc',
        auth='user',
        methods=['POST'],
        csrf=False,
    )
    def designer_set_master(self, design_id, asset_id=None, **kwargs):
        design, asset = self._designer_role_records(
            design_id,
            int(asset_id or 0),
        )
        if not design or not asset:
            return {'error': 'design_asset_not_found'}
        latest = asset.latest_preflight_result_id
        if (
            not latest
            or latest.status != 'accepted'
            or latest.rule_version_id.product_type != design.product_type
        ):
            return {'error': 'master_preflight_required'}
        try:
            design.action_set_ready_to_print_master(asset)
        except (ValidationError, AccessError) as error:
            return {'error': str(error)}
        return {'ok': True}


    _DESIGN_PRODUCT_TYPE_COMPAT = {
        'T-Shirt': 'tshirt',
        'Mug': 'mug',
        'Cap': 'cap',
        'T-Shirt + Mug': 'tshirt_mug',
        'T-Shirt + Cap': 'tshirt_cap',
        'Mug + Cap': 'mug_cap',
        'T-Shirt + Mug + Cap': 'tshirt_mug_cap',
    }
    _DESIGN_UPLOAD_MAX_BYTES = 20 * 1024 * 1024
    _DESIGN_UPLOAD_MAX_ASSETS = 20
    _FORMAT_MIME = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'pdf': 'application/pdf',
    }

    def _designer_upload_rule(self, product_type):
        return request.env['dtf.preflight.rule.version'].sudo().search([
            ('active', '=', True),
            ('product_type', '=', product_type),
        ], order='create_date desc, id desc', limit=1)

    def _designer_upload_target_cm(self, rule):
        areas = rule.printable_area_ids.filtered('active')
        area_widths = [value for value in areas.mapped('width_cm') if value]
        area_heights = [value for value in areas.mapped('height_cm') if value]
        width = rule.max_width_cm or (max(area_widths) if area_widths else 0.0) or rule.min_width_cm
        height = rule.max_height_cm or (max(area_heights) if area_heights else 0.0) or rule.min_height_cm
        return (width or None, height or None)

    def _designer_upload_config_payload(self, profile):
        rules = request.env['dtf.preflight.rule.version'].sudo().search([
            ('active', '=', True),
        ], order='product_type, create_date desc, id desc')
        latest_by_type = {}
        for rule in rules:
            latest_by_type.setdefault(rule.product_type, rule)
        allowed = set()
        min_dpi = 0
        for rule in latest_by_type.values():
            allowed.update(rule.allowed_formats or [])
            min_dpi = max(min_dpi, int(rule.min_effective_dpi or 0))
        allowed_mimes = sorted({
            self._FORMAT_MIME[fmt]
            for fmt in allowed
            if fmt in self._FORMAT_MIME
        })
        if not allowed_mimes:
            allowed_mimes = [
                'image/png', 'image/jpeg', 'image/webp',
                'image/svg+xml', 'application/pdf',
            ]
        return {
            'ok': True,
            'authorized': bool(profile.authorized),
            'qualificationState': profile.qualification_state,
            'productTypes': list(self._DESIGN_PRODUCT_TYPE_COMPAT),
            'configuredProductTypes': [
                legacy
                for legacy, native in self._DESIGN_PRODUCT_TYPE_COMPAT.items()
                if native in latest_by_type
            ],
            'maxFileSizeBytes': self._DESIGN_UPLOAD_MAX_BYTES,
            'maxAssets': self._DESIGN_UPLOAD_MAX_ASSETS,
            'allowedFormats': allowed_mimes,
            'minDpi': min_dpi or 300,
        }

    @http.route(
        '/api/dtf/v1/designer/upload-config',
        type='http',
        auth='user',
        methods=['GET'],
        csrf=False,
    )
    def designer_upload_config(self, **kwargs):
        profile = self._designer_profile()
        if not profile:
            return request.make_json_response(
                {'ok': False, 'error': 'designer_profile_not_found'},
                status=403,
            )
        if not profile.authorized or profile.qualification_state != 'authorized':
            return request.make_json_response({
                'ok': False,
                'error': 'qualification_required',
                'qualificationState': profile.qualification_state,
            }, status=409)
        return request.make_json_response(
            self._designer_upload_config_payload(profile)
        )

    @http.route(
        '/api/dtf/v1/designer/designs/create',
        type='http',
        auth='user',
        methods=['POST'],
        csrf=False,
        readonly=False,
    )
    def designer_design_create(self, **kwargs):
        profile = self._designer_profile()
        if not profile:
            return request.make_json_response(
                {'ok': False, 'error': 'designer_profile_not_found'},
                status=403,
            )
        if not profile.authorized or profile.qualification_state != 'authorized':
            return request.make_json_response({
                'ok': False,
                'error': 'qualification_required',
                'qualificationState': profile.qualification_state,
            }, status=409)

        form = request.httprequest.form
        title_en = str(form.get('titleEn') or '').strip()
        title_ar = str(form.get('titleAr') or '').strip()
        description_en = str(form.get('descriptionEn') or '').strip()
        description_ar = str(form.get('descriptionAr') or '').strip()
        legacy_product_type = str(form.get('productType') or '').strip()
        product_type = self._DESIGN_PRODUCT_TYPE_COMPAT.get(legacy_product_type)
        if not all((title_en, title_ar, description_en, description_ar)):
            return request.make_json_response(
                {'ok': False, 'error': 'bilingual_fields_required'},
                status=400,
            )
        if not product_type:
            return request.make_json_response(
                {'ok': False, 'error': 'invalid_product_type'},
                status=400,
            )

        uploads = [
            upload
            for upload in request.httprequest.files.getlist('files')
            if upload and upload.filename
        ]
        if not uploads:
            return request.make_json_response(
                {'ok': False, 'error': 'files_required'},
                status=400,
            )
        if len(uploads) > self._DESIGN_UPLOAD_MAX_ASSETS:
            return request.make_json_response(
                {'ok': False, 'error': 'too_many_files'},
                status=400,
            )
        try:
            master_index = int(form.get('masterIndex'))
        except (TypeError, ValueError):
            master_index = -1
        try:
            cover_index = int(form.get('coverIndex', -1))
        except (TypeError, ValueError):
            cover_index = -2
        if master_index < 0 or master_index >= len(uploads):
            return request.make_json_response(
                {'ok': False, 'error': 'master_selection_required'},
                status=400,
            )
        if cover_index < -1 or cover_index >= len(uploads):
            return request.make_json_response(
                {'ok': False, 'error': 'cover_selection_invalid'},
                status=400,
            )

        rule = self._designer_upload_rule(product_type)
        if not rule:
            return request.make_json_response(
                {'ok': False, 'error': 'preflight_rule_missing'},
                status=409,
            )
        target_width_cm, target_height_cm = self._designer_upload_target_cm(rule)
        engine = request.env['dtf.preflight.engine'].sudo()

        try:
            with request.env.cr.savepoint():
                design = request.env['dtf.design'].create({
                    'designer_id': profile.id,
                    'title_en': title_en,
                    'title_ar': title_ar,
                    'description_en': description_en,
                    'description_ar': description_ar,
                    'product_type': product_type,
                    'is_qualification_sample': False,
                })
                assets = []
                for index, upload in enumerate(uploads):
                    raw = upload.read()
                    if not raw:
                        raise ValidationError('empty_file')
                    if len(raw) > self._DESIGN_UPLOAD_MAX_BYTES:
                        raise ValidationError('file_too_large')
                    snapshot = engine.inspect_bytes(
                        raw,
                        upload.filename,
                        upload.mimetype,
                        target_width_cm,
                        target_height_cm,
                    )
                    detected = snapshot.get('detected_format') or 'unknown'
                    if (
                        not snapshot.get('signature_valid')
                        or not snapshot.get('readable')
                        or detected not in (rule.allowed_formats or [])
                    ):
                        raise ValidationError('unsupported_file')
                    expected_mime = self._FORMAT_MIME.get(detected)
                    declared_mime = (upload.mimetype or '').lower()
                    if (
                        declared_mime
                        and expected_mime
                        and declared_mime != expected_mime
                        and not (
                            detected == 'jpeg'
                            and declared_mime in ('image/jpeg', 'image/jpg')
                        )
                    ):
                        raise ValidationError('mime_mismatch')
                    if (
                        index == master_index
                        and not snapshot.get('vector')
                        and rule.min_effective_dpi
                        and (snapshot.get('effective_dpi') or {}).get('minimum') is None
                    ):
                        raise ValidationError('preflight_target_size_missing')

                    attachment = request.env['ir.attachment'].sudo().create({
                        'name': upload.filename,
                        'raw': raw,
                        'mimetype': expected_mime or declared_mime or 'application/octet-stream',
                    })
                    asset = request.env['dtf.design.asset'].create({
                        'design_id': design.id,
                        'attachment_id': attachment.id,
                        'name': upload.filename,
                        'file_format': detected,
                        'mime_type': expected_mime or declared_mime or '',
                        'size_bytes': len(raw),
                        'pixel_width': snapshot.get('pixel_width') or 0,
                        'pixel_height': snapshot.get('pixel_height') or 0,
                        'embedded_dpi': snapshot.get('embedded_dpi') or 0,
                        'has_alpha': bool(snapshot.get('alpha')),
                        'previewable': bool(snapshot.get('previewable')),
                        'readable': bool(snapshot.get('readable')),
                        'analyzable': bool(snapshot.get('analyzable')),
                    })
                    attachment.sudo().write({
                        'res_model': 'dtf.design.asset',
                        'res_id': asset.id,
                    })
                    assets.append(asset)

                master_asset = assets[master_index]
                result = engine.run(
                    master_asset.sudo(),
                    rule.sudo(),
                    target_width_cm,
                    target_height_cm,
                )
                if result.status != 'accepted':
                    detail = (
                        result.reasons_en
                        or result.reasons_ar
                        or 'Selected Ready-to-Print Master failed preflight.'
                    )
                    raise ValidationError('master_preflight_failed: %s' % detail)
                design.action_set_ready_to_print_master(master_asset)

                if cover_index >= 0:
                    design.action_set_main_display_asset(assets[cover_index])
                else:
                    design._ensure_main_display_asset()

                payload = self._designer_design_payload(design)
        except (ValidationError, AccessError) as error:
            message = str(error)
            code = message.split(':', 1)[0].strip()
            status = 422
            if code in ('preflight_target_size_missing',):
                status = 409
            return request.make_json_response({
                'ok': False,
                'error': code,
                'message': message,
            }, status=status)

        return request.make_json_response({
            'ok': True,
            'design': payload,
        }, status=201)

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
