import os,tempfile,unittest,json
from calibration_chart import generate_calibration_chart
from calibration_results import build_profile_from_observations

class TestCalibration(unittest.TestCase):
    def test_chart_and_profile(self):
        with tempfile.TemporaryDirectory() as d:
            png=os.path.join(d,"chart.png"); man=os.path.join(d,"chart.json")
            r=generate_calibration_chart(png,man,dpi=100,width_in=4,height_in=6,
                                         stroke_widths_mm=(0.2,0.4),island_diameters_mm=(0.5,),
                                         hole_diameters_mm=(0.5,),choke_values_mm=(0.0,0.1))
            self.assertTrue(os.path.exists(png)); self.assertTrue(os.path.exists(man))
            base=os.path.join(d,"base.json"); obs=os.path.join(d,"obs.json"); out=os.path.join(d,"out.json")
            open(base,"w").write(json.dumps({"profile_id":"x","white_policy":{"spread_mm":0.0},
                                             "printability_thresholds":{}}))
            open(obs,"w").write(json.dumps({"printer":"p","ink_set":"i","film_media":"f","rip":"r","print_mode":"m",
                                            "min_stable_stroke_mm":0.2,"min_stable_island_diameter_mm":0.5,
                                            "selected_choke_mm":0.1}))
            p=build_profile_from_observations(base,obs,out)
            self.assertEqual(p["white_policy"]["choke_mm"],0.1)
            self.assertGreater(p["printability_thresholds"]["min_island_area_mm2"],0)

if __name__=="__main__": unittest.main()
