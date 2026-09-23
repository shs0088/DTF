from odoo import fields, models
from odoo.exceptions import ValidationError


class DTFDesignerProfile(models.Model):
    _inherit = "dtf.designer.profile"

    qualification_design_ids = fields.Many2many(
        "dtf.design",
        "dtf_designer_qualification_design_rel",
        "designer_id",
        "design_id",
        string="Qualification Designs",
        domain="[('designer_id', '=', id), ('is_qualification_sample', '=', True)]",
        help="Exactly three qualification designs are required when the designer submits qualification.",
    )

    def action_submit_qualification(self):
        self.ensure_one()
        designs = self.qualification_design_ids
        if len(designs) != 3:
            raise ValidationError("Exactly 3 qualification designs are required.")
        if any(design.designer_id != self for design in designs):
            raise ValidationError("All qualification designs must belong to the same designer.")
        if any(not design.is_qualification_sample for design in designs):
            raise ValidationError("Qualification submission may contain only qualification sample designs.")
        if any(not design.asset_ids for design in designs):
            raise ValidationError("Each qualification design must contain at least one uploaded asset.")
        self.action_mark_system_qualified()
