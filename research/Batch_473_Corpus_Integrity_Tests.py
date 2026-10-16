#!/usr/bin/env python3
import hashlib,json
from pathlib import Path
d=json.loads(Path(__file__).with_name('Batch_473_Manifest.json').read_text(encoding='utf-8'))
s=d['accepted_sources']
checks=[('12 accepted records',len(s)==12),('unique source IDs',len({x['id'] for x in s})==len(s)),('unique canonical URLs',len({x['url'] for x in s})==len(s)),('all HTTPS',all(x['url'].startswith('https://') for x in s)),('read depth disclosed',all(x.get('read_depth') for x in s)),('findings disclosed',all(x.get('finding') for x in s)),('hashes valid',all(hashlib.sha256(x['url'].encode()).hexdigest()==x['canonical_url_sha256'] for x in s)),('count arithmetic',d['previous_provisional_upper_bound']+d['new_accepted_pages']==d['provisional_cumulative_upper_bound']),('remaining arithmetic',d['target_pages']-d['provisional_cumulative_upper_bound']==d['remaining_by_arithmetic']),('percentage arithmetic',round(d['provisional_cumulative_upper_bound']/d['target_pages']*100,2)==d['percentage']),('global uniqueness not overstated',d['globally_certified_unique_count'] is None and d['historical_semantic_deduplication_complete'] is False),('no printer validation claimed',d['physical_printer_validation'] is False),('12 language groups searched',len(d['languages_searched'])==12),('exclusions documented',len(d['excluded_candidates'])>=5),('English/Turkish/Arabic rotation',set(d['accepted_language_counts'])=={'English','Turkish','Arabic'})]
for n,ok in checks: print(('PASS' if ok else 'FAIL')+': '+n)
if not all(ok for _,ok in checks): raise SystemExit(1)
print(f'{len(checks)}/{len(checks)} checks passed; bookkeeping only, not global uniqueness or physical print validation.')
