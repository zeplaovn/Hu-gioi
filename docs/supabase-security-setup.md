# Hư Giới – Supabase Auth và quản lý chấp thuận online (09/11/2026-v2)

## Phần đã cấu hình

- Project: `rvrwfeblishqadkpzspb` (Supabase `Hugioi`), vùng Singapore (`ap-southeast-1`).
- Trình duyệt dùng `client/auth/supabase.js` với **publishable key**, không dùng `service_role` hay secret key.
- API xác thực: email/password và xác thực email qua Supabase Auth; giao diện và `/api` do cùng một Node server phục vụ sau reverse proxy HTTPS.
- Hai checkbox độc lập, **không đánh dấu sẵn**, liên kết đến `client/legal/privacy.html` và `client/legal/release.html` (phiên bản `2026-11-09-v2`).
- `public.policy_acceptances`: `user_id`, `policy_kind`, `policy_version`, `accepted_at` (server timestamp).
- RLS: chỉ chủ tài khoản có thể đọc hoặc thêm dòng cho chính mình. Không cho `anon` đọc, không cho client `UPDATE/DELETE`, không cho client tự ghi `accepted_at`.
- Thiên Mệnh Các là dữ liệu cấp tài khoản Supabase trong SQLite (Thiên Tinh, nâng cấp và kho bảo vật), phải được xuất theo quyền truy cập dữ liệu và xóa khi chủ tài khoản yêu cầu xóa dữ liệu; **không** xóa khi chỉ đặt lại đạo thân đã tọa hóa.
- Phiên bản online dùng `RemoteSession`; trạng thái nhân vật và giao dịch gameplay do Node API `/api/v1` xác minh và ghi trong SQLite trên máy chủ. Trình duyệt không lưu bản nhân vật online mới vào localStorage. Cloudflare static-only không thể tự chạy backend.
- API tài khoản Node thử nghiệm bị vô hiệu mặc định. Có thể chủ động truyền instance `AuthService` vào router trong bài kiểm thử.

## Cấu hình Supabase Dashboard bắt buộc

1. **Authentication → Providers → Email:** bật email/password và **Confirm email**.
2. **Authentication → URL Configuration:** đặt Site URL là tên miền HTTPS của game và đưa các URL callback cần thiết vào danh sách redirect được phép. Các liên kết xác nhận email mặc định là `/#access_token=...`, nên cần để ứng dụng đọc và xóa fragment trước khi tải phần chơi.
3. **Authentication → Security and Protection:** bật các cơ chế chống bot/CAPTCHA, rate limit và bảo vệ phiên phù hợp môi trường thực tế; ưu tiên email OTP/SMTP đáng tin cậy.
4. Đối chiếu migrations đang áp dụng; bảng `public.policy_acceptances` đã được triển khai trên project ngày 09/11/2026. File tham khảo: `supabase/sql/policy_acceptances.sql`. **Không chạy lại file đó nguyên văn trên cùng project** vì câu lệnh `CREATE POLICY` không idempotent.
5. Kiểm tra `get_advisors(security)` sau mỗi thay đổi và thử đăng nhập/đăng ký trên tên miền thật. Browser cần HTTPS và backend Node hoạt động; `file://` không cung cấp gameplay và không cho vào chế độ khách.
6. Không đưa Supabase secret/service-role key, JWT secret, database password hoặc `HU_AUTH_FILE` vào Git hoặc trình duyệt.

## Bản quyền và nghĩa vụ pháp luật trước khi phát hành

Hai văn bản hiển thị tại `client/legal/` **là dự thảo**. Chưa có tên pháp lý, địa chỉ, phương thức liên hệ của tổ chức/cá nhân vận hành; chưa có kết luận phân loại game G1–G4, giấy phép/xác nhận phát hành, xác minh độ tuổi và điều kiện bảo vệ trẻ em. Do đó **không được diễn giải việc có checkbox là đủ điều kiện phát hành theo luật Việt Nam**.

Cần hoàn tất hồ sơ xử lý dữ liệu cá nhân (bao gồm đánh giá chuyển dữ liệu ra nước ngoài nếu thuộc diện áp dụng, do Supabase vùng Singapore), lập đầu mối nhận yêu cầu rút lại sự đồng ý/xóa tài khoản, và xem xét nghĩa vụ lưu trữ theo Luật 91/2025/QH15, Nghị định 356/2025/NĐ-CP cùng Nghị định 147/2024/NĐ-CP và các sửa đổi còn hiệu lực tại thời điểm phát hành.

## Mô hình bảo mật và giới hạn

- **Tách đồng ý và điều khoản:** hệ thống ghi 2 dòng khi tài khoản đã xác minh email. Trường `accepted_at` do PostgreSQL cấp. Chưa ghi việc từ chối/rút lại đồng ý vì chưa có endpoint tự phục vụ xóa hoặc rút.
- **Session:** access/refresh token Supabase được lưu tạm bằng `sessionStorage`. Dễ bị đọc nếu có XSS trên cùng origin; CSP và lọc đầu vào là điều kiện cần, không phải bảo đảm tuyệt đối. Phiên có thể tiếp tục tồn tại ở tab cho đến khi đóng tab/đăng xuất.
- **Không dùng metadata do client gửi làm cơ sở phân quyền.** Quyền đọc/ghi dòng chấp thuận chỉ dựa trên `auth.uid()` từ JWT đã được Supabase xác thực.
- **Gameplay online server-authoritative:** `RemoteSession` chỉ gửi lệnh và hiển thị snapshot; thời gian/RNG/trạng thái và SQLite do `PlayerService` trên Node quản lý. Không tự chuyển bản lưu localStorage cũ sang backend. Cần backup/restore SQLite và quy trình xóa nhân vật khi tài khoản bị xóa.
- **API Node yêu cầu chấp thuận tại máy chủ.** Với `SUPABASE_URL` và `SUPABASE_PUBLISHABLE_KEY` (publishable, không phải service_role), JWT được xác minh và API yêu cầu đủ hai bản ghi `privacy`/`release_terms` phiên bản `2026-11-09` bằng RLS; từ chối truy cập khi Supabase không phản hồi. Kho SQLite bắt buộc nằm trong thư mục quyền `0700`, tệp DB `0600`.
- **Trước phát hành online:** cần quy trình tự phục vụ rút chấp thuận/xóa tài khoản và xóa dữ liệu gameplay trong SQLite, xác minh phân loại game và giấy phép cần thiết. Xóa tài khoản Supabase hiện **không** tự động xóa bản lưu SQLite.
- **Chính sách phiên bản:** khi thay đổi nội dung trọng yếu, phải sửa `VERSION` trong adapter, cả hai trang pháp lý và schema/constraint được thiết kế; cân nhắc di trú policy version để không khóa đăng nhập.
- **Không đưa mã nguồn gốc lên web root.** Chỉ triển khai bằng Docker Compose với một Node server phục vụ file tĩnh qua allowlist trong `server/http/static.js` và `/api`, sau reverse proxy HTTPS cùng origin. Bản `dist/` chỉ dùng kiểm tra bản build; không host frontend riêng.

## Xác minh

- Kiểm tra Supabase: `public.policy_acceptances` có RLS, 2 policies, `anon` không có SELECT, `authenticated` có SELECT nhưng không UPDATE và không thể tự INSERT `accepted_at`.
- `tests/supabase-consent.test.cjs` kiểm tra đăng ký/xác nhận, đăng nhập, consent và xóa token khỏi URL bằng mock API.
- Chạy `npm test` trên Node >=24, rồi test end-to-end signup → xác nhận email → đăng nhập → lưu 2 consent → đăng xuất.

## Phiên bản đồng ý online

Bản `2026-11-09` cũ được giữ trong bảng để làm lịch sử, nhưng **không mở khóa gameplay online**. Kể từ bản game online-only, `server/auth/consent.js` yêu cầu đủ hai bản ghi `2026-11-09-v2`. Migration `allow_online_only_policy_consent_v2` chỉ mở rộng CHECK cho hai phiên bản mà không xóa bản cũ. Nội dung chính sách `client/legal/privacy.html` và `client/legal/release.html` đã cập nhật công bố xử lý SQLite. `auth/supabase.js` yêu cầu người dùng đồng ý lại; không tự tạo bản ghi đồng ý từ thông tin cũ.

## Giao thức tử vong V9 / chính sách v3

Migration `allow_v3_permadeath_policy_consent` mở rộng constraint để giữ nguyên chấp thuận v1/v2 và ghi nhận `2026-11-09-v3`. Chính sách v3 công bố tọa hóa vĩnh viễn và tiến trình offline đóng băng. Frontend và API yêu cầu đủ hai bản v3; không suy diễn đồng ý mới từ bản cũ. Email hỗ trợ và yêu cầu dữ liệu: `zeplaovn@proton.me`.

## Chính sách v4 — email hợp lệ và giới hạn IP khi đăng nhập

- Bản chấp thuận `2026-11-09-v4` được yêu cầu ở cả frontend và consent verifier backend; migration `allow_v4_email_ip_auth_consent` mở rộng constraint (không xóa consent v1-v3).
- Đăng ký: chỉ chấp nhận địa chỉ email có cú pháp hợp lệ ở giao diện; Supabase Auth yêu cầu người sở hữu xác nhận email. Đây không phải kiểm tra SMTP/MX hoặc xác minh email có tồn tại trước khi gửi thư.
- Đăng nhập: `/api/auth/supabase-login` qua Node same-origin, 10 lượt thử mỗi IP trong 15 phút, 429 + Retry-After khi vượt mức. Bộ đếm tạm RAM, không lưu mật khẩu hay token. Proxy `X-Forwarded-For` chỉ được tin nếu socket đến từ `HU_AUTH_TRUSTED_PROXY_IPS` đã cấu hình và reverse proxy **ghi đè** header do khách gửi. Không đưa IP vào `policy_acceptances`.
- Supabase vẫn công khai các endpoint xác thực. Bảo vệ gateway Node không tự giới hạn request trực tiếp từ kẻ khác đến Supabase; vào Authentication → Rate Limits và Security and Protection để cấu hình giới hạn upstream, CAPTCHA và chống lạm dụng. Đừng tuyên bố kiểm soát toàn bộ IP nếu chưa có limit tại provider hoặc edge.
- Khách hàng dùng chung NAT sẽ dùng chung quota. Triển khai duy nhất một Node instance sau reverse proxy HTTPS cùng origin; không tách giao diện/API. Nếu thiết kế đa instance trong tương lai, phải có bộ giới hạn dùng chung hoặc WAF/edge.
