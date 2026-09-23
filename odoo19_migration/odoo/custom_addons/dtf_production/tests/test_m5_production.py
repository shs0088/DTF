from odoo.exceptions import ValidationError
from odoo.tests.common import TransactionCase


class TestDTFM5Production(TransactionCase):
    def test_handoff_requires_confirmed_checkout_and_snapshots(self):
        self.assertTrue(hasattr(self.env["dtf.production.handoff"], "create_from_line"))
        self.assertTrue(hasattr(self.env["sale.order.line"], "dtf_preflight_snapshot"))
        self.assertTrue(hasattr(self.env["sale.order.line"], "dtf_master_asset_id"))
