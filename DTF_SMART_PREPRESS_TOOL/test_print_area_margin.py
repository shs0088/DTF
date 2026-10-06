import unittest
from print_area import evaluate_print_area
from canvas_margin import evaluate_canvas_margin

class TestPrintAreaMargin(unittest.TestCase):
    def test_overflow_and_rotation(self):
        r=evaluate_print_area(12,10,10,12,True)
        self.assertTrue(r["fits_if_rotated"])
        x=evaluate_print_area(15,16,14,14,True)
        self.assertFalse(x["fits"])
        self.assertEqual(x["findings"][0]["code"],"PRINT_AREA_OVERFLOW")

    def test_margin(self):
        px={"content_bbox":(10,20,90,80),"width_px":100,"height_px":100}
        r=evaluate_canvas_margin(px,100,2.0)
        self.assertTrue(r["available"])
        self.assertGreater(r["minimum_margin_mm"],2.0)

if __name__=="__main__": unittest.main()
