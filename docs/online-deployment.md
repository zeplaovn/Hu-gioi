# Triển khai Hư Giới online (Node 24 + Supabase Auth)

> **Mã nguồn và kiểm thử không đồng nghĩa đã triển khai công khai.** Frontend Cloudflare tĩnh tự nó không vận hành được Node HTTP + SQLite. Cần một server/VM/container HTTPS riêng hoặc chuyển backend sang nền tảng tương thích đã có lưu trữ bền.

## Mô hình

- **Trình duyệt:** giao diện classic-script, `RemoteSession`; mọi tác vụ gameplay POST lên `/api/v1`, không có guest offline, không lưu snapshot nhân vật vào localStorage. Chỉ giữ Supabase access/refresh token trong sessionStorage.
- **Node.js 24:** `server/main.js` chạy `PlayerService`, đồng hồ và RNG chỉ ở máy chủ; `node:sqlite` với WAL và file 0600 trong thư mục 0700; **chỉ một tiến trình ghi SQLite**.
- **Supabase:** email/password Auth và PostgreSQL `policy_acceptances` RLS. Server xác minh JWT và hai bản chấp thuận `2026-11-10-v5` trước mỗi request online (positive cache 30 giây); v1/v2 vẫn lưu làm lịch sử.
- **HTTPS:** cùng domain với frontend được khuyến nghị; nếu tách origin, khai báo `HU_API_ORIGIN` ở frontend build, `HU_ALLOWED_ORIGINS` ở Node và URL/key Supabase công khai; tool build sinh `dist/client/config.js` cùng CSP đúng origin, không có wildcard. Không bao giờ đưa service-role/secret JWT vào JavaScript.

## Frontend và API khác origin

**Cùng origin (mặc định):** bỏ trống `HU_API_ORIGIN`, frontend gọi tương đối `/api/v1/*` và `/api/auth/supabase-login`.

**Tách origin, ví dụ frontend `https://game.example.com`, API `https://api.example.com`:**

```sh
HU_API_ORIGIN=https://api.example.com \
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_WITH_ACTIVE_KEY \
npm run build
```

Deploy toàn bộ `dist/` lên host tĩnh; Node API khai báo `HU_ALLOWED_ORIGINS=https://game.example.com`. Cả API gameplay và gateway login cùng dùng allowlist, hỗ trợ OPTIONS preflight và `Vary: Origin`. `HU_AUTH_TRUSTED_PROXY_IPS` chỉ ghi **IP socket reverse proxy đáng tin**; proxy phải *ghi đè một* `X-Forwarded-For`, không truyền chuỗi client gửi vào. Nếu thiếu proxy tin cậy trong production, server cảnh báo và dùng socket IP.

Build tự sinh **`dist/client/config.js`, `dist/index.html`, `dist/_headers`** từ cùng env. Chỉ các origin `'self'`, Supabase và API đã xác minh mới xuất hiện trong CSP `connect-src`. Không dùng wildcard, không thêm `unsafe-inline`/`unsafe-eval` cho script. Thay URL API/Supabase phải build và deploy lại; tuyệt đối không phát hành service-role key.

Test production: kiểm `GET /api/health` tại API, preflight `OPTIONS /api/auth/supabase-login` từ frontend có `Access-Control-Allow-Origin` đúng, đăng nhập và đọc `/api/v1/bootstrap`. URL HTTP ngoài localhost hoặc có path/query bị từ chối khi build.

## Thiết lập bằng Docker Compose

1. Chuẩn bị VPS/host có Docker, ổ đĩa bền vững và reverse proxy TLS (Caddy, nginx hoặc Cloudflare Tunnel).
**Bảo vệ đăng nhập:** từ chính sách v4, trình duyệt gửi mật khẩu tới `POST /api/auth/supabase-login` **cùng origin Node hoặc khác origin HTTPS thuộc allowlist**, backend kiểm tra email và tối đa **10 lần đăng nhập sai/15 phút/IP hoặc email đã băm**, sau đó chuyển yêu cầu tới Supabase Auth qua HTTPS. Đăng ký vẫn gọi Supabase và yêu cầu xác nhận email. Cloudflare Pages/static không tự chạy gateway; vẫn cần Node API HTTPS, nhưng có thể tách origin khi Node khai báo đúng `HU_ALLOWED_ORIGINS` và preflight CORS. Đặt `HU_AUTH_TRUSTED_PROXY_IPS` chỉ cho IP reverse proxy thực sự tin cậy và yêu cầu proxy **ghi đè** `X-Forwarded-For`, không nối thêm giá trị do khách tự gửi. Mặc định bỏ qua header `X-Forwarded-For`. Hạn mức trong RAM chỉ có hiệu lực trên một instance, reset khi restart: production nhiều instance cần shared Redis/edge limiter. Do Supabase Auth endpoint vẫn công khai, các yêu cầu trực tiếp tới Supabase có thể bỏ qua gateway Node; phải cấu hình thêm Auth Rate Limits và chống bot ở Supabase/edge. Không đưa mật khẩu, token hoặc IP vào nhật ký ứng dụng.

2. Cấu hình Supabase project `rvrwfeblishqadkpzspb`: Authentication → Providers → Email, xác nhận email, Site URL và Redirect URL theo tên miền HTTPS công khai.
3. Đặt key công khai ở môi trường host: `SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`; file `.env` phải có quyền riêng tư, không commit. `compose.yaml` bind cổng Node tới `127.0.0.1:8000` trên máy host.
4. Chạy `docker compose up -d --build`. Phải kiểm tra volume `hugioi_player_data` có quyền thư mục `0700` và DB `0600`; nếu cấu hình volume sai, ứng dụng **chủ động từ chối mở DB**. Tại Linux host, sửa quyền thư mục/owner phù hợp user Node trong container (không đặt chmod 777).
5. Dùng reverse proxy để chuyển toàn bộ `/api/v1/*` và file web trên cùng HTTPS domain đến Node 8000. Không mở port 8000 trực tiếp ra internet.
6. Kiểm tra `GET https://<your-domain>/api/health` trả `gameplay: true`. Thử đăng ký và xác minh email, đăng nhập, chấp thuận 2 chính sách, tải `/api/v1/bootstrap`, gieo ticket, tạo nhân vật, gửi lệnh, tải lại và xác minh revision/tài nguyên từ server.
7. Bật giám sát lỗi/độ trễ. Sao lưu nhất quán bằng `node tools/backup-db.cjs --keep 7` (VACUUM INTO, kiểm tra toàn vẹn, quyền 0600, luân phiên giữ 7 bản; chạy bằng cron/systemd timer, ví dụ mỗi 6 giờ). Không copy file .sqlite thô khi WAL còn giao dịch. Thử khôi phục trước khi cho người dùng thực.
8. **Trước khi triển khai phiên bản chính sách v5:** chạy lệnh ALTER trong `supabase/sql/policy_acceptances.sql` trên project Supabase để cho phép `2026-11-10-v5`; nếu chưa, người dùng sẽ không ghi được đồng ý và bị chặn ở màn đăng nhập.

## Cấu hình môi trường

```sh
NODE_ENV=production
HOST=0.0.0.0
PORT=8000
SUPABASE_URL=https://rvrwfeblishqadkpzspb.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_<active-public-key>
HU_DB_FILE=/data/game.sqlite
# Tùy chọn, CHỈ ở máy chủ: bật POST /api/v1/me/delete-account (xóa cả tài khoản Supabase). Không commit, không đưa lên frontend.
# SUPABASE_SERVICE_ROLE_KEY=<sb_secret_... hoặc service_role>
# HU_ALLOWED_ORIGINS=https://frontend.example.com (nếu tách frontend và API)
# HU_AUTH_TRUSTED_PROXY_IPS=127.0.0.1 (điền đúng IP TCP của proxy, không phải IP user)
```

Không bật `HU_LEGACY_AUTH` trên production. Nếu JWT Supabase còn ký HS256, server có thể yêu cầu `SUPABASE_JWT_SECRET` do host giữ bí mật; tuyệt đối không đưa secret này lên Git/frontend.

## Kiểm tra riêng gameplay V9

- Tạo nhân vật với một Thiên mệnh; xác nhận thiếu hoặc sửa Thiên mệnh trong request sẽ bị từ chối. Tài khoản cũ không tự mang điểm/ngọc từ cơ chế trọng sinh.
- Xác minh online sync 5 giây, bucket 24 lượt/phút (burst 8), `/pause` bucket riêng, và gap heartbeat quá 20 giây; offline không tăng tuổi, tu vi, tài nguyên và không kết toán sản xuất.
- Kiểm tra cả 4 nguyên nhân tử vong: `tribulation`, `pvp`, `combat`, `lifespan`. Nhân vật chết không được gửi lệnh, chỉ owner có thể thực hiện `reset-after-death` để tạo kiếp mới.
- Khi cập nhật lên schema V9 cần kiểm thử migration V4–V8 trên bản sao database và backup trước khi đưa lên production. Quy tắc tạm thời và quyết định sản phẩm chưa xác nhận ở [gameplay-v9.md](gameplay-v9.md).

## Những giới hạn trước thương mại

- Giao diện game hiện chuyển sang online thông qua `RemoteSession`, nhưng **chat thời gian thực, PvP giữa người chơi thật, tông môn chung và bảng xếp hạng thật chưa được triển khai**. Mục Giao du/luận kiếm hiện mô phỏng NPC. Không nên quảng cáo là MMO thật.
- **Bản lưu offline cũ không tự nhập vào tài khoản online.** Thiết kế thủ tục di trú riêng có kiểm toán để tránh nhập state giả mạo hoặc nâng tài nguyên vô hạn.
- **Quyền dữ liệu cá nhân đã có API:** `GET /api/v1/me/export`, `POST /api/v1/me/erase`, `POST /api/v1/me/delete-account` (cần `SUPABASE_SERVICE_ROLE_KEY`; xóa SQLite rồi xóa người dùng Supabase). Chưa có nút trên giao diện; trong lúc đó người dùng có thể email yêu cầu. Xóa tài khoản trực tiếp trên dashboard Supabase vẫn **không** tự xóa SQLite, hãy gọi `/me/erase` hoặc xóa thủ công.
- Chính sách pháp lý là bản dự thảo; email tiếp nhận hỗ trợ và yêu cầu dữ liệu là `zeplaovn@proton.me`, nhưng vẫn thiếu danh tính pháp lý và địa chỉ đơn vị vận hành; cần tư vấn thủ tục phát hành game phù hợp và đánh giá dữ liệu xuyên biên giới.
- Triển khai duy nhất một instance SQLite. Scaling đa instance cần Postgres hoặc thiết kế giao dịch phân tán; không gắn chung volume SQLite nhiều container để cùng ghi.

## Sau khi phát hành

Đặt CI `Security regression tests` và `UI mobile verification` thành điều kiện bắt buộc cho merge, bật dependency scanning và giám sát tỷ lệ lỗi mạng. Mã nguồn `LocalSession`/`LocalStore` cũ nằm trong `legacy/` để kiểm thử và phân tích bản lưu nhưng **không nằm trong dist** và không được import bởi `index.html`.
