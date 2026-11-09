# Hư Giới – Supabase Auth và quản lý chấp thuận (09/11/2026)

## Phần đã cấu hình

- Project: \`rvrwfeblishqadkpzspb\` (Supabase \`Hugioi\`), vùng Singapore (\`ap-southeast-1\`).
- Trình duyệt dùng \`client/auth/supabase.js\` với **publishable key**, không dùng \`service_role\` hay secret key.
- API xác thực: email/password và xác thực email qua Supabase Auth; trang tĩnh chạy được trên Cloudflare.
- Hai checkbox độc lập, **không đánh dấu sẵn**, liên kết đến \`client/legal/privacy.html\` và \`client/legal/release.html\` (phiên bản \`2026-11-09\`).
- \`public.policy_acceptances\`: \`user_id\`, \`policy_kind\`, \`policy_version\`, \`accepted_at\` (server timestamp).
- RLS: chỉ chủ tài khoản có thể đọc hoặc thêm dòng cho chính mình. Không cho \`anon\` đọc, không cho client \`UPDATE/DELETE\`, không cho client tự ghi \`accepted_at\`.
- Trạng thái chơi offline vẫn lưu trên thiết bị; chưa có cloud save và chưa có server-authoritative gameplay.
- API tài khoản Node thử nghiệm bị vô hiệu mặc định. Có thể chủ động truyền instance \`AuthService\` vào router trong bài kiểm thử.

## Cấu hình Supabase Dashboard bắt buộc

1. **Authentication → Providers → Email:** bật email/password và **Confirm email**.
2. **Authentication → URL Configuration:** đặt Site URL là tên miền HTTPS của game và đưa các URL callback cần thiết vào danh sách redirect được phép. Các liên kết xác nhận email mặc định là \`/#access_token=...\`, nên cần để ứng dụng đọc và xóa fragment trước khi tải phần chơi.
3. **Authentication → Security and Protection:** bật các cơ chế chống bot/CAPTCHA, rate limit và bảo vệ phiên phù hợp môi trường thực tế; ưu tiên email OTP/SMTP đáng tin cậy.
4. Đối chiếu migrations đang áp dụng; bảng \`public.policy_acceptances\` đã được triển khai trên project ngày 09/11/2026. File tham khảo: \`supabase/sql/policy_acceptances.sql\`. **Không chạy lại file đó nguyên văn trên cùng project** vì câu lệnh \`CREATE POLICY\` không idempotent.
5. Kiểm tra \`get_advisors(security)\` sau mỗi thay đổi và thử đăng nhập/đăng ký trên tên miền thật. Browser nên chỉ phục vụ qua HTTPS; nếu chạy \`file://\` thì chỉ cho phép chế độ khách/offline.
6. Không đưa Supabase secret/service-role key, JWT secret, database password hoặc \`HU_AUTH_FILE\` vào Git hoặc trình duyệt.

## Bản quyền và nghĩa vụ pháp luật trước khi phát hành

Hai văn bản hiển thị tại \`client/legal/\` **là dự thảo**. Chưa có tên pháp lý, địa chỉ, phương thức liên hệ của tổ chức/cá nhân vận hành; chưa có kết luận phân loại game G1–G4, giấy phép/xác nhận phát hành, xác minh độ tuổi và điều kiện bảo vệ trẻ em. Do đó **không được diễn giải việc có checkbox là đủ điều kiện phát hành theo luật Việt Nam**.

Cần hoàn tất hồ sơ xử lý dữ liệu cá nhân (bao gồm đánh giá chuyển dữ liệu ra nước ngoài nếu thuộc diện áp dụng, do Supabase vùng Singapore), lập đầu mối nhận yêu cầu rút lại sự đồng ý/xóa tài khoản, và xem xét nghĩa vụ lưu trữ theo Luật 91/2025/QH15, Nghị định 356/2025/NĐ-CP cùng Nghị định 147/2024/NĐ-CP và các sửa đổi còn hiệu lực tại thời điểm phát hành.

## Mô hình bảo mật và giới hạn

- **Tách đồng ý và điều khoản:** hệ thống ghi 2 dòng khi tài khoản đã xác minh email. Trường \`accepted_at\` do PostgreSQL cấp. Chưa ghi việc từ chối/rút lại đồng ý vì chưa có endpoint tự phục vụ xóa hoặc rút.
- **Session:** access/refresh token Supabase được lưu tạm bằng \`sessionStorage\`. Dễ bị đọc nếu có XSS trên cùng origin; CSP và lọc đầu vào là điều kiện cần, không phải bảo đảm tuyệt đối. Phiên có thể tiếp tục tồn tại ở tab cho đến khi đóng tab/đăng xuất.
- **Không dùng metadata do client gửi làm cơ sở phân quyền.** Quyền đọc/ghi dòng chấp thuận chỉ dựa trên \`auth.uid()\` từ JWT đã được Supabase xác thực.
- **Dữ liệu nhân vật là dữ liệu offline không đáng tin cậy về mặt cạnh tranh.** Không sử dụng làm nguồn tính tiền, nạp/rút, thứ hạng hay trao thưởng online khi chưa có backend kiểm chứng.
- **Chính sách phiên bản:** khi thay đổi nội dung trọng yếu, phải sửa \`VERSION\` trong adapter, cả hai trang pháp lý và schema/constraint được thiết kế; cân nhắc di trú policy version để không khóa đăng nhập.
- **Không đưa mã nguồn gốc lên web root.** Dùng \`dist/\` do script build, cấu hình \`_headers\` và \`wrangler.jsonc\`.

## Xác minh

- Kiểm tra Supabase: \`public.policy_acceptances\` có RLS, 2 policies, \`anon\` không có SELECT, \`authenticated\` có SELECT nhưng không UPDATE và không thể tự INSERT \`accepted_at\`.
- \`tests/supabase-consent.test.cjs\` kiểm tra đăng ký/xác nhận, đăng nhập, consent và xóa token khỏi URL bằng mock API.
- Chạy \`npm test\` trên Node >=24, rồi test end-to-end signup → xác nhận email → đăng nhập → lưu 2 consent → đăng xuất.
