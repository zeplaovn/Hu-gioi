# Thiên Vân Đại Lục — Thiết kế hệ thân mật idle Hạ Giới v1.1

## 1. Phạm vi và tương thích

- 19 NPC Hạ Giới với ID giữ nguyên bộ `dialogue_scenes.json` v1.0.
- 95 cảnh cốt truyện gốc **giữ nguyên**, thêm 76 hội thoại thường, 38 kỳ ngộ ngẫu nhiên và 36 quà.
- Từng NPC có 4 chủ đề hội thoại ngày thường quay vòng và 2 sự kiện ngẫu nhiên một lần/kiếp.
- Các đoạn này không mở khóa phi thăng, không tặng Thiên Mệnh, không tiết lộ thẳng bí mật Hỗn Độn, không bán cổ vật ẩn.

## 2. Vòng lặp mỗi ngày

1. Reset máy chủ lúc **00:00 UTC**. Chỉ thời gian máy chủ có thẩm quyền.
2. Mỗi NPC được **1 lần** chọn đáp án hội thoại hằng ngày; quay vòng ngẫu nhiên 4 chủ đề không lặp trước khi dùng hết (giữ tập các ID đã hiện trong chu kỳ).
3. Mỗi NPC được nhận **1 món quà/ngày**; cùng `gift_id` cho cùng NPC chỉ lặp lại sau **3 ngày reset**.
4. Quà được trừ kho trong một giao dịch có xác nhận cùng lúc với cộng điểm. Không cộng điểm nếu người chơi thiếu quà, NPC không có mặt hoặc lời mời bị hủy.
5. Sau tương tác xã hội hợp lệ đầu tiên trong ngày, máy chủ xét một lần sự kiện ngẫu nhiên toàn tài khoản (xem mục 4).
6. Tất cả delta quan hệ được cộng theo thứ tự và `clamp(-100, 100)`. Không cho nhận thưởng kép khi retry mạng.

## 3. Điểm quan hệ

| Tương tác | A | B | C |
|---|---|---|---|
| Hội thoại ngày thường | +5 thiện cảm / +1 tín nhiệm | +3 / +2 | -4 / -2 |
| Sự kiện ngẫu nhiên | +9 / +5 | +4 / +2 | -6 / -3 |

Các đáp án viết tay trong gói hiện dùng các điểm chuẩn trên. Điều này dễ QA và có thể điều chỉnh từ bảng cấu hình sau thử nghiệm.

| Mức thích quà | Thiện cảm | Tín nhiệm | Phản ứng hiển thị gợi ý |
|---|---:|---:|---|
| Rất thích (`favorite`) | +6 | +2 | NPC vui thực sự, nhắc lý do phù hợp tính cách |
| Thích (`liked`) | +4 | +1 | NPC nhận quà và cảm ơn |
| Bình thường (`neutral`) | +1 | 0 | NPC lịch sự nhận, không thay cốt truyện |
| Không thích (`disliked`) | -4 | -2 | NPC giải thích vì sao quà không hợp |

Các điều kiêng kỵ trong bảng NPC là **quy tắc nội dung**: những loại đồ như bằng chứng giả, hồ sơ đánh cắp, tin tìm thân nhân chưa kiểm chứng không nằm trong danh mục quà bình thường. Nếu hệ thống có thêm đồ từ quest, chỉ xử lý điều kiêng kỵ bằng cờ kiểm tra nguồn gốc/đồng ý riêng; không tự động trừ quà của người chơi.

## 4. Sự kiện xuất hiện ngẫu nhiên

1. Sự kiện thứ nhất của NPC cần thiện cảm **≥20**, thứ hai **≥50**.
2. Chỉ đưa NPC có mặt/khả dụng theo trạng thái nhiệm vụ vào danh sách. Nếu NPC đã chết, rời map hoặc bị khóa theo nhánh thì không quay ra cảnh gặp trực tiếp.
3. Sau tương tác hợp lệ đầu tiên mỗi ngày: tung một lượt toàn tài khoản với xác suất **20%**. Nếu 4 ngày hợp lệ liên tiếp không xuất hiện, ngày hợp lệ tiếp theo chắc chắn xuất hiện (pity).
4. Chọn NPC theo trọng số: quan hệ 20–49 = 1; 50–79 = 1,5; ≥80 = 2. Sau đó chọn một sự kiện còn mới, đủ điều kiện.
5. Tối đa **1 sự kiện/ngày/tài khoản**; hai sự kiện của cùng NPC phải cách ít nhất **3 ngày**; mỗi `scene_id` sự kiện chỉ trả thưởng **một lần trong một kiếp**.
6. Nếu không có sự kiện đủ điều kiện, không tung/tiêu lượt và không tăng bộ đếm pity.
7. Khi người chơi trùng sinh thật, reset trạng thái `one_time_per_life` và quan hệ; không xóa lịch sử lore account-level đã được cho phép. Phi thăng cùng đời không reset.

**Quan trọng:** Xác suất 20% áp dụng cho *tài khoản mỗi ngày*, không phải 20% × 19 NPC mỗi ngày; nếu không game sẽ phát quá nhiều sự kiện.

## 5. Chống farm và an toàn dữ liệu

- Giao dịch cần idempotency key kiểu `account_id:life_id:npc_id:utc_day:interaction_kind[:id]`.
- Hệ thống không tin timestamp của client, không cấp thưởng khi replay/click lại hoặc kết nối lại.
- Không cộng thân mật bằng cách gửi cùng một món quà liên tiếp nhiều lần.
- Khi đạt 100 thiện cảm, điểm không vượt trần; **không** tự mở nhánh kết cục nếu chưa đạt nhiệm vụ cốt truyện/chứng cứ/điều kiện sống sót.
- Cờ nhiệm vụ, NPC sống/chết, điều kiện gia nhập tông môn và điều kiện map phải được xét bằng state máy chủ.
- Quà bình thường không cộng sức mạnh tu luyện hoặc thay đổi giá trị item quá nhiều; nên là nguồn tiêu thụ kinh tế nhẹ.

## 6. Kinh tế quà tặng

- Quà Hạ Giới thông thường dùng **Linh Thạch hạ phẩm**, hoặc nhận qua nghề phụ/sự kiện nhỏ.
- **Không** định giá cứng trong gói vì v1.6.1 còn sử dụng hệ `LS/LT/TN` cũ; giá sẽ cần cân bằng lại theo nền tiền mới.
- Tỷ lệ chính thức: 1 Linh Thạch thượng = 1.000 Linh Thạch hạ; 1 Tiên Ngọc hạ = 10.000 Linh Thạch thượng; 1 Tiên Ngọc thượng = 100 Tiên Ngọc hạ.
- **Tiên Ngọc thượng phẩm** dành cho vật phẩm, pháp bảo, công pháp, linh thảo cực hiếm có giá trị tu luyện cao tại **Tiên Giới**, không dùng mua quà xã giao phổ thông Hạ Giới.

## 7. QA gameplay tối thiểu

- Test có/không đủ quà, cấp trùng thưởng, đổi ngày bằng đồng hồ client, đa thiết bị, click liên tiếp.
- Test dấu âm khi tặng quà không hợp, cap điểm, ngưỡng 20/50/80/100 và NPC không đủ điều kiện.
- Test sự kiện 20% toàn tài khoản, pity sau bốn ngày hụt, không lặp event một lần/kiếp, cooldown 3 ngày.
- Test NPC đã chết/rời map, chuyển giới cùng kiếp, trùng sinh thật và lưu lore account-level.
- Test dữ liệu quà không nhầm cổ vật ẩn hoặc cho phép mua điểm Thiên Mệnh.
