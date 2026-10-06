import os,tempfile,unittest
from PIL import Image
from matting import rembg_candidate
from upscale_local_ai import realesrgan_ncnn_candidate

class TestOfflineAI(unittest.TestCase):
    def test_matting_refuses_missing_model(self):
        with tempfile.TemporaryDirectory() as d:
            src=os.path.join(d,"a.png"); out=os.path.join(d,"o.png")
            Image.new("RGBA",(4,4),(0,0,0,255)).save(src)
            with self.assertRaises(FileNotFoundError):
                rembg_candidate(src,out,"u2net",os.path.join(d,"models"))

    def test_upscale_refuses_missing_executable(self):
        with tempfile.TemporaryDirectory() as d:
            src=os.path.join(d,"a.png"); out=os.path.join(d,"o.png")
            Image.new("RGBA",(4,4),(0,0,0,255)).save(src)
            with self.assertRaises(FileNotFoundError):
                realesrgan_ncnn_candidate(src,out,os.path.join(d,"missing.exe"))

if __name__=="__main__": unittest.main()
