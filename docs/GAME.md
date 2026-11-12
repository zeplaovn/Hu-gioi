# GAME — Hư Giới · Hồ sơ gameplay và giao diện
> Trạng thái: Hiện hành. Chuẩn phiên bản từ `main` (11/11/2026); **internal test**, không phải tuyên bố tính năng đã nghiệm thu trên production.

## 1. Hệ luật hiện hành
- Game idle tu tiên **online-only**: chỉ tiến triển trong thời gian máy chủ xác nhận có hoạt động; tab ẩn/offline không cấp tu vi, tài nguyên, tuổi, hồi HP hay RNG.
- State **V9**, protocol **v2**, **49 lệnh** thuộc 9 miền; điều khiển thời gian, RNG và kết quả thuộc server. Mã chuẩn: `engine/`, `data/`, `server/services/player-service.js`.
- Mỗi đạo thân chỉ một mạng. Tử vong có thể xảy ra bởi lôi kiếp, chiến đấu, bí cảnh hoặc hết thọ nguyên khi online. Khi đã chết, chỉ có thao tác **bắt đầu lại từ đầu**, không hồi sinh/trọng sinh; xóa nhân vật, Thiên Tinh, nâng cấp Thiên Mệnh Các và rank theo logic hiện hành. Auth và consent được giữ riêng.
- Tên kỹ thuật legacy như `rebirths` trong dữ liệu tương thích **không phải** tính năng chuyển kiếp có lợi ích.
- Luật khác biệt giữa mô phỏng NPC và người chơi thật cần được hiển thị rõ.

## 2. Tạo nhân vật và Thiên Mệnh Các
- Quy trình chính: **01 Chọn đạo thân → 02 Thiên Mệnh Các/Shop Khởi Nguyên → 03 Phân bổ thiên phú**. Một Dấu ấn Thiên Mệnh miễn phí vẫn được chọn trong bước shop.
- Backend cấp preview/ticket và kiểm tra quyền; không tin chủng tộc, tuổi, linh căn, giá, thưởng hay điểm thêm từ client.
- Shop starter đã merge qua **PR #77**: quy đổi điểm thiên phú, Linh Thạch Nhập Thế, Tụ Khí Đan và Bồi Nguyên Đan; hàng chờ phát **đúng một lần** khi tạo nhân vật, trong transaction. Replay trùng `requestId` không phát trùng.
- **Giá test, chưa chốt cân bằng:** thưởng 10 Thiên Tinh trong điều kiện mua starter đầu tiên; điểm thiên phú 4 Thiên Tinh/điểm, tối đa 4; linh thạch giá 2, Tụ Khí Đan giá 3, Bồi Nguyên Đan giá 2. Tổng điểm cơ bản 8, tối đa 12 khi mua thêm; một chỉ số không vượt 8.
- Thiên Mệnh Các trong nhân vật dùng Thiên Tinh nhận từ đột phá đại cảnh giới (`5 × r` tại bậc r). Số dư chỉ có hiệu lực trong **kiếp hiện tại**, không tích lũy qua thao tác reset sau tử vong.
- Nguồn chi tiết: [thien-menh-cac.md](thien-menh-cac.md), [creation-pavilion-shop.md](creation-pavilion-shop.md), [gameplay-v9.md](gameplay-v9.md).

## 3. Tu luyện, Lịch luyện, chiến đấu
- Tu luyện, tuổi thọ, auto đột phá tiểu cảnh giới và chiến đấu do server tính.
- Lịch luyện tạo một sự kiện khi khởi hành: **Quái 45% / NPC 30% / Kỳ duyên 25%**. Quái có giao chiến, né tránh, thương lượng; NPC có sẻ lòng, lắng nghe, tranh luận. `exploreChoice` đã vào protocol. Đây là **giá trị cân bằng test**, chưa được xác nhận phát hành.
- `tamMa` có miền 0–100, tác động cơ hội đột phá; không tự suy giảm ngoài cơ chế hiện có.
- Tri kỷ, Luận kiếm, Đấu giá và các tương tác NPC/tông môn mô phỏng **không phải PvP người thật**.

## 4. Kinh mạch, nghề phụ và tài sản
- Tàng Kinh Các nằm trong tông môn, có 12 sách tra cứu tương ứng bốn nghề và ba giới. Mỗi chuyến lịch luyện hoàn thành cho 20 điểm lịch luyện; ủy thác tông môn thành công cho thêm số điểm bằng cống hiến nhận được. Một nhân vật mượn một quyển tại một thời điểm; đổi sách tiêu điểm theo giá hiển thị, đọc lại quyển đang mượn không tốn thêm. Điểm và sách gắn với nhân vật, không dựa vào cống hiến đã có trước khi cập nhật.
- Sách trình bày các công thức đang có trong game, không khóa lại công thức cũ. Cảnh giới và điều kiện nghề, bí tịch vẫn áp dụng như trước; các bí tịch hiếm độc quyền chưa thuộc phiên bản thư viện này.
- Kinh Mạch Đồ hiển thị **12 Chính Kinh xanh** và **8 Kỳ Kinh vàng**; không có nút bật Thanh Quang/Kim Quang độc lập.
- Phần này hiện là **tra cứu UI/design**, chưa có state/lệnh thực thi tác dụng kinh mạch; luật tạp chất **Z=100 → phế tu vi, thành phàm nhân nhưng không chết ngay** là quyết định thiết kế **chưa code**.
- Các cơ chế Luyện Đan/Luyện Khí/Chế Phù/Linh Điền hiện có cần giữ gating theo cảnh giới; đề xuất **12 sách nghề (4 nghề × 3 giới)** chưa cài.
- Tài sản WebP/GIF chuyển đổi nằm trong `media/assets/custom/2026-11/`; client có chế độ giảm chuyển động. Giữ nguyên asset chưa chứng minh không dùng.
- Tham khảo [asset-pack-crafting-meridians.md](asset-pack-crafting-meridians.md), [design-integration.md](design-integration.md).

## 5. Giao diện, online chat và bảng xếp hạng
- Giao diện chính tông xanh, bản đồ responsive, cửa sổ nổi dạng desktop, menu nhiệm vụ; kiểm thử màn hẹp vẫn là gate release.
- Chat là tính năng người chơi thật với **4 kênh: Thế giới, Tông môn, Đạo hữu, Đạo lữ**; cửa sổ messenger có feed cuộn, composer ở đáy, điều khiển tab và mobile responsive. Mã PR **#78** đã merge; Edge hotfix v9 được báo cáo trên test nhưng vẫn cần thử JWT thật.
- Chat **15 giây/tin** và polling khoảng **10 giây chỉ khi cửa sổ hoạt động và tab hiển thị**; TTL tin 1 giờ/xóa vật lý là **việc còn mở**.
- Bảng xếp hạng theo **Lực chiến/Cảnh giới**, loại nhân vật chết khỏi bảng live; yêu cầu đổi sang **snapshot 12 giờ** chưa hoàn thành.
- Không đồng nhất nút UI có mặt với API deployed đã hoạt động trên mobile.

## 6. Quyết định và kiểm thử còn mở
- Các mục P0/P1 về kinh mạch, phàm nhân, sách nghề, thiết kế cao giới, cân bằng và quyền sở hữu nội dung: [gameplay-decisions.md](gameplay-decisions.md).
- Nghiệm thu cuối: tạo và reset nhân vật, gameplay online/ẩn tab, hồi quy death/permadeath, 12/8 kinh mạch, chat bốn kênh, ranking, 390×844/mobile ngang và desktop, tốc độ load assets.
- Mọi quy tắc/tỉ lệ chưa phê duyệt không được biến thành quyết định sản phẩm chỉ vì đã có code thử.
