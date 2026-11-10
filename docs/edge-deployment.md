# Triển khai Hư Giới: Cloudflare Static + Supabase Edge API (FREE)

> **Trạng thái production 10/11/2026:** Schema `game` đã được áp dụng qua Supabase Migration `20261110075419_game_schema` và Edge Function `api` v1 đã được tải lên. Chưa xác nhận xử lý gameplay thành công cho tới khi cấu hình `HU_DB_POOLER_URL` và `HU_ALLOWED_ORIGINS`. Không chạy lại migration này hoặc migration consent v5. Backend Edge là mục tiêu phát hành; Node/SQLite vẫn giữ để dev/test. Gói Free không bảo đảm uptime.

## Kiến trúc và ranh giới tin cậy

- Trang tĩnh: Cloudflare Worker assets, origin `https://hugioi.blackbearvn.workers.dev`. `index.html` nạp `client/config.js` **trước** `remote-session.js` và `auth/supabase.js`; CSP chỉ `script-src 'self'`. `HU_AUTH_MODE='direct'` gọi HTTPS Supabase Auth `/auth/v1/token?grant_type=password` bằng publishable key **công khai**, không gọi Node login gateway.
- API duy nhất: `https://rvrwfeblishqadkpzspb.supabase.co/functions/v1/api`; Deno route và xác minh JWT (ES256/RS256 qua JWKS, HS256 chỉ khi có secret), `verify_jwt=false` để preflight OPTIONS chạy không cần token; API bearer token vẫn bắt buộc cho mọi gameplay route.
- Database: **schema riêng `game`**, 5 bảng `players`, `player_receipts`, `creation_tickets`, `pavilion_accounts`, `pavilion_receipts`. Không cấp quyền hay policy RLS cho `anon` hoặc `authenticated`. Không thêm `game` vào Data API exposed schemas. Function kết nối qua `HU_DB_POOLER_URL` (Supavisor **transaction pooler, port 6543**) lấy từ dashboard > Connect. `SUPABASE_DB_URL` mặc định là direct, **không dùng** cho gameplay.
- `public.policy_acceptances` **đã tồn tại** với v5 `2026-11-10-v5`. **Không** chạy lại `supabase/sql/policy_acceptances.sql`. Edge đọc trực tiếp bảng này, đòi đủ `privacy` và `release_terms` cho route gameplay; `/me/*` chỉ cần JWT.
- Đồng hồ, RNG, phần thưởng, thọ nguyên và sự hiện diện chỉ quyết định tại backend; client không gửi state/offline/time/price/reward; snapshot không có seed, export không có rng_seed.
- Thiên Mệnh Các mới trên `main` (tích lũy qua kiếp) **được giữ**, có bảng account và receipt riêng. Mỗi hàng player được khóa `FOR UPDATE`; rate token nằm trong hàng `players` cùng giao dịch. Giới hạn theo IP chỉ còn ở Node gateway.

## 1. Kiểm tra trước migration (CHƯA chạy)

Cần Supabase CLI phiên bản hiện hành, Node 24, npm và quyền project. Xem `supabase --version`, `supabase --help`, `supabase db push --help`. CLI v3 ưu tiên `--remote` cho DB; `db push` **mặc định local**, đừng lẫn target! Đường dẫn duy nhất để migrate: `supabase/migrations/20261110075419_game_schema.sql`. Tuyệt đối không có lệnh phá dữ liệu, `db reset` production hoặc chạy lại `policy_acceptances.sql`.

```sh
npm ci
npm run check && npm test
npm run build:edge
npm run edge:budget
supabase login
supabase link --project-ref rvrwfeblishqadkpzspb
supabase migration list --remote
supabase db push --remote --dry-run
# CHỈ SAU KHI CHỦ DỰ ÁN DUYỆT MIGRATION VÀ BACKUP:
# supabase db push --remote
```

**Checklist review SQL trước khi duyệt:** xác nhận đã backup, bảng public.policy_acceptances và constraint v5 đúng, `game` không nằm trong Dashboard > Integrations > Data API > Exposed Schemas, tài khoản `postgres` của connection pooler có quyền bảng riêng, 5 bảng có `relrowsecurity=true`, `pg_policies` game rỗng, foreign keys auth.users `ON DELETE CASCADE`, state ≤64 KB, tên `name_key` unique, receipt và ticket đúng hạn. Supabase migrations có thể tạo `supabase_migrations` history; không sửa thủ công.

Sau migration được phê duyệt, dùng truy vấn đọc để kiểm chứng:

```sql
select n.nspname,c.relname,c.relrowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='game' and c.relkind='r';
select * from pg_policies where schemaname='game'; -- phải rỗng
select has_schema_privilege('anon','game','USAGE') as anon_schema,
       has_schema_privilege('authenticated','game','USAGE') as authenticated_schema,
       has_table_privilege('anon','game.players','SELECT') as anon_read,
       has_table_privilege('authenticated','game.players','SELECT') as authenticated_read;
-- Tất cả 4 giá trị = false. Chỉ chạy test SET ROLE trong transaction ROLLBACK:
begin;
set local role anon;
select * from game.players; -- phải bị permission denied
rollback;
```

Không dùng `security definer` hoặc grant bổ sung để chữa lỗi RLS. Nếu thiếu quyền kết nối function, kiểm tra user DB pooler đúng trước.

## 2. Secrets và CORS (CHỈ chuẩn bị giá trị ngoài Git)

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` được Supabase runtime cấp; **không** cố đặt bằng `secrets set` vì prefix `SUPABASE_` reserved. Publishable key ở client công khai, không phải service-role.

Bí mật do dự án tự đặt (không ghi giá trị thật vào Git, command history hoặc tài liệu):

```sh
# Đọc giá trị thực trong Supabase Dashboard; nhập qua nơi lưu secret an toàn.
# HU_DB_POOLER_URL: postgres://<DB-USER>:<PASSWORD>@<TRANSACTION-POOLER-HOST>:6543/postgres
# HU_ALLOWED_ORIGINS: https://hugioi.blackbearvn.workers.dev
supabase secrets set --env-file ./private-edge-secrets.env --project-ref rvrwfeblishqadkpzspb
# private-edge-secrets.env KHÔNG commit; chmod 0600; xóa sau khi thiết lập.
```

`private-edge-secrets.env` chứa `HU_DB_POOLER_URL`, `HU_ALLOWED_ORIGINS`; tùy chọn `HU_SYNC_INTERVAL_MS=20000`, `HU_ONLINE_GRACE_MS=60000` (grace ≥ 3× sync). Chỉ với project vẫn dùng JWT HS256, có thể đặt `HU_JWT_HS256_SECRET` (tuyệt đối không đưa vào client); nếu không, xác minh ES256/RS256 qua JWKS. Địa chỉ frontend staging phải **thêm origin đúng** vào HU_ALLOWED_ORIGINS, không dùng `*`. `_headers` hiện chỉ `connect-src 'self' https://rvrwfeblishqadkpzspb.supabase.co`, không mở rộng CSP không cần thiết.

## 3. Deploy Edge API và Cloudflare Static — sau phê duyệt riêng

```sh
npm run build:edge
# Theo hướng dẫn CLI v2; CLI v3 có thể dùng --remote=<project-ref>:
supabase functions deploy api --project-ref rvrwfeblishqadkpzspb
npm run build:min
# Cloudflare CLI: npx --yes wrangler@4.158.0 deploy
```

Kiểm tra `supabase functions deploy --help` trên phiên bản CLI cài trước khi chạy; với v3 có thể dùng `--remote=rvrwfeblishqadkpzspb`. Function `api` **một** function, `verify_jwt=false` tại `supabase/config.toml`. Artifact `game.bundle.mjs` do CI/build tạo, không commit. Test chạy `deno check` trước deploy. Trên Cloudflare, `wrangler.jsonc` chỉ chỉ tới `dist/`, không đưa `server/`, `supabase/` hoặc secret lên frontend.

GitHub Actions deploy mẫu (chỉ kích hoạt thủ công, KHÔNG thêm workflow tự deploy trong PR):

```yaml
name: Edge manual deploy
on: workflow_dispatch
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '24' }
      - run: npm ci && npm run check && npm test && npm run build:edge
      - run: npx supabase@latest functions deploy api --project-ref rvrwfeblishqadkpzspb
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

Đặt GitHub repo secret `SUPABASE_ACCESS_TOKEN` bằng giao diện secrets, hạn chế quyền environment, yêu cầu approval trước job deploy. **Không** auto-run migration, không dùng GitHub secrets trong JS client.

## 4. Cấu hình Auth

Dashboard > Authentication > Providers > Email: bật email/password, kiểm tra **Confirm email**. Site URL = `https://hugioi.blackbearvn.workers.dev`; Redirect URLs chỉ origin/callback bạn sở hữu, không wildcard bên ngoài. Thiết lập Supabase Auth rate limits, hạn mức email và nhà cung cấp gửi mail phù hợp. Bật **Leaked Password Protection** nếu gói hỗ trợ; Turnstile optional giai đoạn sau. Direct login công khai bị ràng buộc bởi chính Supabase Auth rate limits; không tuyên bố gateway Node vẫn bảo vệ Edge.

## 5. Xác minh sau deploy

- Từ terminal: `curl -i https://rvrwfeblishqadkpzspb.supabase.co/functions/v1/api/bootstrap` **không JWT** phải 401; preflight `OPTIONS` với `Origin: https://hugioi.blackbearvn.workers.dev` phải 204 và trả `Vary: Origin`, allow origin/header.
- Thử origin ngoài whitelist: không có `Access-Control-Allow-Origin`.
- Đăng ký → xác nhận email → đăng nhập trực tiếp Supabase → đồng ý đủ 2 chính sách v5 → bootstrap → gieo phiếu → tạo nhân vật → 20 lệnh → reload → so sánh revision, state và seed bị ẩn.
- Test offline 20 phút: sync đầu tiên trả 0 giây; gửi lệnh breakthrough lỗi; sync ngay sau vẫn 0 giây, không cộng tuổi/tu vi. Pause tab ẩn → reload → không được tiến triển.
- Test /me/export không có seed, /me/erase và /me/delete-account với account test riêng. Đặc biệt không thử xóa tài khoản production thật.
- Kiểm tra SQL roles bằng truy vấn ở mục 1 và chắc chắn `game` không exposed.
- Ghi CPU time sync/command (và cold-start) từ **Edge Function Metrics/Logs thực tế**; không suy ra CPU từ wall time. Kiểm tra không request vượt 2s CPU/256MB và lỗi 429/5xx; nếu vượt, rollback trước mở cho người chơi.

## 6. Rollback, sao lưu và khôi phục

Trước migration: backup Postgres bằng `supabase db dump --remote` (xem `--help`) hoặc `pg_dump` tại connection đã cấp quyền, lưu bản mã hóa ngoại tuyến cùng checksum, kiểm tra khôi phục trên DB test. Xuất từng tài khoản qua `GET /me/export` **không gồm RNG seed** nên chỉ dùng hỗ trợ người chơi, không thể tái tạo RNG bảo mật; backup Postgres toàn bộ mới khôi phục nguyên trạng gameplay.

Rollback phiên bản function: deploy lại **commit bundle cũ tương thích schema**; rollback frontend bằng asset release trước đó; **không DROP game schema hoặc chạy migration ngược phá dữ liệu** khi chưa đối chiếu backup. Nếu không tương thích schema, khóa đường ghi và restore trong cửa sổ bảo trì đã được phê duyệt. Dịch vụ Node+SQLite dev không tự đọc dữ liệu Postgres; rollback sang Node cần kế hoạch export/migrate riêng.

## 7. Hạn mức FREE và ngân sách

Theo tài liệu Supabase Edge Functions [limits](https://supabase.com/docs/guides/functions/limits) và [pricing](https://supabase.com/docs/guides/functions/pricing): 256 MB RAM, 2 giây CPU/request, bundle ≤20 MB, 150 giây wall-clock worker trên Free, request idle timeout 150 giây, 500.000 lượt function/tháng. Project free có thể bị tạm dừng sau **7 ngày không hoạt động**; không chạy cron chỉ để chống pause hay kéo dài phiên giả. Bảo vệ chi phí: không sync tab ẩn, pause khi rời, 20s heartbeat + 60s grace, bỏ sync nếu lệnh mới thành công, bootstrap bao snapshot và opportunistic bounded cleanup. Mô hình không bảo đảm mọi tổ hợp người chơi vẫn trong quota.

```sh
npm run edge:budget
node tools/simulate-edge-calls.cjs 50 1 0.5
node tools/simulate-edge-calls.cjs 50 1 2
npm run build:edge
```

Kết quả mô hình CI (50 người × mỗi ngày 1h active + 0,5h idle × 30 ngày): active **179** calls/giờ (119 lệnh + 60 sync), idle **178** sync/giờ, **408.000/500.000** calls/tháng (81,6%). Có tính bootstrap/pause mỗi phiên, **chưa tính** retry, đăng ký, spam, nhiều tab, rate-limit rejection, admin. Nếu >500.000 trong dự đoán cho lưu lượng thực, **không triển khai gói Free** nếu chưa đổi thiết kế/giảm giờ. Người treo máy 24h/ngày vượt ngân sách nhanh.

Bundle esbuild đo bằng `npm run build:edge` trên GitHub Actions Node24: **470.291 bytes (0,449 MiB)**, không đồng nghĩa kích thước packed final của Supabase CLI; cần kiểm tra khi deploy. Thời gian khởi động lạnh Deno/Edge và CPU sync/command thực tế **chưa đo được** khi chưa chạy Edge; không giả định <200ms. Có thể dùng `deno eval` import bundle để đo module load cục bộ (không thay thế cold start production) và Edge Metrics để đo sau phê duyệt.

## Tài liệu nền đã đối chiếu

- Supabase Edge Postgres: https://supabase.com/docs/guides/functions/connect-to-postgres
- Supabase Edge limits: https://supabase.com/docs/guides/functions/limits
- Supabase Edge pricing: https://supabase.com/docs/guides/functions/pricing
- Supabase CLI v3 database commands: https://supabase.com/docs/guides/local-development/cli/migrating-to-v3
- Cloudflare Worker static _headers: https://developers.cloudflare.com/workers/static-assets/headers/
- Deno Node interoperability: https://docs.deno.com/runtime/fundamentals/node/
