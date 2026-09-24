from odoo import _, fields, models
from odoo.exceptions import ValidationError


class DTFQualificationRejectWizard(models.TransientModel):
    _name = "dtf.admin.qualification.reject.wizard"
    _description = "DTF Qualification Rejection"

    profile_id = fields.Many2one(
        "dtf.designer.profile",
        required=True,
        readonly=True,
        ondelete="cascade",
    )
    reason = fields.Text(string="Rejection Reason", required=True)

    def action_confirm(self):
        self.ensure_one()
        if self.profile_id.qualification_state not in (
            "system_qualified",
            "under_review",
        ):
            raise ValidationError(
                _("Only a qualification currently awaiting Admin review can be rejected.")
            )
        self.profile_id.action_reject(self.reason)
        self.profile_id._dtf_admin_after_qualification_rejection(self.reason)
        return {"type": "ir.actions.act_window_close"}


class DTFDesignRejectWizard(models.TransientModel):
    _name = "dtf.admin.design.reject.wizard"
    _description = "DTF Design Rejection"

    design_id = fields.Many2one(
        "dtf.design",
        required=True,
        readonly=True,
        ondelete="cascade",
    )
    reason = fields.Text(string="Rejection Reason", required=True)

    def action_confirm(self):
        self.ensure_one()
        self.design_id.action_admin_reject(self.reason)
        return {"type": "ir.actions.act_window_close"}
