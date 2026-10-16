#!/usr/bin/env python3
"""Reproducible integrity checks for research/Batch_467_Manifest.json."""
import hashlib, json, sys
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
path=sys.argv[1] if len(sys.argv)>1 else "research/Batch_467_Manifest.json"
m=json.load(open(path,encoding="utf-8")); s=m["accepted_sources"]
def canon(u):
 p=urlsplit(u); q=[(k,v) for k,v in parse_qsl(p.query,keep_blank_values=True) if not k.lower().startswith("utm_") and k.lower() not in {"fbclid","gclid"}]
 return urlunsplit((p.scheme.lower(),p.netloc.lower(),p.path.rstrip("/"),urlencode(q),""))
assert m["batch"]==467 and len(s)==9
assert m["new_accepted_pages"]==len(s)
assert m["provisional_cumulative_upper_bound"]==m["previous_provisional_upper_bound"]+len(s)==5301
assert m["remaining_by_arithmetic"]==10000-5301==4699 and m["percentage"]==53.01
assert len({canon(x["canonical_url"]) for x in s})==9
assert len({x["id"] for x in s})==9
for x in s:
 assert x["canonical_url"].startswith("https://")
 assert x["canonical_url_sha256"]==hashlib.sha256(canon(x["canonical_url"]).encode()).hexdigest()
 assert x["read_depth"] and x["language"] and x["limitation"]
assert m["globally_certified_unique_count"] is None
assert m["historical_semantic_deduplication_complete"] is False
assert m["physical_printer_validation"] is False
assert any("diglib.eg.org/items/80e01cdf-0c97-473e-883c-92a87996fd4b" in x["canonical_url"] for x in m["excluded_sources"])
print("Batch 467 integrity checks: 12 passed")
