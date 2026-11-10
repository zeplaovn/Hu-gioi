# Bảo mật và vận hành Hư Giới

> Trạng thái: Hiện hành.

**Ranh giới:** Cloudflare chỉ phát hành file tĩnh; `client/config.js` chọn Supabase Auth trực tiếp và Edge API. Edge xác minh bearer JWT và consent cho gameplay rồi xử lý bằng `PlayerService`, Postgres transactions và idempotent receipts. Client không có quyền ghi state/RNG/timing/phần thưởng tin cậy.

**Database:** `supabase/config.toml` đặt `verify_jwt=false` để OPTIONS hoạt động; code `supabase/functions/api/index.ts` vẫn kiểm JWT. Schema `game` có RLS và không cấp quyền cho `anon`/`authenticated`; không mở Data API cho schema này. Policy consent v5 phải kiểm trên project thật trước khi deploy.

**CSP/cache:** `_headers` → `dist/_headers`, `script-src 'self'` không có `unsafe-inline`/`unsafe-eval`, `connect-src` chỉ cho origin Supabase, `/media/*` cache. Chỉ kiểm được cấu hình trong repo, cần kiểm HTTP headers Cloudflare sau deploy.

**Xác minh phiên:** Mặc định mỗi request gọi Supabase Auth để xác minh JWT (không tin JWT chỉ được giải mã). `HU_AUTH_CACHE_MS` (mặc định tắt, tối đa 30 giây) là lựa chọn có chủ ý của chủ dự án để giảm lượt gọi: chỉ cache kết quả thành công, khóa bằng SHA-256 của token, không vượt quá `exp`; đổi lại phiên bị thu hồi còn dùng được tối đa chừng đó trên isolate đã cache. Chấp thuận chính sách được cache `HU_CONSENT_CACHE_MS` (mặc định 5 phút) vì không có luồng rút lại. Xem [runbook Edge](edge-deployment.md).

**Secrets:** Publishable key Supabase có thể công khai, nhưng không đưa service-role, JWT secret, `SUPABASE_ACCESS_TOKEN`, `HU_DB_POOLER_URL`, mật khẩu Postgres hoặc `.env` vào Git, client hay log. `HU_ALLOWED_ORIGINS` phải cấu hình allowlist tường minh.

**Giới hạn chưa kiểm chứng:** Client gọi Supabase Auth thẳng, do đó rate limit đăng ký/đăng nhập, CAPTCHA, xác nhận email, redirect allowlist phụ thuộc Dashboard Supabase. Edge function có URL công khai; traffic rác vẫn có thể tính quota. Cần alerts và thực hành backup/restore.

Node/SQLite và reverse proxy cùng origin chỉ là **dev/legacy**; xem [hướng dẫn lưu trữ lịch sử](archive/online-deployment.md), không dùng để deploy production. Đầu mối duy nhất: [runbook Edge](edge-deployment.md) và [checklist chủ dự án](release-checklist.md).
