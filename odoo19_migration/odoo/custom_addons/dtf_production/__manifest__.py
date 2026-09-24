{
    "name": "DTF Studio Production",
    "version": "19.0.3.0.0",
    "summary": "Native Odoo MRP printing jobs and operator workflow for DTF Studio",
    "category": "DTF Studio",
    "license": "LGPL-3",
    "depends": ["dtf_core", "mrp", "stock", "dtf_design", "dtf_preflight", "dtf_sale"],
    "data": [
        "security/ir.model.access.csv",
        "security/production_rules.xml",
        "views/production_views.xml"
    ],
    "installable": True,
    "application": False
}
