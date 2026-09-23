from datetime import timedelta

from odoo import api, fields, models
from odoo.exceptions import AccessError, ValidationError


class DTFDesignerProfile(models.Model):
    _name = "dtf.designer.profile"
    _description = "DTF Studio Designer Profile"
    _inherit = ["mail.thread", "mail.activity.mixin"]
    _order = "create_date desc, id desc"

    partner_id = fields.Many2one(
        "res.partner",
        required=True,
        ondelete="restrict",
        index=True,
        tracking=True,
    )
    user_id = fields.Many2one(
        "res.users",
        ondelete="set null",
        index=True,
        tracking=True,
        help="Optional login user linked to this designer profile.",
    )
    active = fields.Boolean(default=True, tracking=True)
    qualification_state = fields.Selection(
        [
            ("draft", "Draft"),
            ("system_qualified", "System Qualified"),
            ("under_review", "Under Admin Review"),
            ("replacement_required", "Replacement Required"),
            ("escalated", "Escalated"),
            ("authorized", "Authorized"),
            ("rejected", "Rejected"),
        ],
        default="draft",
        required=True,
        index=True,
        tracking=True,
    )
    authorized = fields.Boolean(
        default=False,
        readonly=True,
        tracking=True,
        help="Only a DTF Administrator can grant the official Authorized state.",
    )
    application_date = fields.Datetime(readonly=True, tracking=True)
    review_deadline = fields.Datetime(readonly=True, tracking=True)
    rejection_count = fields.Integer(default=0, readonly=True)
    last_rejection_reason = fields.Text(readonly=True)
    replacement_deadline = fields.Datetime(readonly=True)

    _sql_constraints = [
        (
            "dtf_designer_partner_unique",
            "unique(partner_id)",
            "A contact can have only one DTF Studio designer profile.",
        ),
        (
            "dtf_designer_user_unique",
            "unique(user_id)",
            "A login user can be linked to only one DTF Studio designer profile.",
        ),
    ]

    @api.constrains("user_id", "partner_id")
    def _check_user_partner(self):
        for record in self:
            if record.user_id and record.user_id.partner_id != record.partner_id:
                raise ValidationError(
                    "The designer login user must belong to the same contact as the designer profile."
                )

    def _require_dtf_admin(self):
        if not self.env.user.has_group("dtf_core.group_dtf_admin"):
            raise AccessError("DTF Administrator permission is required.")

    def action_mark_system_qualified(self):
        self.ensure_one()
        if self.qualification_state not in ("draft", "replacement_required"):
            raise ValidationError("This designer cannot enter system-qualified state from the current state.")
        now = fields.Datetime.now()
        self.write(
            {
                "qualification_state": "system_qualified",
                "application_date": now,
                "review_deadline": now + timedelta(days=5),
            }
        )

    def action_start_admin_review(self):
        self.ensure_one()
        self._require_dtf_admin()
        if self.qualification_state not in ("system_qualified", "under_review"):
            raise ValidationError("Only a system-qualified designer can enter admin review.")
        self.qualification_state = "under_review"

    def action_authorize(self):
        self.ensure_one()
        self._require_dtf_admin()
        self.write({"authorized": True, "qualification_state": "authorized"})

    def action_reject(self, reason):
        self.ensure_one()
        self._require_dtf_admin()
        reason = (reason or "").strip()
        if not reason:
            raise ValidationError("A rejection reason is required.")
        count = self.rejection_count + 1
        values = {
            "authorized": False,
            "rejection_count": count,
            "last_rejection_reason": reason,
        }
        if count == 1:
            values.update(
                {
                    "qualification_state": "replacement_required",
                    "replacement_deadline": fields.Datetime.now() + timedelta(days=5),
                }
            )
        else:
            values.update(
                {
                    "qualification_state": "escalated",
                    "replacement_deadline": False,
                }
            )
        self.write(values)
