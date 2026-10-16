#!/usr/bin/env python3
import hashlib,json
from pathlib import Path
d=json.loads(Path(__file__).with_name("Batch_475_Manifest.json").read_text(encoding="utf-8")); s=d["accepted_sources"]
checks=[
("10 records",len(s)==10),("unique IDs",len({x["id"] for x in s})==10),("unique URLs",len({x["canonical_url"] for x in s})==10),
("HTTPS URLs",all(x["canonical_url"].startswith("https://") for x in s)),("read depth",all(x.get("read_depth") for x in s)),
("findings",all(x.get("finding") for x in s)),("hashes",all(hashlib.sha256(x["canonical_url"].encode()).hexdigest()==x["canonical_url_sha256"] for x in s)),
("cumulative arithmetic",d["previous_provisional_upper_bound"]+d["new_accepted_pages"]==d["provisional_cumulative_upper_bound"]),
("remaining arithmetic",d["target_pages"]-d["provisional_cumulative_upper_bound"]==d["remaining_by_arithmetic"]),
("percentage",round(d["provisional_cumulative_upper_bound"]/d["target_pages"]*100,2)==d["percentage"]),
("global uniqueness caveat",d["globally_certified_unique_count"] is None and not d["historical_semantic_deduplication_complete"]),
("no physical validation claim",d["physical_dtf_validation"] is False),("12 languages searched",len(d["languages_searched"])==12),
("exclusions documented",len(d["exclusions"])>=8),("language counts",sum(d["accepted_language_counts"].values())==10),
("unique hashes",len({x["canonical_url_sha256"] for x in s})==10)]
for n,ok in checks: print(("PASS" if ok else "FAIL")+": "+n)
if not all(ok for _,ok in checks): raise SystemExit(1)
print(f"{sum(ok for _,ok in checks)}/{len(checks)} checks passed")
