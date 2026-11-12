# Gameplay V9 · Một mạng, chỉ tiến triển khi online

> Trạng thái: Hiện hành.
> **Đối chiếu mã nguồn 11/11/2026:** Thiên Tinh và Thiên Mệnh Các chỉ có hiệu lực trong kiếp hiện tại. Khi nhân vật chết và chủ tài khoản chọn bắt đầu lại, backend xóa cả nhân vật, số dư Thiên Tinh, nâng cấp/Kỳ Trân và xếp hạng; không chuyển tài nguyên sang nhân vật mới. Xem [Thiên Mệnh Các](thien-menh-cac.md).

> Bản triển khai theo `hu-gioi-gameplay-spec.md`. Đây là diễn giải kỹ thuật được đưa lên PR #27, chưa được xác nhận đủ để triển khai sản xuất. Các điểm có gắn `[XÁC NHẬN]` ở đặc tả ban đầu vẫn được đánh dấu là quyết định tạm thời.

## Vòng đời nhân vật

1. Đăng nhập Supabase, xác nhận chính sách `2026-11-11-v7` (privacy và điều khoản phát hành).
2. Nếu tài khoản chưa có nhân vật, backend phát `creation/preview` (ticket ràng buộc chủ sở hữu, TTL 10 phút, giới hạn 5 lượt/ngày). Chọn đạo hiệu, giới tính, 8 điểm thiên phú và **một Thiên mệnh miễn phí** (`exp`, `stone`, `life`, `luck`). Chủng tộc, tuổi và linh căn được backend gieo.
3. Gameplay và ngẫu nhiên đều từ `/api/v1`; client chỉ hiển thị snapshot. Giữ nguyên cơ chế tự đột phá tiểu cảnh giới.
4. **Độ kiếp đại cảnh giới thất bại**, **thua đấu NPC mô phỏng** (PvP chưa giữa người thật), **HP về 0 trong chiến đấu hoặc bí cảnh**, hay **thọ nguyên cạn khi online** → `state.death = { cause, at }`. Đạo thân chết, mọi lệnh bị từ chối; chỉ khi chủ tài khoản gọi `reset-after-death` thì nhân vật cùng dữ liệu gameplay liên quan được xóa, sau đó có thể gieo nhân vật mới. Phiếu khởi nguyên cũ được giữ để không reset hạn mức gieo theo ngày.
5. **Không có lệnh `prestige`, `reincarnate`, `buyMeta`, `upgradeOffline`.** Nhân vật mới không kế thừa trang bị, linh thạch, Thiên mệnh đã chọn hay thành tựu. **Không có ngoại lệ kế thừa:** Thiên Tinh, nâng cấp Thiên Mệnh Các và Kỳ Trân cũng bị xóa khi bắt đầu lại sau tử vong; tài khoản Supabase Auth vẫn giữ.

## Chỉ tính thời gian khi online

- Trình duyệt có heartbeat `POST /api/v1/players/{id}/sync` theo cấu hình `server/presence-config.js` khi tab hiện. Tab ẩn/đóng gửi `POST .../pause` có xác thực; máy chủ tự coi đã offline khi ngừng heartbeat quá cửa sổ grace cấu hình trong `server/presence-config.js` (có thể ghi đè qua `HU_ONLINE_GRACE_MS`).
- Khoảng vắng mặt chạy `advance(now, true)`: **0 tu vi, 0 tuổi, 0 vàng, 0 hồi HP, không chiến đấu, không RNG và không tử vong**. Deadline của luyện đan, cây, bí cảnh, nhiệm vụ, buff/cooldown được dịch tương ứng.
- Trở lại game làm mới mốc `lastUpdate` mà không catch-up. Trong trường hợp mạng mất đột ngột, việc xác định đã offline có thể trễ tối đa bằng ngưỡng heartbeat; đây là giới hạn của kết nối HTTP, không phải một hệ thống presence realtime tuyệt đối.
- Nếu người chơi đã ở trạng thái tử vong do lệnh online trước đó, đóng tab không làm đảo ngược cái chết.

## Lịch luyện: sự kiện ngẫu nhiên và tâm ma

- Khi khởi hành (`startExploration`) một chuyến 10 phút bốc **một** sự kiện theo tỉ lệ cố định ở `EXPLORE_WEIGHTS` (`data/adventures.js`): **quái 45% · NPC 30% · kỳ duyên 25%**.
- **Quái** và **NPC** cho phép chọn một cách ứng phó bằng lệnh `exploreChoice { index: 0–2 }` (chọn một lần, trong lúc chuyến đi diễn ra). Kết quả chỉ được tính khi chuyến đi kết thúc; không chọn thì quái dùng **giao chiến** (như trước), NPC chỉ lướt qua.
  - Quái: *Giao chiến* (thắng theo `win_probability`, thua tay trắng) · *Né tránh* (an toàn, không thu được gì) · *Thương lượng* (xác suất 15–75%, giảm khi tâm ma cao; thành công nhận 60% linh thạch quái, thất bại mất 6% sinh lực tối đa nhưng không bao giờ tử vong).
  - NPC: *Sẻ lòng* (tâm ma −12, tu vi ít) · *Lắng nghe* (tâm ma −4, tu vi vừa) · *Tranh luận hơn thua* (tâm ma +10, tu vi nhiều).
- **Kỳ duyên** dùng lại hệ kỳ ngộ có sẵn (`ENCOUNTERS`, `resolveEncounter`), không có lựa chọn.
- **Tâm ma** (`state.tamMa`, số nguyên 0–100, mặc định 0): mỗi điểm giảm 0,15% xác suất đột phá nền (tối đa −15%). Đan `GIAI_DOC` giảm 20 điểm. Tâm ma không tự suy giảm theo thời gian.
- Hằng số: `TAM_MA_MAX`, `TAM_MA_BREAK_PENALTY`, `TAM_MA_CLEANSE`, `EXPLORE_CHOICES`. **Các con số này là đề xuất cân bằng chờ chủ dự án duyệt.**

## Thiên mệnh và tương thích

- `state.destiny` lưu lựa chọn tại Khởi Nguyên, hiệu lực một cấp của `META_UPGRADES` hiện có; `meta.achievements` chỉ là nhật ký thành tựu trong kiếp hiện tại, không cộng điểm mua nâng cấp.
- `engine/state/player.js` dùng V10, chấp nhận V4–V10; `engine/protocol/commands.js` dùng protocol V4 và có 52 lệnh. V10 bổ sung phiên bế quan tu luyện và báo cáo server.
- Khi một nhân vật V8 đang tồn tại được nâng lên V9, người chơi không được tự đưa phiên bản state/hành trang client lên server; chỉ backend chạy normalize. Chưa có công cụ cho nhân vật cũ chọn Thiên mệnh giữa kiếp. Tạo lại sau khi chết mới chọn.

## Quyết định thiết kế tạm thời cần chủ dự án xác nhận

1. HP về 0 trong **cả chiến đấu thông thường và bí cảnh** đều chết; không có cơ chế trọng thương sống sót.
2. **Tab ẩn được tính offline**; tab hiện nhưng đứt mạng được phát hiện qua heartbeat timeout.
3. Một trận PvP NPC có kết quả trong một transaction; không có trạng thái để thoát giữa trận. Bí cảnh nhiều lượt bị **tạm dừng** khi offline, không tính bỏ chạy hay tử vong tự động.
4. Một Thiên mệnh được chọn miễn phí, không có ngân sách điểm hay mở khóa kế thừa.
5. **Không giữ vật phẩm thông thường, thành tựu, Thiên Thư, lịch sử nhân vật hoặc lựa chọn Thiên mệnh qua cái chết**. Thiên Mệnh Các và Kỳ Trân nằm trong bảng tài khoản riêng nhưng bị xóa cùng việc bắt đầu lại sau tử vong; tài khoản đăng nhập và lịch sử chấp thuận chính sách vẫn được lưu ở Supabase.
6. `daoVan`, `offlineCap`, `offlineEff` giữ trường để migrate dữ liệu nhưng không còn lệnh gameplay tương ứng; tính năng tích lũy từ trọng sinh đã bị vô hiệu.

Các quy tắc này không chứng minh production đã sẵn sàng. Chat 4 kênh và bảng xếp hạng là tính năng người chơi thật qua Edge API; Tri kỷ/Luận kiếm/Đấu giá vẫn là NPC mô phỏng. Node/SQLite chỉ dành cho dev/test. Xem [edge-deployment.md](edge-deployment.md) và [security.md](security.md).
