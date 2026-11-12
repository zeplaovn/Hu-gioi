# GAME — Hư Giới · Hồ sơ gameplay và giao diện
> Trạng thái: Hiện hành. Chuẩn phiên bản từ `main` (11/11/2026); **internal test**, không phải tuyên bố tính năng đã nghiệm thu trên production.

## 1. Hệ luật hiện hành
- Game idle tu tiên **online-only**: chỉ tiến triển trong thời gian máy chủ xác nhận có hoạt động; tab ẩn/offline không cấp tu vi, tài nguyên, tuổi, hồi HP hay RNG.
- State **V10**, protocol **v4**, **52 lệnh** thuộc 9 miền; điều khiển thời gian, RNG và kết quả thuộc server. Mã chuẩn: `engine/`, `data/`, `server/services/player-service.js`.
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
- Bia đo linh căn cho biết danh phận nhập môn; danh phận được máy chủ ghi theo linh căn khi gia nhập, tách biệt cấp cống hiến hiện có. Nhân vật đã gia nhập trước bản cập nhật được phân theo linh căn hiện tại khi đồng bộ. Nhóm nhiệm vụ theo danh phận và đại hội PvP chưa được triển khai.
- Công thức luyện đan, luyện khí và chế phù chỉ hiển thị và chế tạo được khi đang mượn quyển sách tương ứng. Đổi sách đóng quyền chế tạo theo quyển cũ; mẻ đã xếp và cây đã trồng vẫn tiếp tục. Cảnh giới và điều kiện nghề, bí tịch vẫn áp dụng; các bí tịch hiếm độc quyền chưa thuộc phiên bản thư viện này. Gieo hạt và chăm sóc linh điền vẫn dùng như hiện hành.
- Các mục chính mở thành trang riêng; Lịch luyện và Bí cảnh nằm trong trang Tông môn. Liên kết cũ đến hai mục này chuyển sang đúng tab mới.
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

### 5.1 Nhiệm vụ ngày, điểm danh và hộp thư
- Màn **Nhiệm vụ** có bốn tab: **Hằng ngày**, **Điểm danh**, **Hộp thư**, **Nhiệm vụ cũ**. Tab Hằng ngày/Điểm danh/Hộp thư lấy dữ liệu từ tài khoản, không nhúng vào snapshot gameplay.
- Máy chủ chọn **3 trong 5 nhiệm vụ** theo `SHA-256(ownerId + ngày)`. Ngày cố định **UTC+7**, reset lúc 00:00 giờ Việt Nam; tiến độ là hiệu số `state.progress` hiện tại trừ baseline đầu ngày. Đổi nhân vật hoặc sang ngày mới sẽ tạo baseline mới, không cộng tiến độ offline.
- Năm nhiệm vụ hiện có: hạ yêu thú, tu luyện online, khám phá vùng đất mới, luyện đan và đột phá. Thưởng Linh Thạch + vật phẩm; chỉ nhận một lần/ngày.
- **Điểm danh** chu kỳ 7 ngày, thưởng tăng dần; bỏ lỡ một ngày quay về ngày 1, hết ngày 7 quay lại ngày 1. Cần có đạo thân.
- **Hộp thư** gieo mẫu `welcome`, `event`, `support` một lần cho mỗi tài khoản bằng `seed_key`; quà đính kèm cấp vào nhân vật hiện tại. Thư sự kiện có hạn 30 ngày; thư hỗ trợ không có quà vẫn đánh dấu đã đọc được.
- Mọi claim dùng `requestId` + receipt phía máy chủ; replay cùng `requestId` trả kết quả cũ, không cộng thưởng lần hai. RequestId dùng cho intent khác bị từ chối.
- Dữ liệu nằm trong `game.account_state`, `game.account_mail`, `game.account_receipts`; xóa tài khoản/dữ liệu gameplay xóa cả ba. Production chỉ có tính năng này sau khi áp migration và deploy lại Edge bundle.

## 6. Quyết định và kiểm thử còn mở
- Các mục P0/P1 về kinh mạch, phàm nhân, sách nghề, thiết kế cao giới, cân bằng và quyền sở hữu nội dung: [gameplay-decisions.md](gameplay-decisions.md).
- Nghiệm thu cuối: tạo và reset nhân vật, gameplay online/ẩn tab, hồi quy death/permadeath, 12/8 kinh mạch, chat bốn kênh, ranking, 390×844/mobile ngang và desktop, tốc độ load assets.
- Mọi quy tắc/tỉ lệ chưa phê duyệt không được biến thành quyết định sản phẩm chỉ vì đã có code thử.
