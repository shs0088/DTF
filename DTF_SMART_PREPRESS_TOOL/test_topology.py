import os,tempfile,unittest
from PIL import Image,ImageDraw
from topology import analyze_topology
from security import validate_upload
from mockup_derivative import make_mockup_derivative

class TestTopology(unittest.TestCase):
    def test_hole_and_components(self):
        with tempfile.TemporaryDirectory() as d:
            p=os.path.join(d,"ring.png")
            im=Image.new("RGBA",(30,30),(0,0,0,0)); dr=ImageDraw.Draw(im)
            dr.rectangle((5,5,24,24),fill=(0,0,0,255)); dr.rectangle((10,10,19,19),fill=(0,0,0,0)); im.save(p)
            r=analyze_topology(p)
            self.assertEqual(r["component_count"],1); self.assertEqual(r["hole_count"],1)
            self.assertTrue(validate_upload(p)["ok"])
            q=os.path.join(d,"preview.png"); x=make_mockup_derivative(p,q,10)
            self.assertTrue(x["master_unchanged"]); self.assertTrue(os.path.exists(q))

if __name__=="__main__": unittest.main()
