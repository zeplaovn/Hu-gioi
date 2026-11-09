# Bảo mật và vận hành gameplay online

## Mô hình bảo mật

Trình duyệt vẫn tải `data/`, `engine/` và giao diện: các luật đã công khai để hiển thị không thể bị giấu tuyệt đối. Tuy nhiên bản online chỉ sử dụng `RemoteSession` để **gửi ý định**, không tin trạng thái, đồng hồ hoặc kết quả RNG phía người chơi. `PlayerService` chạy ở Node kiểm tra luật và cập nhật SQLite trong transaction; mỗi lệnh có `requestId`, `expectedRevision`, giới hạn tốc độ và JWT Supabase. Trạng thái nhận về chỉ phục vụ hiển thị.

## Lớp bảo vệ

| Hạng mục | Thực hiện |
|---|---|
| Tài khoản | Supabase Auth email/password, JWT kiểm chữ ký trên backend, phân quyền theo `sub`; không sử dụng metadata do người dùng tự gửi. |
| Quyền riêng tư | Trước gameplay, kiểm tra trên máy chủ hai bản đồng ý `privacy` và `release_terms` phiên bản `2026-11-09-v2` trong Supabase qua RLS; không kế thừa đồng ý bản cũ. |
| Tương tác game | Các request `/api/v1` do Node xử lý; backend định giờ, RNG, tính thưởng, xét quyền sở hữu, revision conflict và idempotent receipts. |
| Dữ liệu | SQLite nằm ngoài thư mục web với thư mục quyền 0700, tệp quyền 0600; không phục vụ hoặc đưa vào `dist`. Máy chủ chỉ chạy một writer; phải có backup và quy trình phục hồi. |
| Tài nguyên tĩnh | `server/http/static.js` allowlist path, chặn traversal, symlink thoát gốc, file ẩn, file dữ liệu thiết kế nhạy cảm. |
| Header | CSP, `nosniff`, Referrer Policy, COOP/CORP; xác minh headers ở Node/reverse proxy. |
| Build | `npm run build` tạo `dist/` chỉ gồm frontend cần thiết; không đưa `server/`, test, tài liệu, bản lưu hay adapter offline cũ vào `dist/`. |
| Kiểm thử | CI `Security regression tests` và `UI mobile verification`; mock Supabase được dùng **chỉ trong CI**, không được kích hoạt từ production. |

## Triển khai an toàn

Chạy Node 24 trên host/container riêng, đặt `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` và volume `HU_DB_FILE` bền vững; chỉ cho người dùng truy cập thông qua HTTPS reverse proxy. Xem [hướng dẫn triển khai online](online-deployment.md).

**Quan trọng:** `wrangler deploy` / Cloudflare assets-only **chỉ triển khai frontend tĩnh**; không tự chạy Node API/SQLite. Không công bố phiên bản online từ một host tĩnh nếu chưa có đường đến backend thực sự. Nếu tách API và frontend khác origin, cập nhật CORS allowlist và CSP `connect-src`, không dùng wildcard bừa bãi.

Không commit hoặc đưa vào trình duyệt các khóa `SUPABASE_JWT_SECRET`, service-role, thông tin CSDL, file `.env`. Publishable key Supabase có thể công khai nhưng không thay cho JWT và RLS.

## Phần chưa hoàn thành

- Chưa có server HTTPS đã triển khai, đo khả dụng/cảnh báo, sao lưu SQLite production và kiểm thử restore.
- Chưa có tự phục vụ xóa tài khoản và tự xóa bản ghi gameplay SQLite khi người dùng xóa tài khoản Supabase; cần hoàn thiện tuân thủ dữ liệu cá nhân và chính sách phát hành.
- Chưa có PvP/leaderboard/chat nhiều người chơi thật; các phần mô phỏng người chơi NPC không được quảng bá là MMO.
- Dữ liệu save `localStorage` đời cũ không tự động được nhập vào gameplay online; cần thiết kế xác minh nguồn và xử lý gian lận trước khi mở tính năng import.
- Cần kiểm toán lịch sử Git và xoay vòng mọi bí mật từng lộ, nếu có.
