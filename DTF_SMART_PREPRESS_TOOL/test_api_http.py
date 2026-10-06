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

    def test_batch_analyze(self):
        files=[
          ("files",("a.png",png_bytes(),"image/png")),
          ("files",("b.png",png_bytes(),"image/png"))
        ]
        r=self.client.post("/batch/analyze",files=files,data={"width_in":"1","height_in":"1"})
        self.assertEqual(r.status_code,200,r.text)
        j=r.json()
        self.assertEqual(j["count"],2)
        self.assertEqual(sum(j["summary"].values()),2)

    def test_report_create(self):
        r=self.client.post("/reports/create",
            files={"file":("art.png",png_bytes(),"image/png")},
            data={"width_in":"1","height_in":"1"})
        self.assertEqual(r.status_code,200,r.text)
        j=r.json()
        self.assertIn("download_url",j)
        d=self.client.get(j["download_url"])
        self.assertEqual(d.status_code,200)
        self.assertIn("DTF Smart Prepress Report",d.text)

    def test_opencart_evaluate(self):
        r=self.client.post("/integrations/opencart/evaluate",
            files={"file":("art.png",png_bytes(),"image/png")},
            data={"order_item_id":"42","product_type":"T-Shirt","print_width_in":"1","print_height_in":"1",
                  "print_area_width_in":"2","print_area_height_in":"2","master_selected":"true"})
        self.assertEqual(r.status_code,200,r.text)
        j=r.json()
        self.assertEqual(j["order_item_id"],"42")
        self.assertTrue(j["ready_to_print_eligible"])

    def test_mockup_inspect_2d(self):
        r=self.client.post("/mockups/inspect",
            files={"file":("mockup.png",png_bytes(),"image/png")})
        self.assertEqual(r.status_code,200,r.text)
        j=r.json()
        self.assertFalse(j["actual_3d"])
        self.assertEqual(j["kind"],"2d_image")

    def test_mockup_placement_validate(self):
        r=self.client.post("/mockups/placement/validate",data={
            "print_area_id":"front","area_width_mm":"300","area_height_mm":"400",
            "x_mm":"50","y_mm":"60","width_mm":"200","height_mm":"250","rotation_deg":"0"})
        self.assertEqual(r.status_code,200,r.text)
        j=r.json()
        self.assertTrue(j["fits_unrotated"])
        self.assertFalse(j["uv_mapping_used"])

    def test_matting_benchmark(self):
        ref=png_bytes()
        r=self.client.post("/matting/benchmark",
            files=[
              ("reference",("ref.png",ref,"image/png")),
              ("candidates",("c1.png",ref,"image/png")),
              ("candidates",("c2.png",ref,"image/png"))
            ])
        self.assertEqual(r.status_code,200,r.text)
        j=r.json()
        self.assertEqual(j["count"],2)
        self.assertIn("winner",j)

    def test_calibration_chart(self):
        r=self.client.post("/calibration/chart",data={"dpi":"100","width_in":"4","height_in":"6"})
        self.assertEqual(r.status_code,200,r.text)
        self.assertIn("png_url",r.json())

if __name__=="__main__": unittest.main()
