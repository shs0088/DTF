import tempfile,unittest
from self_check import run_self_check

class TestSelfCheck(unittest.TestCase):
    def test_core_self_check(self):
        with tempfile.TemporaryDirectory() as d:
            r=run_self_check(d)
            self.assertIn("core_ready",r)
            self.assertTrue(r["sqlite"]["ok"])
            self.assertIn("optional_ai",r)
            self.assertFalse(r["network_required_for_runtime_ai"])

if __name__=="__main__": unittest.main()
