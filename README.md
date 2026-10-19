# Thiên Vân Đại Lục

Game tu tiên idle theo **thời gian thật**. Thiết kế canonical: **v1.3** (`docs/design/`).

```text
HTML/CSS/JS thuần (apps/web)  →  Supabase Edge Function `api`  →  pgSQL (schema `game`) trên Supabase PostgreSQL
   giao diện                 xác thực, validate, rate limit        LUẬT GAME: tu luyện, đột phá, chết, Thiên Mệnh
```

- **Server quyết định mọi thứ quan trọng.** Client chỉ gửi ý định ("tôi muốn đột phá"), nhận kết quả.
- **Luật game nằm trong pgSQL** (một transaction, idempotent). Edge Function là lớp mỏng; `packages/game-core` (TypeScript) chỉ để hiển thị/dự đoán và có test đối chiếu với SQL.
- Database **làm mới từ đầu** (không còn save cũ). Code bản cũ (HTML/JS thuần + `save_game`) nằm ở `legacy/` để đối chiếu.

## Cấu trúc

```text
apps/web/             HTML/CSS/JS thuần (ES modules, Vite chỉ để gom mã): đăng nhập, tu luyện, đột phá, Quán Đỉnh, Bia Thiên Mệnh
packages/game-core/   hằng số + công thức TS (sinh từ data/*.csv), test parity với SQL
supabase/
  migrations/         schema v2, dữ liệu tĩnh (sinh tự động), hàm pgSQL
  functions/api/      Edge Function (handler.ts thuần, index.ts là entry Deno)
  tests/              test SQL trên Postgres thật (lifecycle, Thiên Mệnh, bảo mật/RLS)
  seed.sql            CHỈ local: tăng tốc thời gian ×2000
data/                 dữ liệu cân bằng v1.3 (nguồn của migration dữ liệu tĩnh)
tools/                gen-static (CSV → SQL/TS), db-test, simulator + qa_check của gói v1.3
docs/                 design/ (tài liệu v1.3) và ARCHITECTURE.md
legacy/               mã bản cũ, không còn chạy
```

## Chạy local

Cần Node ≥ 22, pnpm 10. Chạy đầy đủ cần Docker + [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
pnpm install
supabase start                    # Postgres + Auth + Edge Runtime; áp migration + seed.sql
supabase functions serve api      # Edge Function tại http://127.0.0.1:54321/functions/v1/api
cp apps/web/.env.example apps/web/.env   # điền PUBLIC_SUPABASE_ANON_KEY từ `supabase status`
pnpm dev:web                      # http://localhost:5173
```

Không có Docker vẫn chạy được toàn bộ **test** (xem dưới): `tools/db-test.mjs` tự khởi động một Postgres tạm.

## Test

```bash
pnpm test        # gen:check + game-core + web + Edge handler + DB (migration, SQL, parity, handler↔Postgres)
pnpm build:web
```

DB test cần Postgres server (`initdb`) hoặc biến `DATABASE_URL` trỏ tới một database **trống**.

## Dữ liệu cân bằng

`data/*.csv` + `data/balance_config.json` là nguồn. Sau khi sửa:

```bash
pnpm gen          # sinh lại supabase/migrations/*_v2_static_data.sql và packages/game-core/src/data.generated.ts
pnpm gen:check    # CI dùng để chắc chắn file sinh ra khớp nguồn
```

Chưa phát hành: sửa thẳng migration dữ liệu tĩnh. Sau khi đã có database thật, mọi thay đổi dùng migration mới.

## Triển khai (tóm tắt)

1. **Supabase**: `supabase link`, `supabase db push`, `supabase functions deploy api`. Đặt secret `ALLOWED_ORIGINS` (danh sách origin web, ngăn cách bằng dấu phẩy). Thêm `game` vào *Exposed schemas* (Settings → API) để Edge Function gọi hàm; client vẫn không có quyền gì trên schema này.
2. **Web** (Vercel): Root Directory `apps/web`, Framework Preset **Vite** (build `pnpm build`, output `dist`), bật "Include source files outside of Root Directory"; env `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` (Vite nhúng vào bản build: đổi giá trị phải Redeploy). Router theo hash (`#/play`) nên không cần rewrite. Nếu dự án Vercel đang đặt framework là SvelteKit, đổi sang Vite.

Chi tiết thiết kế, mô hình bảo mật và các điểm cần duyệt: `docs/ARCHITECTURE.md`.
