# Nâng cấp dữ liệu và thư viện nội dung v1.6.1

## Đã triển khai

- Nguồn thiết kế chuyển từ v1.3/60 ngày sang gói đã kiểm tra v1.6.1. Tiến trình tham chiếu 33 ngày; mục tiêu tài khoản 30–45 ngày không phải cam kết thời gian hoàn tất.
- Máy chủ và game-core dùng từng mốc trong `xp_thresholds_45_days.csv`: thời gian hiệu dụng = XP yêu cầu / XP mỗi giờ × 3.600. Tổng tương đương khoảng 33 ngày ở 16,8 giờ hiệu dụng/ngày; online thường xuyên sẽ nhanh hơn.
- Migration mới giữ cảnh giới, tầng, tỷ lệ tiến độ tầng, tỷ lệ thọ nguyên đã dùng, tài sản và Thiên Mệnh. Các xác nhận đột phá đang chờ bị vô hiệu để người chơi xem lại thông số. Không sửa các migration lịch sử.
- Tàng Thư Các có 12 chương mở theo cảnh giới hiện tại, 30 hồ sơ Bách Quái, tìm kiếm và lọc 268 vật phẩm. Đọc truyện không tự ghi hoàn thành nhiệm vụ hoặc quan hệ.
- Đổi tên 842 ảnh và lưu đường dẫn cũ/mới trong `docs/asset-renames.csv`. Tên có ID là ánh xạ minh họa đề xuất, không tự thêm một vật phẩm vào dữ liệu. 78 đường dẫn ảnh đang có trong web được chuyển qua bộ tên mới.
- Tạo lại 3 biểu tượng bị dính khung ảnh khác: Gỗ Lôi, Yêu Đan (MAT-004), Tơ Băng. 89 khung hoạt ảnh khác được đánh dấu `can_sua_khung`, chưa tạo lại; chúng không được chọn làm minh họa mới.
- Tài liệu cũ, bảng tiến trình/kinh tế 60 ngày, simulator/QA v1.3 được thay khỏi cây hiện hành; vẫn có thể tra lịch sử Git. Không xóa `legacy/` hoặc các migration cũ vì còn giá trị đối chiếu.

## Phạm vi chưa hoàn tất

Đây là nâng cấp nền dữ liệu, tiến trình idle và thư viện đọc; chưa phải triển khai toàn bộ thiết kế game. Combat, cửa hàng/kinh tế, crafting, tông môn, nhiệm vụ phân nhánh, thiện cảm/tín nhiệm và kết thúc Quy Phàm vẫn cần các đợt triển khai máy chủ riêng. Menu của các tính năng chưa có vẫn khóa. Không tự biến các cơ chế đang ghi “đề xuất” thành luật phát hành. Hồ sơ nội bộ Hỗn Độn không được đưa vào Tàng Thư Các.

Việc tạo lại 89 khung hoạt ảnh còn tồn đọng phải giữ nhất quán nhân vật và căn chỉnh giữa các frame, sau đó kiểm tra phát hoạt ảnh. Không coi các frame này là đã sửa.

## Kiểm tra và triển khai

- `pnpm gen:check`: kiểm tra SQL/TS/nội dung sinh ra đúng nguồn.
- `pnpm test:content`: kiểm tra đủ 135 ngưỡng, bộ phân tích CSV, 842 đường dẫn ảnh, cùng test hội thoại NPC. Tàng Thư Các đã chuyển sang repo `Hu-gioi-wiki` nên không còn trong game.
- `pnpm test` và `pnpm build:web`: chạy đầy đủ trước merge/deploy, gồm SQL trên PostgreSQL và đối chiếu TS↔SQL.
- Môi trường soạn thay đổi bị chặn tải npm (HTTP 403), chưa có Supabase CLI/PostgreSQL; chưa chạy local đầy đủ unit test/build/DB. Smoke test giao diện cũng bị chặn vì thiếu Chromium trong môi trường. Hai file migration được soạn theo cấu trúc migration hiện có do CLI không cài được. CI của PR phải là cổng kiểm tra trước khi triển khai.
- Chưa áp dụng migration lên database thật. Sao lưu database rồi áp dụng migration mới trước khi phát hành web tương ứng. Giữ nguyên `time_scale` và `hazard_scale` đang cấu hình ở server.

## Ảnh tạo lại

Dùng Imagegen tích hợp, chỉnh sửa ảnh gốc, nền trong suốt. Prompt chung: giữ chủ thể/màu/khung tròn vàng và ngọc xanh, loại bỏ mảnh khung dư phía trên, khôi phục vòng tròn và tua hoàn chỉnh, một biểu tượng ở giữa, có khoảng trong suốt bốn phía, không chữ. Chủ thể từng ảnh: gỗ có sét tím; yêu đan đỏ trong vỏ ngà; tơ băng xanh nhạt với kén tằm.
