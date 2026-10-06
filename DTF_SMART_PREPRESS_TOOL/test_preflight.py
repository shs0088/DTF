import unittest
from preflight import ImageFacts, OutputProfile, analyze

class TestPreflight(unittest.TestCase):
    def test_effective_dpi_and_feature_loss(self):
        image=ImageFacts(4800,5400,16,18,True,min_feature_px=8)
        profile=OutputProfile("pilot",choke_mm=0.5)
        report=analyze(image,profile)
        self.assertEqual(report["effective_dpi"]["minimum"],300.0)
        self.assertEqual(report["status"],"FAIL")

    def test_low_alpha_warning(self):
        image=ImageFacts(4800,4800,16,16,True,low_alpha_ratio=0.01)
        report=analyze(image,OutputProfile("pilot"))
        self.assertEqual(report["status"],"WARN")
        self.assertTrue(any(x["code"]=="LOW_ALPHA" for x in report["findings"]))

if __name__ == "__main__":
    unittest.main()
