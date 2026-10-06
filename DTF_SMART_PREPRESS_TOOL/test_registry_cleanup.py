import os,tempfile,time,unittest
from PIL import Image
from asset_registry import AssetRegistry
from runtime_cleanup import cleanup_runtime
from provenance import sha256_file

class TestRegistryCleanup(unittest.TestCase):
    def test_registry_lineage(self):
        with tempfile.TemporaryDirectory() as d:
            db=os.path.join(d,"assets.sqlite3")
            src=os.path.join(d,"src.png"); der=os.path.join(d,"der.png")
            Image.new("RGBA",(4,4),(1,2,3,255)).save(src)
            Image.new("RGBA",(4,4),(4,5,6,255)).save(der)
            reg=AssetRegistry(db)
            s=reg.register(src,"master")
            reg.register(der,"candidate",s["sha256"],"test",{"x":1})
            line=reg.lineage(s["sha256"])
            self.assertEqual(len(line),2)
            self.assertEqual(line[1]["parent_sha256"],s["sha256"])

    def test_cleanup(self):
        with tempfile.TemporaryDirectory() as d:
            p=os.path.join(d,"old.tmp")
            open(p,"wb").write(b"123")
            os.utime(p,(1,1))
            r=cleanup_runtime(d,1)
            self.assertEqual(r["deleted"],1)
            self.assertFalse(os.path.exists(p))

if __name__=="__main__": unittest.main()
