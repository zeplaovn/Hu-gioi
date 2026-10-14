# Kiến trúc v3

## Runtime

```text
Browser
  React screens/components
        ↓
  GameProvider + domain reducer
        ↓
  services/client.js
        ↓
Fastify /api
        ↓
Supabase Auth + PostgREST/RPC
        ↓
PostgreSQL + RLS
```

## Frontend

`apps/web/src/game/` là domain gameplay độc lập React. `catalog.js` chứa data tĩnh, `rules.js` chứa công thức, `state.js` định nghĩa schema save và migration adapter, `reducers/` chia action theo bounded context.

`state/GameProvider.jsx` chịu trách nhiệm hydrate, idle catch-up, tick và autosave. React components không tự sửa game state.

`state/ServerProvider.jsx` quản lý server status, maintenance và presence heartbeat.

## API

`apps/api/src/app.js` là Fastify app dùng chung local và serverless. API không tin user id từ browser: mọi route player-private xác minh Bearer token qua Supabase Auth trước khi gọi PostgREST/RPC bằng chính token đó.

Public anon/publishable key được phép tới browser theo mô hình Supabase. Service role, database password và JWT signing secret tuyệt đối không có trong repo/runtime.

## Database

`supabase/migrations/` tiếp tục là schema/RPC/RLS source of truth. Không chỉnh migration production cũ; mọi thay đổi DB mới phải là migration mới.

## Save schema

Save runtime hiện là `version: 3`. `normalizeSave()` hỗ trợ best-effort migration từ schema v2 và shape legacy trước rewrite. Dữ liệu không ánh xạ được có thể bị bỏ qua trong phase rewrite.
