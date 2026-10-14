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

## Current implementation status

- React app now embeds the existing browser game at `/legacy/index.html` in **Vite development mode only**.
- Vite middleware reads existing source and assets directly from repository root without copying or deleting legacy files.
- Fastify provides health and public configuration endpoints, but **does not yet replace Supabase RPC/Auth**.
- The iframe is a compatibility adapter, **not** a rewrite of game screens/state. The Vite production build does not yet package the legacy game, and must not be deployed as a replacement for production.
- Legacy HTML still requires its Supabase configuration/build pipeline; using the dev bridge alone does not inject production configuration.
- Existing SQL migrations, RLS policies, cloud saves and leaderboard remain unchanged.
- Build, integration and gameplay regression tests for the new stack have not been executed yet.

### Release gate

Do not switch production traffic until all gameplay modules, screens, authentication, save synchronization, chat, admin/maintenance routes and security boundaries have migrated, production asset packaging works, and end-to-end plus SQL/RLS tests pass.
