#!/usr/bin/env python3
import json, hashlib, re, sys
from pathlib import Path
root=Path(__file__).resolve().parent
m=json.loads((root/"DTF_Smart_Prepress_Batch_468_Manifest.json").read_text(encoding="utf-8"))
def canon(u): return re.sub(r"^http://","https://",u.strip(),flags=re.I).split("#",1)[0].rstrip("/").lower()
s=m["accepted_sources"]
assert len(s)==14
assert len({x["id"] for x in s})==14
assert len({canon(x["canonical_url"]) for x in s})==14
assert all(x["read_depth"] for x in s)
assert m["provisional_cumulative_upper_bound"]==m["previous_provisional_upper_bound"]+m["new_accepted_pages"]
assert m["remaining_by_arithmetic"]==m["target_pages"]-m["provisional_cumulative_upper_bound"]
assert m["globally_certified_unique_count"] is None
print("Batch 468 integrity checks: 6/6 passed")
