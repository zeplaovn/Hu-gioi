# Triển khai Hư Giới online (Node 24 + Supabase Auth)

> **Mã nguồn và kiểm thử không đồng nghĩa đã triển khai công khai.** Frontend Cloudflare tĩnh tự nó không vận hành được Node HTTP + SQLite. Cần một server/VM/container HTTPS riêng hoặc chuyển backend sang nền tảng tương thích đã có lưu trữ bền.

## Mô hình

- **Trình duyệt:** giao diện classic-script, `RemoteSession`; mọi tác vụ gameplay POST lên `/api/v1`, không có guest offline, không lưu snapshot nhân vật vào localStorage. Chỉ giữ Supabase access/refresh token trong sessionStorage.
- **Node.js 24:** `server/main.js` chạy `PlayerService`, đồng hồ và RNG chỉ ở máy chủ; `node:sqlite` với WAL và file 0600 trong thư mục 0700; **chỉ một tiến trình ghi SQLite**.
- **Supabase:** email/password Auth và PostgreSQL `policy_acceptances` RLS. Server xác minh JWT và hai bản chấp thuận `2026-11-09-v3` trước mỗi request online (positive cache 30 giây); v1/v2 vẫn lưu làm lịch sử.
- **HTTPS:** cùng domain với frontend được khuyến nghị; nếu tách origin, cấu hình CORS `HU_ALLOWED_ORIGINS`, CSP `connect-src` và `window.HU_API_ORIGIN` từ nguồn cấu hình đáng tin cậy trước khi tải script. Không bao giờ đưa service-role/secret JWT vào JavaScript.

## Thiết lập bằng Docker Compose

1. Chuẩn bị VPS/host có Docker, ổ đĩa bền vững và reverse proxy TLS (Caddy, nginx hoặc Cloudflare Tunnel).
2. Cấu hình Supabase project `rvrwfeblishqadkpzspb`: Authentication → Providers → Email, xác nhận email, Site URL và Redirect URL theo tên miền HTTPS công khai.
3. Đặt key công khai ở môi trường host: `SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`; file `.env` phải có quyền riêng tư, không commit. `compose.yaml` bind cổng Node tới `127.0.0.1:8000` trên máy host.
4. Chạy `docker compose up -d --build`. Phải kiểm tra volume `hugioi_player_data` có quyền thư mục `0700` và DB `0600`; nếu cấu hình volume sai, ứng dụng **chủ động từ chối mở DB**. Tại Linux host, sửa quyền thư mục/owner phù hợp user Node trong container (không đặt chmod 777).
5. Dùng reverse proxy để chuyển toàn bộ `/api/v1/*` và file web trên cùng HTTPS domain đến Node 8000. Không mở port 8000 trực tiếp ra internet.
6. Kiểm tra `GET https://<your-domain>/api/health` trả `gameplay: true`. Thử đăng ký và xác minh email, đăng nhập, chấp thuận 2 chính sách, tải `/api/v1/bootstrap`, gieo ticket, tạo nhân vật, gửi lệnh, tải lại và xác minh revision/tài nguyên từ server.
7. Bật giám sát lỗi/độ trễ, backup nhất quán SQLite (dùng backup API, không copy file .sqlite thô khi WAL còn giao dịch), thử khôi phục trước khi cho người dùng thực.

## Cấu hình môi trường

```sh
NODE_ENV=production
HOST=0.0.0.0
PORT=8000
SUPABASE_URL=https://rvrwfeblishqadkpzspb.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_<active-public-key>
HU_DB_FILE=/data/game.sqlite
# HU_ALLOWED_ORIGINS=https://frontend.example.com (nếu tách frontend và API)
```

Không bật `HU_LEGACY_AUTH` trên production. Nếu JWT Supabase còn ký HS256, server có thể yêu cầu `SUPABASE_JWT_SECRET` do host giữ bí mật; tuyệt đối không đưa secret này lên Git/frontend.

## Kiểm tra riêng gameplay V9

- Tạo nhân vật với một Thiên mệnh; xác nhận thiếu hoặc sửa Thiên mệnh trong request sẽ bị từ chối. Tài khoản cũ không tự mang điểm/ngọc từ cơ chế trọng sinh.
- Xác minh online sync khoảng 5 giây, `/pause` khi tab ẩn, và gap heartbeat quá 15 giây; offline không tăng tuổi, tu vi, tài nguyên và không kết toán sản xuất.
- Kiểm tra cả 4 nguyên nhân tử vong: `tribulation`, `pvp`, `combat`, `lifespan`. Nhân vật chết không được gửi lệnh, chỉ owner có thể thực hiện `reset-after-death` để tạo kiếp mới.
- Khi cập nhật lên schema V9 cần kiểm thử migration V4–V8 trên bản sao database và backup trước khi đưa lên production. Quy tắc tạm thời và quyết định sản phẩm chưa xác nhận ở [gameplay-v9.md](gameplay-v9.md).

## Những giới hạn trước thương mại

- Giao diện game hiện chuyển sang online thông qua `RemoteSession`, nhưng **chat thời gian thực, PvP giữa người chơi thật, tông môn chung và bảng xếp hạng thật chưa được triển khai**. Mục Giao du/luận kiếm hiện mô phỏng NPC. Không nên quảng cáo là MMO thật.
- **Bản lưu offline cũ không tự nhập vào tài khoản online.** Thiết kế thủ tục di trú riêng có kiểm toán để tránh nhập state giả mạo hoặc nâng tài nguyên vô hạn.
- **Chưa có chức năng tự xóa tài khoản và dữ liệu SQLite theo yêu cầu của người dùng**, cũng chưa có cơ chế đồng bộ việc xóa tài khoản Supabase sang SQLite; điều này cần hoàn thiện trước phát hành chính thức.
- Chính sách pháp lý là bản dự thảo; email tiếp nhận hỗ trợ và yêu cầu dữ liệu là `zeplaovn@proton.me`, nhưng vẫn thiếu danh tính pháp lý và địa chỉ đơn vị vận hành; cần tư vấn thủ tục phát hành game phù hợp và đánh giá dữ liệu xuyên biên giới.
- Triển khai duy nhất một instance SQLite. Scaling đa instance cần Postgres hoặc thiết kế giao dịch phân tán; không gắn chung volume SQLite nhiều container để cùng ghi.

## Sau khi phát hành

Đặt CI `Security regression tests` và `UI mobile verification` thành điều kiện bắt buộc cho merge, bật dependency scanning và giám sát tỷ lệ lỗi mạng. Mã nguồn `LocalSession`/`LocalStore` cũ vẫn ở repo để kiểm thử và phân tích bản lưu nhưng **không nằm trong dist** và không được import bởi `index.html`.
