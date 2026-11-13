# Vòng đời nhân vật — một mạng, chỉ tiến triển khi online

> Trạng thái: Hiện hành. Tên tệp `gameplay-v9.md` được giữ để không gãy liên kết và test cũ; nội dung đã đối chiếu state **V10**, protocol **v4** ngày 13/11/2026.

## 1. Vòng đời chuẩn

1. **Đăng nhập Supabase Auth** và chấp thuận hai chính sách `privacy` + `release_terms`, phiên bản `2026-11-11-v7`.
2. Nếu tài khoản chưa có nhân vật, backend phát `POST /api/v1/creation/preview`: ticket ràng buộc chủ sở hữu, TTL **10 phút**, giới hạn **5 lượt/ngày**. Chủng tộc, tuổi và linh căn được backend gieo.
3. Màn tạo nhân vật có ba bước: **01 Chọn đạo thân → 02 Thiên Mệnh Các/Quầy Khởi Nguyên → 03 Phân bổ thiên phú**. Người chơi chọn một Thiên mệnh miễn phí; có thể đổi Thiên Tinh lấy hàng starter. Toàn bộ giá, số lượng và giới hạn do server kiểm.
4. `POST /api/v1/players` tạo đạo thân trong transaction, áp dụng hàng chờ starter đúng một lần. Sau khi tạo, quầy starter khóa.
5. Gameplay chạy qua `/api/v1`: client chỉ gửi intent; server giữ đồng hồ, RNG, revision, receipt và state.
6. Khi chết, mọi lệnh bị từ chối. Chủ tài khoản có thể gọi `POST /api/v1/players/{id}/reset-after-death`, sau đó tạo đạo thân mới từ ticket mới.

## 2. Điều kiện tử vong

`state.death = { cause, at }` được ghi khi:

- độ kiếp đại cảnh giới thất bại;
- thua trận đấu NPC mô phỏng;
- sinh lực về 0 trong chiến đấu hoặc bí cảnh;
- thọ nguyên cạn khi đang online.

Không có cơ chế trọng thương sống sót, hồi sinh, `prestige`, `reincarnate`, `buyMeta` hay `upgradeOffline`. Tab ẩn/offline không gây tử vong.

## 3. Bắt đầu lại sau tử vong

- Reset **không thu phí**; xóa nhân vật, toàn bộ state gameplay, kho Thiên Mệnh Các (Thiên Tinh, nâng cấp, Kỳ Trân) và loại khỏi bảng xếp hạng.
- Tài khoản Supabase Auth, lịch sử chấp thuận chính sách và lịch sử ticket được giữ để không reset hạn mức gieo theo ngày.
- Nhân vật mới **không kế thừa** trang bị, linh thạch, Thiên mệnh đã chọn, thành tựu, Thiên Thư, quan hệ NPC hay bất kỳ tài nguyên nào.
- Tên trường legacy như `rebirths` trong `pavilion_accounts` chỉ là cấu trúc tương thích dữ liệu; không phải cơ chế trọng sinh.

## 4. Chỉ tính thời gian khi online

- Trình duyệt gửi heartbeat `POST /api/v1/players/{id}/sync` khi tab hiện, theo `server/presence-config.js`: **20 giây/lần**, grace **60 giây**.
- Tab ẩn/đóng gửi `POST .../pause` có xác thực. Máy chủ coi là offline khi ngừng heartbeat quá grace; có thể ghi đè bằng `HU_SYNC_INTERVAL_MS` / `HU_ONLINE_GRACE_MS` trong giới hạn.
- Khoảng vắng mặt chạy `advance(now, true)`: **0 tu vi, 0 tuổi, 0 linh thạch, 0 hồi sinh lực, không chiến đấu, không RNG, không tử vong**. Deadline của luyện đan, cây, bí cảnh, nhiệm vụ, buff/cooldown được dịch tương ứng.
- Trở lại game làm mới `lastUpdate` mà không catch-up. Mất mạng đột ngột có thể được phát hiện trễ tối đa bằng ngưỡng heartbeat; đây là giới hạn của HTTP, không phải presence realtime tuyệt đối.
- Nếu nhân vật đã chết do một lệnh online trước đó, đóng tab không làm đảo ngược cái chết.

## 5. Bế quan

- Ba lựa chọn: 30 phút (1.800 giây), 2 giờ (7.200 giây), 8 giờ (28.800 giây).
- Phiên dừng khi hết giờ, đạt viên mãn, thọ nguyên còn 5 phút, người chơi dừng hoặc nhân vật chết. Bế quan **không tự độ kiếp**.
- Tab ẩn làm đóng băng phiên. Báo cáo gồm thời gian online, tu vi, linh thạch, tiểu cảnh giới, chiến lợi phẩm và sự kiện; server không cấp thưởng lần hai.
- Sau khi phiên dừng, luật tu luyện và thọ nguyên thông thường tiếp tục.

## 6. Lịch luyện và tâm ma

- `startExploration` mở chuyến 10 phút và bốc **một** sự kiện theo `EXPLORE_WEIGHTS` trong `data/adventures.js`: **quái 45% · NPC 30% · kỳ duyên 25%**.
- Quái: **Giao chiến** (thắng theo xác suất, thua tay trắng) · **Né tránh** (an toàn, không thu được gì) · **Thương lượng** (xác suất 15–75%, giảm khi tâm ma cao; thành công nhận 60% linh thạch quái, thất bại mất 6% sinh lực tối đa nhưng không tử vong).
- NPC: **Sẻ lòng** (tâm ma −12, tu vi ít) · **Lắng nghe** (tâm ma −4, tu vi vừa) · **Tranh luận hơn thua** (tâm ma +10, tu vi nhiều).
- Kỳ duyên dùng hệ `ENCOUNTERS`/`resolveEncounter`, không có lựa chọn.
- `tamMa` là số nguyên 0–100, mặc định 0. Mỗi điểm giảm 0,15% xác suất đột phá nền (tối đa −15%). Đan `GIAI_DOC` giảm 20 điểm; tâm ma không tự giảm theo thời gian.
- Các hằng số `TAM_MA_MAX`, `TAM_MA_BREAK_PENALTY`, `TAM_MA_CLEANSE`, `EXPLORE_CHOICES` là **đề xuất cân bằng chờ duyệt**.

## 7. Thiên mệnh và tương thích

- `state.destiny` lưu lựa chọn tại Khởi Nguyên; `meta.achievements` chỉ là nhật ký thành tựu trong kiếp hiện tại, không cộng điểm mua nâng cấp.
- `engine/state/player.js` dùng **V10**, chấp nhận V4–V10; `engine/protocol/commands.js` dùng protocol **V4**, **52 lệnh**.
- Khi bản lưu cũ được nâng lên V10, chỉ backend chạy `normalize`; người chơi không được tự đưa state/hành trang client lên server.
- Chưa có công cụ cho nhân vật cũ chọn lại Thiên mệnh giữa kiếp. Tạo lại sau khi chết mới chọn.

## 8. Quyết định thiết kế tạm thời

1. Sinh lực về 0 trong **cả chiến đấu thông thường và bí cảnh** đều chết; không có trọng thương sống sót.
2. **Tab ẩn được tính offline**; tab hiện nhưng đứt mạng được phát hiện qua heartbeat timeout.
3. Một trận PvP NPC có kết quả trong một transaction; không có trạng thái thoát giữa trận. Bí cảnh nhiều lượt bị **tạm dừng** khi offline, không tự bỏ chạy hay tử vong.
4. Một Thiên mệnh miễn phí, không có ngân sách điểm hay mở khóa kế thừa.
5. **Không giữ** vật phẩm thông thường, thành tựu, Thiên Thư, lịch sử nhân vật hay lựa chọn Thiên mệnh qua cái chết. Thiên Mệnh Các và Kỳ Trân lưu ở bảng account nhưng bị xóa khi bắt đầu lại; tài khoản đăng nhập và consent được giữ.
6. `daoVan`, `offlineCap`, `offlineEff` giữ trường để migrate dữ liệu nhưng không còn lệnh gameplay tương ứng.

Các quy tắc này không chứng minh production đã sẵn sàng. Chat bốn kênh và bảng xếp hạng là tính năng người chơi thật qua Edge API; Tri kỷ/Luận kiếm/Đấu giá vẫn là NPC mô phỏng. Node/SQLite chỉ dành cho dev/test. Xem [edge-deployment.md](edge-deployment.md) và [security.md](security.md).