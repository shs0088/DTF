import os,tempfile,unittest,json
from PIL import Image
from profile_loader import validate_output_profile,profile_fingerprint,load_output_profile
from raster_quality import analyze_raster_quality

class TestProfileRaster(unittest.TestCase):
    def test_profile_validation(self):
        p={"profile_id":"x","white_policy":{"choke_mm":0.1,"spread_mm":0.0},
           "printability_thresholds":{"min_stroke_mm":0.2}}
        v=validate_output_profile(p)
        self.assertTrue(v["valid"])
        self.assertEqual(len(profile_fingerprint(p)),64)
        bad={"profile_id":"x","white_policy":{"choke_mm":-1}}
        self.assertFalse(validate_output_profile(bad)["valid"])

    def test_load_rejects_bad_profile(self):
        with tempfile.TemporaryDirectory() as d:
            p=os.path.join(d,"p.json")
            with open(p,"w",encoding="utf-8") as f:
                json.dump({"profile_id":"x","white_policy":{"spread_mm":-1}},f)
            with self.assertRaises(ValueError): load_output_profile(p)

    def test_raster_quality(self):
        with tempfile.TemporaryDirectory() as d:
            p=os.path.join(d,"a.png")
            im=Image.new("L",(32,32))
            for y in range(32):
                for x in range(32): im.putpixel((x,y),255 if (x+y)%2 else 0)
            im.convert("RGBA").save(p)
            r=analyze_raster_quality(p)
            self.assertIn("laplacian_variance",r)
            self.assertIn("block_boundary_ratio",r)

if __name__=="__main__": unittest.main()
