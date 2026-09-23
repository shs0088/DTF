# M1 validation

Dedicated CI validates Python syntax, XML, manifests, dependencies, secret patterns, Compose structure, PostgreSQL port exposure, Odoo-core isolation and the 13 addon directories. Odoo/PostgreSQL runtime is separate and must not be marked PASS without execution.
