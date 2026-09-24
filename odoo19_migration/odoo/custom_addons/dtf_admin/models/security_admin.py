from odoo import _, models
from odoo.exceptions import ValidationError


class ResGroupsDTFProtection(models.Model):
    _inherit = "res.groups"

    def _dtf_protected_groups(self):
        groups = self.env["res.groups"]
        for xmlid in (
            "dtf_core.group_dtf_admin",
            "dtf_core.group_dtf_printing_operator",
        ):
            group = self.env.ref(xmlid, raise_if_not_found=False)
            if group:
                groups |= group
        return groups

    def write(self, vals):
        protected = self & self._dtf_protected_groups()
        if protected and {"name", "privilege_id"} & set(vals):
            raise ValidationError(
                _("Protected DTF system groups cannot be renamed or moved to another privilege.")
            )
        return super().write(vals)

    def unlink(self):
        if self & self._dtf_protected_groups():
            raise ValidationError(_("Protected DTF system groups cannot be deleted."))
        return super().unlink()


class ResUsersDTFProtection(models.Model):
    _inherit = "res.users"

    def _dtf_active_admin_count(self):
        admin_group = self.env.ref(
            "dtf_core.group_dtf_admin",
            raise_if_not_found=False,
        )
        if not admin_group:
            return 0
        return self.sudo().search_count([
            ("active", "=", True),
            ("group_ids", "in", admin_group.id),
        ])

    def write(self, vals):
        had_active_admin = self._dtf_active_admin_count() > 0
        result = super().write(vals)
        if had_active_admin and self._dtf_active_admin_count() == 0:
            raise ValidationError(
                _("At least one active DTF Administrator must remain.")
            )
        return result

    def unlink(self):
        had_active_admin = self._dtf_active_admin_count() > 0
        result = super().unlink()
        if had_active_admin and self._dtf_active_admin_count() == 0:
            raise ValidationError(
                _("At least one active DTF Administrator must remain.")
            )
        return result
