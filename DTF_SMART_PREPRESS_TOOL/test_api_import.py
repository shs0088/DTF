import unittest
import api

class TestAPIImport(unittest.TestCase):
    def test_routes_exist(self):
        paths={r.path for r in api.app.routes}
        required={"/health","/analyze","/candidates/create","/profiles/validate",
                  "/calibration/chart","/calibration/profile","/masters/accept","/packages/create","/batch/analyze","/jobs"}
        self.assertTrue(required.issubset(paths))

    def test_runtime_security_defaults(self):
        self.assertGreater(api.settings.max_upload_bytes,0)
        self.assertGreaterEqual(api.settings.max_workers,1)

if __name__=="__main__": unittest.main()
