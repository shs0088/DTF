from odoo import fields, models


class DTFDesignAsset(models.Model):
    _inherit = "dtf.design.asset"

    preflight_result_ids = fields.One2many(
        "dtf.preflight.result",
        "asset_id",
        string="Preflight History",
    )
    latest_preflight_result_id = fields.Many2one(
        "dtf.preflight.result",
        compute="_compute_latest_preflight_result",
        string="Latest Preflight Result",
    )

    def _compute_latest_preflight_result(self):
        for asset in self:
            asset.latest_preflight_result_id = asset.preflight_result_ids.sorted(
                key=lambda result: (result.evaluated_at or fields.Datetime.from_string("1970-01-01 00:00:00"), result.id),
                reverse=True,
            )[:1]

    def _recompute_preflight_from_results(self):
        for asset in self:
            latest = asset.preflight_result_ids.sorted(
                key=lambda result: (result.evaluated_at or fields.Datetime.from_string("1970-01-01 00:00:00"), result.id),
                reverse=True,
            )[:1]
            if latest:
                result = latest[0]
                summary = (result.reasons_en or result.reasons_ar or "").strip()
                asset.with_context(dtf_preflight_sync=True).write(
                    {
                        "preflight_state": result.status,
                        "preflight_summary": summary,
                    }
                )
            else:
                asset.with_context(dtf_preflight_sync=True).write(
                    {
                        "preflight_state": "pending",
                        "preflight_summary": False,
                    }
                )

    def write(self, vals):
        if (
            {"preflight_state", "preflight_summary"} & set(vals)
            and not self.env.context.get("dtf_preflight_sync")
            and not self.env.context.get("dtf_preflight_migration")
        ):
            vals = dict(vals)
            vals.pop("preflight_state", None)
            vals.pop("preflight_summary", None)
        return super().write(vals)
