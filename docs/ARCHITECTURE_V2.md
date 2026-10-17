# Kiến trúc V2 — tách FE / BE / Database

Branch triển khai: `rebuild/fe-be-db`.

## Mục tiêu

- Frontend không truy cập trực tiếp bảng/RPC Supabase.
- Backend là cổng API duy nhất cho gameplay/network và xác thực quyền.
- Database chỉ chứa schema, migration, RLS, function/RPC nội bộ và test SQL.
- Luật gameplay thuần có thể dùng chung qua package contracts/domain, nhưng mọi thao tác có tác động bền vững hoặc economy phải được server xác nhận.
- Migration production đã apply vẫn bất biến.

## Cấu trúc đích

```text
apps/
  frontend/              # Vite + TypeScript, UI/game client
    src/
      app/
      game/
      features/
      ui/
      api/
      platform/
  backend/               # Fastify + TypeScript
    src/
      server.ts
      config/
      middleware/
      modules/
        auth/
        player/
        save/
        leaderboard/
        chat/
        server-status/
        admin/
      db/
packages/
  contracts/             # DTO/type/schema dùng chung FE-BE
  game-domain/           # logic gameplay thuần, không DOM/network/database
database/
  README.md
supabase/                 # source-of-truth DB hiện tại; sẽ chuyển vào database/supabase sau khi tooling đổi xong
  migrations/
  tests/
legacy/                   # chỉ tạo khi bắt đầu move runtime cũ; không nhân bản source trong giai đoạn đầu
```

## Boundary bắt buộc

### Frontend

Frontend chịu trách nhiệm:

- render UI, routing/screen state;
- input, animation, asset loading;
- local in-memory state và optimistic UI có thể rollback;
- gọi API backend bằng access token;
- không chứa service-role key, database password hoặc logic admin đặc quyền.

Frontend không được:

- gọi `/rest/v1/*` hay RPC Supabase trực tiếp;
- quyết định kết quả transaction economy;
- tự ghi save, chat, leaderboard hoặc trạng thái admin vào database.

### Backend

Backend chịu trách nhiệm:

- verify Supabase Auth JWT/session;
- validate DTO/request;
- rate-limit;
- save/load player state;
- transaction economy;
- chat, leaderboard, server status;
- admin RBAC/audit;
- orchestration giữa domain logic và database.

Backend dùng Supabase/Postgres với credential chỉ tồn tại ở server environment.

### Database

Database chịu trách nhiệm:

- schema và constraint;
- RLS deny-by-default;
- migration bất biến;
- transaction/data integrity;
- function SQL chỉ khi phù hợp với tính toàn vẹn dữ liệu hoặc atomic operation;
- SQL regression tests.

Business orchestration không nên nằm rải rác trong trigger/RPC nếu có thể đặt rõ ràng ở backend.

## Luồng request V2

```text
Browser
  -> HTTPS /api
  -> Backend
      -> validate auth + input
      -> domain/service
      -> Supabase/Postgres
  <- JSON DTO
```

Auth vẫn có thể dùng Supabase Auth ở client cho sign-in/sign-up, nhưng sau khi có access token, dữ liệu game đi qua backend API.

## Mapping từ V1

| V1 | V2 |
|---|---|
| `src/ui/*` | `apps/frontend/src/ui/*` |
| `src/game/core/*` | `packages/game-domain` hoặc `apps/frontend/src/game` tùy mức thuần |
| `src/game/features/*` | tách client presentation và server-authoritative command |
| `src/services/cloud.js` | `apps/frontend/src/api/*` + `apps/backend/src/modules/*` |
| `src/services/auth.js` | frontend auth adapter + backend auth middleware |
| `src/services/admin_bridge.js` | backend admin module |
| `supabase/migrations/*` | giữ nguyên lịch sử, sau đó chuyển nguyên khối vào `database/supabase/migrations` |
| `supabase/tests/*` | `database/supabase/tests` |

## Thứ tự migrate

1. Dựng workspace, frontend/backend/contracts.
2. Backend health/config/auth middleware.
3. Chuyển server-status và leaderboard sang backend.
4. Chuyển save/load player khỏi `cloud.js`.
5. Chuyển chat.
6. Chuyển economy/transaction-sensitive features.
7. Chuyển admin boundary.
8. Chuyển UI/game runtime sang TypeScript modules.
9. Move `supabase/` -> `database/supabase/` khi CI/tooling đã cập nhật.
10. Xóa legacy service trực tiếp Supabase khỏi browser sau khi parity test đạt.

## Quy tắc migrate

- Không rewrite migration production đã apply.
- Mỗi vertical slice phải có contract + backend test + frontend integration test.
- Không merge bước làm mất khả năng deploy/rollback.
- Feature V2 chỉ được coi là hoàn tất khi browser không còn cần gọi Supabase data API trực tiếp cho feature đó.
