{
    "name": "DTF Studio Finance",
    "version": "19.0.2.0.0",
    "summary": "Designer earnings, balances, withdrawals, and finance administration",
    "category": "DTF Studio",
    "license": "LGPL-3",
    "depends": [
        "dtf_core",
        "dtf_designer",
        "dtf_design",
        "dtf_preflight",
        "dtf_sale",
        "account"
    ],
    "data": [
        "security/ir.model.access.csv",
        "security/finance_rules.xml",
        "data/finance_cron.xml",
        "views/finance_views.xml"
    ],
    "installable": True,
    "application": False
}
