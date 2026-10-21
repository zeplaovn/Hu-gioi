# Thiên Vân Đại Lục

Game tu tiên idle theo **thời gian thật**. Thiết kế hiện hành: **v2.1** (`docs/v21/`, `data/v21/`).

Bản2.1 bổ sung màn nhiệm vụ/tông môn, thương các, ví và luyện hóa, linh điền, nghề, hành trang, PvE và đấu giá. Chi tiết phạm vi, chuyển save và kiểm tra: [V21_IMPLEMENTATION.md](docs/V21_IMPLEMENTATION.md).

- 14 đại cảnh giới,126 tầng; kiếp mới Luyện Khí tầng1 với3 LT_HP.
- 9 NPC; Linh Giới dùng LT_TP, Tiên Giới dùng TN; reset00:00 giờ Việt Nam.
- Nguồn luật mới là JSON trong `data/v21`. CSV và dữ liệu xã hội19 NPC bên dưới chỉ tái lập các migration lịch sử.
- UI mới dùng `GET /play` và `POST /play/action`; luật và giao dịch chạy PostgreSQL.
- Bản beta PvE chưa mở PvP/Lục Mệnh6 người. Các hiệu ứng đặc biệt chưa có handler bị từ chối trước khi trừ đồ.

```text
HTML/CSS/JS thuần (apps/web)  →  Supabase Edge Function `api`  →  pgSQL (schema `game`) trên Supabase PostgreSQL
   giao diện                 xác thực, validate, rate limit        LUẬT GAME: tu luyện, đột phá, chết, Thiên Mệnh
```

- **Server quyết định mọi thứ quan trọng.** Client chỉ gửi ý định ("tôi muốn đột phá"), nhận kết quả.
- **Luật game nằm trong pgSQL** (một transaction, idempotent). Edge Function là lớp mỏng; `packages/game-core` (TypeScript) chỉ để hiển thị/dự đoán và có test đối chiếu với SQL.
- Schema game mới không nhập save cũ; dữ liệu live chỉ được reset khi triển khai vào đúng dự án. Code và dữ liệu bản cũ đã được bỏ khỏi cây hiện hành; đối chiếu qua lịch sử Git.

## Cấu trúc

```text
apps/web/             HTML/CSS/JS thuần (ES modules, Vite chỉ để gom mã): đăng nhập, tu luyện, đột phá, Quán Đỉnh, Bia Thiên Mệnh
packages/game-core/   hằng số + công thức TS (sinh từ data/*.csv), test parity với SQL
supabase/
  migrations/         schema v2, dữ liệu tĩnh (sinh tự động), hàm pgSQL
  functions/api/      Edge Function (handler.ts thuần, index.ts là entry Deno)
  tests/              test SQL trên Postgres thật (lifecycle, Thiên Mệnh, bảo mật/RLS)
  seed.sql            CHỈ local: tăng tốc thời gian ×2000
data/                 dữ liệu cân bằng v1.6.1 (nguồn của migration dữ liệu tĩnh)
tools/                gen-static (CSV → SQL/TS), db-test, simulator thiết kế và bộ kiểm tra nội dung
docs/                 design/ (tài liệu v1.6.1) và ARCHITECTURE.md
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
pnpm gen          # sinh migration nâng cấp design_v161 và dữ liệu nội dung và packages/game-core/src/data.generated.ts
pnpm gen:check    # CI dùng để chắc chắn file sinh ra khớp nguồn
```

Các migration lịch sử giữ nguyên. Bản nâng cấp dùng migration mới; sau khi migration này đã được áp dụng, các đợt cân bằng tiếp theo phải tạo migration mới.

## Triển khai (tóm tắt)

1. **Supabase**: `supabase link`, `supabase db push`, `supabase functions deploy api`. Đặt secret `ALLOWED_ORIGINS` (danh sách origin web, ngăn cách bằng dấu phẩy). Thêm `game` vào *Exposed schemas* (Settings → API) để Edge Function gọi hàm; client vẫn không có quyền gì trên schema này.
2. **Web** (Vercel): Root Directory `apps/web`, Framework Preset **Vite** (build `pnpm build`, output `dist`), bật "Include source files outside of Root Directory"; env `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` (Vite nhúng vào bản build: đổi giá trị phải Redeploy). Router theo hash (`#/play`) nên không cần rewrite. Nếu dự án Vercel đang đặt framework là SvelteKit, đổi sang Vite.

Chi tiết thiết kế, mô hình bảo mật và các điểm cần duyệt: `docs/ARCHITECTURE.md`.

## Lịch sử nâng cấp v1.6.1

Xem [phạm vi, kiểm tra và việc còn lại](docs/UPGRADE_v1.6.1.md). Tàng Thư Các (truyện, Bách Quái Chí, danh mục vật phẩm) nằm ở repo `Hu-gioi-wiki`, không còn trong game.

## Lịch sử nhập Nhân duyên Hạ Giới v1.1

Hội thoại nằm trong game: **Lịch luyện** (NPC trung lập), **Tông môn** (3 tông môn Hạ Giới) và **Bí cảnh** (kỳ ngộ ngẫu nhiên): 19 NPC, 95 cảnh chính, 38 sự kiện. Máy chủ kiểm soát reset UTC, điểm quan hệ, quà và chống thưởng lặp. [Phạm vi đã làm, kiểm thử và phần còn thiếu](docs/social/IMPLEMENTATION.md). Đây chưa phải bản hoàn thiện toàn bộ thiết kế game.
