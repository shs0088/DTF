from odoo import api, fields, models
from odoo.exceptions import ValidationError


PRODUCT_TYPE_SELECTION = [
    ("tshirt", "T-Shirt"),
    ("mug", "Mug"),
    ("cap", "Cap"),
    ("tshirt_mug", "T-Shirt + Mug"),
    ("tshirt_cap", "T-Shirt + Cap"),
    ("mug_cap", "Mug + Cap"),
    ("tshirt_mug_cap", "T-Shirt + Mug + Cap"),
]


class DTFPreflightRuleVersion(models.Model):
    _name = "dtf.preflight.rule.version"
    _description = "DTF Studio Preflight Rule Version"
    _order = "create_date desc, id desc"

    name = fields.Char(required=True)
    version = fields.Char(required=True, index=True)
    active = fields.Boolean(default=True, index=True)
    product_type = fields.Selection(
        PRODUCT_TYPE_SELECTION,
        required=True,
        index=True,
    )
    min_effective_dpi = fields.Integer(default=300, required=True)
    min_width_cm = fields.Float()
    min_height_cm = fields.Float()
    max_width_cm = fields.Float()
    max_height_cm = fields.Float()
    allowed_formats = fields.Json(default=list)
    require_previewable = fields.Boolean(default=True)
    require_transparency = fields.Boolean(default=False)
    max_scale_factor = fields.Float(default=1.0)
    notes = fields.Text()

    _sql_constraints = [
        (
            "dtf_preflight_rule_version_unique",
            "unique(version, product_type)",
            "A preflight rule version must be unique per product type.",
        ),
    ]

    @api.constrains(
        "min_effective_dpi",
        "min_width_cm",
        "min_height_cm",
        "max_width_cm",
        "max_height_cm",
        "max_scale_factor",
    )
    def _check_positive_limits(self):
        for record in self:
            if record.min_effective_dpi <= 0:
                raise ValidationError("Minimum effective DPI must be greater than zero.")
            for value in (
                record.min_width_cm,
                record.min_height_cm,
                record.max_width_cm,
                record.max_height_cm,
                record.max_scale_factor,
            ):
                if value < 0:
                    raise ValidationError("Preflight numeric limits cannot be negative.")
            if (
                record.max_width_cm
                and record.min_width_cm
                and record.max_width_cm < record.min_width_cm
            ):
                raise ValidationError("Maximum width cannot be less than minimum width.")
            if (
                record.max_height_cm
                and record.min_height_cm
                and record.max_height_cm < record.min_height_cm
            ):
                raise ValidationError("Maximum height cannot be less than minimum height.")


class DTFPreflightResult(models.Model):
    _name = "dtf.preflight.result"
    _description = "DTF Studio Preflight Result"
    _order = "evaluated_at desc, id desc"

    asset_id = fields.Many2one(
        "dtf.design.asset",
        required=True,
        ondelete="cascade",
        index=True,
    )
    rule_version_id = fields.Many2one(
        "dtf.preflight.rule.version",
        required=True,
        ondelete="restrict",
        index=True,
    )
    status = fields.Selection(
        [
            ("pending", "Pending"),
            ("accepted", "Accepted"),
            ("rejected", "Rejected"),
        ],
        default="pending",
        required=True,
        index=True,
    )
    reasons_en = fields.Text()
    reasons_ar = fields.Text()
    analyzer_snapshot = fields.Json(default=dict)
    evaluated_at = fields.Datetime(default=fields.Datetime.now, required=True, index=True)
    locked = fields.Boolean(
        default=False,
        help="Locked results are immutable historical evidence unless an explicit controlled migration context is used.",
    )

    @api.model_create_multi
    def create(self, vals_list):
        records = super().create(vals_list)
        records._sync_asset_state()
        return records

    def write(self, vals):
        if any(record.locked for record in self) and not self.env.context.get("dtf_allow_locked_write"):
            raise ValidationError("Locked preflight results are immutable.")
        result = super().write(vals)
        if {"status", "reasons_en", "reasons_ar", "analyzer_snapshot", "locked"} & set(vals):
            self._sync_asset_state()
        return result

    def unlink(self):
        if any(record.locked for record in self) and not self.env.context.get("dtf_allow_locked_write"):
            raise ValidationError("Locked preflight results cannot be deleted.")
        assets = self.mapped("asset_id")
        result = super().unlink()
        assets._recompute_preflight_from_results()
        return result

    def _sync_asset_state(self):
        for asset in self.mapped("asset_id"):
            asset._recompute_preflight_from_results()

    @api.constrains("status", "reasons_en", "reasons_ar")
    def _check_rejection_reason(self):
        for record in self:
            if record.status == "rejected" and not (
                (record.reasons_en or "").strip() or (record.reasons_ar or "").strip()
            ):
                raise ValidationError("A rejected preflight result requires at least one rejection reason.")
