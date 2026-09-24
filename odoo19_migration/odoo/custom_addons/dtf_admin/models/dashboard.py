from datetime import timedelta

from odoo import _, api, fields, models
from odoo.exceptions import AccessError, ValidationError


class DTFAdminDashboard(models.AbstractModel):
    _name = "dtf.admin.dashboard"
    _description = "DTF Studio Admin Dashboard"

    @api.model
    def _require_admin(self):
        if not (
            self.env.is_superuser()
            or self.env.user.has_group("dtf_core.group_dtf_admin")
        ):
            raise AccessError(_("DTF Administrator permission is required."))

    @api.model
    def _order_domain(self):
        return [
            ("company_id", "=", self.env.company.id),
            ("state", "in", ("sale", "done")),
            ("order_line.dtf_design_id", "!=", False),
        ]

    @api.model
    def _payment_state(self, order):
        invoices = order.invoice_ids.filtered(
            lambda move: move.move_type == "out_invoice" and move.state != "cancel"
        )
        if invoices and all(invoice.payment_state == "paid" for invoice in invoices):
            return "paid"
        states = set(invoices.mapped("payment_state"))
        if "partial" in states or ("paid" in states and len(states) > 1):
            return "partial"
        if "in_payment" in states:
            return "in_payment"
        return "pending"

    @api.model
    def _payment_label(self, state):
        return {
            "paid": _("Paid"),
            "partial": _("Partially Paid"),
            "in_payment": _("In Payment"),
            "pending": _("Payment Pending"),
        }.get(state, state)

    @api.model
    def _order_state_label(self, order):
        selections = dict(order._fields["state"]._description_selection(self.env))
        return selections.get(order.state, order.state)

    @api.model
    def _inventory_attention_domain(self):
        return [
            ("company_id", "=", self.env.company.id),
            ("location_id.usage", "=", "internal"),
            ("product_id.active", "=", True),
            ("product_id.product_tmpl_id.dtf_product_type", "!=", False),
            ("quantity", "<", 0),
        ]

    @api.model
    def _review_domain(self):
        return [
            ("qualification_state", "in", (
                "system_qualified",
                "under_review",
                "replacement_required",
                "escalated",
            ))
        ]

    @api.model
    def _production_domain(self):
        return [
            ("company_id", "=", self.env.company.id),
            ("dtf_is_print_job", "=", True),
            ("dtf_operator_stage", "in", ("new", "under_preparation", "ready")),
        ]

    @api.model
    def _payout_domain(self):
        return [
            ("company_id", "=", self.env.company.id),
            ("state", "=", "requested"),
        ]

    @api.model
    def _product_domain(self):
        return [
            ("active", "=", True),
            ("dtf_product_type", "!=", False),
            "|",
            ("company_id", "=", False),
            ("company_id", "=", self.env.company.id),
        ]

    @api.model
    def _recent_admin_activity(self):
        admin_group = self.env.ref("dtf_core.group_dtf_admin").sudo()
        author_ids = admin_group.all_user_ids.filtered("active").partner_id.ids
        if not author_ids:
            return []
        messages = self.env["mail.message"].sudo().search(
            [
                ("author_id", "in", author_ids),
                ("model", "in", (
                    "dtf.designer.profile",
                    "dtf.design",
                    "dtf.designer.withdrawal",
                    "mrp.production",
                    "sale.order",
                )),
            ],
            order="date desc, id desc",
            limit=8,
        )
        return [
            {
                "id": message.id,
                "date": fields.Datetime.to_string(message.date),
                "actor": message.author_id.display_name or "",
                "subject": message.subject or _("Admin activity"),
                "model": message.model or "",
                "res_id": message.res_id or 0,
                "record_name": message.record_name or "",
            }
            for message in messages
        ]

    @api.model
    def get_dashboard(self):
        self._require_admin()
        company = self.env.company
        orders = self.env["sale.order"].sudo().search(
            self._order_domain(),
            order="date_order desc, id desc",
        )
        payment_by_order = {
            order.id: self._payment_state(order)
            for order in orders
        }
        payment_pending_ids = [
            order.id for order in orders if payment_by_order[order.id] != "paid"
        ]

        production_count = self.env["mrp.production"].sudo().search_count(
            self._production_domain()
        )
        review_count = self.env["dtf.designer.profile"].sudo().search_count(
            self._review_domain()
        )
        product_count = self.env["product.template"].sudo().search_count(
            self._product_domain()
        )
        inventory_attention_count = self.env["stock.quant"].sudo().search_count(
            self._inventory_attention_domain()
        )
        payout_count = self.env["dtf.designer.withdrawal"].sudo().search_count(
            self._payout_domain()
        )

        today = fields.Date.context_today(self)
        days = [today - timedelta(days=offset) for offset in range(6, -1, -1)]
        series = {
            day: {"date": fields.Date.to_string(day), "orders": 0, "sales": 0.0}
            for day in days
        }
        for order in orders:
            if not order.date_order:
                continue
            local_day = fields.Datetime.context_timestamp(self, order.date_order).date()
            if local_day not in series:
                continue
            amount = order.currency_id._convert(
                order.amount_total,
                company.currency_id,
                company,
                order.date_order.date(),
            )
            series[local_day]["orders"] += 1
            series[local_day]["sales"] += amount

        recent_orders = []
        for order in orders[:8]:
            payment_state = payment_by_order[order.id]
            recent_orders.append({
                "id": order.id,
                "name": order.name,
                "customer": order.partner_id.display_name or "",
                "date": fields.Datetime.to_string(order.date_order),
                "amount": order.amount_total,
                "currency": order.currency_id.name,
                "state": order.state,
                "state_label": self._order_state_label(order),
                "payment_state": payment_state,
                "payment_label": self._payment_label(payment_state),
            })

        return {
            "company": {
                "id": company.id,
                "name": company.display_name,
                "currency": company.currency_id.name,
            },
            "kpis": [
                {"key": "orders", "label": _("Total Orders"), "value": len(orders)},
                {"key": "payment_pending", "label": _("Payment Pending"), "value": len(payment_pending_ids)},
                {"key": "production", "label": _("Production Queue"), "value": production_count},
                {"key": "designer_review", "label": _("Designer Review"), "value": review_count},
                {"key": "products", "label": _("Products"), "value": product_count},
                {"key": "inventory", "label": _("Inventory Attention"), "value": inventory_attention_count},
                {"key": "payouts", "label": _("Payout Requests"), "value": payout_count},
            ],
            "series": list(series.values()),
            "recent_orders": recent_orders,
            "recent_activity": self._recent_admin_activity(),
            "texts": {
                "title": _("Dashboard"),
                "subtitle": _("Operational overview"),
                "refresh": _("Refresh"),
                "order_activity": _("Order Activity — Last 7 Days"),
                "orders": _("Orders"),
                "sales": _("Sales"),
                "recent_orders": _("Recent Orders"),
                "recent_activity": _("Recent Admin Activity"),
                "quick_links": _("Quick Links"),
                "no_recent_orders": _("No recent orders."),
                "no_recent_activity": _("No recent Admin activity."),
                "order": _("Order"),
                "customer": _("Customer"),
                "date": _("Date"),
                "total": _("Total"),
                "payment": _("Payment"),
                "status": _("Status"),
                "designers": _("Designers"),
                "production": _("Production"),
                "payouts": _("Payouts"),
                "reports": _("Reports"),
            },
        }

    @api.model
    def get_metric_action(self, metric):
        self._require_admin()
        actions = self.env["ir.actions.actions"]

        if metric == "orders":
            action = actions._for_xml_id("dtf_admin.action_dtf_admin_orders")
            action["domain"] = self._order_domain()
            return action

        if metric == "payment_pending":
            orders = self.env["sale.order"].sudo().search(self._order_domain())
            ids = [
                order.id
                for order in orders
                if self._payment_state(order) != "paid"
            ]
            action = actions._for_xml_id("dtf_admin.action_dtf_admin_orders")
            action["name"] = _("Payment Pending")
            action["domain"] = [("id", "in", ids)]
            return action

        mapping = {
            "production": (
                "dtf_production.action_dtf_print_jobs",
                self._production_domain(),
            ),
            "designer_review": (
                "dtf_admin.action_dtf_admin_qualification_review",
                self._review_domain(),
            ),
            "products": (
                "dtf_admin.action_dtf_admin_products",
                self._product_domain(),
            ),
            "inventory": (
                "dtf_admin.action_dtf_admin_inventory",
                self._inventory_attention_domain(),
            ),
            "payouts": (
                "dtf_finance.action_dtf_finance_withdrawals",
                self._payout_domain(),
            ),
        }
        if metric not in mapping:
            raise ValidationError(_("Unknown dashboard metric."))

        xmlid, domain = mapping[metric]
        action = actions._for_xml_id(xmlid)
        action["domain"] = domain
        return action
