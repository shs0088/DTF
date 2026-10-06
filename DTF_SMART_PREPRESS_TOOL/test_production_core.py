import os,tempfile,time,unittest,json
from PIL import Image
from jobs import PersistentJobQueue
from provenance import sha256_file,asset_record
from profile_loader import load_output_profile,calibration_readiness
from acceptance import evaluate_master_gate,accept_candidate_as_new_master
from edge_quality import analyze_edge_rgb
from pipeline import inspect_master

class TestProductionCore(unittest.TestCase):
    def test_persistent_jobs(self):
        with tempfile.TemporaryDirectory() as d:
            db=os.path.join(d,"jobs.sqlite3")
            q=PersistentJobQueue(1,db)
            jid=q.submit(lambda:{"ok":True})
            for _ in range(100):
                s=q.status(jid)
                if s["state"]=="completed": break
                time.sleep(.01)
            self.assertEqual(q.status(jid)["result"],{"ok":True})
            q2=PersistentJobQueue(1,db)
            self.assertEqual(q2.status(jid)["state"],"completed")

    def test_provenance_and_acceptance(self):
        with tempfile.TemporaryDirectory() as d:
            src=os.path.join(d,"candidate.png"); dst=os.path.join(d,"master.png")
            Image.new("RGBA",(8,8),(255,0,0,255)).save(src)
            self.assertEqual(len(sha256_file(src)),64)
            self.assertEqual(asset_record(src,"candidate")["role"],"candidate")
            report={"status":"PASS","pixel_analysis":{"has_alpha":True},
                    "calibration_readiness":{"calibrated_for_authoritative_gate":True}}
            self.assertTrue(evaluate_master_gate(report,True,True)["eligible"])
            out=accept_candidate_as_new_master(src,dst,report,True,True)
            self.assertTrue(out["accepted"]); self.assertTrue(os.path.exists(dst))
            with self.assertRaises(FileExistsError):
                accept_candidate_as_new_master(src,dst,report,True,True)

    def test_profile_readiness_and_pipeline(self):
        with tempfile.TemporaryDirectory() as d:
            img=os.path.join(d,"a.png"); prof=os.path.join(d,"p.json")
            Image.new("RGBA",(300,300),(10,20,30,255)).save(img)
            data={"profile_id":"cal","printer":"p","ink_set":"i","film_media":"f","rip":"r",
                  "print_mode":"m","icc_revision":"v1","screening":"s","min_effective_dpi":200,
                  "white_policy":{"source_mode":"alpha","choke_mm":0.0,"spread_mm":0.0},
                  "printability_thresholds":{"min_stroke_mm":0.01,"min_island_area_mm2":0.0001}}
            open(prof,"w",encoding="utf-8").write(json.dumps(data))
            self.assertTrue(calibration_readiness(load_output_profile(prof))["calibrated_for_authoritative_gate"])
            report=inspect_master(img,1,1,output_profile_path=prof,require_calibrated_profile=True)
            self.assertIn("master_gate",report); self.assertIn("source_asset",report)
            self.assertEqual(report["source_asset"]["sha256"],sha256_file(img))
            self.assertIn("edge_quality",report)

    def test_edge_metric_runs(self):
        with tempfile.TemporaryDirectory() as d:
            p=os.path.join(d,"e.png")
            im=Image.new("RGBA",(10,10),(0,0,0,0))
            for y in range(3,7):
                for x in range(3,7): im.putpixel((x,y),(200,20,20,255))
            im.putpixel((2,4),(255,255,255,128)); im.save(p)
            r=analyze_edge_rgb(p)
            self.assertIn("rgb_deviation_p95",r)

if __name__=="__main__": unittest.main()
