# Thiên Vân Đại Lục

Game tu tiên idle chạy trên web. Runtime v3 được viết lại bằng **React + Vite** ở frontend và **Fastify** ở API layer; **Supabase PostgreSQL/RLS/RPC** tiếp tục là nguồn dữ liệu bền vững.

## Stack

- `apps/web`: React 19 + Vite, toàn bộ UI và gameplay client.
- `apps/api`: Fastify gateway, xác minh Supabase session và proxy các RPC/database operation dành cho game.
- `supabase/migrations`: schema, RLS và RPC source of truth.
- `assets`: asset runtime được Vite đóng gói nguyên trạng.
- `assets_src`: source sheets cho asset pipeline.

Không còn runtime `window.TT`, script-order contract hoặc DOM UI thuần JavaScript.

## Chạy local

```bash
npm install
npm run dev:api
npm run dev:web
```

API mặc định: `http://localhost:3001`. Web: `http://localhost:5173`.

Environment cho API/build deployment:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
HCAPTCHA_SITEKEY   # optional
WEB_ORIGINS        # comma-separated, local default http://localhost:5173
```

`SUPABASE_ANON_KEY` phải là public anon/publishable key; không được dùng service-role/secret key.

## Test / build

```bash
npm test
npm run build
```

## Persistence

Save vẫn database-only. Frontend giữ state trong RAM, Fastify nhận Bearer token, xác minh user với Supabase Auth và gọi `save_game()` bằng token của user. Revision conflict vẫn ưu tiên dữ liệu máy chủ.

## Gameplay v3

Runtime hiện có tạo nhân vật, chủng tộc/linh căn/ngũ đại thuộc tính, tu luyện, 9 cảnh giới × 9 tầng, đột phá, thọ nguyên, công pháp, lịch luyện, túi đồ/phường thị, linh điền, luyện đan/vẽ phù/luyện khí, tông môn/nhiệm vụ, Hạ/Tiên/Thần Giới, bí cảnh, thành tựu/Thiên Mệnh/chuyển thế, leaderboard, World Chat, maintenance banner/presence và cloud save.

Xem `docs/ARCHITECTURE.md` và `docs/DEVELOPMENT.md`.
