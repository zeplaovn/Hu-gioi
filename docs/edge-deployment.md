# Triển khai Hư Giới: Cloudflare Static + Supabase Edge API

> Trạng thái: Hiện hành. Hồ sơ chính: [SYSTEM](SYSTEM.md). **Chưa phải playbook production đã nghiệm thu.** Mọi thao tác deploy/migration phải được chủ dự án duyệt; không chạy lại migration đã áp dụng.

## 0. Trạng thái triển khai đã biết

- Trang tĩnh: Cloudflare Workers Static Assets, origin `https://hugioi.redeyestudio.workers.dev`, phục vụ `dist/`.
- API: Supabase Edge Function `api`, project `rvrwfeblishqadkpzspb`; bundle Deno được tạo bởi `npm run build:edge`, **không commit**.
- Database: PostgreSQL private schema `game` qua Supavisor **transaction pooler cổng 6543**.
- **Mã nguồn hiện tại:** 13 bảng `game`, 6 migration, 23 route, consent `2026-11-11-v7`, chat TTL 1 giờ/UNLOGGED.
- **Bản ghi dự án:** migration chat `20261112030000_chat_unlogged_ttl_5m.sql` đã áp dụng production ngày 12/11/2026; Edge bundle **version 26** đã deploy cùng ngày. Repository không thể tự xác minh Dashboard; phải đối chiếu lịch sử migration và mã ACTIVE trước khi thao tác.
- **Chưa có bằng chứng** authenticated smoke 200 đầy đủ trên thiết bị thật sau version 26; chưa đo WAL/latency/p95. Gói Free không bảo đảm uptime.

## 1. Kiến trúc và ranh giới tin cậy

- `index.html` nạp `client/config.js` **trước** `remote-session.js` và `auth/supabase.js`; CSP chỉ `script-src 'self'` cùng origin hCaptcha.
- `HU_AUTH_MODE='direct'` gọi HTTPS Supabase Auth `/auth/v1/token?grant_type=password` bằng publishable key **công khai**, không qua Node login gateway.
- API duy nhất: `https://rvrwfeblishqadkpzspb.supabase.co/functions/v1/api`. `verify_jwt=false` trong `supabase/config.toml` để preflight OPTIONS chạy; code vẫn bắt buộc bearer JWT cho mọi route gameplay.
- Client chỉ gửi intent + `requestId` + `expectedVersion`; không gửi state, thời gian, RNG, giá hay phần thưởng.
- Không còn server Node/SQLite: production chỉ gồm Cloudflare static + Supabase Edge. Test dùng kho in-memory và PGlite; `tools/online-ci-server.cjs` chỉ cho Playwright CI.
- Thiên Mệnh Các có hiệu lực trong kiếp hiện tại; reset sau tử vong xóa kho, dù bảng account/receipt tách riêng.

## 2. Checklist trước khi deploy

> Checklist thao tác tay trên Supabase/Cloudflare; CI/PGlite chỉ kiểm tra mã và database giả lập.

- [ ] **Consent v7:** kiểm tra constraint `public.policy_acceptances` có `2026-11-11-v7`; runtime chỉ chấp nhận `privacy` + `release_terms` cùng version. Nếu thiếu, dừng deploy và xin duyệt migration.
- [ ] **Secrets:** `HU_DB_POOLER_URL` đúng transaction pooler 6543; `HU_ALLOWED_ORIGINS` là allowlist tường minh, không `*`; `SUPABASE_URL` do runtime cấp. Không ghi giá trị secret vào tài liệu/log.
- [ ] **Auth:** kiểm tra rate limit đăng nhập/đăng ký/email, CAPTCHA nếu dùng, xác nhận email, Site URL và redirect allowlist.
- [ ] **Database:** `game` không nằm trong Data API exposed schemas; 13 bảng bật RLS; `pg_policies` của `game` rỗng; `anon`/`authenticated` không có quyền bảng; foreign key `auth.users` `ON DELETE CASCADE`.
- [ ] **Migration:** đối chiếu `supabase migration list --remote`; không chạy lại baseline hoặc migration đã áp dụng. Baseline hợp nhất có thể xóa dữ liệu `game` khi chạy trên môi trường có dữ liệu.
- [ ] **Hạn mức/cảnh báo:** theo dõi Edge calls, dung lượng/WAL PostgreSQL, lỗi 429/5xx, chi phí. Request rác và nhiều tab vẫn tính quota.
- [ ] **CI:** `npm run check`, `npm test`, `npm run build:min`, `npm run build:edge`, `npm run edge:budget` xanh trên commit cuối.
- [ ] **Smoke staging:** JWT/consent → bootstrap → preview/tạo nhân vật → lệnh/replay → sync/pause → chat 4 kênh → ranking → daily/checkin/mail → reset sau tử vong. Dùng tài khoản test riêng.

## 3. Kiểm tra migration (chỉ đọc trước)

Cần Supabase CLI hiện hành, Node 24, npm và quyền project.

```sh
npm ci
npm run check && npm test
npm run build:edge
npm run edge:budget
supabase login
supabase link --project-ref rvrwfeblishqadkpzspb
supabase migration list --remote
supabase db push --remote --dry-run
# CHỈ SAU KHI CHỦ DỰ ÁN DUYỆT MIGRATION VÀ CÓ BACKUP:
# supabase db push --remote
```

**6 migration trong tree:**

1. `20261112001142_unified_baseline.sql` — baseline hợp nhất (schema, RLS, trigger rank, admin RPC). **Có thể xóa dữ liệu `game` khi chạy trên môi trường có dữ liệu.**
2. `20261112013428_admin_chat_send.sql` — RPC chat admin.
3. `20261112014658_cleanup_expired_data.sql` — dọn receipt/ticket/audit mỗi 3 giờ.
4. `20261112015036_cleanup_chat_messages.sql` — dọn chat cũ.
5. `20261112020000_daily_mail_checkin.sql` — 3 bảng tài khoản + cron `hugioi-cleanup-account-receipts` (`15 */3 * * *`).
6. `20261112030000_chat_unlogged_ttl_5m.sql` — chat UNLOGGED, TTL 1 giờ, cron `hugioi-cleanup-chat` (`*/5 * * * *`).

Sau migration, kiểm chứng bằng truy vấn đọc:

```sql
select n.nspname, c.relname, c.relrowsecurity, c.relpersistence
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'game' and c.relkind = 'r';
-- 13 bảng; relrowsecurity = true; hai bảng chat có relpersistence = 'u'

select * from pg_policies where schemaname = 'game'; -- phải rỗng

select has_schema_privilege('anon','game','USAGE') as anon_schema,
       has_schema_privilege('authenticated','game','USAGE') as authenticated_schema,
       has_table_privilege('anon','game.players','SELECT') as anon_read,
       has_table_privilege('authenticated','game.players','SELECT') as authenticated_read;
-- Cả 4 giá trị = false

select jobname, schedule from cron.job
where jobname in ('hugioi-cleanup-chat','hugioi-cleanup-account-receipts');
-- đúng lịch */5 * * * * và 15 */3 * * *
```

Không dùng `SECURITY DEFINER` hoặc grant bổ sung để chữa lỗi RLS. Nếu thiếu quyền kết nối function, kiểm tra user DB pooler trước.

## 4. Secrets và CORS

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` do Supabase runtime cấp; prefix `SUPABASE_` reserved, không đặt lại bằng `secrets set`.

Bí mật dự án tự đặt (không ghi giá trị thật vào Git, command history hoặc tài liệu):

```sh
# HU_DB_POOLER_URL:
# postgres://<DB-USER>:<PASSWORD>@<TRANSACTION-POOLER-HOST>:6543/postgres
# HU_ALLOWED_ORIGINS:
# https://hugioi.redeyestudio.workers.dev
supabase secrets set --env-file ./private-edge-secrets.env --project-ref rvrwfeblishqadkpzspb
# private-edge-secrets.env KHÔNG commit; chmod 0600; xóa sau khi thiết lập.
```

`HU_ALLOWED_ORIGINS` nếu chưa đặt sẽ mặc định origin Cloudflare chính thức; production bắt buộc đặt tường minh, thêm staging origin nếu có. Không dùng wildcard. `private-edge-secrets.env` có thể chứa tùy chọn `HU_SYNC_INTERVAL_MS`, `HU_ONLINE_GRACE_MS` (grace ≥ 3× sync). Project dùng JWT HS256 có thể đặt `HU_JWT_HS256_SECRET`; nếu không, xác minh ES256/RS256 qua JWKS.

Biến tinh chỉnh (không phải secret):

| Biến | Mặc định | Giới hạn | Ý nghĩa |
|---|---:|---:|---|
| `HU_AUTH_CACHE_MS` | `0` (tắt) | 0–30000 | Cache xác minh JWT thành công trong isolate; token bị thu hồi có thể dùng tới 30 giây. Không cache lỗi. |
| `HU_CONSENT_CACHE_MS` | `300000` | 0–900000 | Cache consent; đổi policy cần deploy lại. |

Không bật `HU_AUTH_CACHE_MS` khi chưa chấp nhận độ trễ thu hồi phiên.

### Biến build Cloudflare

`tools/build-dist.cjs` đọc biến công khai lúc build:

| Biến | Tác dụng |
|---|---|
| `SUPABASE_URL` | `https://<project>.supabase.co`; thay URL adapter và `connect-src` |
| `SUPABASE_PUBLISHABLE_KEY` | khóa `sb_publishable_...`; từ chối `sb_secret_...`/`service_role` |
| `HCAPTCHA_SITEKEY` | bật hCaptcha ở đăng nhập/đăng ký (rỗng = tắt) |

Chỉ bật CAPTCHA trong Supabase Auth sau khi game và dashboard đều gửi `captcha_token`, vì CAPTCHA áp dụng cho cả project.

## 5. Deploy Edge và Cloudflare (sau phê duyệt riêng)

```sh
npm run build:edge
supabase functions deploy api --remote=rvrwfeblishqadkpzspb --no-verify-jwt --yes
npm run build:min
npx --yes wrangler@4.158.0 deploy
```

Workflow chính thức: `.github/workflows/edge-bundle-build.yml`, chạy thủ công bằng `workflow_dispatch` từ `main`. Runner chạy `npm ci`, kiểm tra, `npm run build:edge`, Deno check/test, rồi mới deploy. Bundle bị `.gitignore` loại trừ; `_bundle_entry.mjs` là source. Nếu thiếu secret `SUPABASE_ACCESS_TOKEN`, workflow dừng, **không deploy**. Không dán token vào chat/repo.

`game.bundle.mjs` do CI/build tạo, không commit. `wrangler.jsonc` chỉ trỏ `dist/`, không đưa `server/`, `supabase/` hoặc secret lên frontend.

## 6. Cấu hình Auth

Dashboard > Authentication > Providers > Email: bật email/password, kiểm tra **Confirm email**. Site URL = `https://hugioi.redeyestudio.workers.dev`; Redirect URLs chỉ origin/callback sở hữu, không wildcard. Thiết lập rate limit, hạn mức email và nhà cung cấp gửi mail. Bật **Leaked Password Protection** nếu gói hỗ trợ.

### Google OAuth (chỉ sau khi cấu hình Dashboard)

- Google OAuth Client **Web application**; Authorized redirect URI: `https://rvrwfeblishqadkpzspb.supabase.co/auth/v1/callback` (callback Supabase, không phải Cloudflare).
- Bật provider Google trong Supabase, nhập Client ID/Secret tại Dashboard; không commit.
- Site URL và Redirect URLs phải khớp origin staging/production, không wildcard tùy tiện.
- Frontend dùng Authorization Code + PKCE S256; verifier chỉ ở `sessionStorage`; mã OAuth được dọn khỏi URL trước khi đổi token. Không nhận JWT trực tiếp từ URL fragment.
- Kiểm thử: redirect → callback → Cloudflare → `/auth/v1/user` → consent v7 → bootstrap/reload/logout; thử từ chối quyền, refresh giữa redirect và mở callback ngoài phiên.

### Kiểm tra consent của Edge ACTIVE

Mã nguồn dùng `2026-11-11-v7` ở `client/auth/supabase.js`, `server/auth/consent.js` và `supabase/functions/api/index.ts`. **CI chỉ kiểm tra mã nguồn; bản ACTIVE có thể cũ.** Sau mỗi deploy, đọc source của function `api` trên Dashboard (hoặc API quản trị) và so `POLICY_VERSION`, không chỉ xem Git. Cần đủ `privacy` + `release_terms` cùng user, cùng version; không thêm version cũ hoặc bỏ kiểm tra consent để chữa lỗi.

## 7. Xác minh sau deploy

- `curl -i https://rvrwfeblishqadkpzspb.supabase.co/functions/v1/api/bootstrap` không JWT phải **401**.
- `OPTIONS` với `Origin: https://hugioi.redeyestudio.workers.dev` phải **204**, có `Vary: Origin` và allow origin/header đúng.
- Origin ngoài whitelist không có `Access-Control-Allow-Origin`.
- Đăng ký → xác nhận email → đăng nhập → consent v7 → bootstrap → preview → tạo nhân vật thử → 20 lệnh → reload → so revision/state; export không có seed.
- Offline 20 phút: sync đầu trả 0 giây; lệnh breakthrough bị từ chối; không cộng tuổi/tu vi. Pause tab ẩn → reload → không tiến triển.
- Chat: kênh thế giới/tông môn/đạo hữu/đạo lữ; gửi dưới 15 giây bị chặn; replay cùng `requestId` trả kết quả cũ; tin quá 1 giờ không trả; cron 5 phút chạy.
- Ranking: top 50 theo power/realm; nhân vật chết không còn trên bảng.
- Daily/checkin/mail: reset UTC+7, claim/replay không cộng hai lần, mail quà chỉ nhận một lần.
- Reset sau tử vong: xóa player, pavilion, rank; Auth và consent còn.
- Kiểm tra CPU time sync/command và cold start từ Edge Metrics thực tế; không suy ra từ wall time. Nếu vượt giới hạn CPU/RAM hoặc lỗi 429/5xx tăng, rollback trước khi mở cho người chơi.

## 8. Rollback, sao lưu và khôi phục

- Trước migration: backup Postgres bằng `supabase db dump --remote` hoặc `pg_dump`, lưu bản mã hóa ngoại tuyến cùng checksum; kiểm tra khôi phục trên DB test.
- Rollback function: deploy lại bundle cũ **tương thích schema**. Rollback frontend: phát hành asset trước đó.
- Rollback chat: `supabase/sql/rollback/20261112030000_chat_unlogged_ttl_5m_rollback.sql` (đổi bảng về LOGGED, unschedule cron, khôi phục RPC admin chat; giữ dữ liệu).
- Không DROP schema `game` hoặc chạy migration ngược phá dữ liệu khi chưa đối chiếu backup. Nếu schema không tương thích, khóa đường ghi và restore trong cửa sổ bảo trì đã duyệt.
- `GET /me/export` không gồm RNG seed; chỉ dùng hỗ trợ người chơi. Backup Postgres toàn bộ mới khôi phục nguyên trạng gameplay.

## 9. Hạn mức Free và ngân sách

Theo tài liệu Supabase Edge Functions (limits/pricing), kiểm tra lại tại ngày deploy: khoảng 256 MB RAM, 2 giây CPU/request, bundle ≤20 MB, 500.000 lượt function/tháng; project Free có thể bị tạm dừng sau 7 ngày không hoạt động. Không chạy cron chỉ để chống pause.

```sh
npm run edge:budget
node tools/simulate-edge-calls.cjs 50 1 0.5
node tools/simulate-edge-calls.cjs 50 1 2
```

Mô hình CI cũ (50 người × 1h active + 0,5h idle/ngày × 30 ngày) cho khoảng **408.000/500.000** calls/tháng, **chưa tính** retry, đăng ký, spam, nhiều tab, rate-limit rejection và admin. Đây là mô phỏng, không phải cam kết. Nếu dự báo vượt quota, không triển khai gói Free khi chưa đổi thiết kế/giảm giờ.

Kích thước bundle và cold start phải đọc trong log deploy/Edge Metrics, không suy đoán.

## Tài liệu nền

- Supabase Edge Postgres: https://supabase.com/docs/guides/functions/connect-to-postgres
- Supabase Edge limits: https://supabase.com/docs/guides/functions/limits
- Supabase Edge pricing: https://supabase.com/docs/guides/functions/pricing
- Supabase CLI v3: https://supabase.com/docs/guides/local-development/cli/migrating-to-v3
- Cloudflare static headers: https://developers.cloudflare.com/workers/static-assets/headers/
- Deno Node interoperability: https://docs.deno.com/runtime/fundamentals/node/