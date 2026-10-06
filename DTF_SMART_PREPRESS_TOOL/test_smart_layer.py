import os,tempfile,unittest
from PIL import Image
from recommendations import build_recommendations
from candidate_manager import CandidateManager

class TestSmartLayer(unittest.TestCase):
    def test_recommendations(self):
        report={"findings":[{"code":"NO_ALPHA"},{"code":"EFFECTIVE_DPI_BELOW_PROFILE"}],
                "pixel_analysis":{"semi_transparent_ratio":0},"edge_quality":{},"geometry":{}}
        actions={x["action"] for x in build_recommendations(report)}
        self.assertIn("background_candidate",actions)
        self.assertIn("upscale_candidate",actions)

    def test_candidate_lineage(self):
        with tempfile.TemporaryDirectory() as d:
            src=os.path.join(d,"src.png"); cand=os.path.join(d,"cand.png")
            Image.new("RGBA",(5,5),(100,100,100,255)).save(src)
            Image.new("RGBA",(5,5),(101,100,100,255)).save(cand)
            m=CandidateManager(os.path.join(d,"work"),os.path.join(d,"assets.sqlite3"))
            r=m.register_candidate(src,cand,"unit_test",{"a":1})
            self.assertTrue(os.path.exists(r["manifest"]))
            self.assertEqual(r["candidate"]["parent_sha256"],__import__("provenance").sha256_file(src))

if __name__=="__main__": unittest.main()
