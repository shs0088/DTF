{
    "name": "DTF Studio Admin",
    "version": "19.0.2.0.0",
    "summary": "Native Odoo administration shell for DTF Studio",
    "category": "DTF Studio",
    "license": "LGPL-3",
    "depends": [
        "dtf_core",
        "dtf_designer",
        "dtf_design",
        "dtf_preflight",
        "dtf_sale",
        "dtf_production",
        "dtf_finance",
        "dtf_printify",
        "dtf_notifications",
        "dtf_backend_theme",
    ],
    "data": [
        "views/admin_views.xml",
    ],
    "installable": True,
    "application": True,
}
