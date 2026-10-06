import os,tempfile,unittest
from zipfile import ZipFile
from PIL import Image
from prepress_package import create_prepress_package

class TestPrepressPackage(unittest.TestCase):
    def test_package(self):
        with tempfile.TemporaryDirectory() as d:
            src=os.path.join(d,"a.png"); z=os.path.join(d,"p.zip")
            Image.new("RGBA",(300,300),(10,20,30,255)).save(src)
            r=create_prepress_package(src,z,1,1)
            self.assertTrue(os.path.exists(z))
            self.assertFalse(r["source_embedded"])
            with ZipFile(z) as f:
                names=set(f.namelist())
                self.assertIn("preflight-report.json",names)
                self.assertIn("white-preview.png",names)
                self.assertIn("mockup-preview.png",names)
                self.assertNotIn("a.png",names)

if __name__=="__main__": unittest.main()
