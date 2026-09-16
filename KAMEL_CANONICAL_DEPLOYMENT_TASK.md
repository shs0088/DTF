# KAMEL — CANONICAL PROJECT DEPLOYMENT + RUNTIME VERIFICATION TASK

TASK STATUS: READY
BRANCH: kamel/admin-rbac-foundation
VERIFIED IMPLEMENTATION SOURCE SHA: 549689a4b710f1afc9f45ef2d48520e9cb1ab349

## Canonical live project

Use ONLY this existing CAMEL project/domain:

- Homepage: https://dtf-studio-v48-safe-frontend-zk9t5j.camelai.app/
- Admin: https://dtf-studio-v48-safe-frontend-zk9t5j.camelai.app/admin

DO NOT create a new project, new domain, alternate Admin deployment, or replacement homepage.

## Mandatory pre-flight

1. Fetch GitHub.
2. Checkout branch: kamel/admin-rbac-foundation
3. Verify current GitHub HEAD is the latest descendant of the verified implementation source SHA above.
4. Read AGENTS.md, protected baseline, requirements, rules, checking list, and change log.
5. Verify the source selected for deployment contains the complete current work and is not an older CAMEL workspace.
6. Run full configured validation before deployment: typecheck, build, and all configured Bun regression suites.
7. Stop on any source/test failure and fix it before deployment.

## Deployment authorization

The owner explicitly authorizes deploying the CURRENT VERIFIED BRANCH to the EXISTING canonical CAMEL project above.
Deploy the existing project only.
Do not modify main.
Do not merge to main as part of deployment.
Do not create a second deployment URL.

## Required routing after deployment

Storefront:
- / = existing DTF Studio homepage/storefront

Administration:
- /admin = Admin login / authenticated Admin entry
- all Admin modules must remain under /admin/...

The complete current Admin work must appear on this exact Admin deployment, including:
- Dashboard
- Orders
- Production Queue
- Manual Review
- Products
- Printify Catalog/internal supplier workflow
- Customers
- Designers
- Payouts
- Reports
- Promotions
- Settings
- Integrations
- Audit Log
- Users
- User Groups
- OpenCart-style Access/Modify RBAC

Preserve the existing Black + Electric Blue DTF Studio visual system.

## Preserve the full project

Deploy the CURRENT BRANCH AS ONE PROJECT.
Do not cherry-pick only the Admin files if that would omit current shared backend/database work.

Preserve and include the verified current storefront/homepage, customer/cart/checkout work, designer dashboard/new-design upload work, database/backend updates, Printify/catalog architecture, and Admin modules/permissions.
Do not overwrite correct homepage behavior with an Admin-only build.

## Runtime verification on the canonical URLs

After deployment, verify directly against the canonical deployment:
1. Homepage / loads successfully.
2. /admin loads the Admin login/entry.
3. Authenticated Admin dashboard loads.
4. Every Admin navigation item routes under /admin.
5. Each Admin module above loads without 404/500.
6. Main Administrator Access/Modify works.
7. Printing Operator default-deny/least-privilege works.
8. Custom User Group Access/Modify behavior works.
9. Direct restricted Admin URL returns denial.
10. Direct restricted Admin API returns 403.
11. Fake role/group/permission headers do not escalate.
12. Disabled Admin is rejected.
13. Last Main Administrator protection works.
14. View-only group cannot perform Modify operations.
15. Printify catalog still loads with current pagination/category behavior.
16. Homepage remains unchanged/working after Admin deployment.
17. Checkout/customer/designer flows have no obvious route regression.
18. No secret names/values are exposed in Integrations.
19. Audit records are produced for protected Admin mutations.

## Final report

Return:
- GitHub source SHA actually deployed
- CAMEL deployment/project used
- homepage URL
- Admin URL
- deployment result
- full CI/test result
- runtime routes tested
- authorization tests PASS/FAIL
- regressions found/fixed
- anything still pending

Do not report COMPLETE unless the canonical URLs above were actually verified after deployment.