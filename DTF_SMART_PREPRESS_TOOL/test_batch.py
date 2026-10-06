import os,tempfile,unittest
from PIL import Image
from batch import analyze_batch

class TestBatch(unittest.TestCase):
    def test_batch_reports_independent_items(self):
        with tempfile.TemporaryDirectory() as d:
            a=os.path.join(d,"a.png"); b=os.path.join(d,"b.jpg")
            Image.new("RGBA",(100,100),(10,20,30,255)).save(a)
            Image.new("RGB",(100,100),(255,255,255)).save(b)
            r=analyze_batch([("a.png",a),("b.jpg",b)],1,1)
            self.assertEqual(r["count"],2)
            self.assertEqual(len(r["items"]),2)
            self.assertEqual(sum(r["summary"].values()),2)

if __name__=="__main__": unittest.main()
