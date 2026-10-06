import os,tempfile,time,unittest
from PIL import Image,ImageDraw
from background import border_connected_color_key, alpha_zones
from edge_decontamination import unmatte_known_background
from color_management import inspect_color
from halftone import ordered_bayer_preview
from jobs import BoundedJobQueue

class TestProcessing(unittest.TestCase):
    def test_background_only_border_connected(self):
        with tempfile.TemporaryDirectory() as d:
            src=os.path.join(d,"src.png"); out=os.path.join(d,"out.png")
            im=Image.new("RGB",(20,20),(255,255,255)); dr=ImageDraw.Draw(im)
            dr.rectangle((4,4,15,15),fill=(0,0,0)); dr.rectangle((8,8,11,11),fill=(255,255,255)); im.save(src)
            r=border_connected_color_key(src,out,tolerance=2)
            a=Image.open(out).convert("RGBA")
            self.assertEqual(a.getpixel((0,0))[3],0)
            self.assertEqual(a.getpixel((9,9))[3],255)  # enclosed white survives
            self.assertGreater(r["pixels_removed"],0)
            self.assertGreater(alpha_zones(out)["transparent"],0)

    def test_unmatte_alpha_preserved(self):
        with tempfile.TemporaryDirectory() as d:
            src=os.path.join(d,"src.png"); out=os.path.join(d,"out.png")
            Image.new("RGBA",(5,5),(200,100,100,128)).save(src)
            unmatte_known_background(src,out,(255,255,255))
            self.assertEqual(Image.open(out).getchannel("A").getextrema(),(128,128))

    def test_color_and_halftone(self):
        with tempfile.TemporaryDirectory() as d:
            src=os.path.join(d,"src.png"); out=os.path.join(d,"ht.png")
            Image.new("RGBA",(8,8),(100,120,140,255)).save(src)
            self.assertFalse(inspect_color(src)["embedded_icc"])
            ordered_bayer_preview(src,out)
            self.assertTrue(os.path.exists(out))

    def test_queue(self):
        q=BoundedJobQueue(1)
        jid=q.submit(lambda: 7)
        for _ in range(50):
            s=q.status(jid)
            if s["state"]=="completed": break
            time.sleep(.01)
        self.assertEqual(q.status(jid)["result"],7)

if __name__=="__main__": unittest.main()
