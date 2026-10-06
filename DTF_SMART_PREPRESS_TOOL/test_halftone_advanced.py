import os,tempfile,unittest
from PIL import Image
from halftone import ordered_bayer_preview,error_diffusion_preview

class TestHalftoneAdvanced(unittest.TestCase):
    def test_algorithms(self):
        with tempfile.TemporaryDirectory() as d:
            src=os.path.join(d,"g.png")
            im=Image.new("L",(16,16))
            for y in range(16):
                for x in range(16): im.putpixel((x,y),x*17)
            im.convert("RGBA").save(src)
            for algo in ("floyd-steinberg","atkinson"):
                out=os.path.join(d,algo+".png")
                r=error_diffusion_preview(src,out,algo)
                self.assertEqual(r["family"],"error_diffusion")
                self.assertEqual(Image.open(out).getextrema(),(0,255))
            b=os.path.join(d,"b.png"); ordered_bayer_preview(src,b)
            self.assertTrue(os.path.exists(b))

if __name__=="__main__": unittest.main()
