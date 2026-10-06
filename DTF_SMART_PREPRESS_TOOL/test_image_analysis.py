import os, tempfile, unittest
from PIL import Image
from image_analysis import analyze_pixels
from white_underbase import generate_white_preview

class TestImageAnalysis(unittest.TestCase):
    def test_alpha_stats_and_preview(self):
        with tempfile.TemporaryDirectory() as d:
            src=os.path.join(d,"a.png"); out=os.path.join(d,"w.png")
            im=Image.new("RGBA",(10,10),(0,0,0,0))
            for x in range(3,7):
                for y in range(3,7):
                    im.putpixel((x,y),(255,0,0,255))
            im.putpixel((2,4),(255,255,255,10))
            im.save(src)
            r=analyze_pixels(src)
            self.assertGreater(r["transparent_ratio"],0)
            self.assertGreater(r["low_alpha_ratio"],0)
            w=generate_white_preview(src,out,300,choke_mm=0.1)
            self.assertTrue(os.path.exists(out))
            self.assertGreaterEqual(w["choke_px"],1)

if __name__=="__main__":
    unittest.main()
