# SYSTEM — Hư Giới · Hồ sơ backend, database và vận hành
> Trạng thái: Hiện hành. Chuẩn từ `main` 11/11/2026; môi trường thử nghiệm nội bộ, chưa production-ready.

## 1. Source of truth và kiến trúc
```text
Browser → Cloudflare Workers Static Assets (dist/)
       ├─ Supabase Auth (JWT, direct)
       └─ Supabase Edge Function api (Deno)
            └─ Supavisor transaction pooler :6543 → PostgreSQL schema game
```
- Frontend: `index.html`, `client/`, `css/`, `media/`; `npm run build:min` tạo `dist/`. CSS được bundle/hash khi build, không xóa 16 CSS nguồn chỉ vì dist dùng một bundle.
- Gameplay: `engine/` + `data/` là luật dùng chung; `server/services/player-service.js` làm nguồn chân lý cho intent và revision.
- API production hướng tới `supabase/functions/api/index.ts`, `http.ts`, `social.ts`; `tools/build-edge.cjs` tạo bundle. Bundle sinh ra không được commit.
- Node/SQLite dev/test: `server/main.js`, `server/repositories/sqlite-players.js`, `client/session/local-session.js`, `client/persistence/local-store.js`, Docker/Compose là **dev/test/legacy**, không dùng triển khai Cloudflare production. Khi dùng gateway Node dev sau reverse proxy, phải cấu hình `HU_AUTH_TRUSTED_PROXY_IPS` đúng IP proxy, proxy tin cậy ghi đè header forwarded và bảo vệ `SUPABASE_URL`.

## 2. Xác thực, API và đồng bộ
- JWT có xác minh tại backend; `verify_jwt=false` trên Edge là cấu hình cho preflight, **không** mở gameplay vô danh. Ràng buộc owner, kiểm tra consent cả privacy và release_terms, policy `2026-11-11-v7`; `/me/*` có quy tắc riêng.
- Dữ liệu online có requestId/idempotency, optimistic revision, row lock, RNG/time/reward/giá do server quyết. Không lộ seed/tokens, tránh ghi secrets.
- Ảnh chụp player được trả từ `/bootstrap`, `/state`, sync/command; browser chỉ gửi intent; khi tab ẩn `pause`, không tính tích lũy offline.
- Chat/ranking API: `/social/chat/connect`, `poll`, `send`, `leave`, `/social/ranking`. Bốn kênh có phân quyền; xác thực, consent và cooldown server **15 giây/tin**. Frontend poll khoảng **10 giây**, chỉ khi mở chat/hiện tab. API chỉ trả tin trong **1 giờ**; bảng chat là **UNLOGGED**, cron dọn mỗi **5 phút**, đọc theo kênh có micro-cache + singleflight, số online cache 45 giây.
- Nhiệm vụ ngày/điểm danh/hộp thư: `GET /daily`, `POST /daily/claim`, `POST /daily/checkin`, `GET /mail`, `POST /mail/claim`. Dữ liệu cấp tài khoản nằm trong `game.account_state`/`game.account_mail`; mọi claim có receipt idempotent trong `game.account_receipts`. Ngày reset cố định **UTC+7**, không theo múi giờ client; điểm danh lặp chu kỳ 7 ngày, bỏ ngày quay về ngày 1.
- Root cause 404 cũ: source Git đã có routes nhưng Supabase **Edge ACTIVE v8** thiếu dispatcher. Theo PR #78, Edge **v9** đã hotfix trên test; chưa có bằng chứng authenticated `200` cho phiên người chơi thật. Consent v7 từng lệch ở Edge v7, hotfix v8 trong PR #76.

## 3. Database: giữ toàn vẹn trước tối ưu
- Schema private `game`, **11 bảng**: `players`, `player_receipts`, `creation_tickets`, `pavilion_accounts`, `pavilion_receipts`, `world_chat_messages`, `world_chat_presence`, `player_leaderboard`, `account_state`, `account_receipts`, `account_mail`. Bảng `public.policy_acceptances` lưu đồng ý chính sách.
- Không expose `game` qua Data API; RLS bật và không cấp thao tác trực tiếp cho `anon`/`authenticated`.
- `supabase/migrations/` là lịch sử nguồn; **6 SQL migration** hiện hành trong tree, gồm baseline hợp nhất, admin chat, cleanup dữ liệu, cleanup chat, nhiệm vụ ngày/hộp thư và tối ưu chat §11.1. Migration `20261112020000_daily_mail_checkin.sql` thêm 3 bảng tài khoản và job `hugioi-cleanup-account-receipts` chạy `15 */3 * * *`. Migration `20261112030000_chat_unlogged_ttl_5m.sql` chuyển hai bảng chat sang UNLOGGED qua bảng mới + đổi tên, thêm `last_chat_at` và job `hugioi-cleanup-chat` chạy `*/5 * * * *`; **đã áp dụng production ngày 12/11/2026**, Edge bundle mới chưa deploy. Rollback thủ công ở `supabase/sql/rollback/20261112030000_chat_unlogged_ttl_5m_rollback.sql`.
- `supabase/sql/rebuild-internal-test.sql` là reset **phá hủy**, có guard để dùng khi game.* trống trên DB **test**; tuyệt đối không chạy production hoặc đẩy vào migration tự động. Đợt test đã bảo toàn 1 Auth user và 2 consent, 9 bảng RLS. Chi tiết [internal-db-rebuild.md](internal-db-rebuild.md).
- Xóa player sau tử vong đồng thời xóa kho Thiên Mệnh Các và khỏi bảng rank; **không kế thừa Thiên Tinh**. Các trường legacy chỉ để tương thích dữ liệu. Đọc [thien-menh-cac.md](thien-menh-cac.md).

## 4. Việc đã làm vs còn mở theo task §11
| Hạng mục | Đã có trên main / môi trường test | Chưa nghiệm thu / chưa triển khai |
|---|---|---|
| Chat | API 5 route, 15s send, client 10s foreground polling; TTL 1 giờ, UNLOGGED, cleanup 5 phút, cache/singleflight, optimistic send | Migration đã áp dụng production; Edge bundle mới chưa deploy; cần đo WAL/latency và authenticated smoke |
| Ranking | Bảng live theo power/realm, trigger loại tử vong | Snapshot 12 giờ, chuyển độc lập sect_id và bỏ trigger/ghi thừa |
| Auth | JWT + consent v7, hotfix Edge consent drift | Authenticated smoke, đo latency, cache/isolate theo benchmark |
| State/Sync | Server-authoritative, online-only, revision/receipts | Giãn heartbeat an toàn, giảm ghi JSONB, response delta, đo p95 |
| DB | Migration ledger hiện hành và rebuild test có guard; cleanup receipt tài khoản bằng cron riêng; cleanup chat 5 phút đã chạy production | Retention `player_receipts`, `pavilion_receipts`, `creation_tickets`, WAL/bloat/TOAST; Edge chat mới chưa deploy |
| Frontend | CSS min bundle/hash và responsive chat | Browser smoke toàn bộ thiết bị, Web Vitals/asset cost đo thực |

**Ưu tiên:** (1) đo số calls, SQL, p50/p95, WAL, payload/egress, (2) giảm calls, (3) giảm lưu trữ, (4) giữ mượt và bảo mật thiết yếu. Không nêu quota/giá Cloudflare, Supabase như số thật nếu chưa kiểm tra tài liệu chính thức.

## 5. Runbook / CI / phát hành
- `npm ci` → `npm run check` → `npm test` → `npm run build:min` → `npm run build:edge` → `npm run edge:budget`. Node.js 24+.
- Trước phát hành phải kiểm tra CI trên commit mới, authenticated smoke với test account (consent/creation/chat/rank/daily/checkin/mail/reset), mobile 390×844, CPU/latency, schema/migration, rollback, origin/CSP, JWT, quota/cảnh báo.
- Mọi thay đổi DB phải có migration phù hợp, rollback, chạy staging và đảm bảo không làm mất auth/player. Chỉ chủ dự án phê duyệt deploy production.
- Tài liệu chính: [architecture.md](architecture.md), [edge-deployment.md](edge-deployment.md), [security.md](security.md), [engine-contract.md](engine-contract.md), [release-checklist.md](release-checklist.md), [task.txt (lịch sử Git)](https://github.com/zeplaovn/Hugioi/blob/0b99954/task.txt).

**Merge tài liệu không tự deploy** Edge/Cloudflare, không chạy reset hoặc migration trên database.
