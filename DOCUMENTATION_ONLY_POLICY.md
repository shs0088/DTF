# DTF Studio Documentation-Only Branch Policy

Branch: docs/project-records

Purpose:
This branch is the single safe place for project papers, requirements, QC records, rules, checklists, change logs, theme specifications, and optional suggestions.

Safety rule:
Updating documentation on this branch MUST NOT change the running DTF Studio application.

Protected application branches:
- camel-current
- main
- implementation branches such as kamel/admin-rbac-foundation

Rules:
1. Documentation edits belong on docs/project-records only.
2. Do not edit application source, database schema, package files, public runtime assets, deployment configuration, or application workflows from documentation tasks.
3. Documentation changes must not be merged automatically into an application branch.
4. A requirement written here becomes application work only after a separate implementation task/branch is created.
5. CAMEL/GitHub implementation work may read the approved requirements from this branch, but must write code only on the explicitly named implementation branch.
6. Documentation commits never authorize deployment, merge, database execution, import, publish, or production changes.
7. Before implementation, record the implementation branch and exact starting SHA.
8. After implementation, update QC records here from verified evidence only.
9. Never mark a requirement Implemented solely because an agent reported success; require code/CI/runtime evidence as applicable.
10. If a documentation-only commit contains application-source changes, the docs-only guard must fail.

Application baseline preserved when this branch was created:
camel-current = da347ffbf928bbd1c80f302c134cd8928255abf8

KAMEL working branch at separation time:
kamel/admin-rbac-foundation = c8a4145e48aab03fcd36874ab67de9e48754ff55
