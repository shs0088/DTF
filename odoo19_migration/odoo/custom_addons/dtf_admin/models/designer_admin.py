from odoo import _, models
from odoo.exceptions import AccessError


class DTFDesignerProfileAdmin(models.Model):
    _inherit = "dtf.designer.profile"

    def _dtf_admin_require_admin(self):
        if not (
            self.env.is_superuser()
            or self.env.user.has_group("dtf_core.group_dtf_admin")
        ):
            raise AccessError(_("DTF Administrator permission is required."))

    def action_open_qualification_reject_wizard(self):
        self.ensure_one()
        self._dtf_admin_require_admin()
        return {
            "type": "ir.actions.act_window",
            "name": _("Reject Qualification"),
            "res_model": "dtf.admin.qualification.reject.wizard",
            "view_mode": "form",
            "target": "new",
            "context": {"default_profile_id": self.id},
        }
