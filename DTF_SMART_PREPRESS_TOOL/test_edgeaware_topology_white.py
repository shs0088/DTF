import os,tempfile,unittest
from PIL import Image,ImageDraw
from edge_aware_denoise import guided_denoise_derivative
from topology_guarded_white import topology_guarded_choke_preview

class TestEdgeAwareTopologyWhite(unittest.TestCase):
    def test_guided_filter_preserves_alpha(self):
        with tempfile.TemporaryDirectory() as d:
            src=os.path.join(d,"a.png"); out=os.path.join(d,"o.png")
            Image.new("RGBA",(20,20),(100,120,140,128)).save(src)
            guided_denoise_derivative(src,out,2,0.01)
            self.assertEqual(Image.open(out).getchannel("A").getextrema(),(128,128))

    def test_topology_guard_backs_off_for_tiny_component(self):
        with tempfile.TemporaryDirectory() as d:
            src=os.path.join(d,"a.png"); out=os.path.join(d,"w.png")
            im=Image.new("RGBA",(30,30),(0,0,0,0)); dr=ImageDraw.Draw(im)
            dr.rectangle((5,5,20,20),fill=(0,0,0,255))
            dr.rectangle((25,25,25,25),fill=(0,0,0,255))
            im.save(src)
            r=topology_guarded_choke_preview(src,out,300,0.5)
            self.assertTrue(r["topology_preserved"])
            self.assertLessEqual(r["applied_choke_px"],r["requested_choke_px"])

if __name__=="__main__": unittest.main()
