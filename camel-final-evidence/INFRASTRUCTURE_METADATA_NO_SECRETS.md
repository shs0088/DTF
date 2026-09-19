# Infrastructure Metadata (No Secrets)

- Cloudflare Worker name in wrangler config: dtf-studio-v48-safe-frontend
- Durable Object binding: ITEMS -> ItemStore; migration tag v1; SQLite class ItemStore
- Assets binding: ASSETS; directory ./public/
- R2 bindings/buckets: none present in observed wrangler.jsonc
- Database row counts: not available through read-only source inspection
- R2 object count: not available
- Vercel project/public URL observed in prior task context: dtf-printify-public-catalog-api-engshakhsheer-8324.vercel.app was user-provided/previously mentioned; current runtime verification not performed here
- GitHub: shs0088/DTF; reference branch integrate/v48-camel-final-20260917; evidence branch camel/final-technical-evidence-2026-09-19
- Printify connection: present and connected; credentials omitted
- OpenAI connection: present and connected; credentials omitted
