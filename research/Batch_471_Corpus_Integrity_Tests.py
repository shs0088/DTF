# Batch 471 corpus-integrity checks
# Run: python Batch_471_Corpus_Integrity_Tests.py Batch_471_Manifest.json
import json, hashlib, sys
from urllib.parse import urlsplit
m=json.load(open(sys.argv[1],encoding='utf-8'))
s=m['accepted_sources']
assert len(s)==8
assert len({x['id'] for x in s})==len(s)
assert len({x['canonical_url'] for x in s})==len(s)
for x in s:
    assert urlsplit(x['canonical_url']).scheme == 'https'
    assert hashlib.sha256(x['canonical_url'].encode()).hexdigest()==x['canonical_url_sha256']
assert m['previous_provisional_upper_bound'] + m['new_accepted_pages'] == m['provisional_cumulative_upper_bound']
assert m['target_pages'] - m['provisional_cumulative_upper_bound'] == m['remaining_by_arithmetic']
assert round(100*m['provisional_cumulative_upper_bound']/m['target_pages'],2)==m['percentage']
assert m['globally_certified_unique_count'] is None
assert m['historical_semantic_deduplication_complete'] is False
assert m['physical_printer_validation'] is False
print('11/11 checks passed; global uniqueness and physical print validation remain explicitly unclaimed.')
