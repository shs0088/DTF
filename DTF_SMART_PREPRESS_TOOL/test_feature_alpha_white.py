import os,tempfile,unittest
from PIL import Image,ImageDraw
from feature_width import analyze_feature_width
from alpha_quality import analyze_alpha_quality
from white_gradient_qa import analyze_white_support
from white_underbase import generate_white_preview

class TestFeatureAlphaWhite(unittest.TestCase):
    def test_feature_width(self):
        with tempfile.TemporaryDirectory() as d:
            p=os.path.join(d,"s.png")
            im=Image.new("RGBA",(40,40),(0,0,0,0)); dr=ImageDraw.Draw(im)
            dr.rectangle((10,5,13,34),fill=(0,0,0,255)); im.save(p)
            r=analyze_feature_width(p,128,300)
            self.assertGreater(r["skeleton_proxy_points"],0)
            self.assertGreater(r["width_px"]["min"],0)

    def test_alpha_and_white_tail(self):
        with tempfile.TemporaryDirectory() as d:
            p=os.path.join(d,"a.png"); w=os.path.join(d,"w.png")
            im=Image.new("RGBA",(20,20),(0,0,0,0))
            for x in range(5,15):
                im.putpixel((x,10),(255,0,0,max(1,(x-4)*20)))
            im.save(p)
            aq=analyze_alpha_quality(p)
            self.assertGreater(aq["semi_transparent_pixels"],0)
            generate_white_preview(p,w,300)
            q=analyze_white_support(p,w)
            self.assertIn("tail_white_support_fraction",q)

if __name__=="__main__": unittest.main()
