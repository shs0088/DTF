import os,tempfile,unittest
from report_html import render_report_html

class TestReportHTML(unittest.TestCase):
    def test_report_escapes_content(self):
        with tempfile.TemporaryDirectory() as d:
            p=os.path.join(d,"r.html")
            report={"status":"WARN","effective_dpi":{"minimum":300},"pixel_analysis":{"has_alpha":True},
                    "findings":[{"severity":"WARN","code":"X","message":"<script>alert(1)</script>"}],
                    "recommendations":[],"source_asset":{"sha256":"a"*64}}
            render_report_html(report,p)
            s=open(p,encoding="utf-8").read()
            self.assertNotIn("<script>alert(1)</script>",s)
            self.assertIn("&lt;script&gt;",s)

if __name__=="__main__": unittest.main()
