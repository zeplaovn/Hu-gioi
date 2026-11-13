# GAME — Hư Giới · Gameplay và giao diện

> Trạng thái: Hiện hành. Đối chiếu mã nguồn `main` ngày 13/11/2026 (HEAD `58f7e6f`); **internal test**, không phải tuyên bố tính năng đã nghiệm thu trên production.

## 1. Hệ luật hiện hành

- Game idle tu tiên **online-only**: chỉ tiến triển trong thời gian máy chủ xác nhận có hoạt động. Tab ẩn/offline không cấp tu vi, tài nguyên, tuổi, hồi sinh lực hay RNG.
- State **V10**, protocol **v4**, **52 lệnh** thuộc **8 miền lệnh**: `progression`, `time`, `inventory`, `crafting`, `combat`, `world`, `adventures`, `social`. `engine/rules/creation.js` xử lý tạo nhân vật, không nhận lệnh. Đồng hồ, RNG, giá và phần thưởng do máy chủ quyết định.
- Mã chuẩn: `engine/` và `data/` là luật dùng chung; `server/services/player-service.js` là nguồn chạy gameplay; `supabase/functions/api/` là backend Edge production.
- Mỗi đạo thân **một mạng**. Tử vong có thể xảy ra bởi lôi kiếp, chiến đấu, bí cảnh hoặc hết thọ nguyên khi online. Khi đã chết, chỉ có thao tác **bắt đầu lại từ đầu**; không hồi sinh/trọng sinh. Reset xóa nhân vật, Thiên Tinh, nâng cấp Thiên Mệnh Các và thứ hạng; tài khoản Auth và lịch sử chấp thuận chính sách được giữ riêng.
- Tên kỹ thuật legacy như `rebirths` trong dữ liệu tương thích **không phải** tính năng chuyển kiếp có lợi ích.
- **Người chơi thật:** chat bốn kênh và bảng xếp hạng. **Mô phỏng NPC:** Tri kỷ, Đạo hữu, Luận kiếm, Đấu giá và các hoạt động tông môn. UI ghi nhãn `NPC · mô phỏng` cho các mục tương ứng.

## 2. Tạo nhân vật và Thiên Mệnh Các

Màn tạo đạo thân có ba bước trong `index.html`:

1. **01 · Chọn đạo thân** — tên, giới tính, chủng tộc, tuổi, linh căn và thiên phú do backend gieo trong preview.
2. **02 · Thiên Mệnh Các · Quầy Khởi Nguyên** — chọn một Dấu ấn Thiên Mệnh miễn phí và có thể đổi Thiên Tinh lấy hàng starter.
3. **03 · Phân bổ thiên phú** — phân bổ 8 điểm cơ bản (tối đa 12 điểm sau khi mua thêm; mỗi chỉ số tối đa 8).

Backend cấp preview/ticket ràng buộc chủ sở hữu, TTL **10 phút**, giới hạn **5 lượt/ngày**; không tin chủng tộc, tuổi, linh căn, giá, thưởng hay điểm thêm từ client.

**Quầy starter (giá test, chưa chốt cân bằng):**

| Món | Giá (Thiên Tinh) | Giới hạn trước khi tạo | Khi vào game |
|---|---:|---:|---|
| 1 điểm Thiên Phú | 4 | 4 điểm | Tăng tổng điểm từ 8 lên tối đa 12 |
| Linh Thạch Nhập Thế | 2 | 2 túi | +200 linh thạch/túi |
| Kim Nguyên Đan | 3 | 2 gói | +2 Kim Nguyên Đan/gói |
| Huyết Châu Đan | 2 | 2 gói | +2 Huyết Châu Đan/gói |

Tài khoản chưa có đạo thân và chưa có sổ Thiên Mệnh được tặng **10 Thiên Tinh duy nhất khi đổi món starter đầu tiên**. Hàng chờ được áp dụng đúng một lần trong transaction tạo nhân vật; replay cùng `requestId` không phát trùng. Sau khi có nhân vật, quầy starter khóa.

**Thiên Mệnh Các trong game** dùng Thiên Tinh nhận từ đại đột phá thành công lên bậc `r`: `5 × r` (r = 1…13). Sáu thuộc tính (Tướng Mạo, Phúc Duyên, Căn Cốt, Ngộ Tính, Vận Khí, Cơ Duyên) đạt tối đa cấp 20, mỗi cấp +2,5% hiệu quả tương đối, trần +50%. Số dư, nâng cấp và Kỳ Trân chỉ có hiệu lực trong **kiếp hiện tại**; reset sau tử vong xóa toàn bộ.

Nguồn chi tiết: [thien-menh-cac.md](thien-menh-cac.md), [creation-pavilion-shop.md](creation-pavilion-shop.md), [gameplay-v9.md](gameplay-v9.md).

## 3. Tu luyện, bế quan và đột phá

- Tu luyện, tuổi thọ, tự đột phá tiểu cảnh giới và chiến đấu do server tính. Có **14 cảnh giới** từ Luyện Khí đến Đạo Tổ; số tầng mỗi cảnh giới lấy từ `data/balance.js`.
- **Bế quan** là phiên tĩnh tu có kiểm soát: chọn 30 phút (1.800 giây), 2 giờ (7.200 giây) hoặc 8 giờ (28.800 giây). Phiên dừng khi hết giờ, khi đạt viên mãn, khi thọ nguyên còn 5 phút, khi người chơi dừng hoặc khi nhân vật chết. Bế quan **không tự độ kiếp**.
- Tab ẩn/offline làm đóng băng phiên; sau khi phiên dừng, luật tu luyện và thọ nguyên thông thường tiếp tục. Báo cáo bế quan do server trả về, gồm tu vi, linh thạch, tiểu cảnh giới, chiến lợi phẩm và sự kiện; không cấp thưởng lần hai.
- Đại đột phá cần vượt lôi kiếp. Thất bại độ kiếp khiến đạo thân **tọa hóa**; không có cơ chế trọng thương sống sót trong luật hiện hành.

## 4. Lịch luyện, chiến đấu và bí cảnh

- `startExploration` mở chuyến lịch luyện 10 phút và gieo **một** sự kiện theo tỉ lệ trong `data/adventures.js`: **quái 45% · NPC 30% · kỳ duyên 25%**. Đây là giá trị cân bằng test, chưa được xác nhận phát hành.
- Quái có ba cách ứng phó: **Giao chiến**, **Né tránh**, **Thương lượng**. NPC có **Sẻ lòng**, **Lắng nghe**, **Tranh luận hơn thua**. Kết quả chỉ tính khi chuyến đi kết thúc; không chọn thì quái dùng giao chiến, NPC chỉ lướt qua.
- `tamMa` có miền 0–100; mỗi điểm giảm 0,15% xác suất đột phá nền (tối đa −15%). Đan `GIAI_DOC` giảm 20 điểm. Tâm ma không tự suy giảm theo thời gian.
- Có **9 bí cảnh** trong `data/adventures.js`, mở cao nhất đến cảnh giới 8 (Độ Kiếp). Hai chế độ: kết toán theo tầng (`startDungeon`) và đánh theo lượt (`enterDungeon` + `dungeonAct`).
- Tri kỷ, Luận kiếm, Đấu giá và tương tác NPC/tông môn là **mô phỏng**, không phải PvP người thật.

## 5. Nghề phụ, kinh mạch và tông môn

- Bốn nghề: **Luyện đan**, **Luyện khí**, **Chế phù**, **Linh điền**. Công thức luyện đan/luyện khí/chế phù chỉ hiển thị và chế tạo được khi đang mượn quyển sách tương ứng ở **Tàng Kinh Các**; mẻ đã xếp và cây đã trồng vẫn tiếp tục khi đổi sách.
- Tàng Kinh Các có **12 sách tra cứu** (4 nghề × 3 giới: Hạ Giới 0–4, Linh Giới 5–8, Tiên Giới 9–13). Mỗi chuyến lịch luyện hoàn thành cho 20 điểm lịch luyện; ủy thác tông môn thành công cho thêm điểm bằng cống hiến. Một nhân vật mượn một quyển tại một thời điểm; đọc lại quyển đang mượn không tốn thêm.
- Hệ **sách nghề vĩnh viễn** (`learnedRecipes`, học một lần, mở nhiều công thức) mới là **đề xuất**, chưa triển khai. Xem [profession-manuals-proposal.md](profession-manuals-proposal.md).
- **Kinh Mạch Đồ** hiển thị **12 Chính Kinh xanh** và **8 Kỳ Kinh vàng**; không có nút bật Thanh Quang/Kim Quang độc lập. Đây là **tra cứu UI/design**, chưa có state/lệnh thực thi tác dụng kinh mạch. Luật tạp chất **Z=100 → phế tu vi, thành phàm nhân nhưng không chết ngay** đã chốt thiết kế nhưng **chưa code**.
- Ba tông môn: Thanh Vân Tông, Huyết Sát Môn, Vạn Dược Cốc. Có 6 cấp danh phận, 49 ủy thác, 10 món kho tông môn; danh phận nhập môn do linh căn quyết định. Đại hội PvP và thành viên tông môn thật chưa triển khai.

## 6. Giao diện hiện hành

Menu chính có 9 cửa sổ: **Tu luyện**, **Bế quan**, **Tông môn**, **Nghề phụ**, **Nhân vật**, **Thế giới**, **Nhiệm vụ**, **Truyền âm**, **Bảng xếp hạng**; màn **Cài đặt** mở từ menu phụ. Trên mobile, menu được thu gọn thành dropdown.

- **Tu luyện:** hấp thu linh thạch, tốc độ, thanh tu vi, mục tiêu, công pháp, bế quan và lối tắt.
- **Thế giới:** ba tab Bản đồ, Cửa hàng, Đấu giá; Đấu giá là phiên mô phỏng.
- **Tông môn:** sáu tab Ủy thác, Lịch luyện, Bí cảnh, Tàng Kinh Các, Kho tông môn, Danh phận.
- **Nhiệm vụ:** bốn tab **Hằng ngày**, **Điểm danh**, **Hộp thư**, **Nhiệm vụ cũ**.
- **Giao du:** bốn tab Tri kỷ, Đạo hữu, Luận kiếm, Bảng xếp hạng; ba tab đầu là NPC mô phỏng.
- **Truyền âm:** bốn kênh Thế giới, Tông môn, Đạo hữu, Đạo lữ và tab Nhật ký.

## 7. Chat và bảng xếp hạng

- Chat là tính năng **người chơi thật** qua Edge API JWT + consent. Bốn kênh: **Thế giới** (công khai), **Tông môn** (chỉ thành viên cùng tông môn), **Đạo hữu** và **Đạo lữ** (phòng công khai, không phải nhắn tin riêng).
- Gửi cách nhau tối thiểu **15 giây**; client poll khoảng **10 giây**, chỉ khi cửa sổ chat mở và tab hiển thị. API chỉ trả tin trong **1 giờ**; bảng chat là **UNLOGGED**, cron xóa vật lý mỗi **5 phút** (presence không hoạt động quá 10 phút cũng bị xóa).
- Bảng xếp hạng top 50 theo **Lực chiến** hoặc **Cảnh giới**, đọc bảng live `game.player_leaderboard`; trigger loại nhân vật đã chết. **Snapshot 12 giờ chưa được triển khai** — đây vẫn là đề xuất tối ưu, không phải tính năng hiện hành.
- Không đồng nhất nút UI có mặt với API đã được xác minh trên mọi thiết bị. Cần authenticated smoke trước khi công bố.

## 8. Nhiệm vụ ngày, điểm danh và hộp thư

- Máy chủ chọn **3 trong 5 nhiệm vụ** theo `SHA-256(ownerId + ngày)`. Ngày cố định **UTC+7**, reset lúc 00:00 giờ Việt Nam; tiến độ là hiệu số `state.progress` hiện tại trừ baseline đầu ngày. Đổi nhân vật hoặc sang ngày mới tạo baseline mới; không cộng tiến độ offline.
- Năm nhiệm vụ: hạ yêu thú, tu luyện online, khám phá vùng đất mới, luyện đan và đột phá. Thưởng Linh Thạch + vật phẩm; chỉ nhận một lần/ngày.
- **Điểm danh** chu kỳ 7 ngày, thưởng tăng dần; bỏ lỡ một ngày quay về ngày 1, hết ngày 7 quay lại ngày 1. Cần có đạo thân.
- **Hộp thư** gieo mẫu `welcome`, `event`, `support` một lần cho mỗi tài khoản bằng `seed_key`; quà đính kèm cấp vào nhân vật hiện tại. Thư sự kiện có hạn 30 ngày; thư hỗ trợ không có quà vẫn đánh dấu đã đọc được.
- Mọi claim dùng `requestId` + receipt phía máy chủ; replay cùng `requestId` trả kết quả cũ, không cộng thưởng lần hai. RequestId dùng cho intent khác bị từ chối.
- Dữ liệu nằm trong `game.account_state`, `game.account_mail`, `game.account_receipts`; xóa tài khoản/dữ liệu gameplay xóa cả ba.

## 9. Quyết định và kiểm thử còn mở

- Các mục P0/P1 về kinh mạch, phàm nhân, sách nghề, thiết kế cao giới, cân bằng và quyền sở hữu nội dung: [gameplay-decisions.md](gameplay-decisions.md).
- Nghiệm thu cuối: tạo và reset nhân vật, gameplay online/ẩn tab, hồi quy death/permadeath, 12/8 kinh mạch, chat bốn kênh, ranking, 390×844/mobile ngang và desktop, tốc độ load assets.
- Mọi quy tắc/tỉ lệ chưa phê duyệt không được biến thành quyết định sản phẩm chỉ vì đã có code thử.

Xem thêm [SYSTEM](SYSTEM.md), [hợp đồng engine](engine-contract.md), [Thiên Mệnh Các](thien-menh-cac.md), [tổng hợp công việc](PROJECT-STATUS.md).