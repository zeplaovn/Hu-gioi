# Triển khai Hư Giới: Cloudflare Static + Supabase Edge API (FREE)

> Trạng thái: Hiện hành. Hồ sơ chính: [SYSTEM](SYSTEM.md); không dùng hướng dẫn Node/SQLite cũ.
> **Thông tin bàn giao production ngày 10/11/2026 chưa được xác minh qua Dashboard.** Mã nguồn hiện hành ngày 11/11/2026 đã có các migration bổ sung chat/ranking và chính sách `2026-11-11-v7`. Trước khi deploy phải kiểm tra lịch sử migration thực tế, `HU_DB_POOLER_URL`, `HU_ALLOWED_ORIGINS` và policy v7; không giả định database đã được cập nhật chỉ vì file có trong Git. Không chạy lại bất kỳ migration đã áp dụng. Backend Edge là mục tiêu phát hành; Node/SQLite chỉ cho dev/test. Gói Free không bảo đảm uptime.

## Kiến trúc và ranh giới tin cậy

- Trang tĩnh: Cloudflare Worker assets, origin `https://hugioi.redeyestudio.workers.dev`. `index.html` nạp `client/config.js` **trước** `remote-session.js` và `auth/supabase.js`; CSP chỉ `script-src 'self'`. `HU_AUTH_MODE='direct'` gọi HTTPS Supabase Auth `/auth/v1/token?grant_type=password` bằng publishable key **công khai**, không gọi Node login gateway.
- API duy nhất: `https://rvrwfeblishqadkpzspb.supabase.co/functions/v1/api`; Deno route và xác minh JWT (ES256/RS256 qua JWKS, HS256 chỉ khi có secret), `verify_jwt=false` để preflight OPTIONS chạy không cần token; API bearer token vẫn bắt buộc cho mọi gameplay route.
- Database: **schema riêng `game`**, 11 bảng theo migrations hiện hành: `players`, `player_receipts`, `creation_tickets`, `pavilion_accounts`, `pavilion_receipts`, `world_chat_messages`, `world_chat_presence`, `player_leaderboard`, `account_state`, `account_receipts`, `account_mail`. Không cấp quyền hay policy RLS cho `anon` hoặc `authenticated`. Không thêm `game` vào Data API exposed schemas. Function kết nối qua `HU_DB_POOLER_URL` (Supavisor **transaction pooler, port 6543**) lấy từ dashboard > Connect. `SUPABASE_DB_URL` mặc định là direct, **không dùng** cho gameplay.
- `public.policy_acceptances` có các version lịch sử; runtime hiện tại **chỉ chấp nhận consent v7 `2026-11-11-v7`**. Migration `20261111023603_v7_consent_and_deceased_leaderboard.sql` bổ sung constraint v7. **Không** chạy lại `supabase/sql/policy_acceptances.sql`. Edge đọc trực tiếp bảng này, đòi đủ `privacy` và `release_terms` cho route gameplay; `/me/*` chỉ cần JWT.
- Đồng hồ, RNG, phần thưởng, thọ nguyên và sự hiện diện chỉ quyết định tại backend; client không gửi state/offline/time/price/reward; snapshot không có seed, export không có rng_seed.
- Thiên Mệnh Các trên `main` chỉ có hiệu lực trong **kiếp hiện tại**; reset sau tử vong xóa cả kho, dù bảng account và receipt được tách riêng. Mỗi hàng player được khóa `FOR UPDATE`; rate token nằm trong hàng `players` cùng giao dịch. Giới hạn theo IP chỉ còn ở Node gateway.

## Trước khi mở cho người chơi — [checklist bàn giao](release-checklist.md)

> **Checklist thao tác TAY trên Supabase/Cloudflare production — chưa được CI kiểm chứng.** CI/PGlite chỉ kiểm tra mã và database giả lập; không chứng minh Dashboard, secrets, hạn mức hay luồng người chơi thật đã sẵn sàng. Chủ dự án phải tích từng ô, lưu bằng chứng cấu hình **không chứa token, mật khẩu hoặc connection string**.

- [ ] **Policy consent v7 trước Edge deploy:** Kiểm tra constraint `public.policy_acceptances` bằng `pg_get_constraintdef` và lịch sử Supabase Migrations; xác nhận version `2026-11-11-v7` hợp lệ. Nếu migration v7 chưa được áp dụng, **dừng deploy và xin duyệt migration tương ứng**; không sửa constraint trực tiếp trên production hoặc chạy lại v5/v6. Lưu bằng chứng xác minh đã che dữ liệu tài khoản.
- [ ] **Secrets / runtime:** Kiểm tra `SUPABASE_URL` do Supabase Edge runtime cấp; đặt `HU_DB_POOLER_URL` đúng URI **transaction pooler cổng 6543**, và đặt tường minh `HU_ALLOWED_ORIGINS` là các origin frontend được duyệt (không có `*`). Thiếu/sai `SUPABASE_URL` hoặc `HU_DB_POOLER_URL` khiến function **fail-fast khi khởi động**. Hiện mã có fallback `HU_ALLOWED_ORIGINS` về origin Cloudflare chính thức nếu chưa đặt, **nhưng checklist production bắt buộc đặt tường minh**. Chỉ ghi trạng thái có/không, không chụp giá trị secret.
- [ ] **Supabase Auth:** Tại Dashboard kiểm tra giới hạn tốc độ đăng nhập/đăng ký và gửi email, **CAPTCHA nếu khả dụng**, xác nhận email đang bật, Site URL và redirect allowlist hợp lệ. Chụp bằng chứng vào checklist vận hành (che địa chỉ cá nhân, token và các bí mật).
- [ ] **Hạn mức Free và cảnh báo:** Cấu hình cảnh báo/thủ tục theo dõi số lượt gọi **Edge Functions** và **dung lượng PostgreSQL**, kèm ngưỡng cảnh báo phù hợp với hạn mức gói miễn phí. Edge API có **URL công khai** nên request rác, request bị từ chối và nhiều tab vẫn có thể tính vào hạn mức; không xem test quota nội bộ là cam kết chi phí.
- [ ] **Smoke thật sau deploy:** Chạy lại mục **“5. Xác minh sau deploy”** trên Supabase/Cloudflare production: kiểm tra OPTIONS 204, không có JWT → 401, đăng nhập thật → consent v7 → bootstrap → preview → tạo nhân vật thử → lệnh → reload và đối chiếu dữ liệu PostgreSQL; kiểm tra metrics và rollback. Dùng tài khoản test riêng, **không thực hiện xóa tài khoản thật**.

**Trạng thái khi checklist chưa được chủ dự án xác nhận:** *chưa được CI kiểm chứng; chưa mở cho người chơi*.

## 1. Kiểm tra trước migration (CHƯA chạy)

Cần Supabase CLI phiên bản hiện hành, Node 24, npm và quyền project. Xem `supabase --version`, `supabase --help`, `supabase db push --help`. CLI v3 ưu tiên `--remote` cho DB; `db push` **mặc định local**, đừng lẫn target! Nguồn migration duy nhất là **toàn bộ tập tin có thứ tự trong `supabase/migrations/`**, gồm migration schema gốc, cleanup indexes và các migration xã hội/policy ngày 11/11; đối chiếu history trước khi làm bất kỳ thay đổi nào. Tuyệt đối không có lệnh phá dữ liệu, `db reset` production hoặc chạy lại `policy_acceptances.sql`.

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

**Checklist review SQL trước khi duyệt:** xác nhận đã backup, bảng public.policy_acceptances và constraint v7 đúng, `game` không nằm trong Dashboard > Integrations > Data API > Exposed Schemas, tài khoản `postgres` của connection pooler có quyền bảng riêng, 11 bảng có `relrowsecurity=true`, `pg_policies` game rỗng, foreign keys auth.users `ON DELETE CASCADE`, state ≤64 KB, tên `name_key` unique, receipt và ticket đúng hạn. Migration nhiệm vụ ngày `20261112020000_daily_mail_checkin.sql` tạo `account_state`, `account_receipts`, `account_mail` và cron `hugioi-cleanup-account-receipts`; chỉ áp sau khi chủ dự án duyệt. Migration tối ưu chat `20261112030000_chat_unlogged_ttl_5m.sql` (nhánh §11.1) chuyển hai bảng chat sang UNLOGGED, thêm `last_chat_at` và cron `hugioi-cleanup-chat` 5 phút; cần cửa sổ bảo trì ngắn vì migration copy rồi đổi tên bảng. Rollback thủ công ở `supabase/sql/rollback/20261112030000_chat_unlogged_ttl_5m_rollback.sql`. Supabase migrations có thể tạo `supabase_migrations` history; không sửa thủ công.

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

Sau khi migration chat được duyệt, kiểm tra thêm:

```sql
select c.relname, c.relpersistence
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'game' and c.relname in ('world_chat_messages','world_chat_presence');
-- cả hai phải là 'u' (UNLOGGED)
select jobname, schedule from cron.job where jobname = 'hugioi-cleanup-chat';
-- phải có đúng một job, schedule '*/5 * * * *'
```

Không dùng `security definer` hoặc grant bổ sung để chữa lỗi RLS. Nếu thiếu quyền kết nối function, kiểm tra user DB pooler đúng trước.

## 2. Secrets và CORS (CHỈ chuẩn bị giá trị ngoài Git)

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` được Supabase runtime cấp; **không** cố đặt bằng `secrets set` vì prefix `SUPABASE_` reserved. Publishable key ở client công khai, không phải service-role.

Bí mật do dự án tự đặt (không ghi giá trị thật vào Git, command history hoặc tài liệu):

```sh
# Đọc giá trị thực trong Supabase Dashboard; nhập qua nơi lưu secret an toàn.
# HU_DB_POOLER_URL: postgres://<DB-USER>:<PASSWORD>@<TRANSACTION-POOLER-HOST>:6543/postgres
# HU_ALLOWED_ORIGINS: https://hugioi.redeyestudio.workers.dev
supabase secrets set --env-file ./private-edge-secrets.env --project-ref rvrwfeblishqadkpzspb
# private-edge-secrets.env KHÔNG commit; chmod 0600; xóa sau khi thiết lập.
```

`HU_ALLOWED_ORIGINS` nếu chưa đặt sẽ mặc định duy nhất origin Cloudflare chính thức `https://hugioi.redeyestudio.workers.dev`; cấu hình secret tường minh vẫn được khuyến nghị và bắt buộc để thêm staging. Không dùng wildcard.\n\n`private-edge-secrets.env` chứa `HU_DB_POOLER_URL`, `HU_ALLOWED_ORIGINS`; tùy chọn `HU_SYNC_INTERVAL_MS`, `HU_ONLINE_GRACE_MS` (tham khảo `server/presence-config.js`) (grace ≥ 3× sync). Chỉ với project vẫn dùng JWT HS256, có thể đặt `HU_JWT_HS256_SECRET` (tuyệt đối không đưa vào client); nếu không, xác minh ES256/RS256 qua JWKS. Địa chỉ frontend staging phải **thêm origin đúng** vào HU_ALLOWED_ORIGINS, không dùng `*`. `_headers` hiện chỉ `connect-src 'self' https://rvrwfeblishqadkpzspb.supabase.co`, không mở rộng CSP không cần thiết.

Biến tùy chọn để giảm lượt gọi mạng (không phải secret; đặt cùng cách với secret nếu muốn đổi):

| Biến | Mặc định | Giới hạn | Ý nghĩa |
|---|---|---|---|
| `HU_AUTH_CACHE_MS` | `0` (tắt) | 0–30000 | Cache kết quả xác minh JWT **thành công** trong một isolate. Tắt = hỏi Supabase Auth ở mọi request. Bật thì token bị thu hồi/đăng xuất vẫn dùng được tối đa chừng ấy ms; token bị từ chối và lỗi dịch vụ không bao giờ được cache. |
| `HU_CONSENT_CACHE_MS` | `300000` | 0–900000 | Cache kết quả kiểm tra chấp thuận chính sách. Hiện không có luồng rút lại chấp thuận; đổi `POLICY_VERSION` cần deploy lại và các isolate cũ có thể giữ cache tới chừng ấy ms. |

Không bật `HU_AUTH_CACHE_MS` khi chưa xác nhận chấp nhận độ trễ thu hồi phiên; đây là quyết định bảo mật của chủ dự án.

## 2b. Biến môi trường build (Cloudflare, dùng chung tên với Hugioi-dashboard)

`tools/build-dist.cjs` đọc các biến công khai sau lúc build và đưa vào `dist/` (mã client, `index.html` và `_headers` CSP):

| Biến | Tác dụng |
| --- | --- |
| `SUPABASE_URL` | `https://<project>.supabase.co`; thay URL trong adapter và `connect-src` |
| `SUPABASE_PUBLISHABLE_KEY` | khóa `sb_publishable_...`; từ chối `sb_secret_` / `service_role` |
| `HCAPTCHA_SITEKEY` | bật hCaptcha ở form đăng nhập/đăng ký (rỗng = tắt) |

Không đặt biến thì giữ mặc định trong mã nguồn. Chỉ bật CAPTCHA trong Supabase Auth sau khi game và dashboard đều đã có sitekey, vì CAPTCHA áp dụng cho cả project.

## 3. Deploy Edge API và Cloudflare Static — sau phê duyệt riêng

```sh
npm run build:edge
# CLI v3: --remote=<project-ref>; --yes bắt buộc khi không có TTY (CI):
supabase functions deploy api --remote=rvrwfeblishqadkpzspb --no-verify-jwt --yes
npm run build:min
# Cloudflare CLI: npx --yes wrangler@4.158.0 deploy
```

**B3 — Workflow deploy chính thức:** `.github/workflows/edge-bundle-build.yml` chạy **thủ công** qua GitHub Actions → `workflow_dispatch` từ `main`. Runner chạy `npm ci`, kiểm tra, sinh `supabase/functions/api/game.bundle.mjs` bằng `npm run build:edge`, chạy Deno check/test, rồi mới gọi Supabase CLI deploy. Bundle được `.gitignore` loại trừ và **không có trong Git**; `_bundle_entry.mjs` vẫn là source. Nếu chưa có GitHub Actions secret `SUPABASE_ACCESS_TOKEN`, workflow dừng ở bước kiểm tra secret với thông báo rõ ràng, **không deploy**; không dán token vào chat/repo. Nhánh cũ `ops/edge-bundle-deploy-20261110` chỉ còn là tồn dư của cách commit bundle tạm, **không dùng để deploy nữa và không xóa khi chưa hỏi chủ dự án**.

Kiểm tra `supabase functions deploy --help` trên phiên bản CLI cài trước khi chạy; với v3 dùng `--remote=rvrwfeblishqadkpzspb` và luôn thêm `--yes` khi chạy trong CI (không có TTY để xác nhận). Function `api` **một** function, `verify_jwt=false` tại `supabase/config.toml`. Artifact `game.bundle.mjs` do CI/build tạo, không commit. Test chạy `deno check` trước deploy. Trên Cloudflare, `wrangler.jsonc` chỉ chỉ tới `dist/`, không đưa `server/`, `supabase/` hoặc secret lên frontend.

Mẫu lệnh tham khảo cho quy trình deploy thủ công; workflow được duy trì chính thức trong `.github/workflows/edge-bundle-build.yml` (không tự chạy khi push):

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
      - run: npx supabase@latest functions deploy api --remote=rvrwfeblishqadkpzspb --no-verify-jwt --yes
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

Đặt GitHub repo secret `SUPABASE_ACCESS_TOKEN` bằng giao diện secrets, hạn chế quyền environment, yêu cầu approval trước job deploy. **Không** auto-run migration, không dùng GitHub secrets trong JS client.

## 4. Cấu hình Auth

Dashboard > Authentication > Providers > Email: bật email/password, kiểm tra **Confirm email**. Site URL = `https://hugioi.redeyestudio.workers.dev`; Redirect URLs chỉ origin/callback bạn sở hữu, không wildcard bên ngoài. Thiết lập Supabase Auth rate limits, hạn mức email và nhà cung cấp gửi mail phù hợp. Bật **Leaked Password Protection** nếu gói hỗ trợ; Turnstile optional giai đoạn sau. Direct login công khai bị ràng buộc bởi chính Supabase Auth rate limits; không tuyên bố gateway Node vẫn bảo vệ Edge.

### Đăng nhập Google OAuth (chỉ sau khi cấu hình Dashboard)

- Tạo Google OAuth Client **Web application** trong Google Cloud Console. Authorized redirect URI tại Google phải là `https://rvrwfeblishqadkpzspb.supabase.co/auth/v1/callback` (đây là callback của Supabase, **không** phải URL Cloudflare). Cấu hình OAuth consent screen, test users và chính sách xuất bản phù hợp.
- Supabase Dashboard > Authentication > Providers > Google: bật provider, nhập **Client ID** và **Client Secret** tại Dashboard (không commit vào Git hoặc đưa vào client).
- Supabase Dashboard > Authentication > URL Configuration: Site URL `https://hugioi.redeyestudio.workers.dev`, thêm chính URL này vào Redirect URLs; với staging dùng allowlist chính xác, không wildcard tùy tiện. Frontend khởi tạo Authorization Code + PKCE S256, chuyển hướng qua Supabase Auth và đổi `code` lấy phiên bằng `/auth/v1/token?grant_type=pkce`.
- Chế độ Google chỉ áp dụng `HU_AUTH_MODE='direct'` và HTTPS (hoặc localhost). PKCE verifier chỉ lưu ở `sessionStorage`, mã OAuth được dọn khỏi URL trước khi đổi token. Không nhận JWT trực tiếp từ URL fragment. Browser cần cho phép sessionStorage và Web Crypto.
- Xác minh bằng tài khoản Google thử nghiệm: redirect Google → Supabase callback → Cloudflare → xác minh `/auth/v1/user` → **consent v7** → bootstrap/reload/logout. Thử từ chối quyền Google, refresh tab trong lúc redirect, và mở URL callback ngoài phiên gốc; không được tự động nhận token.
- Tài khoản email/password cũ được giữ nguyên; việc gộp tài khoản với Google phụ thuộc hành vi liên kết danh tính của Supabase. Không tự gộp người chơi chỉ theo địa chỉ email.

### Kiểm tra version consent của Edge đã triển khai (bắt buộc)

Mã nguồn cùng dùng `2026-11-11-v7` ở `client/auth/supabase.js`, `server/auth/consent.js` và `supabase/functions/api/index.ts`. **CI chỉ kiểm tra mã nguồn; Edge Function đã deploy có thể vẫn đang chạy bản cũ.** Ngày 11/11/2026, test nội bộ phát hiện Edge deployment v7 vẫn chứa `POLICY_VERSION = '2026-11-10-v5'`, nên người dùng đã chấp thuận v7 vẫn gặp `CONSENT_REQUIRED` tại `/bootstrap`. Đã hotfix Edge deployment v8 bằng cách thay **duy nhất** constant đó thành `2026-11-11-v7`; dữ liệu consent/Auth không bị thay đổi.

Sau **mỗi lần** deploy Edge: dùng Supabase Dashboard → Edge Functions → `api` → Source (hoặc API quản trị `get_edge_function`) để đọc **mã của bản đang ACTIVE**, không chỉ file Git, và so `POLICY_VERSION` với `HU_SUPABASE.VERSION`. Cần đủ hai consent `privacy` và `release_terms` của **cùng người dùng và cùng version**; không tự thêm v5 hoặc bỏ qua kiểm tra consent để chữa lỗi. Bằng tài khoản test thật: xác nhận `GET /bootstrap` trả 200 sau khi accept v7, refresh trang và xác nhận phiên tiếp tục; thử tài khoản chưa accept phải vẫn bị từ chối. Không dán JWT/password vào ticket, log hoặc ảnh.

## 5. Xác minh sau deploy

- Từ terminal: `curl -i https://rvrwfeblishqadkpzspb.supabase.co/functions/v1/api/bootstrap` **không JWT** phải 401; preflight `OPTIONS` với `Origin: https://hugioi.redeyestudio.workers.dev` phải 204 và trả `Vary: Origin`, allow origin/header.
- Thử origin ngoài whitelist: không có `Access-Control-Allow-Origin`.
- Đăng ký → xác nhận email → đăng nhập trực tiếp Supabase → đồng ý đủ 2 chính sách v7 → bootstrap → gieo phiếu → tạo nhân vật → 20 lệnh → reload → so sánh revision, state và seed bị ẩn.
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

Bundle esbuild đo bằng `npm run build:edge` trên GitHub Actions Node24: **kích thước đọc trong log của commit triển khai**, không đồng nghĩa kích thước packed final của Supabase CLI; cần kiểm tra khi deploy. Thời gian khởi động lạnh Deno/Edge và CPU sync/command thực tế **chưa đo được** khi chưa chạy Edge; không giả định <200ms. Có thể dùng `deno eval` import bundle để đo module load cục bộ (không thay thế cold start production) và Edge Metrics để đo sau phê duyệt.

## Tài liệu nền đã đối chiếu

- Supabase Edge Postgres: https://supabase.com/docs/guides/functions/connect-to-postgres
- Supabase Edge limits: https://supabase.com/docs/guides/functions/limits
- Supabase Edge pricing: https://supabase.com/docs/guides/functions/pricing
- Supabase CLI v3 database commands: https://supabase.com/docs/guides/local-development/cli/migrating-to-v3
- Cloudflare Worker static _headers: https://developers.cloudflare.com/workers/static-assets/headers/
- Deno Node interoperability: https://docs.deno.com/runtime/fundamentals/node/
