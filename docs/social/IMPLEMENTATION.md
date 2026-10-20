# NPC Hạ Giới v1.1 — phạm vi triển khai

Nguồn nhập: hai ZIP người dùng cung cấp ngày 20/10/2026. Dữ liệu v1.6.1 và combat được thay bằng nguồn đính kèm; 19 NPC dùng đúng 95 cảnh chính, 76 hội thoại ngày, 38 kỳ ngộ, 36 quà và 95 sở thích.

## Đã nối vào game

- `#/nhan-duyen`: danh sách NPC, chọn câu trả lời, quan hệ, sự kiện và xác nhận/hủy quà. Nội dung chỉ được tải sau khi máy chủ mở cảnh; không đóng gói 209 cảnh trong client.
- PostgreSQL là nơi quyết định cảnh, đáp án, điểm và vật phẩm. API không nhận thời gian, điểm hay tài khoản do client tự khai.
- Khóa hàng kiếp tuần tự hóa thao tác đa thiết bị. Mỗi offer có kết quả cố định: retry không thưởng kép. Mọi request ghi kèm `life_id`, không tác động sang kiếp mới.
- Reset 00:00 UTC, một daily/NPC/ngày, 4 chủ đề không lặp trong chu kỳ. Một quà/NPC/ngày; cùng quà cách 3 ngày; trừ quà và cộng điểm cùng giao dịch. Giá `BALANCE_TBD` được giữ nguyên, chưa mở bán quà.
- Kỳ ngộ: 20% một lượt/tài khoản/ngày đủ điều kiện, pity sau 4 lần hụt, ngưỡng 20/50, trọng số NPC 1/1.5/2, cooldown 3 ngày; cảnh trả thưởng một lần/kiếp. Không tiêu lượt nếu không có ứng viên. Offer hết hạn khi reset UTC.
- `game.npc_presence` là dữ liệu máy chủ cho NPC chết/rời map/bị khóa. Gặp trực tiếp chỉ khả dụng trong Hạ Giới. Chọn một NPC khả dụng được coi là gặp NPC; chưa có cơ chế gia nhập tông môn để bổ sung điều kiện riêng.
- 5 cảnh chính/NPC mở tuần tự theo ngưỡng 0/20/50/80/100. Cờ lựa chọn chỉ lưu ứng viên/nhánh; không tự trao quest artifact, kết cục hay phi thăng. Giữ ID lore đã đọc ở tài khoản; quan hệ và quà mất khi chết thật, không mất khi phi thăng.

## Chưa thể gọi là hoàn thiện toàn game

Repo trước thay đổi này chỉ có tu luyện/đột phá/TM và thư viện đọc. Các hệ thống sau vẫn cần triển khai và kiểm thử riêng: chiến đấu theo lượt và boss phases; túi đồ/kinh tế/shop/craft/công pháp; bản đồ, nhiệm vụ 12 chương và tông môn; điều kiện kết thúc Quy Phàm; multiplayer 6 người và nội dung bí mật. Không mở giả các menu chưa có backend.

Quà chưa có nguồn phát hành production do giá chưa duyệt và nghề phụ chưa triển khai. Máy chủ có đường tặng/tiêu quà đầy đủ, kiểm thử cấp quà trực tiếp chỉ trong giao dịch test. Không cấp miễn phí đồ hay bán điểm TM để lấp chỗ trống.

## Kiểm tra và phát hành

`node tools/gen-social.mjs --check`, `node --test tests/social.test.mjs`, `pnpm db:test`, `pnpm test`, `pnpm build:web`.

Môi trường hiện tại không có PostgreSQL/Supabase CLI; `pnpm install --frozen-lockfile` bị chính sách tải package chặn HTTP 403. Migration dùng quy ước tên hiện có vì không thể chạy CLI. CI trên GitHub đã chạy thành công trên commit `db68821ccc7f8cee6092d18367439abc91daef15`: gen:check, 9 kiểm thử nội dung/API, kiểm thử game-core/web, kiểm thử Edge, 5 bộ SQL, parity và API↔PostgreSQL (gồm thao tác đồng thời), build web. Lần CI đầu tìm được khác biệt payload mở lại offer và đã được sửa. Kết nối Supabase trả danh sách dự án rỗng, nên chưa chạy migration hoặc xóa dữ liệu live.

Dữ liệu/code cũ trong `legacy/` được bỏ khỏi cây hiện hành theo yêu cầu, vẫn truy được trong lịch sử Git. Không sửa migration lịch sử vì chúng là chuỗi phụ thuộc cần thiết cho database mới. Không xóa tài khoản Auth hoặc tiến độ live khi chưa xác định được database đích.

Không chạy được kiểm tra giao diện bằng trình duyệt trong môi trường này vì thiếu binary Chromium.
