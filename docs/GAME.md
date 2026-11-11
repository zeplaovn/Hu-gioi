# Hư Giới — Hồ sơ GAME (11/11/2026)

**Phạm vi:** luật chơi, giao diện, trải nghiệm, tài sản. **Trạng thái:** đang test nội bộ, một số tính năng/giá trị còn chờ duyệt.

## Luật cốt lõi
- Game tu tiên idle nhưng chỉ tính tiến trình khi online; tab ẩn/offline không tích lũy.
- State V9, protocol v2, 49 lệnh. Engine server-authoritative; client không được quyết định RNG, thời gian, kết quả.
- Nhân vật chết bởi các điều kiện gameplay đã định: không hồi sinh/trọng sinh. Sau khi chết, bắt đầu lại từ đầu, không kế thừa vật phẩm, Thiên Tinh, nâng cấp hoặc thứ hạng.
- Tạo nhân vật: chọn đạo thân, Thiên Mệnh Các/Quầy Khởi Nguyên, phân bổ thiên phú; quà và mua vật phẩm phải được xác nhận từ server, một lần duy nhất. Giá/giới hạn shop ở PR #77 là giá test, chưa được chủ dự án duyệt.
- Thiên Tinh thay Đạo Vận theo định hướng thiết kế; không khôi phục cơ chế trọng sinh.

## Tính năng và UI được ghi nhận
- Lịch luyện: quái 45%, NPC 30%, kỳ duyên 25%; lựa chọn tương tác; Tâm Ma tác động tỷ lệ đột phá. Đây là các giá trị cân bằng còn cần xác nhận.
- Kinh mạch: 12 chính kinh, 8 kỳ kinh; asset và bố cục mobile cần nghiệm thu sau các nhánh liên quan.
- Giao diện xanh lục; bản đồ responsive; cửa sổ nổi theo kiểu desktop, nhiệm vụ ở menu; bỏ các nút Thanh Quang/Kim Quang theo yêu cầu thiết kế.
- Chat bốn kênh: Thế giới, Tông môn, Đạo hữu, Đạo lữ; cửa sổ chat responsive, chống spam gửi 15 giây, poll khi đang mở/hiện. PR #78 đã merge; API live vẫn cần authenticated smoke.
- Bảng xếp hạng người chơi thật: Lực chiến và Cảnh giới; nhân vật chết không được đứng trong bảng live.
- Tri kỷ, Luận kiếm, Đấu giá và các tương tác NPC vẫn là mô phỏng, không mặc nhiên là multiplayer/PvP người thật.

## Nguồn kỹ thuật và quyết định
- [Gameplay V9](gameplay-v9.md)
- [Thiên Mệnh Các](thien-menh-cac.md)
- [Quầy Khởi Nguyên](creation-pavilion-shop.md)
- [Sổ quyết định gameplay](gameplay-decisions.md)
- [Thiết kế tích hợp](design-integration.md)
- [Hồ sơ hệ thống](SYSTEM.md)

**Không đánh dấu “hoàn thành” chỉ dựa trên mô tả PR chưa merge hoặc chưa test.** Các điều chỉnh gameplay phải đi kèm test và duyệt cân bằng.
