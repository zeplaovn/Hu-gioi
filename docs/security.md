# Bảo mật và vận hành Hư Giới

> Trạng thái: Hiện hành. Đối chiếu mã nguồn `main` ngày 13/11/2026.

## 1. Ranh giới tin cậy

Cloudflare chỉ phát hành file tĩnh trong `dist/`. `client/config.js` chọn Supabase Auth trực tiếp và Edge API. Edge xác minh bearer **JWT** và consent cho gameplay rồi xử lý bằng `PlayerService`, giao dịch Postgres và receipt idempotent. Client không có quyền ghi state, RNG, thời gian hay phần thưởng đáng tin cậy.

Node/SQLite và reverse proxy cùng origin chỉ là **dev/test/legacy**; không dùng để deploy production. Xem [SYSTEM](SYSTEM.md).

## 2. Xác thực và consent

- Edge gọi Supabase Auth để xác minh JWT; không tin token chỉ vì giải mã được. Header chấp nhận duy nhất `Authorization: Bearer <JWT>`; không chấp nhận `apikey` thay JWT.
- Consent bắt buộc cho gameplay: `privacy` và `release_terms`, phiên bản **`2026-11-11-v7`**. Cache consent tối đa 5 phút (`HU_CONSENT_CACHE_MS`); không có luồng rút lại.
- Cache xác minh token là tùy chọn (`HU_AUTH_CACHE_MS`, mặc định tắt, tối đa 30 giây). Chỉ cache kết quả thành công, khóa bằng SHA-256 của token, không vượt quá `exp`. Đổi lại, token bị thu hồi có thể còn dùng tối đa 30 giây trên isolate đã cache.
- Ba route quyền dữ liệu `/me/export`, `/me/erase`, `/me/delete-account` có quy tắc riêng; xóa tài khoản cần xác nhận chuỗi chính xác.

## 3. Database

- Schema private **`game` có 13 bảng**, bật RLS và **không** cấp quyền cho `anon`/`authenticated`; không thêm `game` vào Data API exposed schemas.
- Edge truy cập qua `HU_DB_POOLER_URL` (Supavisor transaction pooler, cổng 6543) với quyền server. Không dùng direct connection cho gameplay.
- `public.policy_acceptances` có policy read/insert theo `auth.uid()`.
- `game.admin_users` là allowlist admin tường minh, mặc định rỗng/`enabled=false`; RPC admin kiểm `auth.uid()` + role và ghi `game.admin_audit_log`. Không dựa vào email hoặc `user_metadata`.
- Xóa tài khoản xóa player, pavilion, receipt, mail và dữ liệu liên quan; reset sau tử vong chỉ xóa dữ liệu kiếp hiện tại.

## 4. CORS, CSP và header

- CORS chỉ cho allowlist `HU_ALLOWED_ORIGINS`; không dùng wildcard. `Vary: Origin`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`.
- CSP trong `_headers` → `dist/_headers`: `default-src 'self'`; `script-src 'self'` cùng origin hCaptcha; `connect-src 'self'` + Supabase + hCaptcha; `object-src 'none'`; `frame-ancestors 'none'`; `base-uri 'none'`; `form-action 'none'`. Không có `unsafe-inline`/`unsafe-eval` cho script.
- Chỉ kiểm được cấu hình trong repository; phải kiểm HTTP header thực tế trên Cloudflare sau deploy. Không suy luận từ file `_headers`.

## 5. Rate limit, payload và lỗi

- Rate limit token bucket theo owner + route trong bộ nhớ isolate, không phải giới hạn toàn cục. Cần Supabase Auth rate limit và WAF phía trước cho traffic rác.
- Chat có cooldown **15 giây/tin** bằng conditional UPDATE; replay cùng `requestId` được ưu tiên trước cooldown.
- Payload JSON tối đa **64 KB**; state JSON tối đa **64 KB**. Lỗi trả envelope có `code`, `requestId`; log vận hành không chứa token, state, SQL hay password.
- Giới hạn đăng ký/đăng nhập, CAPTCHA, xác nhận email, redirect allowlist phụ thuộc Dashboard Supabase. `HU_HCAPTCHA_SITEKEY` để trống = tắt CAPTCHA; chỉ bật sau khi cả game và dashboard gửi `captcha_token`.

## 6. Secrets và vận hành

- Publishable key Supabase có thể công khai. **Không** đưa service-role key, JWT secret, `SUPABASE_ACCESS_TOKEN`, `HU_DB_POOLER_URL`, mật khẩu Postgres hoặc `.env` vào Git, client hay log.
- `HU_ALLOWED_ORIGINS` phải là allowlist tường minh. Không dùng `*`.
- Bật cảnh báo Edge calls, lỗi 429/5xx, dung lượng DB/WAL và chi phí. Kiểm tra backup/restore định kỳ.
- Admin dashboard dùng chung schema nhưng chỉ qua RPC `public.hu_admin_*`; không cấp quyền bảng trực tiếp.

## 7. Giới hạn chưa kiểm chứng

- Chưa có bằng chứng authenticated smoke 200 cho toàn bộ luồng trên thiết bị thật sau Edge version 26.
- Chưa đo WAL/latency/p95 sau khi chat chuyển UNLOGGED.
- Chưa xác minh cấu hình Supabase Auth (email confirmation, leaked-password protection, rate limit) từ repository.
- Chưa có quy trình report/mute/kiểm duyệt chat hoàn chỉnh; admin hiện có RPC xóa tin công khai kèm audit.
- Chưa có snapshot 12 giờ cho bảng xếp hạng; bảng live vẫn là nguồn hiện hành.

Đầu mối vận hành: [runbook Edge](edge-deployment.md), [checklist release](release-checklist.md), [SYSTEM](SYSTEM.md).