# Backend, API và lưu trữ trong repo v2.1

Runtime dùng PostgreSQL schema `game`, Supabase Edge Function `api` và web hiện có. Đây là triển khai cho repo; SQLite và62 route của gói tham chiếu ban đầu không phải runtime này.

| Giao diện | Chức năng |
|---|---|
|GET /state|Tu luyện, trạng thái kiếp, Thiên Mệnh, intent đột phá/tọa hóa|
|GET /play|Ví chính xác, túi, đất/cây, nghề/job, nhiệm vụ, catalog và đấu giá|
|POST /play/action|Ý định kinh tế/nghề/nhiệm vụ/combat/đấu giá/kết thúc|
|GET /social, POST /social/action|9 NPC, thoại, thiện cảm, quà và kỳ ngộ|
|Các route vòng đời/TM|Giữ tương thích API đã triển khai trước2.1|

Một thao tác ghi có `life_id`, UUID `request_id`, `version`, `action` và `args`. Edge lấy account từ JWT. SQL kiểm sở hữu, kiếp còn sống, điều kiện, quota và phiên bản; trừ/nhận trong một transaction. Retry cùng key+payload trả receipt gốc, payload khác bị từ chối. Client giữ thao tác đang chờ trong sessionStorage để retry sau mất mạng.

Tiền dùng numeric(78,0), trả chuỗi thập phân; không tính tiền bằng Number trên client. Sổ tiền bất biến ghi nguồn/tiêu, số dư sau giao dịch, nguồn khởi đầu, số dư chuyển từ bản cũ và mất tài sản khi chết. Lịch sử đấu giá giữ trước/sau mỗi thay đổi. Các bảng bật RLS và chỉ service_role được gọi qua Edge đã xác thực.

Craft khóa nguyên liệu/phí/lượt ở lúc bắt đầu, lưu RNG kín; trả kết quả đúng một lần khi nhận. Job/EXP/cây/đồ/hộp nhận theo kiếp; công thức đã học và quota theo tài khoản. Đấu giá giữ toàn bộ tiền bid, hoàn người bị vượt giá, chống bid sát giờ, thuế/phí và xử lý chết. Xem [triển khai, chuyển save và giới hạn](../V21_IMPLEMENTATION.md).

Chạy `pnpm test` và `pnpm build:web` trước khi tích hợp. Kiểm thêm bản sao database thật trước phát hành. Không sửa migration lịch sử hoặc dùng rollback để hồi sinh tài sản đã mất. Bản beta dùng advisory transaction lock cho các giao dịch mới, cần đo tải trước khi mở rộng. Các handler đặc biệt chưa hỗ trợ từ chối trước khi tiêu đồ; hợp đồng đầy đủ nằm trong EFFECT_HANDLERS.md.
