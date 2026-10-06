import io,unittest
from PIL import Image
from fastapi.testclient import TestClient
import api

def png_bytes():
    b=io.BytesIO()
    Image.new("RGBA",(20,20),(100,120,140,255)).save(b,"PNG")
    return b.getvalue()

class TestAPIHTTP(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client=TestClient(api.app)

    def test_health(self):
        r=self.client.get("/health")
        self.assertEqual(r.status_code,200)
        self.assertTrue(r.json()["ok"])

    def test_analyze_upload(self):
        r=self.client.post("/analyze",
            files={"file":("art.png",png_bytes(),"image/png")},
            data={"width_in":"1","height_in":"1","choke_mm":"0","spread_mm":"0"})
        self.assertEqual(r.status_code,200,r.text)
        j=r.json()
        self.assertIn("effective_dpi",j)
        self.assertIn("master_gate",j)
        self.assertIn("recommendations",j)

    def test_candidate_create(self):
        r=self.client.post("/candidates/create",
            files={"file":("art.png",png_bytes(),"image/png")},
            data={"operation":"denoise","params_json":"{}"})
        self.assertEqual(r.status_code,200,r.text)
        j=r.json()
        self.assertIn("download_url",j)
        d=self.client.get(j["download_url"])
        self.assertEqual(d.status_code,200)
        self.assertGreater(len(d.content),0)

    def test_calibration_chart(self):
        r=self.client.post("/calibration/chart",data={"dpi":"100","width_in":"4","height_in":"6"})
        self.assertEqual(r.status_code,200,r.text)
        self.assertIn("png_url",r.json())

if __name__=="__main__": unittest.main()
