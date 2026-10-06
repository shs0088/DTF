import os,tempfile,unittest
import numpy as np
from PIL import Image,ImageDraw
from white_underbase import WhitePolicy,generate_white_preview
from morphology import apply_alpha_morphology
from thresholding import threshold_alpha_candidate
from matting import inspect_trimap
from deblur import wiener_deblur_derivative

class TestAdvanced(unittest.TestCase):
    def test_white_binary_requires_cutoff(self):
        with tempfile.TemporaryDirectory() as d:
            src=os.path.join(d,"a.png"); out=os.path.join(d,"w.png")
            Image.new("RGBA",(10,10),(100,100,100,128)).save(src)
            with self.assertRaises(ValueError):
                generate_white_preview(src,out,300,policy=WhitePolicy(gradient_policy="binary"))

    def test_morph_threshold_trimap(self):
        with tempfile.TemporaryDirectory() as d:
            src=os.path.join(d,"a.png"); m=os.path.join(d,"m.png"); t=os.path.join(d,"t.png")
            im=Image.new("RGBA",(20,20),(0,0,0,0)); dr=ImageDraw.Draw(im); dr.rectangle((5,5,14,14),fill=(0,0,0,128)); im.save(src)
            apply_alpha_morphology(src,m,"dilate",0.1,300)
            threshold_alpha_candidate(src,t,"fixed",100)
            self.assertGreater(inspect_trimap(src)["unknown_pixels"],0)
            self.assertEqual(Image.open(t).getchannel("A").getextrema(),(0,255))

    def test_wiener_alpha_preserved(self):
        with tempfile.TemporaryDirectory() as d:
            src=os.path.join(d,"a.png"); out=os.path.join(d,"d.png")
            a=np.zeros((16,16,4),dtype=np.uint8); a[:,:,:3]=100; a[:,:,3]=128
            Image.fromarray(a,"RGBA").save(src)
            wiener_deblur_derivative(src,out,5,1.0,0.05)
            self.assertEqual(Image.open(out).getchannel("A").getextrema(),(128,128))

if __name__=="__main__": unittest.main()
