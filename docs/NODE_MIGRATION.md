# Node.js + React/Vite + Fastify migration

This branch is an incremental migration, **not a completed rewrite**. Legacy gameplay remains under `src/` and is not removed or modified. Supabase SQL migrations remain the schema source of truth.

## Local development

From repository root:

```sh
npm install --prefix apps/api
npm install --prefix apps/web
npm run dev:api
# in another terminal
npm run dev:web
```

Web: http://localhost:5173; API: http://localhost:3001/api/health.

## Migration sequence

1. Preserve legacy behavior with existing regression tests and snapshot expected flows.
2. Extract TT gameplay state and actions into framework-independent ES modules with parity tests.
3. Wrap screens in React components and move legacy DOM mutations behind adapters during transition.
4. Move privileged operations into Fastify endpoints using verified Supabase JWTs; keep existing RLS/RPC checks, never trust browser-provided player IDs.
5. Migrate auth, cloud saves, chat, admin bridge and maintenance flows; retain database-only save and revision semantics.
6. Migrate standalone staff/maintenance pages and production deployment configuration.
7. Run end-to-end and SQL/RLS regression tests before switching traffic. Do not change production migrations in place.

Only public Supabase URL and anon key may be sent to browser; never expose service-role credentials.
