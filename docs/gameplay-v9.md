# Gameplay V9 · Một mạng, chỉ tiến triển khi online

> Trạng thái: Hiện hành.
> **Bổ sung 10/11/2026:** Thiên Mệnh Các là kho vĩnh viễn thuộc tài khoản: đột phá đại cảnh giới được 5×bậc Thiên Tinh, nhận lại đầy đủ ở mỗi kiếp; cấp và Kỳ Trân giữ qua xóa đạo thân sau khi chết. Nhân vật vẫn không hồi sinh, tạo kiếp mới miễn phí. Xem [Thiên Mệnh Các](thien-menh-cac.md).

> Bản triển khai theo `hu-gioi-gameplay-spec.md`. Đây là diễn giải kỹ thuật được đưa lên PR #27, chưa được xác nhận đủ để triển khai sản xuất. Các điểm có gắn `[XÁC NHẬN]` ở đặc tả ban đầu vẫn được đánh dấu là quyết định tạm thời.

## Vòng đời nhân vật

1. Đăng nhập Supabase, xác nhận chính sách `2026-11-10-v5` (privacy và điều khoản phát hành).
2. Nếu tài khoản chưa có nhân vật, backend phát `creation/preview` (ticket ràng buộc chủ sở hữu, TTL 10 phút, giới hạn 5 lượt/ngày). Chọn đạo hiệu, giới tính, 8 điểm thiên phú và **một Thiên mệnh miễn phí** (`exp`, `stone`, `life`, `luck`). Chủng tộc, tuổi và linh căn được backend gieo.
3. Gameplay và ngẫu nhiên đều từ `/api/v1`; client chỉ hiển thị snapshot. Giữ nguyên cơ chế tự đột phá tiểu cảnh giới.
4. **Độ kiếp đại cảnh giới thất bại**, **thua đấu NPC mô phỏng** (PvP chưa giữa người thật), **HP về 0 trong chiến đấu hoặc bí cảnh**, hay **thọ nguyên cạn khi online** → `state.death = { cause, at }`. Đạo thân chết, mọi lệnh bị từ chối; chỉ khi chủ tài khoản gọi `reset-after-death` thì bản nhân vật và phiếu tạo được xóa, sau đó có thể gieo nhân vật mới.
5. **Không có lệnh `prestige`, `reincarnate`, `buyMeta`, `upgradeOffline`.** Nhân vật mới không kế thừa trang bị, linh thạch, Thiên mệnh đã chọn hay thành tựu. **Ngoại lệ:** kho tài khoản Thiên Mệnh Các (Thiên Tinh, nâng cấp vĩnh viễn, Kỳ Trân chưa dùng) được giữ để tăng tốc kiếp mới.

## Chỉ tính thời gian khi online

- Trình duyệt có heartbeat `POST /api/v1/players/{id}/sync` theo cấu hình `server/presence-config.js` khi tab hiện. Tab ẩn/đóng gửi `POST .../pause` có xác thực; máy chủ tự coi đã offline khi ngừng heartbeat quá cửa sổ grace cấu hình trong `server/presence-config.js` (có thể ghi đè qua `HU_ONLINE_GRACE_MS`).
- Khoảng vắng mặt chạy `advance(now, true)`: **0 tu vi, 0 tuổi, 0 vàng, 0 hồi HP, không chiến đấu, không RNG và không tử vong**. Deadline của luyện đan, cây, bí cảnh, nhiệm vụ, buff/cooldown được dịch tương ứng.
- Trở lại game làm mới mốc `lastUpdate` mà không catch-up. Trong trường hợp mạng mất đột ngột, việc xác định đã offline có thể trễ tối đa bằng ngưỡng heartbeat; đây là giới hạn của kết nối HTTP, không phải một hệ thống presence realtime tuyệt đối.
- Nếu người chơi đã ở trạng thái tử vong do lệnh online trước đó, đóng tab không làm đảo ngược cái chết.

## Thiên mệnh và tương thích

- `state.destiny` lưu lựa chọn tại Khởi Nguyên, hiệu lực một cấp của `META_UPGRADES` hiện có; `meta.achievements` chỉ là nhật ký thành tựu trong kiếp hiện tại, không cộng điểm mua nâng cấp.
- `engine/state/player.js` dùng V9, chấp nhận V4–V9; `engine/protocol/commands.js` dùng protocol V2 và có 48 lệnh.
- Khi một nhân vật V8 đang tồn tại được nâng lên V9, người chơi không được tự đưa phiên bản state/hành trang client lên server; chỉ backend chạy normalize. Chưa có công cụ cho nhân vật cũ chọn Thiên mệnh giữa kiếp. Tạo lại sau khi chết mới chọn.

## Quyết định thiết kế tạm thời cần chủ dự án xác nhận

1. HP về 0 trong **cả chiến đấu thông thường và bí cảnh** đều chết; không có cơ chế trọng thương sống sót.
2. **Tab ẩn được tính offline**; tab hiện nhưng đứt mạng được phát hiện qua heartbeat timeout.
3. Một trận PvP NPC có kết quả trong một transaction; không có trạng thái để thoát giữa trận. Bí cảnh nhiều lượt bị **tạm dừng** khi offline, không tính bỏ chạy hay tử vong tự động.
4. Một Thiên mệnh được chọn miễn phí, không có ngân sách điểm hay mở khóa kế thừa.
5. **Không giữ vật phẩm thông thường, thành tựu, Thiên Thư, lịch sử nhân vật hoặc lựa chọn Thiên mệnh qua cái chết**. Thiên Mệnh Các và Kỳ Trân là kho riêng cấp tài khoản, được kế thừa; tài khoản và chính sách vẫn được lưu ở Supabase.
6. `daoVan`, `offlineCap`, `offlineEff` giữ trường để migrate dữ liệu nhưng không còn lệnh gameplay tương ứng; tính năng tích lũy từ trọng sinh đã bị vô hiệu.

Các quy tắc này chưa đồng nghĩa game đã có triển khai HTTPS công khai, sao lưu SQLite production, xóa tài khoản tự phục vụ hoặc multiplayer thật. Xem [edge-deployment.md](edge-deployment.md) và [security.md](security.md).
