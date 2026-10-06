import os,tempfile,unittest,json,struct
from PIL import Image
from mockup_asset import inspect_mockup_asset,GLB_MAGIC,JSON_CHUNK

class TestMockupAsset(unittest.TestCase):
    def test_image_is_2d(self):
        with tempfile.TemporaryDirectory() as d:
            p=os.path.join(d,"m.png"); Image.new("RGB",(4,4),(0,0,0)).save(p)
            r=inspect_mockup_asset(p)
            self.assertFalse(r["actual_3d"]); self.assertEqual(r["kind"],"2d_image")

    def test_gltf_mesh_is_actual_3d(self):
        with tempfile.TemporaryDirectory() as d:
            p=os.path.join(d,"m.gltf")
            open(p,"w",encoding="utf-8").write(json.dumps({"asset":{"version":"2.0"},"meshes":[{"primitives":[]}]}))
            self.assertTrue(inspect_mockup_asset(p)["actual_3d"])

    def test_glb_structure(self):
        with tempfile.TemporaryDirectory() as d:
            p=os.path.join(d,"m.glb")
            js=json.dumps({"asset":{"version":"2.0"},"meshes":[{"primitives":[]}]}).encode()
            pad=(-len(js))%4; js+=b" "*pad
            total=12+8+len(js)
            raw=struct.pack("<III",GLB_MAGIC,2,total)+struct.pack("<II",len(js),JSON_CHUNK)+js
            open(p,"wb").write(raw)
            self.assertTrue(inspect_mockup_asset(p)["actual_3d"])

    def test_obj_geometry(self):
        with tempfile.TemporaryDirectory() as d:
            p=os.path.join(d,"m.obj")
            open(p,"w").write("v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n")
            self.assertTrue(inspect_mockup_asset(p)["actual_3d"])

if __name__=="__main__": unittest.main()
