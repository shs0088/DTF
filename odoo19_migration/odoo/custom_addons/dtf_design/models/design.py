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


class DTFDesign(models.Model):
    _name = "dtf.design"
    _description = "DTF Studio Design"
    _inherit = ["mail.thread", "mail.activity.mixin"]
    _order = "create_date desc, id desc"

    designer_id = fields.Many2one(
        "dtf.designer.profile",
        required=True,
        ondelete="restrict",
        index=True,
        tracking=True,
    )
    active = fields.Boolean(default=True)
    state = fields.Selection(
        [
            ("draft", "Draft"),
            ("published", "Published"),
            ("rejected", "Rejected"),
            ("archived", "Archived"),
        ],
        default="draft",
        required=True,
        index=True,
        tracking=True,
    )
    is_qualification_sample = fields.Boolean(
        default=False,
        index=True,
        help="Qualification samples are reviewed internally and cannot be published as storefront designs.",
    )

    title_en = fields.Char(string="English Title", tracking=True)
    title_ar = fields.Char(string="Arabic Title", tracking=True)
    description_en = fields.Text(string="English Description")
    description_ar = fields.Text(string="Arabic Description")

    product_type = fields.Selection(
        PRODUCT_TYPE_SELECTION,
        required=True,
        default="tshirt",
        index=True,
        tracking=True,
    )

    asset_ids = fields.One2many(
        "dtf.design.asset",
        "design_id",
        string="Assets",
    )
    main_display_asset_id = fields.Many2one(
        "dtf.design.asset",
        string="Main Display Image",
        ondelete="set null",
        tracking=True,
    )
    ready_to_print_master_asset_id = fields.Many2one(
        "dtf.design.asset",
        string="Ready-to-Print Master",
        ondelete="set null",
        tracking=True,
        help="This field is never populated automatically. The designer must explicitly select one eligible asset.",
    )

    @api.constrains("main_display_asset_id", "ready_to_print_master_asset_id", "asset_ids", "is_qualification_sample")
    def _check_asset_roles(self):
        for record in self:
            for asset in (record.main_display_asset_id, record.ready_to_print_master_asset_id):
                if asset and asset.design_id != record:
                    raise ValidationError("Selected display/master assets must belong to the same design.")
            if record.main_display_asset_id:
                if not record.main_display_asset_id.previewable:
                    raise ValidationError("The Main Display Image must be previewable.")
                if not (record.main_display_asset_id.mime_type or "").startswith("image/"):
                    raise ValidationError("The Main Display Image must be an image asset.")
            if record.is_qualification_sample and (
                record.main_display_asset_id or record.ready_to_print_master_asset_id
            ):
                raise ValidationError(
                    "Qualification sample designs do not use Main Display Image or Ready-to-Print Master roles."
                )

    def action_set_main_display_asset(self, asset):
        self.ensure_one()
        if self.is_qualification_sample:
            raise ValidationError("Qualification sample designs do not use a Main Display Image.")
        if not asset or asset.design_id != self:
            raise ValidationError("The selected Main Display Image must belong to this design.")
        if not asset.previewable or not (asset.mime_type or "").startswith("image/"):
            raise ValidationError("The selected Main Display Image must be a previewable image.")
        self.main_display_asset_id = asset

    def action_clear_main_display_asset(self):
        self.ensure_one()
        self.main_display_asset_id = False

    def action_set_ready_to_print_master(self, asset):
        self.ensure_one()
        if self.is_qualification_sample:
            raise ValidationError("Qualification sample designs do not use a Ready-to-Print Master.")
        if not asset or asset.design_id != self:
            raise ValidationError("The selected Ready-to-Print Master must belong to this design.")
        if not asset.readable or not asset.analyzable:
            raise ValidationError("The Ready-to-Print Master must be readable and analyzable.")
        self.ready_to_print_master_asset_id = asset

    def action_clear_ready_to_print_master(self):
        self.ensure_one()
        self.ready_to_print_master_asset_id = False

    def _ensure_main_display_asset(self):
        self.ensure_one()
        if self.main_display_asset_id or self.is_qualification_sample:
            return self.main_display_asset_id
        candidates = self.asset_ids.filtered(
            lambda asset: asset.previewable and (asset.mime_type or "").startswith("image/")
        ).sorted(key=lambda asset: (asset.create_date or fields.Datetime.from_string("1970-01-01 00:00:00"), asset.id), reverse=True)
        if candidates:
            self.main_display_asset_id = candidates[0]
        return self.main_display_asset_id

    def action_publish(self):
        for record in self:
            if record.is_qualification_sample:
                raise ValidationError("Qualification sample designs cannot be published.")
            missing = []
            if not (record.title_ar or "").strip():
                missing.append("Arabic Title")
            if not (record.title_en or "").strip():
                missing.append("English Title")
            if not (record.description_ar or "").strip():
                missing.append("Arabic Description")
            if not (record.description_en or "").strip():
                missing.append("English Description")
            if missing:
                raise ValidationError("Missing required bilingual field(s): %s" % ", ".join(missing))
            record._ensure_main_display_asset()
            if not record.main_display_asset_id:
                raise ValidationError("A previewable display image is required before publishing.")
            if not record.ready_to_print_master_asset_id:
                raise ValidationError("Please select the design that will be used for final print.")
            master = record.ready_to_print_master_asset_id
            if not master.readable or not master.analyzable:
                raise ValidationError("The Ready-to-Print Master is not readable/analyzable.")
            if master.preflight_state != "accepted":
                raise ValidationError("The Ready-to-Print Master must pass preflight before publishing.")
            record.state = "published"


class DTFDesignAsset(models.Model):
    _name = "dtf.design.asset"
    _description = "DTF Studio Design Asset"
    _order = "create_date desc, id desc"

    design_id = fields.Many2one(
        "dtf.design",
        required=True,
        ondelete="cascade",
        index=True,
    )
    attachment_id = fields.Many2one(
        "ir.attachment",
        required=True,
        ondelete="restrict",
        index=True,
        help="Binary data is stored by Odoo/filestore through ir.attachment.",
    )
    name = fields.Char(required=True)
    file_format = fields.Char(index=True)
    mime_type = fields.Char(index=True)
    size_bytes = fields.Integer()
    pixel_width = fields.Integer()
    pixel_height = fields.Integer()
    embedded_dpi = fields.Float()
    has_alpha = fields.Boolean()
    previewable = fields.Boolean(default=False, index=True)
    readable = fields.Boolean(default=False, index=True)
    analyzable = fields.Boolean(default=False, index=True)
    preflight_state = fields.Selection(
        [
            ("pending", "Pending"),
            ("accepted", "Accepted"),
            ("rejected", "Rejected"),
        ],
        default="pending",
        required=True,
        index=True,
    )
    preflight_summary = fields.Text()

    is_main_display_image = fields.Boolean(compute="_compute_roles")
    is_ready_to_print_master = fields.Boolean(compute="_compute_roles")

    @api.depends("design_id.main_display_asset_id", "design_id.ready_to_print_master_asset_id")
    def _compute_roles(self):
        for asset in self:
            asset.is_main_display_image = asset.design_id.main_display_asset_id == asset
            asset.is_ready_to_print_master = asset.design_id.ready_to_print_master_asset_id == asset

    @api.constrains("size_bytes", "pixel_width", "pixel_height", "embedded_dpi")
    def _check_non_negative_metadata(self):
        for asset in self:
            if asset.size_bytes < 0 or asset.pixel_width < 0 or asset.pixel_height < 0 or asset.embedded_dpi < 0:
                raise ValidationError("Asset technical metadata cannot contain negative values.")
