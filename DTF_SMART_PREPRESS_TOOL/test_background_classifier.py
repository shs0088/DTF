import os,tempfile,unittest
from PIL import Image,ImageDraw
from background_classifier import classify_background

class TestBackgroundClassifier(unittest.TestCase):
    def test_uniform_border_prefers_key(self):
        with tempfile.TemporaryDirectory() as d:
            p=os.path.join(d,"a.jpg")
            im=Image.new("RGB",(30,30),(255,255,255)); ImageDraw.Draw(im).rectangle((8,8,21,21),fill=(0,0,0)); im.save(p)
            r=classify_background(p)
            self.assertEqual(r["recommended_mode"],"border_connected_color_key_candidate")

    def test_existing_alpha_preferred(self):
        with tempfile.TemporaryDirectory() as d:
            p=os.path.join(d,"a.png")
            im=Image.new("RGBA",(20,20),(0,0,0,0)); ImageDraw.Draw(im).rectangle((5,5,14,14),fill=(255,0,0,255)); im.save(p)
            r=classify_background(p)
            self.assertEqual(r["recommended_mode"],"existing_alpha")

if __name__=="__main__": unittest.main()
