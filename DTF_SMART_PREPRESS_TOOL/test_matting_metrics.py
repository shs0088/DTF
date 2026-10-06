import os,tempfile,unittest
from PIL import Image
from matting_metrics import compare_alpha_mattes
from matting_benchmark import benchmark_candidates

class TestMattingMetrics(unittest.TestCase):
    def test_identical_alpha(self):
        with tempfile.TemporaryDirectory() as d:
            a=os.path.join(d,"a.png"); b=os.path.join(d,"b.png")
            Image.new("RGBA",(10,10),(0,0,0,128)).save(a)
            Image.new("RGBA",(10,10),(255,0,0,128)).save(b)
            r=compare_alpha_mattes(a,b)
            self.assertEqual(r["mse"],0.0)
            self.assertEqual(r["sad_mean"],0.0)
            self.assertEqual(r["threshold_iou_mean"],1.0)

    def test_benchmark_orders_better_candidate(self):
        with tempfile.TemporaryDirectory() as d:
            ref=os.path.join(d,"r.png"); good=os.path.join(d,"g.png"); bad=os.path.join(d,"b.png")
            Image.new("RGBA",(8,8),(0,0,0,128)).save(ref)
            Image.new("RGBA",(8,8),(0,0,0,128)).save(good)
            Image.new("RGBA",(8,8),(0,0,0,255)).save(bad)
            r=benchmark_candidates(ref,[("bad",bad),("good",good)])
            self.assertEqual(r["winner"],"good")

if __name__=="__main__": unittest.main()
