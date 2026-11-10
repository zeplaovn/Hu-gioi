# LỊCH SỬ — không còn là nguồn sự thật

> Trạng thái: Lịch sử. Nội dung bên dưới giữ nguyên để đối chiếu; liên kết tương đối trong văn bản cũ có thể không còn hợp lệ khi chuyển thư mục. Runbook hiện hành: [Edge](../edge-deployment.md).

---

# Triển khai Node/SQLite để dev và đối chiếu hợp đồng

> **Lưu ý (10/11/2026):** Đây là hướng dẫn **Node/SQLite fallback dành cho dev/test**, không còn là kiến trúc production mục tiêu. Cloudflare Worker tĩnh + Supabase Edge/Postgres dùng [docs/edge-deployment.md](edge-deployment.md). Không triển khai Node gateway trên Worker tĩnh. Ở mode Node, dùng file `client/config.js` đặt `HU_API_BASE='/api/v1'` và `HU_AUTH_MODE='gateway'` trước khi build; tuyệt đối không đổi luật gameplay. Mọi IP proxy trusted phải cấu hình `HU_AUTH_TRUSTED_PROXY_IPS` đúng địa chỉ kết nối thực; khi đứng sau Cloudflare, proxy tin cậy phải **ghi đè** X-Forwarded-For từ CF-Connecting-IP, không tin header do client gửi.


> **Mã nguồn và kiểm thử không đồng nghĩa đã triển khai công khai.** Mục này chỉ mô tả chế độ Node riêng; kiến trúc Edge production hỗ trợ frontend tĩnh Cloudflare tách origin theo tài liệu mới.

## Mô hình

- **Trình duyệt:** giao diện classic-script, `RemoteSession`; mọi tác vụ gameplay POST lên `/api/v1`, không có guest offline, không lưu snapshot nhân vật vào localStorage. Chỉ giữ Supabase access/refresh token trong sessionStorage.
- **Node.js 24:** `server/main.js` chạy `PlayerService`, đồng hồ và RNG chỉ ở máy chủ; `node:sqlite` với WAL và file 0600 trong thư mục 0700; **chỉ một tiến trình ghi SQLite**.
- **Supabase:** email/password Auth và PostgreSQL `policy_acceptances` RLS. Server xác minh JWT và hai bản chấp thuận `2026-11-10-v5` trước mỗi request online (positive cache 30 giây); v1/v2 vẫn lưu làm lịch sử.
- **HTTPS:** reverse proxy chuyển **toàn bộ giao diện và `/api`** về cùng Node server qua một HTTPS origin. Không có cấu hình `HU_API_ORIGIN` hay frontend chạy trên origin khác. Không bao giờ đưa service-role/secret JWT vào JavaScript.

## Thiết lập bằng Docker Compose

1. Chuẩn bị VPS/host có Docker, ổ đĩa bền vững và reverse proxy TLS (Caddy, nginx hoặc Cloudflare Tunnel).
**Bảo vệ đăng nhập:** từ chính sách v4, trình duyệt gửi mật khẩu tới `POST /api/auth/supabase-login` **cùng origin Node**, backend kiểm tra email và tối đa **10 lần thất bại/15 phút/IP** (đăng nhập thành công không tiêu quota), sau đó chuyển yêu cầu tới Supabase Auth qua HTTPS. Đăng ký vẫn gọi Supabase và yêu cầu xác nhận email. Không dùng Cloudflare Pages/static-only hay frontend tách origin; mọi request giao diện và API đi qua cùng reverse proxy HTTPS tới Node. Đặt `HU_AUTH_TRUSTED_PROXY_IPS` chỉ cho IP reverse proxy thực sự tin cậy và yêu cầu proxy **ghi đè** `X-Forwarded-For`, không nối thêm giá trị do khách tự gửi. Mặc định bỏ qua header `X-Forwarded-For`. Hạn mức trong RAM chỉ có hiệu lực trên một instance, reset khi restart: production nhiều instance cần shared Redis/edge limiter. Do Supabase Auth endpoint vẫn công khai, các yêu cầu trực tiếp tới Supabase có thể bỏ qua gateway Node; phải cấu hình thêm Auth Rate Limits và chống bot ở Supabase/edge. Không đưa mật khẩu, token hoặc IP vào nhật ký ứng dụng.

2. Cấu hình Supabase project `rvrwfeblishqadkpzspb`: Authentication → Providers → Email, xác nhận email, Site URL và Redirect URL theo tên miền HTTPS công khai.
3. Đặt key công khai ở môi trường host: `SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`; file `.env` phải có quyền riêng tư, không commit. Bắt buộc đặt `HU_AUTH_TRUSTED_PROXY_IPS` thành đúng địa chỉ IP nguồn của reverse proxy **mà container Node nhìn thấy** (với proxy trên host Docker có thể là IP gateway bridge, không nhất thiết là `127.0.0.1`). Kiểm tra địa chỉ thực tế qua cấu hình mạng Docker/proxy; không dùng dải wildcard. `compose.yaml` từ chối khởi chạy nếu thiếu biến này và bind cổng Node tới `127.0.0.1:8000` trên host.
4. Chạy `docker compose up -d --build`. Phải kiểm tra volume `hugioi_player_data` có quyền thư mục `0700` và DB `0600`; nếu cấu hình volume sai, ứng dụng **chủ động từ chối mở DB**. Tại Linux host, sửa quyền thư mục/owner phù hợp user Node trong container (không đặt chmod 777).
5. Dùng reverse proxy để chuyển **toàn bộ đường dẫn** (trang web, file tĩnh, `/api/*`) trên cùng HTTPS origin đến Node 8000. Không mở port 8000 trực tiếp ra internet.
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
HU_AUTH_TRUSTED_PROXY_IPS=<IP-proxy-nhin-tu-container>
# Tùy chọn, CHỈ ở máy chủ: bật POST /api/v1/me/delete-account (xóa cả tài khoản Supabase). Không commit, không đưa lên frontend.
# SUPABASE_SERVICE_ROLE_KEY=<sb_secret_... hoặc service_role>
# Không cấu hình FE tách origin hoặc HU_API_ORIGIN.
```

Không bật `HU_LEGACY_AUTH` trên production. Nếu JWT Supabase còn ký HS256, server có thể yêu cầu `SUPABASE_JWT_SECRET` do host giữ bí mật; tuyệt đối không đưa secret này lên Git/frontend.

## Kiểm tra sau deploy

**Chỉ chạy trên máy chủ triển khai thật** sau khi cấu hình `.env` (bao gồm `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `HU_AUTH_TRUSTED_PROXY_IPS`) và reverse proxy HTTPS. **Các bước sau chưa được chạy trong CI**; CI chỉ kiểm tra mã nguồn, test tự động và bản build.

1. Dựng và khởi động đúng một Node container: `docker compose build && docker compose up -d`. Xác định container bằng `docker compose ps -q hugioi`; chạy `docker inspect --format '{{.State.Health.Status}}' <container>` và xác nhận kết quả `healthy`.
2. Kiểm tra HTTPS health endpoint: `curl -s https://<domain>/api/health`. JSON phải có `"gameplay":true` và `"auth":true`; HTTP 200 một mình **không đủ** để xác nhận đăng nhập/gameplay đã bật.
3. Kiểm tra headers sau proxy: `curl -sI https://<domain>/` phải có `Content-Security-Policy` và `Cache-Control: no-cache`. `curl -sI https://<domain>/media/audio/hu_gioi.mp3` phải có `Cache-Control: public, max-age=86400, must-revalidate`, không xuất hiện hai header Cache-Control.
4. Mở **hai tài khoản từ hai IP client khác nhau qua cùng proxy tin cậy**. Kiểm tra quota game API và đăng nhập độc lập theo IP; xác nhận proxy **ghi đè** `X-Forwarded-For` và `HU_AUTH_TRUSTED_PROXY_IPS` khớp IP nguồn proxy nhìn từ container.
5. Giữ tab game hiện trong **3 phút idle**: không có toast lỗi đồng bộ/HTTP 429, heartbeat duy trì nhịp khoảng 5 giây, **tu vi tăng đều** theo trạng thái từ server (tab ẩn không tăng).

Nếu bất kỳ bước nào sai, chưa coi triển khai production đạt yêu cầu; kiểm tra cấu hình Supabase, proxy, volume SQLite và log container trước khi phát hành.

## Kiểm tra riêng gameplay V9

- Tạo nhân vật với một Thiên mệnh; xác nhận thiếu hoặc sửa Thiên mệnh trong request sẽ bị từ chối. Tài khoản cũ không tự mang điểm/ngọc từ cơ chế trọng sinh.
- Xác minh online sync khoảng 5 giây, `/pause` khi tab ẩn, và gap heartbeat quá 15 giây; offline không tăng tuổi, tu vi, tài nguyên và không kết toán sản xuất.
- Kiểm tra cả 4 nguyên nhân tử vong: `tribulation`, `pvp`, `combat`, `lifespan`. Nhân vật chết không được gửi lệnh, chỉ owner có thể thực hiện `reset-after-death` để tạo kiếp mới.
- Khi cập nhật lên schema V9 cần kiểm thử migration V4–V8 trên bản sao database và backup trước khi đưa lên production. Quy tắc tạm thời và quyết định sản phẩm chưa xác nhận ở [gameplay-v9.md](gameplay-v9.md).

## Những giới hạn trước thương mại

- Giao diện game hiện chuyển sang online thông qua `RemoteSession`, nhưng **chat thời gian thực, PvP giữa người chơi thật, tông môn chung và bảng xếp hạng thật chưa được triển khai**. Mục Giao du/luận kiếm hiện mô phỏng NPC. Không nên quảng cáo là MMO thật.
- **Bản lưu offline cũ không tự nhập vào tài khoản online.** Thiết kế thủ tục di trú riêng có kiểm toán để tránh nhập state giả mạo hoặc nâng tài nguyên vô hạn.
- **Quyền dữ liệu cá nhân đã có API:** `GET /api/v1/me/export`, `POST /api/v1/me/erase`, `POST /api/v1/me/delete-account` (cần `SUPABASE_SERVICE_ROLE_KEY`; xóa SQLite rồi xóa người dùng Supabase). Chưa có nút trên giao diện; trong lúc đó người dùng có thể email yêu cầu. Xóa tài khoản trực tiếp trên dashboard Supabase vẫn **không** tự xóa SQLite, hãy gọi `/me/erase` hoặc xóa thủ công.
- Chính sách pháp lý là bản dự thảo; email tiếp nhận hỗ trợ và yêu cầu dữ liệu là `zeplaovn@proton.me`, nhưng vẫn thiếu danh tính pháp lý và địa chỉ đơn vị vận hành; cần tư vấn thủ tục phát hành game phù hợp và đánh giá dữ liệu xuyên biên giới.
- Triển khai duy nhất một instance SQLite. Scaling đa instance cần Postgres hoặc thiết kế giao dịch phân tán; không gắn chung volume SQLite nhiều container để cùng ghi.

## Sau khi phát hành

Đặt CI `Security regression tests` và `UI mobile verification` thành điều kiện bắt buộc cho merge, bật dependency scanning và giám sát tỷ lệ lỗi mạng. Mã nguồn `LocalSession`/`LocalStore` cũ vẫn ở repo để kiểm thử và phân tích bản lưu nhưng **không nằm trong dist** và không được import bởi `index.html`.
