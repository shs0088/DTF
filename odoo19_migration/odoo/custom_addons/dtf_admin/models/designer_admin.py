from odoo import _, fields, models
from odoo.exceptions import AccessError


class DTFDesignerProfileAdmin(models.Model):
    _inherit = "dtf.designer.profile"

    def _dtf_admin_require_admin(self):
        if not (
            self.env.is_superuser()
            or self.env.user.has_group("dtf_core.group_dtf_admin")
        ):
            raise AccessError(_("DTF Administrator permission is required."))

    def _dtf_notify_designer(self, body):
        self.ensure_one()
        partner_ids = self.partner_id.ids
        self.message_post(body=body, partner_ids=partner_ids)

    def _dtf_finish_activity(self, activity_xmlid, user_id=None, feedback=None):
        self.ensure_one()
        self.activity_feedback(
            [activity_xmlid],
            user_id=user_id,
            feedback=feedback,
            only_automated=False,
        )

    def action_start_admin_review(self):
        self.ensure_one()
        self._dtf_admin_require_admin()
        result = super().action_start_admin_review()

        activity_type = self.env.ref(
            "dtf_notifications.mail_activity_type_dtf_admin_review"
        )
        existing = self.activity_ids.filtered(
            lambda activity:
                activity.activity_type_id == activity_type
                and activity.user_id == self.env.user
        )
        if not existing:
            deadline = (
                fields.Date.to_date(self.review_deadline)
                if self.review_deadline
                else fields.Date.context_today(self)
            )
            self.activity_schedule(
                "dtf_notifications.mail_activity_type_dtf_admin_review",
                date_deadline=deadline,
                summary=_("Review designer qualification"),
                user_id=self.env.user.id,
            )

        self._dtf_notify_designer(
            _("Your designer qualification is under Admin review.")
        )
        return result

    def action_authorize(self):
        self.ensure_one()
        self._dtf_admin_require_admin()
        result = super().action_authorize()
        self._dtf_finish_activity(
            "dtf_notifications.mail_activity_type_dtf_admin_review",
            user_id=self.env.user.id,
            feedback=_("Designer qualification authorized."),
        )
        if self.user_id:
            self._dtf_finish_activity(
                "dtf_notifications.mail_activity_type_dtf_designer_replacement",
                user_id=self.user_id.id,
                feedback=_("Qualification approved; replacement is no longer required."),
            )
        self._dtf_notify_designer(_("Your designer qualification has been authorized."))
        return result

    def _dtf_admin_after_qualification_rejection(self, reason):
        self.ensure_one()
        self._dtf_admin_require_admin()
        clean_reason = (reason or "").strip()

        self._dtf_finish_activity(
            "dtf_notifications.mail_activity_type_dtf_admin_review",
            user_id=self.env.user.id,
            feedback=_("Qualification rejected: %s") % clean_reason,
        )

        if self.qualification_state == "replacement_required":
            if self.user_id:
                replacement_type = self.env.ref(
                    "dtf_notifications.mail_activity_type_dtf_designer_replacement"
                )
                existing = self.activity_ids.filtered(
                    lambda activity:
                        activity.activity_type_id == replacement_type
                        and activity.user_id == self.user_id
                )
                if not existing:
                    deadline = (
                        fields.Date.to_date(self.replacement_deadline)
                        if self.replacement_deadline
                        else fields.Date.context_today(self)
                    )
                    self.activity_schedule(
                        "dtf_notifications.mail_activity_type_dtf_designer_replacement",
                        date_deadline=deadline,
                        summary=_("Replace rejected qualification designs"),
                        note=clean_reason,
                        user_id=self.user_id.id,
                    )
            self._dtf_notify_designer(
                _("Qualification requires replacement designs. Reason: %s")
                % clean_reason
            )
        elif self.qualification_state == "escalated":
            if self.user_id:
                self._dtf_finish_activity(
                    "dtf_notifications.mail_activity_type_dtf_designer_replacement",
                    user_id=self.user_id.id,
                    feedback=_("Second rejection escalated to Admin."),
                )
            escalation_type = self.env.ref(
                "dtf_notifications.mail_activity_type_dtf_qualification_escalation"
            )
            existing = self.activity_ids.filtered(
                lambda activity:
                    activity.activity_type_id == escalation_type
                    and activity.user_id == self.env.user
            )
            if not existing:
                self.activity_schedule(
                    "dtf_notifications.mail_activity_type_dtf_qualification_escalation",
                    date_deadline=fields.Date.context_today(self),
                    summary=_("Escalated designer qualification"),
                    note=clean_reason,
                    user_id=self.env.user.id,
                )
            self._dtf_notify_designer(
                _("Qualification was rejected again and escalated for Admin handling. Reason: %s")
                % clean_reason
            )
        return True

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
