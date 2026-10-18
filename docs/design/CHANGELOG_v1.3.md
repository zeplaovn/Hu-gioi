# CHANGELOG v1.2 → v1.3 (17/10/2026)

## Quyết định của chủ dự án đã áp dụng
- Database làm mới từ đầu, **không còn save cũ**: xóa toàn bộ phần migration save legacy (mục 11, lộ trình, open decisions, ghi chú "giữ tên legacy" của PILL-013).
- Phi Thăng, permadeath, mất trắng tài sản vật lý, Thiên Mệnh +1/tầng, Thiên Mệnh Các, stack OPEN: **giữ nguyên từ v1.2**.

## Sửa lỗi
1. **Số học Thiên Mệnh:** v1.2 ghi +1 TM mỗi tầng nhưng simulator chỉ đếm 15 mốc (15 TM/kiếp), trong khi giá đầy đủ Quán Đỉnh là 3.590 TM (~240 kiếp). Chốt **9 tầng/cảnh giới → 135 TM/kiếp**, hạ giá Quán Đỉnh còn **2.280 TM (~17 kiếp hoàn tất)**; giá item 20–90 TM giữ nguyên (15–67% một kiếp).
2. **Simulator viết lại:** v1.2 cho P10 = P25 = median = 60,0 (đỉnh nhọn do không có phân tán). v1.3 thêm mức chăm chỉ lognormal, nhiễu từng giai đoạn, TM theo tầng, chi TM theo giá thật, thọ nguyên; có `--sensitivity` thử hazard ×0,5/×1,0/×1,5 vì xác suất chết là giả định.
3. **Lỗi định dạng:** phụ lục v1.2 của file cốt truyện và file bí mật chứa 12 ký tự `\n` literal mỗi file; đã chuyển thành xuống dòng thật.
4. **Số mục Balance Master bị trùng (hai mục 19):** đã đánh lại số.
5. **QA:** v1.2 chỉ kiểm sự có mặt của câu chữ. `scripts/qa_check.py` mới kiểm dữ liệu thật: số lượng, ID, ba map, nhất quán kinh tế và cửa sổ 7 ngày, giá Thiên Mệnh khớp config, item TM không nằm trong drop/shop, thọ nguyên, tái lập simulator, xlsx không lỗi công thức.
6. **xlsx dựng lại** từ dữ liệu v1.3 (có công thức, biểu đồ source/sink).
7. Xóa các file mô phỏng cũ (`simulation_result*.json` của v1.0/v1.2).

## Bổ sung [Đề xuất v1.3] — chờ duyệt
- **Offline/lethal:** offline không gây chết; auto-tu luyện dừng trước tầng 9 và Độ Kiếp; xác nhận hai bước; mất kết nối không tự gây tử vong.
- **PvP Sinh Tử:** không loot xác; ghép BP ±10%; chỉ số Thiên Mệnh tính 50% trong PvP xếp hạng.
- **Thọ nguyên:** 100 năm khởi đầu, tiêu hao 10 năm/ngày, cấp `100 + 20×ngày` theo giai đoạn (`data/tho_nguyen.csv`).
- **Chống chuyển tài sản:** tài khoản ≥72h, khóa 24h item nhận, tối đa 20% tài sản chuyển ra/ngày, flag cặp tài khoản bất thường.
- **Lục Mệnh:** tài khoản ≥14 ngày, hàng chờ ghép đội.

## Giữ nguyên (đã kiểm)
- Bảng kinh tế của v1.2: cửa sổ 7 ngày trong 1,127–1,216, nằm trong vùng khỏe 1,05–1,25.
- Dữ liệu master, lore, NPC, tông môn, spoiler.

## Chưa xử lý
- Xác suất chết thật, ngưỡng chiến lực Lục Mệnh, giá cuối: cần closed beta/telemetry.
- Kinh tế: `death_loss_expected` là giá trị mô hình, chưa suy từ mô hình tài sản tích lũy.
