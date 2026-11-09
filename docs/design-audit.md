# Kiểm toán luật design

Mọi số liệu dưới đây lấy từ chạy engine thật (`engine/game.js`, nhân vật mẫu Nhân tộc, Song linh căn, hạt giống cố định), không phải suy đoán. Mức độ: **Nghiêm trọng** = chặn tiến trình hoặc đánh lừa người chơi; **Cao** = lệch thiết kế rõ.

## Nghiêm trọng

### 1. Thọ nguyên cạn trước khi kịp qua Luyện Khí
`aging_speed(r)` (`data/formulas.js`) tính theo `realm_time(r)` ở tốc độ tham chiếu, bỏ qua hệ số `U^(s/N)` làm các tầng cuối chậm hơn và bỏ qua hệ số linh căn. Thọ nguyên Luyện Khí của Nhân tộc là 80 năm, trong khi cảnh giới này tiêu 80 năm sau khoảng 41 phút chơi liên tục.

| Kịch bản (không dùng gì thêm) | Kết quả |
|---|---|
| Ngụy, Tứ hành, Tam hành, Song linh căn, Nhân tộc | Tọa hóa ở Luyện Khí sau 0,68 giờ |
| Thiên linh căn | Qua Luyện Khí lúc 76,5/240 tuổi |
| Ngụy + Tiên Duệ | Qua được (thọ nguyên Tiên Duệ gấp 5,6 lần) |
| Bot mua nâng cấp tốc tu và hấp thụ linh thạch | Ngụy/Tứ hành vẫn chết ở Luyện Khí; các loại còn lại chết ở Trúc Cơ tầng 4 (2,5 giờ) |

Không có cách kéo dài thọ nguyên ở giai đoạn này: chỉ `PILL-004` (bậc 4, giá 5×10⁹ linh thạch) và `PILL-039` (bậc 7) có hiệu ứng `THO_NGUYEN`. Cảnh báo cũ nhắc "Trường Thọ Quả" là vật phẩm không tồn tại. `HERB-005` Ích Thọ Thảo (mô tả "kéo dài thọ nguyên", `years: 100`) không có đường dùng trong `use()`.

**Đề xuất** (cần quyết định cân bằng): tính `aging_speed` từ thời gian thực tế `Σ exp_need / tốc độ` thay vì `realm_time`; hoặc cho `LIFE_USE` thấp hơn ở Luyện Khí; hoặc cho `HERB-005` cộng thọ nguyên khi ăn.

### 2. Lôi kiếp là phép thử tất định nhưng giao diện hiện xác suất
`tribulation()` chỉ so tổng sát thương với HP, khiên và giảm thương; `breakthrough()` cần `rng() < chance` **và** mọi đợt lôi đều qua. Nhân vật không có khiên/giảm thương thất bại ở **mọi** cảnh giới từ Trúc Cơ đến Đại La (tổng sát thương luôn gấp 1,27 lần HP), trong khi `chance()` hiện 81% đến 30%. Mỗi lần thất bại mất 15% tu vi. Kiếp vận tích thêm chỉ nâng `chance()` nền nên không bao giờ cứu được ca này.

Từ Nguyên Anh trở đi cần một viên hộ kiếp phẩm Trung trở lên (`sub ≥ 1`): viên Hạ phẩm (khiên 10%, giảm 5%) không đủ, mà đa số vật phẩm KIEP trong bảng đều là Hạ phẩm (`sub 0`). `use()` lấy `Math.max` nên nhiều viên không cộng dồn. Đại La (realm 12) không có vật phẩm KIEP nào cùng bậc.

**Đã sửa ở giao diện**: `breakthroughOdds()` trả xác suất thực; màn Thiên kiếp, mục tiêu ở màn tu luyện và nút "Dẫn lôi" nay báo "chắc thất bại" kèm bước xác nhận. Luật không đổi.

## Cao

### 3. Dị linh căn nhanh hơn Thiên, trái mô tả
`data/roots.js` mô tả Dị "sánh ngang Thiên linh căn", nhưng `LINH_CAN_RATE` đặt Dị = 2, Thiên = 1,5 (Âm Dương, Hỗn Độn = 3, Ngụy = 0,6). Dị còn có thêm chỉ số chiến đấu, nên Dị vượt Thiên cả hai mặt. Chênh lệch tốc tu giữa Ngụy và Hỗn Độn là 5 lần.

### 4. `createCharacter` không kiểm linh căn khớp `rootType`
Engine chỉ kiểm `rootType` là khóa hợp lệ, không kiểm mảng `roots` có cho ra đúng loại đó. Giao diện hiện tự gieo ngẫu nhiên nên chưa lộ, nhưng khi chuyển sang server (`backend-plan.md`) client có thể gửi `Thiên` hoặc `Dị` tùy ý. Cần gọi `rootType(roots)` ở server để suy ra loại thay vì tin client.

### 5. Hấp thụ linh thạch không có trần, đan Tu Vi thì có
`absorb` đổi linh thạch sang tu vi không giới hạn, còn đan `TU_VI` bị chặn `DAN_REALM_CAP` 25% mỗi cảnh giới và suy giảm theo số lần dùng. Theo công thức, mỗi linh thạch hấp thụ cho nhiều tu vi hơn khoảng 1,2 lần so với mua đan Tu Vi. Với thu nhập hiện tại tổng cộng chỉ thêm tối đa khoảng 15% tốc độ nên chưa vỡ cân bằng, nhưng trần của đan trở nên vô nghĩa nếu thu nhập tăng.

## Thấp

- `docs/design-integration.md` ghi schema lưu "vẫn là V7" trong khi `VERSION` là 8.
- 4 trong 10 NPC có vai trò giao nhiệm vụ nên không có `offer`; đúng thiết kế, nhưng màn NPC nên ẩn nút mua/học cho họ.
- Tính độc bẩm sinh dùng giả định 5% ATK/giây trong 3 giây (đã ghi ở `design-integration.md`) vì bảng thiết kế thiếu mức sát thương.

## Đã kiểm và không phải lỗi

Tham chiếu dữ liệu (đan phương, rèn pháp bảo, phù, phần thưởng nhiệm vụ) đều khớp mã vật phẩm; `BT-900`/`BT-901` mua được ở cửa hàng; chênh lệch mua/bán (×1,2 / ×0,4) chỉ thành vòng lời khi chiết khấu NPC vượt 66,7%, mà mức tối đa hiện là 30%.
