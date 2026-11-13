# SYSTEM — Hư Giới · Backend, database và vận hành

> Trạng thái: Hiện hành. Đối chiếu mã nguồn `main` ngày 13/11/2026 (HEAD `58f7e6f`); môi trường thử nghiệm nội bộ, **chưa production-ready**.

## 1. Kiến trúc và ranh giới tin cậy

```text
Browser
  ├─ Cloudflare Workers Static Assets (dist/)
  ├─ Supabase Auth (JWT, direct)
  └─ Supabase Edge Function api (Deno)
       └─ Supavisor transaction pooler :6543
            └─ PostgreSQL schema game (private, RLS)
```

- **Frontend:** `index.html`, `client/`, `css/`, `media/`; `npm run build:min` tạo `dist/`. Cloudflare chỉ phục vụ file tĩnh, không chạy logic gameplay.
- **Luật dùng chung:** `engine/` + `data/`. State **V10**, protocol **v4**, **52 lệnh**; `engine/protocol/commands.js` là hợp đồng lệnh.
- **Backend Edge:** `supabase/functions/api/index.ts` xác thực JWT, consent, CORS, route; `social.ts` xử lý chat/ranking; `tools/build-edge.cjs` đóng gói `server/`, `engine/`, `data/` thành bundle không commit.
- **Node/SQLite:** `server/main.js` và `server/repositories/sqlite-players.js` chỉ dùng cho **dev/test**, không phải backend production. Khi chạy gateway Node sau reverse proxy, phải cấu hình `HU_AUTH_TRUSTED_PROXY_IPS` đúng IP proxy; proxy tin cậy phải ghi đè header forwarded và bảo vệ `SUPABASE_URL`.
- **Client:** `client/session/remote-session.js` chỉ gửi intent + `requestId` + `expectedVersion` + bearer JWT. Không gửi state, thời gian, RNG, giá hoặc phần thưởng đáng tin cậy.

## 2. Xác thực, consent và API

- Supabase Auth phát JWT; Edge xác minh token với Supabase Auth (không chỉ giải mã). `verify_jwt=false` trong `supabase/config.toml` để OPTIONS/preflight hoạt động, **không** mở gameplay vô danh.
- Consent bắt buộc cho gameplay: chính sách `privacy` và `release_terms`, phiên bản **`2026-11-11-v7`**. Ba route quyền dữ liệu `/me/*` có quy tắc riêng. Consent được cache tối đa 5 phút (`HU_CONSENT_CACHE_MS`).
- Rate limit theo owner + route bằng token bucket trong bộ nhớ isolate; không phải giới hạn toàn cục. Payload JSON tối đa **64 KB**; state JSON tối đa **64 KB**.
- CORS chỉ cho allowlist `HU_ALLOWED_ORIGINS` (mặc định origin Cloudflare của game), không dùng wildcard. Header bảo mật gồm `nosniff`, `no-referrer`, `Cache-Control: no-store`.

**23 route Edge hiện hành** (`supabase/functions/api/http.ts`):

| Nhóm | Route | Ghi chú |
|---|---|---|
| Phiên | `GET /bootstrap` | Tài khoản, nhân vật, Thiên Mệnh Các, consent |
| Chat | `POST /social/chat/connect` | Vào kênh, trả tin gần nhất trong TTL |
| Chat | `POST /social/chat/poll` | Poll tin mới theo cursor |
| Chat | `POST /social/chat/send` | Gửi tin, idempotent theo `requestId` |
| Chat | `POST /social/chat/leave` | Rời kênh |
| Ranking | `GET|POST /social/ranking` | Top 50 theo `power` hoặc `realm` |
| Tạo nhân vật | `POST /creation/preview` | Ticket 10 phút, 5 lượt/ngày |
| Tạo nhân vật | `POST /players` | Tạo đạo thân từ ticket |
| Thiên Mệnh Các | `POST /pavilion/purchase` | Mua nâng cấp/Kỳ Trân |
| Nhiệm vụ ngày | `GET /daily` | 3 nhiệm vụ, điểm danh, mốc reset |
| Nhiệm vụ ngày | `POST /daily/claim` | Nhận thưởng nhiệm vụ |
| Nhiệm vụ ngày | `POST /daily/checkin` | Điểm danh 7 ngày |
| Hộp thư | `GET /mail` | Danh sách thư tài khoản |
| Hộp thư | `POST /mail/claim` | Nhận quà/đánh dấu đã đọc |
| Quyền dữ liệu | `GET /me/export` | Xuất dữ liệu gameplay |
| Quyền dữ liệu | `POST /me/erase` | Xóa dữ liệu gameplay |
| Quyền dữ liệu | `POST /me/delete-account` | Xóa dữ liệu + tài khoản |
| Nhân vật | `GET /players/{id}/state` | Snapshot hiện tại |
| Nhân vật | `POST /players/{id}/sync` | Heartbeat/đồng bộ |
| Nhân vật | `POST /players/{id}/commands` | Gửi một intent |
| Nhân vật | `POST /players/{id}/pause` | Tab ẩn/đóng |
| Nhân vật | `POST /players/{id}/reset-after-death` | Xóa đạo thân đã chết |
| Nhân vật | `POST /players/{id}/delete-character` | Xóa nhân vật có xác nhận |

## 3. Đồng bộ online-only

- Client gửi heartbeat `sync` theo `SYNC_INTERVAL_MS = 20000` (20 giây). Máy chủ coi là offline sau `ONLINE_GRACE_MS = 60000` (60 giây) không có heartbeat; cả hai có thể ghi đè bằng `HU_SYNC_INTERVAL_MS` / `HU_ONLINE_GRACE_MS` trong giới hạn an toàn.
- Tab ẩn/đóng gửi `pause`. Khi offline, `advance(now, true)` không cấp tu vi, tuổi, linh thạch, hồi sinh lực, không chạy chiến đấu/RNG và không gây tử vong; deadline của nghề phụ, cây, bí cảnh, nhiệm vụ, buff/cooldown được dịch tương ứng.
- Trở lại game làm mới `lastUpdate` mà không catch-up. Đây là giới hạn của presence qua HTTP, không phải realtime tuyệt đối.
- Mỗi lệnh là một giao dịch: khóa người chơi → kiểm receipt → kiểm revision → `advance(now)` → thực thi → ghi snapshot/receipt. Replay cùng `requestId` chỉ trả receipt.

## 4. Chat và bảng xếp hạng

- Chat có bốn kênh: `world`, `sect`, `dao_huu`, `dao_lu`. Kênh `sect` chỉ cho thành viên cùng tông môn; ba kênh còn lại là phòng công khai, không phải DM.
- Gửi cách nhau **15 giây** (`SEND_INTERVAL_MS`), kiểm bằng conditional UPDATE trên `world_chat_presence.last_chat_at`; replay cùng `requestId` được ưu tiên trước rate limit.
- API chỉ trả tin trong **1 giờ** (`MESSAGE_TTL_MS`); cron `hugioi-cleanup-chat` xóa vật lý mỗi **5 phút**, đồng thời xóa presence không hoạt động quá 10 phút. Bảng chat là **UNLOGGED**; chấp nhận mất dữ liệu chat khi PostgreSQL crash.
- Đọc theo kênh có micro-cache 4 giây + singleflight; số người online cache 45 giây; presence chat grace 90 giây. Client poll khoảng 10 giây khi cửa sổ mở và tab hiển thị.
- Ranking đọc bảng live `game.player_leaderboard`, top 50, hai tiêu chí `power` và `realm`; trigger loại nhân vật đã chết. **Chưa có snapshot 12 giờ** — đây là đề xuất tối ưu, không phải tính năng đã triển khai.

## 5. Nhiệm vụ ngày, điểm danh, hộp thư

- `GET /daily` chọn **3 trong 5 nhiệm vụ** theo `SHA-256(ownerId + ngày)`. Ngày cố định **UTC+7**, reset 00:00 giờ Việt Nam. Tiến độ là hiệu số `state.progress` hiện tại trừ baseline đầu ngày; đổi nhân vật hoặc sang ngày mới tạo baseline mới.
- `POST /daily/claim` và `POST /daily/checkin` dùng `requestId` + receipt idempotent. Điểm danh chu kỳ 7 ngày; bỏ lỡ một ngày quay về ngày 1.
- `GET /mail` trả thư tài khoản; ba mẫu `welcome`, `event`, `support` được gieo một lần bằng `seed_key`. Quà đính kèm cấp vào nhân vật hiện tại; thư sự kiện hết hạn sau 30 ngày.
- Dữ liệu nằm trong `game.account_state`, `game.account_mail`, `game.account_receipts`; receipt tài khoản được dọn bằng job `hugioi-cleanup-account-receipts` lúc `15 */3 * * *`.

## 6. Database và migration

- Schema private **`game` có 13 bảng**: `players`, `player_receipts`, `creation_tickets`, `pavilion_accounts`, `pavilion_receipts`, `world_chat_messages`, `world_chat_presence`, `player_leaderboard`, `account_state`, `account_receipts`, `account_mail`, `admin_users`, `admin_audit_log`. Bảng `public.policy_acceptances` lưu đồng ý chính sách.
- Không expose `game` qua Data API. RLS bật; không cấp quyền trực tiếp cho `anon`/`authenticated`. Edge truy cập qua connection pooler với quyền server.
- `supabase/migrations/` có **6 migration** hiện hành:
  1. `20261112001142_unified_baseline.sql` — baseline hợp nhất, gồm schema, RLS, trigger rank, admin RPC.
  2. `20261112013428_admin_chat_send.sql` — RPC gửi chat admin.
  3. `20261112014658_cleanup_expired_data.sql` — dọn receipt/ticket/audit mỗi 3 giờ.
  4. `20261112015036_cleanup_chat_messages.sql` — dọn chat cũ.
  5. `20261112020000_daily_mail_checkin.sql` — 3 bảng tài khoản + cron receipt.
  6. `20261112030000_chat_unlogged_ttl_5m.sql` — chat UNLOGGED, TTL 1 giờ, cron 5 phút, `last_chat_at`.
- Migration chat đã được ghi nhận **áp dụng production ngày 12/11/2026**; Edge bundle **version 26** được ghi nhận deploy cùng ngày. Không thể xác minh dashboard từ repository; phải kiểm tra lịch sử migration thật trước khi thao tác.
- Rollback chat thủ công: `supabase/sql/rollback/20261112030000_chat_unlogged_ttl_5m_rollback.sql`.

## 7. Việc đã có và còn mở

| Hạng mục | Đã có trong mã/main | Chưa nghiệm thu hoặc chưa triển khai |
|---|---|---|
| Chat | 4 route chat + ranking, 4 kênh, 15 giây/tin, TTL 1 giờ, UNLOGGED, cleanup 5 phút, cache/singleflight | Đo WAL/latency sau deploy, authenticated smoke, kiểm duyệt nội dung |
| Ranking | Bảng live power/realm, top 50, trigger loại tử vong | Snapshot 12 giờ, giảm trigger/ghi DB, tách `sect_id` |
| Auth | JWT + consent v7, allowlist CORS, rate limit isolate | Smoke JWT thật, đo p95, cache/isolate theo benchmark |
| State/Sync | Server-authoritative, revision/receipt, sync 20 giây/grace 60 giây | Đo p95, response delta, giảm ghi JSONB |
| DB | 13 bảng, RLS, 6 migration, rollback chat, rebuild test có guard | Retention receipt/ticket, WAL/bloat/TOAST, xác minh migration production |
| Frontend | CSS bundle/hash, responsive, menu mobile thu gọn | Browser smoke toàn bộ thiết bị, Web Vitals/asset cost |

**Ưu tiên:** đo số call/SQL, p50/p95, WAL, payload/egress → giảm call → giảm lưu trữ → giữ mượt và bảo mật. Không nêu quota/giá Cloudflare hoặc Supabase như số thật nếu chưa kiểm tra tài liệu chính thức.

## 8. Runbook, CI và phát hành

```sh
npm ci
npm run check
npm test
npm run build:min
npm run build:edge
npm run edge:budget
```

Node.js **24+**. `npm run edge:budget` chỉ mô phỏng, không phải đo production.

Trước phát hành phải có: CI xanh trên commit cuối; authenticated smoke với tài khoản test (consent → preview → tạo nhân vật → lệnh/replay → sync/pause → chat 4 kênh → ranking → daily/checkin/mail → reset sau tử vong); kiểm tra migration/rollback; mobile 390×844 và desktop; CSP/origin; đo latency/CPU; xác nhận quyền truy cập dashboard.

Mọi thay đổi DB phải có migration additive, rollback, chạy staging và không làm mất Auth/consent/player. Chỉ chủ dự án phê duyệt deploy production. **Merge tài liệu không tự deploy Edge/Cloudflare, không chạy migration hay reset database.**

Tài liệu liên quan: [kiến trúc](architecture.md), [runbook Edge](edge-deployment.md), [bảo mật](security.md), [hợp đồng engine](engine-contract.md), [checklist release](release-checklist.md).