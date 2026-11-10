# Tích hợp dữ liệu thiết kế

> Trạng thái: Hiện hành.
> **Trạng thái nguồn:** Snapshot `data/design-raw.js` và lớp ánh xạ `data/design.js` đã nằm trong repository. Game **online-only**, state V9, protocol v2/48 lệnh. Tài liệu này mô tả nội dung được engine dùng, **không** phải hướng dẫn chạy game offline.
>
> **Lưu ý công cụ:** Một số phiên bản tài liệu cũ nhắc `tools/import-game-design.mjs`, nhưng **file đó hiện không còn trong repository**. Không chạy lệnh import/ghi đè theo hướng dẫn cũ; muốn thêm snapshot phải tạo lại công cụ có test liên kết và được review như một thay đổi dữ liệu.

## 1. Dữ liệu và mã tương thích

`data/design-raw.js` là bản snapshot của `du_lieu.json` ở nguồn thiết kế bên ngoài; **file nguồn đó không có trong repository**. `data/design.js` ánh xạ mã thiết kế sang mã vật phẩm cũ (ví dụ `HERB-001`, `EQ-001`, `BT-001`) để state V4–V9 vẫn giải mã được. Các mã mới có thể có định danh riêng, ví dụ `BT-900`, `TAL-PL-001`.

`data/catalog.js` hợp nhất vật phẩm và vùng của game. `data/balance.js`/`data/formulas.js` giữ luật số học. `data/roots.js`, `data/meridians.js`, `data/character.js`, `data/social.js`, `data/adventures.js`, `data/story.js` chứa bảng nội dung chuyên biệt. Các bảng này dùng trong Node/browser thông qua CommonJS/classic scripts, **không phải nguồn save của client**.

Khi thêm hoặc sửa vật phẩm, đảm bảo mã không đụng mã cũ, bản đồ `byDesign`/`byLegacy` duy nhất, nguyên liệu/recipe tham chiếu mã tồn tại, và luật không đột ngột thay thế sản phẩm đang chế tạo/cây đã gieo của nhân vật đang sống.

## 2. Các nhóm đã nối với luật

- **Nghề phụ:** Snapshot có 30 hạt chi tiết, 25 loại đan, 30 pháp bảo, các bí tịch và một phù thiết kế; catalog gốc rộng hơn. `crafting.js` vẫn có fallback cho hạt/công thức ngoài snapshot. Cây đang trồng giữ thời điểm hoàn thành khi chuyển dữ liệu.
- **Luyện khí/chế phù:** Công thức snapshot yêu cầu `BT-900` (rèn) và `BT-901` (phù) sau khi lĩnh ngộ; đây là **bí tịch tiền điều kiện**, chưa phải 12 quyển sách nghề chứa danh sách công thức. Kế hoạch sách nghề tại [profession-manuals-proposal.md](profession-manuals-proposal.md).
- **Công pháp/pháp bảo:** Phần thưởng theo dữ liệu thiết kế đã nối vào engine khi có mô tả; kỹ năng thiếu định lượng vẫn có fallback/hạn chế. Tương hợp ngũ hành, độ tinh khiết và tuổi dược trong dược lực **chưa có công thức được duyệt**.
- **Chiến đấu và bí cảnh:** Quái Hạ Giới/boss có trong snapshot dùng dữ liệu mới; nội dung còn lại có quy tắc tổng quát. Bí cảnh có cả kết toán theo tầng và theo lượt (`startDungeon`, `enterDungeon`, `dungeonAct`). NPC thiết kế hiện vẫn tập trung ở Hạ Giới.
- **Linh căn và kinh mạch:** Ngũ hành, Dị và thức tỉnh Hỗn Độn đã có luật. 12 chính kinh/8 kỳ kinh và tạp chất trong `data/meridians.js` **hiện mới là dữ liệu xem trước**, chưa có state/lệnh kinh mạch; phàm nhân Z=100 đã được **chốt thiết kế** nhưng **chưa triển khai**.
- **Thiên Thư/NPC:** `data/story.js` có 14 chương, 10 NPC gốc, ghi chép kỳ ngộ. `world.storyMark` hiện ghi đọc/cờ lời hẹn, chưa có tác động chỉ số. Cờ nhân vật **không được kế thừa qua kiếp**, khác Thiên Mệnh Các thuộc tài khoản.
- **Thiên Mệnh Các:** Đã triển khai trên `main`; đây là tích lũy Thiên Tinh theo account, không phải trọng sinh đạo thân cũ. Xem [thien-menh-cac.md](thien-menh-cac.md).

## 3. Những phần còn chờ quyết định

`docs/gameplay-decisions.md` là **sổ duyệt tập trung** và nêu phương án cùng đánh dấu chưa chốt. Những điểm liên quan trực tiếp import dữ liệu:

1. **P0-10→12:** định lượng công pháp khác hệ, tinh khiết/tuổi dược, hệ số đan và pháp bảo, cùng giới hạn cộng dồn.
2. **P0-13→18:** chuẩn hóa **69 hạt**, ánh xạ công thức vào **12 sách nghề (4 nghề × 3 giới, đã duyệt số quyển)**, nguồn rơi/giá sách, quyền kiến thức và migration.
3. **P0-19→22:** hệ quả Thiên Thư, quái/bảng rơi, NPC, bí cảnh và nhiệm vụ Linh/Tiên Giới.
4. **P0-24→25:** kiểm cân bằng và nguồn thu/tài nguyên bằng mô phỏng 30 ngày trước khi chốt thông số mới.

**Không tự biến các bảng minh họa “ĐỀ XUẤT” thành `data/` sản xuất.** Nếu cần sinh mã/content mới phải gắn nhãn dự thảo, đối chiếu mã vật phẩm/realm, giữ rollback và test migration.

## 4. Quy trình cập nhật nội dung hiện tại

1. Xác định nguồn thay đổi và chốt các công thức/cột thuộc danh sách P0 tương ứng, lưu bản gốc trong PR để review.
2. Chỉnh đúng file `data/` (không nhận số liệu từ client), duy trì ánh xạ legacy và các mã item/tier hiện có. Nếu cần tự động import từ JSON/Excel, **xây dựng công cụ import và test trước**, vì chưa có script `tools/import-game-design.mjs` trong repo.
3. Bổ sung test liên kết tại `tests/engine.test.cjs`, `tests/meridians.test.cjs`, `tests/story.test.cjs` hoặc một test dữ liệu mới. Không đổi schema state nếu chưa có migration V4–V9.
4. Chạy `npm run check && npm test`, đánh giá thay đổi thời gian tu, tỷ lệ thành công, loot và kinh tế. Nếu đổi state/tính cân bằng, thêm kiểm thử phiên server và bản lưu cũ.
5. Cập nhật [sổ quyết định](gameplay-decisions.md), [kiểm kê](gameplay-audit.md), `data/README.md` và tài liệu gameplay khi thay đổi đã được duyệt.

## 5. Mở khóa theo cảnh giới

Các mốc nguồn ở `data/catalog.js` (`FEATURES`); luật chặn bằng `requireFeature` và UI đọc `featureOpen`. Rèn/chế phù mở tại **Kết Đan** trong source, giao du mô phỏng mở tại **Nguyên Anh**. Bí cảnh có ngưỡng riêng của từng nơi. Việc đổi nhãn Kết Đan/Kim Đan được nêu tại **P0-29**, chưa tự đổi dữ liệu.

Xem thêm [engine-contract.md](engine-contract.md), [architecture.md](architecture.md), [data/README.md](../data/README.md).
