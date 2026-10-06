import os,tempfile,unittest
import numpy as np
from PIL import Image
from image_ops import extend_hidden_rgb, resize_rgba_premultiplied_linear, denoise_derivative, sharpen_derivative

class TestImageOps(unittest.TestCase):
    def test_alpha_preserved_hidden_rgb(self):
        with tempfile.TemporaryDirectory() as d:
            src=os.path.join(d,"src.png"); out=os.path.join(d,"bleed.png")
            a=np.zeros((8,8,4),dtype=np.uint8); a[3:5,3:5,:3]=[255,0,0]; a[3:5,3:5,3]=255
            Image.fromarray(a,"RGBA").save(src)
            before=np.asarray(Image.open(src))[:,:,3].copy()
            r=extend_hidden_rgb(src,out,2)
            after=np.asarray(Image.open(out))[:,:,3]
            self.assertTrue(np.array_equal(before,after)); self.assertGreater(r["filled_transparent_rgb_pixels"],0)

    def test_resize_and_filters_are_derivatives(self):
        with tempfile.TemporaryDirectory() as d:
            src=os.path.join(d,"src.png"); Image.new("RGBA",(20,20),(100,120,140,128)).save(src)
            r=os.path.join(d,"r.png"); resize_rgba_premultiplied_linear(src,r,(10,10))
            self.assertEqual(Image.open(r).size,(10,10))
            n=os.path.join(d,"n.png"); s=os.path.join(d,"s.png")
            denoise_derivative(src,n); sharpen_derivative(src,s)
            self.assertEqual(Image.open(n).getchannel("A").getextrema(),(128,128))
            self.assertEqual(Image.open(s).getchannel("A").getextrema(),(128,128))

if __name__=="__main__": unittest.main()
