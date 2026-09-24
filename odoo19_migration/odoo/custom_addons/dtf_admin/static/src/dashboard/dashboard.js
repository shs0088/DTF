/** @odoo-module **/

import { Component, onWillStart, useState } from "@odoo/owl";
import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { standardActionServiceProps } from "@web/webclient/actions/action_service";

export class DTFAdminDashboard extends Component {
    static template = "dtf_admin.Dashboard";
    static props = { ...standardActionServiceProps };

    setup() {
        this.orm = useService("orm");
        this.action = useService("action");
        this.state = useState({ loading: true, data: null, error: null });
        onWillStart(() => this.load());
    }

    async load() {
        this.state.loading = true;
        this.state.error = null;
        try {
            this.state.data = await this.orm.call("dtf.admin.dashboard", "get_dashboard", []);
        } catch (error) {
            this.state.error = error?.message || _t("Unable to load dashboard");
        } finally {
            this.state.loading = false;
        }
    }

    async openMetric(key) {
        const action = await this.orm.call("dtf.admin.dashboard", "get_metric_action", [key]);
        return this.action.doAction(action);
    }

    openAction(xmlid) {
        return this.action.doAction(xmlid);
    }

    openOrder(orderId) {
        return this.action.doAction({
            type: "ir.actions.act_window",
            name: this.state.data?.texts?.order || _t("Order"),
            res_model: "sale.order",
            res_id: orderId,
            views: [[false, "form"]],
            target: "current",
        });
    }

    formatMoney(amount, currency) {
        try {
            return new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: currency || this.state.data?.company?.currency || "JOD",
            }).format(amount || 0);
        } catch {
            return Number(amount || 0).toFixed(2) + " " + (currency || "");
        }
    }

    formatDate(value) {
        if (!value) return "";
        const normalized = value.includes("T") ? value : value.replace(" ", "T") + "Z";
        const parsed = new Date(normalized);
        return Number.isNaN(parsed.getTime())
            ? value
            : parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    }

    shortDate(value) {
        if (!value) return "";
        const parsed = new Date(value + "T00:00:00");
        return Number.isNaN(parsed.getTime())
            ? value
            : parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }

    barHeight(point) {
        const points = this.state.data?.series || [];
        const maxOrders = Math.max(1, ...points.map(item => item.orders || 0));
        const percentage = Math.max(5, Math.round(((point.orders || 0) / maxOrders) * 100));
        return "height: " + percentage + "%";
    }

    paymentClass(state) {
        if (state === "paid") return "text-bg-success";
        if (state === "partial" || state === "in_payment") return "text-bg-warning";
        return "text-bg-secondary";
    }

    get retryText() {
        return _t("Retry");
    }
}

registry.category("actions").add("dtf_admin.dashboard", DTFAdminDashboard);
