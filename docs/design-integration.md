# Tích hợp dữ liệu thiết kế

Game dùng snapshot `shared/data/design-raw.js` từ `../idea/data-game-chuan/du_lieu.json`, cùng lớp ánh xạ `shared/data/design.js`. Các mã hiện có như `HERB-001`, `EQ-001`, `BT-001` vẫn dùng trong bản lưu; mã thiết kế được đối chiếu qua cột mã game cũ. Nội dung mới không có mã cũ có mã riêng, ví dụ `BT-900` và `TAL-PL-001`.

Snapshot được đóng gói thành classic script để browser chạy được cả qua `file://`; Node và browser dùng cùng dữ liệu. Chỉnh Excel hoặc JSON bên ngoài **không tự cập nhật game**. Nếu cần tạo snapshot mới từ JSON, chạy tại gốc workspace:

```sh
node tools/import-game-design.mjs /duong-dan/du_lieu.json --check
node tools/import-game-design.mjs /duong-dan/du_lieu.json --force
npm test
npm run check
```

`--check` chỉ kiểm tra dữ liệu và liên kết, không ghi file; `--force` ghi đè snapshot hiện tại, nên sao lưu nếu đã sửa thủ công. Excel và JSON không tự đồng bộ với nhau. Không chạy công cụ xuất Excel lên bản đã chỉnh nếu chưa sao lưu.

## Phạm vi đã nối

- 30 hạt và linh thảo, 25 đan, 30 pháp bảo, 12 công pháp, 12 bí tịch và một phù trong 5 cảnh giới đầu được ánh xạ. Ngoài phạm vi đó, dữ liệu vật phẩm cũ được giữ lại.
- Linh điền dùng thời gian, độ khó, sản lượng và điều kiện đất của hạt có định nghĩa. Đổi loại đất tại ô trống; cây đã gieo trước khi cập nhật vẫn giữ thời điểm kết thúc. Các phẩm chất linh thảo đều có thể dùng làm nguyên liệu, ưu tiên phẩm thấp trước.
- Rèn pháp bảo trong bộ mới cần bí tịch `BT-900` và linh thảo; phù mới cần `BT-901`. Công thức ngoài bộ mới giữ luật rèn/chế phù cũ. Các bí tịch nghề chỉ cần lĩnh ngộ, không chiếm ô vận hành công pháp.
- Bí tịch luyện khí/luyện đan được ánh xạ dùng mức thưởng trong dữ liệu, có tính độ thuần thục, phẩm chất, chênh lệch cảnh giới và trần của game hiện tại.
- Pháp bảo mới cộng các chỉ số được định nghĩa; giáp ảo/hồi máu kích hoạt tại màn Lịch luyện, còn đóng băng, choáng, độc và chảy máu kích hoạt khi đánh trúng. Các công pháp có dữ liệu chủ động có thể dùng tại màn Lịch luyện khi đã lĩnh ngộ và vận hành. Công pháp cũ vẫn giữ phần hiệu ứng thụ động để tương thích tiến trình.
- Năm quái thường Hạ Giới dùng chỉ số và bảng rơi mới; boss Cáo Truyền Thuyết được dùng ở Hóa Thần Đài. Sáu boss bí cảnh tương ứng dùng bảng thưởng và các ngưỡng giai đoạn. Các đối thủ và bí cảnh còn lại tiếp tục dùng luật cũ; linh thạch và yêu đan vẫn được cấp theo công thức hiện tại.
- Màn **Thế giới → NPC** có 10 NPC Hạ Giới. Tặng món thích +5, món ghét −5; NPC bán hoặc dạy vật phẩm theo dữ liệu. Vai trò giao nhiệm vụ/luyện đan hiện dẫn đến màn nhiệm vụ/luyện đan chung, chưa có nhiệm vụ hoặc dịch vụ riêng theo từng NPC.
- Dị linh căn khắc hệ gốc và không bị hệ gốc khắc. Ngũ hành có thể biến dị Hỗn Độn sau lôi kiếp; xác suất nền 1%, tiếp tục dùng cộng thêm Vận Khí/bảo hiểm của game. Trúc Cơ → Kết Đan có ba tia lôi kiếp. Hỗn Độn giữ hệ ban đầu. Âm Dương không còn được tạo mới nhưng bản lưu Âm Dương vẫn được nạp.

## Giới hạn cần hoàn thiện

- Đặc tả chưa định lượng thưởng/phạt công pháp khác hệ, ảnh hưởng độ tinh khiết/tuổi dược hoặc các hệ số đan dược/pháp bảo vào xác suất Hỗn Độn; chưa tự đặt các công thức đó. Hiện hiệu ứng độc bẩm sinh dùng giả định 5% ATK/giây trong 3 giây vì bảng chỉ cho xác suất 15% mà không có mức sát thương.
- Chiến đấu bí cảnh vẫn là mô phỏng theo tầng, không phải trận chiến tương tác trực tiếp. Chỉ các thủ lĩnh có trong dữ liệu thiết kế được dùng chỉ số/giai đoạn và thưởng mới.
- Thể lực được hiển thị dưới dạng chỉ số; dữ liệu công pháp hiện có không yêu cầu tiêu hao thể lực. Hệ quả cân bằng giữa 5 cảnh giới mới và các cảnh giới cao hơn cần được chơi thử và điều chỉnh.
- Schema lưu vẫn là V7, bổ sung giá trị mặc định khi nạp bản cũ. Nên xuất bản lưu trước khi thử một bản cập nhật có thay đổi cân bằng.
