# DTF Studio Protected Baseline Governance

Before any future source edit:

1. Read `/AGENTS.md`.
2. Read `/00_DTF_STUDIO_PROTECTED_PASS_BASELINE.txt`.
3. Read `/01_DTF_STUDIO_CHANGE_LOG.txt`.
4. Identify every file, selector, function, route, API, and component the request may affect.
5. Compare them against all PROTECTED PASS items.
6. PASS means DO NOT TOUCH.

A protected PASS item must not be redesigned, refactored, optimized, cleaned up, renamed, rewritten, replaced, moved, merged into another implementation, or indirectly changed through shared CSS unless the user explicitly approves changing that protected item.

A broad instruction such as “fix everything”, “update all”, “correct the complete page”, “improve UI”, “synchronize everything”, or “correct A-to-Z” does not authorize modification of a protected PASS item.

If a requested change may affect a protected PASS item, stop before modifying that item and return:

PROTECTED ITEM CONFLICT DETECTED

Protected item:
[exact item]

Requested change:
[exact request]

Affected file:
[file]

Affected selector/function:
[selector/function]

Why this may cause regression:
[reason]

Proposed modification:
[exact proposal]

USER CONFIRMATION REQUIRED.

Do not revert, restore, or deploy without explicit scope and validation. Append to the change log; never overwrite prior entries.
