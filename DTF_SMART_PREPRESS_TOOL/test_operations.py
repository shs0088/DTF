import os,tempfile,unittest
from PIL import Image
from candidate_manager import CandidateManager
from operations import create_candidate

class TestOperations(unittest.TestCase):
    def test_candidate_operations(self):
        with tempfile.TemporaryDirectory() as d:
            src=os.path.join(d,"src.png")
            Image.new("RGBA",(12,12),(120,80,60,255)).save(src)
            m=CandidateManager(os.path.join(d,"cand"),os.path.join(d,"assets.sqlite3"))
            r=create_candidate(src,"denoise",{},m)
            self.assertTrue(os.path.exists(r["candidate"]["path"]))
            self.assertTrue(os.path.exists(r["manifest"]))
            z=create_candidate(src,"resize",{"width_px":6,"height_px":6},m)
            self.assertEqual(Image.open(z["candidate"]["path"]).size,(6,6))

    def test_unsupported(self):
        with tempfile.TemporaryDirectory() as d:
            src=os.path.join(d,"src.png"); Image.new("RGBA",(4,4),(0,0,0,255)).save(src)
            with self.assertRaises(ValueError): create_candidate(src,"magic",{})

if __name__=="__main__": unittest.main()
