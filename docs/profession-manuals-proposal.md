# Sách nghề và sổ công thức — bản thiết kế chờ duyệt

> **TÌNH TRẠNG: DỰ THẢO, KHÔNG PHẢI GAMEPLAY ĐÃ TRIỂN KHAI.** Chủ dự án đã chốt cần **các cuốn sách riêng cho từng nghề, chứa công thức để học**. Cách chia tập, điều kiện học, giá/nguồn nhận và migration là **ĐỀ XUẤT**, chưa cố định. Nguồn: `engine/rules/inventory.js`, `engine/rules/crafting.js`, `client/ui/screens/craft.js`, `data/design.js` và `data/items.js` trên `main` ngày 10/11/2026.

## 1. Bốn loại sách nghề

| Nghề thực tế | Tên dòng sách **ĐỀ XUẤT** | Loại kiến thức mở sau khi học | Mã vật phẩm hiện có |
|---|---|---|---|
| **Luyện đan** | **Đan Đạo Chân Giải** (Đan Phổ) | Danh sách `PILL` và định lượng nguyên liệu từ `DESIGN.recipes`/công thức kế thừa | `PILL-002` (Tụ Khí Đan), `PILL-001` (Bồi Nguyên Đan); **chưa có sách công thức nghề riêng** |
| **Luyện khí** | **Bách Luyện Khí Phổ** | Danh sách `EQ` và nguyên liệu từ `DESIGN.forge`/công thức kế thừa | `EQ-001` (Thanh Vân Sơ Huy Kiếm), `BT-900` đã dùng như **bí tịch tiền điều kiện**, không phải sách liệt kê nhiều công thức |
| **Chế phù** | **Vạn Phù Bí Lục** | Danh sách `TAL` và nguyên liệu từ `DESIGN.talisman`/công thức kế thừa | `TAL-001` (Hộ Thân Phù), `TAL-002` (Hỏa Cầu Phù), `BT-901` là **bí tịch tiền điều kiện** |
| **Linh điền** | **Bách Thảo Linh Kinh** | Danh sách `SEED`/`HERB` trồng được, đất và điều kiện chăm theo bảng hạt | `SEED-HERB-001` (Hạt Tụ Khí Thảo) |

Mã trong cột cuối **được xác nhận tồn tại**; đây là ví dụ công thức sẽ được đưa vào sách sau khi khóa dữ liệu, **không** phải danh sách đã học hoặc kết quả có trong game.

## 2. Cách chia tập — **ĐỀ XUẤT A (khuyên dùng)**

Mỗi nghề có **ba tập**, tương ứng Hạ Giới (bậc 0–4), Linh Giới (5–8), Tiên Giới (9–13), tổng **12 quyển**. Trong từng tập, danh sách mã công thức cụ thể phải được xuất từ `data/catalog.js` + `data/design.js`, rồi kiểm `item(code)`, tier, cost, nguyên liệu và ngưỡng mở; **không dùng tên hoặc vật phẩm không tồn tại**.

| Tập | Đan Đạo Chân Giải | Bách Luyện Khí Phổ | Vạn Phù Bí Lục | Bách Thảo Linh Kinh |
|---|---|---|---|---|
| **Hạ Giới** | Đan Phổ · Phàm Thiên | Khí Phổ · Trúc Cơ Thiên | Phù Lục · Trấn Tà Thiên | Linh Thảo Kinh · Sơn Dã Thiên |
| **Linh Giới** | Đan Phổ · Hư Linh Thiên | Khí Phổ · Linh Bảo Thiên | Phù Lục · Huyền Trận Thiên | Linh Thảo Kinh · Linh Mạch Thiên |
| **Tiên Giới** | Đan Phổ · Tiên Đình Thiên | Khí Phổ · Tiên Khí Thiên | Phù Lục · Tiên Ấn Thiên | Linh Thảo Kinh · Tiên Dược Thiên |

Mỗi tập **không thay thế điều kiện cảnh giới** hiện hành: biết công thức không cho phép tạo vật vượt cảnh giới. Một quyển dạy nhiều công thức, không cần một item sách riêng cho từng vật phẩm. Nội dung lời dẫn trong từng trang sách lấy từ `data/`.

**ĐỀ XUẤT B (chưa chọn):** một quyển cho mỗi công thức. Ưu điểm tăng giá trị loot, nhược điểm số lượng vật phẩm sách rất lớn (60 đan, 82 pháp bảo, 36 phù, 69 hạt = 247 đầu công thức sơ bộ), tốn inventory/UI và vượt khả năng cân bằng hiện tại. Không tự chọn thay người thiết kế.

## 3. Dự kiến luồng người chơi — **ĐỀ XUẤT**

1. Có quyển sách trong túi (mua từ NPC/cửa hàng, nhận nhiệm vụ hoặc rơi boss **sẽ phải duyệt nguồn/giá**).
2. Gửi lệnh `learn` với mã item sách, máy chủ kiểm chủ sở hữu, cảnh giới, không phải phàm nhân và chưa học; ghi `learnedRecipes` vào state V10, tiêu hao sách theo luật `learn` hiện tại.
3. `learnedRecipes` là danh sách **mã công thức server xác minh**, không chấp nhận danh sách nguyên liệu, tiền, tỷ lệ thành công hoặc kết quả từ client. Sách nghề **không chiếm ba ô vận hành công pháp**. Có thể mở giao diện **Tàng Kinh Các → Sách nghề** để đọc công thức.
4. `craft`, `forge` và gieo qua `use(SEED)` hoặc `garden` xác minh đã học công thức. Chưa học → lỗi có mã `RECIPE_NOT_LEARNED` và lời dẫn tiếng Việt; không trừ nguyên liệu. Đang phàm nhân → từ chối học sách và dùng vật phẩm, không bỏ qua qua đường dùng khác.
5. Phân định `BT-900` và `BT-901`: vẫn có hiệu lực như **bí tịch tiền điều kiện** đã học cho các công thức hiện hữu, không tự thu hồi. Trước khi tách thành hệ sách mới phải kiểm `craft/forge` và dữ liệu thành phẩm để tránh đòi hai cuốn không cần thiết.
6. **Migration không phá người chơi cũ:** các công thức đã từng có quyền chế tạo trên bản cũ được coi là mở khóa tương đương khi migrate, hoặc được cấp “Sách nghề truyền thừa” miễn phí; **cách bồi hoàn phải chốt**, không tự khóa bộ đan đang luyện/cây đã gieo. Sổ công thức phải tồn tại sau logout; khi đạo thân tử vong, quyền kiến thức thuộc nhân vật hay tài khoản **chưa được duyệt**. Nếu gắn theo account, phải xem xét Thiên Mệnh Các PR #31.
7. Không cho phép sách tạo ra vật phẩm hoặc lượng nguyên liệu tùy ý, không dùng `Math.random()`/đồng hồ phía client, không thêm dependency. Test parser sách, catalog link, học trùng, học sai cảnh giới, không sở hữu sách, công thức chưa học, dùng seed, restart, migration V4–V9 và giới hạn 64 KB.

## 4. Số liệu đã xác minh và giới hạn

- `data/items.js` trên `main`: **60 PILL**, **82 EQ**, **36 TAL**, **69 SEED**; ngoài ra **80 BT** gồm công pháp/bí tịch, không đồng nghĩa 80 sách công thức.
- Snapshot `data/design-raw.js`: **50 hàng nguyên liệu đan phương**, **30 hàng rèn pháp bảo**, **1 hàng vẽ phù**, **30 hàng hạt giống**. Đan phương có nhiều hàng vật liệu trên mỗi mã đan; phải gom theo mã, **không** coi 50 hàng là 50 công thức.
- 39 hạt giống không có bảng chi tiết trong snapshot; tạm giữ fallback để không hỏng game cho đến khi dữ liệu đầy đủ được phê duyệt.
- Chưa có quyết định về **giá**, **nơi nhận**, **học một lần hay nhiều lượt**, **mỗi nghề có một cuốn hay nhiều tập**, **kiến thức có giữ qua kiếp hay không**. Các điểm này được đánh dấu chờ duyệt, không có hành vi triển khai.

## 5. Liên hệ luật phàm nhân (đã chốt một phần)

Khi Z đạt 100, **đã chốt:** nhân vật phế tu vi, trở thành phàm nhân, không tu luyện và không dùng vật phẩm; không tử vong ngay, chỉ chết khi cạn thọ nguyên. Vì sách nghề là vật phẩm học/tiêu hao nên **đang ở trạng thái phàm nhân không được học sách**. Quyết định còn thiếu: tuổi thọ còn lại được tính ra sao và có cho thực hiện hành động không dùng vật phẩm (chat, đọc sách đã học, đi lại) hay không. Theo V9, đồng hồ game chỉ tiến khi **online**.

**Dừng tại đây để chủ dự án duyệt loại tập sách và thông số còn thiếu trước khi đưa dữ liệu sách và luật học công thức vào `engine/`.**
