import unittest
from mockup_placement import validate_print_area_placement

class TestMockupPlacement(unittest.TestCase):
    def test_inside_area(self):
        r=validate_print_area_placement("front",300,400,50,60,200,250)
        self.assertTrue(r["fits_unrotated"])
        self.assertFalse(r["uv_mapping_used"])
        self.assertEqual(r["placement_space"],"dtf_print_area")

    def test_overflow(self):
        r=validate_print_area_placement("front",300,400,200,300,150,150)
        self.assertFalse(r["fits_unrotated"])
        self.assertEqual(r["findings"][0]["code"],"PLACEMENT_OUTSIDE_PRINT_AREA")

if __name__=="__main__": unittest.main()
