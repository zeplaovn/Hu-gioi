# Rewrite v2: React/Vite + Fastify + Supabase PostgreSQL

Branch `rewrite/react-vite-fastify` now runs a React gameplay implementation directly. The previous iframe compatibility bridge is removed from the new runtime.

## Architecture

- `apps/web`: React 19 + Vite. Owns screens, gameplay state, feature panels and client session handling.
- `apps/api`: Fastify gateway. Verifies Supabase access tokens and exposes save, leaderboard, chat and account endpoints.
- `assets/`: reused unchanged. Vite serves them in development and copies them to `dist/assets` during build.
- `supabase/migrations`: remains the database source of truth. Existing production migrations are not rewritten.
- legacy `src/`, `styles/`, `scripts/`: retained temporarily as reference/regression material but are no longer used by the v2 web runtime.

## Run

```bash
npm install
npm run dev:api
npm run dev:web
```

Required API environment:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
HCAPTCHA_SITEKEY   # optional in current v2 UI
WEB_ORIGINS        # optional, default http://localhost:5173
```

## Current rewrite scope

Implemented in the new runtime: account sign-in/sign-up, database save load/push with revision, character creation, cultivation, exploration, rest, breakthrough, inventory, farm, crafting, sect membership/missions, world travel, reincarnation/meta progression, world chat, leaderboard and asset reuse.

This is an aggressive rewrite pass. Gameplay formulas and old-save migration are approximate and intentionally require later parity testing/fixes. Do not assume production equivalence until regression tests and database integration tests are run.
