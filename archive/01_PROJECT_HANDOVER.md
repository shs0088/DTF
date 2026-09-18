# Project Handover

## Identity
- Camel project: `dtf-studio-v48-safe-frontend`
- Source project id: `ca-4ae996677c654c02a0fc8e115bca8889-dtf-studio-v48-1l5d`
- Backend: `do-r2`
- Live URL: https://dtf-studio-v48-safe-frontend-zk9t5j.camelai.app
- Purpose: isolated DTF Studio V48.22E safe frontend preserving supplied static presentation/navigation and backend files.

## Product and architecture
Bilingual DTF Studio storefront, designer marketplace, customizer, commerce/cart, auth, design qualification/analyzer, admin operations, production workflow, and Printify catalog/admin scaffold. React 19, React Router 7, TypeScript, Vite, Tailwind CSS v4, lucide-react, Radix UI, Cloudflare Workers, static assets, Durable Object SQLite ItemStore, virtual workspace connections, and generated Worker manifest. Home redirects to `public/DTF_Studio_V48.22E_VIEW_ALL_SYNCED.html`; routes are under `app/routes`; Worker/API/admin logic is `workers/static-app.ts`; persistence is `workers/item-store.ts`. Printify catalog discovery is snapshot-backed from `/data/printify-catalog.json`; protected server connector routes also exist.

## Governance and status
`AGENTS.md`, the protected baseline, and append-only change log govern edits. Protected items include card sizing, mobile menu behavior/scroll/spacing/alignment, Mini Brand Banner, Featured title, scrollbar rules, navigation API/source, and English master geometry. Source implementation is confirmed by inspection. Current browser/responsive QA and authenticated Printify operation were not verified for this handover.
