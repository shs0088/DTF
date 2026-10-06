from __future__ import annotations
from pathlib import Path
from typing import Dict,Any
import html,json

def _e(v): return html.escape(str(v))

def render_report_html(report:Dict[str,Any],output_path:str,title:str="DTF Smart Prepress Report")->str:
    status=report.get("status","UNKNOWN")
    dpi=(report.get("effective_dpi") or {}).get("minimum","—")
    gate=report.get("master_gate") or {}
    cal=report.get("calibration_readiness") or {}
    px=report.get("pixel_analysis") or {}
    topo=report.get("topology") or {}
    area=report.get("print_area") or {}
    findings=report.get("findings") or []
    recs=report.get("recommendations") or []
    source=(report.get("source_asset") or {}).get("sha256","—")
    rows=[]
    for f in findings:
        rows.append(f"<tr><td>{_e(f.get('severity'))}</td><td>{_e(f.get('code'))}</td><td>{_e(f.get('message'))}</td></tr>")
    recrows=[]
    for r in recs:
        recrows.append(f"<tr><td>{_e(r.get('priority'))}</td><td>{_e(r.get('action'))}</td><td>{_e(r.get('reason'))}</td></tr>")
    raw=html.escape(json.dumps(report,indent=2,ensure_ascii=False))
    doc=f"""<!doctype html><html><head><meta charset="utf-8"><title>{_e(title)}</title>
<style>
body{{font-family:Arial,sans-serif;max-width:1100px;margin:30px auto;color:#111;padding:0 18px}}
h1,h2{{margin-bottom:8px}}.status{{font-size:28px;font-weight:700}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}}
.card{{border:1px solid #ccc;border-radius:10px;padding:12px}}table{{border-collapse:collapse;width:100%}}th,td{{border:1px solid #ccc;padding:8px;text-align:left;vertical-align:top}}
pre{{background:#f5f5f5;padding:12px;overflow:auto;white-space:pre-wrap}}small{{color:#555}}
</style></head><body>
<h1>{_e(title)}</h1><div class="status">{_e(status)}</div>
<div class="grid">
<div class="card"><b>Effective DPI</b><br>{_e(dpi)}</div>
<div class="card"><b>Source alpha</b><br>{_e(px.get('has_alpha','—'))}</div>
<div class="card"><b>Components / holes</b><br>{_e(topo.get('component_count','—'))} / {_e(topo.get('hole_count','—'))}</div>
<div class="card"><b>Print area fit</b><br>{_e(area.get('fits','not supplied'))}</div>
<div class="card"><b>Master eligible</b><br>{_e(gate.get('eligible','—'))}</div>
<div class="card"><b>Calibrated profile</b><br>{_e(cal.get('calibrated_for_authoritative_gate','—'))}</div>
</div>
<h2>Findings</h2><table><tr><th>Severity</th><th>Code</th><th>Message</th></tr>{''.join(rows) or '<tr><td colspan="3">No findings</td></tr>'}</table>
<h2>Recommendations</h2><table><tr><th>Priority</th><th>Action</th><th>Reason</th></tr>{''.join(recrows) or '<tr><td colspan="3">No recommendations</td></tr>'}</table>
<h2>Traceability</h2><p><b>Source SHA-256:</b> {_e(source)}</p>
<p><b>Output-profile fingerprint:</b> {_e(cal.get('profile_fingerprint_sha256','—'))}</p>
<details><summary>Full JSON report</summary><pre>{raw}</pre></details>
<p><small>This report does not replace printer/RIP calibration or a production proof.</small></p>
</body></html>"""
    Path(output_path).write_text(doc,encoding="utf-8")
    return output_path
