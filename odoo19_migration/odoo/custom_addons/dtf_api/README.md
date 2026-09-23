# dtf_api

Versioned compatibility API for the preserved DTF Studio frontend and future clients.

M1 keeps the existing starter controller and normalizes the addon dependency graph. Full API parity is implemented in later milestones under `/api/dtf/v1`.

Do not expose supplier credentials or make client-controlled role/permission headers authoritative.
