# Prompt giao việc: viết cốt truyện cho Hư Giới

> Dán toàn bộ nội dung bên dưới (từ "VAI TRÒ") cho AI khác. AI cần có quyền đọc repo `zeplaovn/Hu-gioi` (nhánh `main`).

---

## VAI TRÒ

Bạn là biên kịch game kiêm lập trình viên web cho **Hư Giới**, một game idle tu tiên chạy trên trình duyệt (tiếng Việt). Nhiệm vụ: viết **cốt truyện chính, lời thoại NPC và nhật ký cơ duyên** rồi nối vào game theo đúng kiến trúc hiện có. Bạn viết cả nội dung lẫn code tích hợp, nhưng **không sửa luật chơi, công thức cân bằng hay giao diện ngoài phạm vi liệt kê dưới đây**.

## BỐI CẢNH ĐÃ CÓ (không được mâu thuẫn)

**Mở đầu** (`client/ui/onboarding.js`, mảng `STORY` + `CHAPTERS`): người chơi là một người Trái Đất bị trận văn cổ xưa cuốn khỏi nhân gian, vượt hư không, rơi vào **Hư Giới**, nơi thiên đạo tái lập. Năm chương: Nhân gian, Thiên biến, Ly giới, Vượt hư không, Tiên lộ khởi nguyên. Giọng văn: trang trọng, hơi bi tráng, câu dài có nhịp. Có 5 ảnh minh họa `media/assets/world/story/intro/1..5.webp`.

**Thế giới** (`data/catalog.js`, `ZONES`): ba giới, 14 vùng theo cảnh giới.
- Hạ Giới: Thanh Vân Sơn (Luyện Khí), Trúc Ảnh Lâm (Trúc Cơ), Vạn Kiếm Phong (Kết Đan), Nguyên Anh Cốc (Nguyên Anh), Hóa Thần Đài (Hóa Thần).
- Linh Giới: Hư Không Cảnh (Luyện Hư), Hợp Thể Sơn (Hợp Thể), Đại Thừa Thiên (Đại Thừa), Cửu Cửu Kiếp Đài (Độ Kiếp).
- Tiên Giới: Chân Tiên Điện, Kim Tiên Hải, Thái Ất Cung, Đại La Thiên, Hồng Mông Đạo Vực (Đạo Tổ).

**Tông môn** (`data/adventures.js`, `SECTS`): Thanh Vân Tông (chính đạo, trừ yêu hộ trận), Huyết Sát Môn (lấy chiến dưỡng đạo), Vạn Dược Cốc (đan đạo dưỡng sinh).

**Bí cảnh** (`DUNGEONS`, 9 nơi): Thanh Mộc Lâm (Cổ Mộc Yêu Vương), Huyền Thủy Đàm (Huyền Thủy Giao), Xích Viêm Động (Xích Viêm Ma Sư), Kim Phong Cốc (Kim Giáp Kiếm Linh), Hậu Thổ Thiên Cung (Hậu Thổ Khôi Vương), Cửu U Ma Uyên (Cửu U Ma Chủ), Lôi Đình Cổ Điện (Lôi Đình Cổ Thú), Thái Cổ Tiên Phủ (Thủ Hộ Tiên Linh), Thiên Môn Kiếp Hải (Thiên Môn Kiếp Chủ). Đọc file để lấy mô tả và cảnh giới yêu cầu.

**Kỳ ngộ** (`ENCOUNTERS`): các sự kiện ngẫu nhiên khi du hành (Linh Tuyền Bên Suối, Lão Nông Chỉ Điểm, Quý Nhân Giúp Đỡ...). Đọc file để biết định dạng.

**10 NPC Hạ Giới** (`data/design-raw.js` → `data/design.js`, `npc`): Trần Minh, Tô Nhược Vân, Diệp Hồng Y, Bạch Tử Yên, Tạ Thiên Cơ, Vũ Tiểu Thanh, Lâm Thiết Sinh, Tống Hữu Tài, Hứa Mặc, Tàng Phong Lão Nhân. Mỗi NPC có `bối cảnh`, `quan hệ`, `vai trò` (giao nhiệm vụ, dạy công pháp, dạy bí tịnh, bán đồ, luyện đan thuê). **Hãy đọc kỹ cột `bối cảnh` và `quan hệ` của từng NPC và giữ nguyên tính cách đó.**

**Nhiệm vụ riêng NPC** (`data/social.js`, `NPC_QUESTS`): mỗi vai trò có chuỗi 3 bước (mở theo thiện cảm 0, 20, 55), mô tả dùng placeholder `{npc}` và `{likes}`.

## SẢN PHẨM CẦN GIAO

1. **`data/story.js`**: file dữ liệu thuần, theo mẫu của `data/social.js` (IIFE, `root.HU_STORY_DATA`, `module.exports` cho Node). Không chứa logic. Gồm:
   - **Cốt truyện chính 3 hồi**, mỗi giới một hồi (Hạ Giới / Linh Giới / Tiên Giới). Mỗi hồi 4-6 chương. Mỗi chương: `id`, `title`, `unlock` (điều kiện mở: chỉ dùng cảnh giới `realm` hoặc số lần đã làm một việc có sẵn trong state, xem bên dưới), `text` (60-140 từ), `choices` tùy chọn (tối đa 2 lựa chọn, **chỉ ảnh hưởng lời thoại/cờ cốt truyện, không đổi chỉ số hay phần thưởng**).
   - **Lời thoại NPC**: với mỗi trong 10 NPC, 3 mức thiện cảm (xa lạ / quen / tri kỷ), mỗi mức 2-3 câu, đúng giọng nhân vật.
   - **Văn bản bổ sung**: 1 đoạn mở cho mỗi bí cảnh; 1 đoạn ngắn khi gặp từng boss; 1 đoạn khi độ kiếp thành công cho từng giới.
2. **Hook tích hợp tối thiểu** (nhỏ và có thể gỡ):
   - Thêm `<script>` cho `data/story.js` vào `index.html` đúng thứ tự (xem các thẻ script hiện có).
   - Một tab hoặc mục "Thiên Thư" (nhật ký cốt truyện) trong `client/ui/screens/meta.js` hoặc màn phù hợp, liệt kê chương đã mở, chương khóa hiển thị mờ kèm điều kiện.
   - Lời thoại NPC hiển thị trong tab NPC của `client/ui/screens/world.js` theo thiện cảm hiện tại.
   - Cờ cốt truyện lưu trong state mới `s.story = { read: {}, flags: {} }`; **mọi thay đổi state phải đi qua engine**: thêm lệnh vào `engine/protocol/commands.js` và `engine/rules/*` (đúng một miền luật cho mỗi lệnh), nâng `version` và `normalize` trong `engine/state/player.js` (bản lưu cũ phải đọc được).
3. **Test** trong `tests/` (node:test, `.cjs`): tính toàn vẹn dữ liệu, mọi `id` duy nhất, mọi NPC/bí cảnh/vùng được tham chiếu đều tồn tại, lệnh mới qua `execute`, `normalize` nâng cấp bản lưu cũ.
4. **Tài liệu**: cập nhật `README.md`, `docs/engine-contract.md` (số lệnh và bảng lệnh) và thêm 1 mục vào `docs/design-integration.md`.

## RÀNG BUỘC KỸ THUẬT (bắt buộc)

- Game là **tĩnh, không build**, dùng thẻ `<script>` kinh điển, phải mở được bằng `file://`. Không thêm bundler, framework, hay thư viện.
- Phân tầng: `data/` (dữ liệu thuần) → `engine/` (luật, state, lệnh) → `client/` (giao diện). Client không được tự đổi state; chỉ gửi lệnh qua `UI.command`.
- Mỗi lệnh phải thuộc **đúng một** miền luật của engine; test hợp đồng đếm số lệnh (hiện là 49) nên khi thêm lệnh phải cập nhật test và tài liệu.
- Chạy `npm test` và phải xanh toàn bộ (hiện 97/97) trước khi bàn giao.
- Giao diện phải dùng được trên điện thoại (chiều rộng 390px) và không phát sinh thanh cuộn ngang. Tái sử dụng bộ `UI.kit` và các lớp CSS sẵn có; nếu cần CSS mới, thêm vào cuối `css/screens.css`.
- Không thêm ảnh mới. Nếu cần ảnh, ghi rõ vào danh sách yêu cầu ảnh trong phần báo cáo cuối.

## RÀNG BUỘC NỘI DUNG

- Tiếng Việt, từ vựng tiên hiệp (linh khí, đạo hữu, đạo tâm, thiên kiếp...). **Không** để lộ thuật ngữ kỹ thuật hay mã nội bộ trong văn bản hiển thị (xem `tests/lore-language.test.cjs`: dùng "Linh lực", không dùng "MP"; không lộ `hp/atk/def`; không viết "Tốc tu").
- Tôn trọng chủ đề đã đặt: người Trái Đất lạc vào Hư Giới, thiên đạo tái lập, "kẻ cô độc hay người thành Tiên hóa Thánh". Có thể mở rộng nguồn gốc trận văn, nhưng không phủ nhận phần mở đầu.
- Nội dung phù hợp mọi lứa tuổi: không máu me thái quá, không nội dung tình dục, không châm biếm tôn giáo hay chính trị có thật.
- Không dùng tên người, tên môn phái, tên chiêu thức của truyện/game có bản quyền khác. Mọi tên phải do bạn sáng tạo hoặc lấy từ repo.
- Mỗi chương là một đơn vị đọc được trong 20-40 giây; không viết khối chữ dài. Tránh lặp motif "ánh sáng, linh khí lan tỏa" ở nhiều chương liền nhau.
- Nhất quán xưng hô: người chơi là "đạo hữu" (NPC gọi) hoặc "ngươi/ta" tùy NPC; ghi quy ước vào đầu `data/story.js`.

## CÁCH LÀM VIỆC

1. Đọc trước: `README.md`, `docs/architecture.md`, `docs/engine-contract.md`, `data/social.js`, `data/adventures.js`, `engine/rules/social.js`, `client/ui/screens/world.js`, `client/ui/onboarding.js`, `tests/lore-language.test.cjs`.
2. Đưa **dàn ý** (tên 3 hồi, danh sách chương, tuyến NPC) cho tôi duyệt **trước khi** viết toàn bộ văn bản và code.
3. Sau khi được duyệt: viết dữ liệu, rồi engine + test, rồi giao diện. Commit nhỏ theo từng bước, nhánh riêng `feature/story`, không đẩy thẳng vào `main`.
4. Khi xong, báo cáo: danh sách file đổi, số lệnh mới, kết quả `npm test`, ảnh chụp giao diện ở 390px và 1280px, danh sách ảnh minh họa nên bổ sung, và những chỗ bạn **không chắc** hoặc tự quyết định thay tôi.

## ĐỊNH NGHĨA HOÀN THÀNH

- `npm test` xanh, bản lưu cũ vẫn nạp được.
- Mở game ở `file://`, tạo nhân vật mới: thấy chương 1 của Thiên Thư; thăng cảnh giới thì mở chương kế; NPC đổi lời thoại theo thiện cảm.
- Không có lỗi trong console; không có request ảnh lỗi 404.
