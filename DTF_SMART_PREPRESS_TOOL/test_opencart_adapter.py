import os,tempfile,unittest
from PIL import Image
from opencart_adapter import evaluate_order_item

class TestOpenCartAdapter(unittest.TestCase):
    def test_requires_explicit_master(self):
        with tempfile.TemporaryDirectory() as d:
            p=os.path.join(d,"a.png")
            Image.new("RGBA",(300,300),(10,20,30,255)).save(p)
            r=evaluate_order_item(p,"1","T-Shirt",1,1,2,2,False)
            self.assertFalse(r["ready_to_print_eligible"])
            self.assertIn("MASTER_NOT_EXPLICITLY_SELECTED",r["blocking_reasons"])

    def test_valid_contract_can_pass_preflight_gate(self):
        with tempfile.TemporaryDirectory() as d:
            p=os.path.join(d,"a.png")
            Image.new("RGBA",(300,300),(10,20,30,255)).save(p)
            r=evaluate_order_item(p,"2","Mug",1,1,2,2,True)
            self.assertTrue(r["ready_to_print_eligible"])

if __name__=="__main__": unittest.main()
