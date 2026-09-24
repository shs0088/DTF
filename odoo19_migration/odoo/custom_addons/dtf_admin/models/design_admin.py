from odoo import _, fields, models
from odoo.exceptions import AccessError, ValidationError


class DTFDesignAdmin(models.Model):
    _inherit = "dtf.design"

    admin_rejection_reason = fields.Text(
        string="Rejection Reason",
        readonly=True,
        tracking=True,
    )
    admin_rejected_at = fields.Datetime(
        string="Rejected At",
        readonly=True,
        tracking=True,
    )
    admin_rejected_by_id = fields.Many2one(
        "res.users",
        string="Rejected By",
        readonly=True,
        ondelete="restrict",
        tracking=True,
    )

    def _dtf_admin_require_admin(self):
        if not (
            self.env.is_superuser()
            or self.env.user.has_group("dtf_core.group_dtf_admin")
        ):
            raise AccessError(_("DTF Administrator permission is required."))

    def action_open_admin_reject_wizard(self):
        self.ensure_one()
        self._dtf_admin_require_admin()
        if self.state != "draft":
            raise ValidationError(_("Only a draft design can be rejected from Admin review."))
        return {
            "type": "ir.actions.act_window",
            "name": _("Reject Design"),
            "res_model": "dtf.admin.design.reject.wizard",
            "view_mode": "form",
            "target": "new",
            "context": {"default_design_id": self.id},
        }

    def action_admin_reject(self, reason):
        self.ensure_one()
        self._dtf_admin_require_admin()
        if self.state != "draft":
            raise ValidationError(_("Only a draft design can be rejected from Admin review."))
        clean_reason = (reason or "").strip()
        if not clean_reason:
            raise ValidationError(_("A rejection reason is required."))
        self.write({
            "state": "rejected",
            "admin_rejection_reason": clean_reason,
            "admin_rejected_at": fields.Datetime.now(),
            "admin_rejected_by_id": self.env.user.id,
        })
        self.message_post(body=_("Design rejected: %s") % clean_reason)
        return True
