from odoo import http
from odoo.exceptions import AccessError
from odoo.http import request


class DTFProductionController(http.Controller):
    @http.route(
        "/api/dtf/v1/production/<int:production_id>/master",
        type="http",
        auth="user",
        methods=["GET"],
        csrf=False,
        readonly=True,
    )
    def download_master(self, production_id, **kwargs):
        job = request.env["mrp.production"].browse(production_id).exists()
        if not job:
            raise request.not_found()

        job.check_access("read")
        if not job.dtf_is_print_job:
            raise request.not_found()

        user = request.env.user
        if not (
            user.has_group("dtf_core.group_dtf_admin")
            or user.has_group("dtf_core.group_dtf_printing_operator")
        ):
            raise AccessError("Only DTF production staff may download the print master.")

        attachment = job.dtf_master_attachment_id.sudo().exists()
        if not attachment:
            raise request.not_found()
        if job.dtf_master_asset_id.sudo().attachment_id != attachment:
            raise request.not_found()

        return request.env["ir.binary"]._get_stream_from(
            attachment
        ).get_response(as_attachment=True)
