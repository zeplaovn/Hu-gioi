# Kiểm toán luật design

> Trạng thái: Lịch sử.
Mọi số liệu dưới đây lấy từ chạy engine thật (`engine/game.js`, nhân vật mẫu Nhân tộc, Song linh căn, hạt giống cố định), không phải suy đoán. Tài liệu chia hai loại rõ ràng:

- **Khắc nghiệt có chủ ý**: độ khó do chủ dự án muốn, mô phỏng thế giới tu tiên thực tế như tiểu thuyết (ví dụ *Phàm Nhân Tu Tiên*). **Không phải lỗi, không được làm dễ đi.** Mọi thay đổi phải qua hồi quy độ khó (xem cuối tài liệu).
- **Lỗi thật**: sai lệch giữa mô tả, dữ liệu và mã, đã hoặc cần sửa mà không đổi độ khó.

## Khắc nghiệt có chủ ý (giữ nguyên)

### 1. Thọ nguyên Luyện Khí cạn nhanh
`aging_speed(r)` (`data/formulas.js`) tính theo `realm_time(r)` ở tốc độ tham chiếu, bỏ qua hệ số `U^(s/N)` làm các tầng cuối chậm hơn và bỏ qua hệ số linh căn. Thọ nguyên Luyện Khí của Nhân tộc là 80 năm, tiêu hết sau khoảng 41 phút tu luyện liên tục kể từ tuổi khởi nguyên 18.

| Kịch bản (không dùng gì thêm) | Kết quả |
|---|---|
| Ngụy, Tứ hành, Tam hành, Song linh căn, Nhân tộc | Tọa hóa ở Luyện Khí sau 0,68 giờ |
| Thiên linh căn | Qua Luyện Khí lúc 76,5/240 tuổi |
| Ngụy + Tiên Duệ | Qua được (thọ nguyên Tiên Duệ gấp 5,6 lần) |
| Bot mua nâng cấp tốc tu và hấp thụ linh thạch | Ngụy/Tứ hành vẫn chết ở Luyện Khí; các loại còn lại chết ở Trúc Cơ tầng 4 (2,5 giờ) |

**Lý do chủ ý và đối chiếu nguyên tác.** Trong tiểu thuyết, tu sĩ Luyện Khí gần như người thường: thọ nguyên chỉ cỡ một đời người, đa số không qua nổi bình cảnh đột phá và hết đời ở cảnh giới này; muốn đột phá phải có đan dược trợ lực. Game giữ đúng tinh thần đó: chỉ Thiên linh căn hoặc Tiên Duệ (hoặc có trợ lực) mới qua được. Mức 80 năm còn khắc nghiệt hơn nguyên tác (100 đến 180 năm) và vẫn giữ nguyên (`RACE_LIFE` không đổi).

Điều cần làm cho trung thực (đã làm, không đổi độ khó): màn tạo nhân vật và màn tu luyện hiển thị thọ nguyên quy ra thời gian thực, tính từ `F.aging_speed` qua `H.lifePace`. Chỉ `PILL-004` (bậc 4, giá 5×10⁹ linh thạch) và `PILL-039` (bậc 7) có hiệu ứng `THO_NGUYEN`; `HERB-005` Ích Thọ Thảo chưa có đường dùng trong `use()`, ghi nhận như một khoảng trống nội dung chứ không phải lý do giảm độ khó.

### 2. Lôi kiếp chắc thất bại khi thiếu hộ kiếp
`tribulation()` chỉ so tổng sát thương với HP, khiên và giảm thương; `breakthrough()` cần `rng() < chance` **và** mọi đợt lôi đều qua. Nhân vật không có khiên/giảm thương thất bại ở **mọi** cảnh giới từ Trúc Cơ đến Đại La (tổng sát thương luôn gấp 1,27 lần HP). Mỗi lần thất bại mất 15% tu vi. Từ Nguyên Anh trở đi cần một viên hộ kiếp phẩm Trung trở lên (`sub ≥ 1`); viên Hạ phẩm không đủ và `use()` lấy `Math.max` nên nhiều viên không cộng dồn.

**Lý do chủ ý và đối chiếu nguyên tác.** Độ lôi kiếp là cửa ải sinh tử: tu sĩ trong truyện không dám độ kiếp tay không mà phải chuẩn bị đan, phù, pháp bảo hộ thân. Chắc thất bại khi thiếu chuẩn bị là đúng ý đồ. Đại La (realm 12) không có vật phẩm KIEP cùng bậc là hệ quả của độ khó đỉnh, không sửa.

Phần giao diện đã sửa vì từng đánh lừa người chơi (không đổi luật): `breakthroughOdds()` trả xác suất thực; màn Thiên kiếp, mục tiêu ở màn tu luyện và nút "Dẫn lôi" báo "chắc thất bại" kèm bước xác nhận. Kiếp vận tích thêm chỉ nâng `chance()` nền nên không cứu được ca thiếu hộ kiếp, đúng như thiết kế.

## Lỗi thật

### 3. Dị linh căn nhanh hơn Thiên, trái mô tả (đã sửa)
`data/roots.js` từng mô tả Dị "sánh ngang Thiên linh căn", nhưng `LINH_CAN_RATE` đặt Dị = 2, Thiên = 1,5 (Âm Dương, Hỗn Độn = 3, Ngụy = 0,6). **Giữ số, sửa mô tả**: lời dẫn nhóm Dị nay nói Dị hấp thụ nhanh hơn Thiên và có sở trường riêng. Chênh lệch tốc tu giữa Ngụy và Hỗn Độn là 5 lần.

### 4. `createCharacter` không kiểm linh căn khớp `rootType` (đã sửa)
Trước đây engine chỉ kiểm `rootType` là khóa hợp lệ. Nay các loại ngũ hành phải khớp `rootType(roots)` (số hệ đạt 50 điểm), phải có ít nhất một hệ đạt 50, và Dị phải có đúng một hệ đạt 50 thuộc `DI_LINH_CAN[rootSub].from`. Sai thì ném lỗi tiếng Việt. `Hỗn Độn` và `Âm Dương` vẫn bị từ chối khi tạo mới; `normalize` bản lưu cũ không bị ảnh hưởng.

## Ghi chú cân bằng (chưa đổi luật, chờ chủ dự án)

### 5. Hấp thụ linh thạch không có trần, đan Tu Vi thì có
`absorb` đổi linh thạch sang tu vi không giới hạn, còn đan `TU_VI` bị chặn `DAN_REALM_CAP` 25% mỗi cảnh giới và suy giảm theo số lần dùng. Theo công thức, mỗi linh thạch hấp thụ cho nhiều tu vi hơn khoảng 1,2 lần so với mua đan Tu Vi. Với thu nhập hiện tại tổng cộng chỉ thêm tối đa khoảng 15% tốc độ nên chưa vỡ cân bằng, nhưng trần của đan trở nên vô nghĩa nếu thu nhập tăng. Quyết định hiện hành: không đổi luật.

## Thấp

- `docs/design-integration.md` từng ghi schema lưu "vẫn là V7" trong khi `VERSION` là 8: đã sửa.
- 4 trong 10 NPC có vai trò giao nhiệm vụ nên không có `offer`. Đã kiểm `client/ui/screens/world.js`: nút mua/học chỉ hiện khi vai trò là bán đồ, luyện đan hoặc dạy công pháp có `offer`, nên các NPC này chỉ có nút "Nhiệm vụ chung". Không phải lỗi giao diện.
- Tính độc bẩm sinh dùng giả định 5% ATK/giây trong 3 giây (đã ghi ở `design-integration.md`) vì bảng thiết kế thiếu mức sát thương.

## Đã kiểm và không phải lỗi

Tham chiếu dữ liệu (đan phương, rèn pháp bảo, phù, phần thưởng nhiệm vụ) đều khớp mã vật phẩm; `BT-900`/`BT-901` mua được ở cửa hàng; chênh lệch mua/bán (×1,2 / ×0,4) chỉ thành vòng lời khi chiết khấu NPC vượt 66,7%, mà mức tối đa hiện là 30%.

## Hồi quy độ khó

Mọi thay đổi phải giữ nguyên: Ngụy, Tứ hành, Tam hành, Song tọa hóa ở Luyện Khí sau 0,68 giờ (tuổi 80/80); Thiên qua Luyện Khí lúc 76,5/240 tuổi sau 0,63 giờ (hạt giống 7, Nhân tộc, không vật phẩm); và `breakthroughOdds().doomed === true` khi không có hộ kiếp từ Trúc Cơ đến Đại La (`tests/design-audit.test.cjs`).
