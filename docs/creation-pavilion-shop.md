# Thiên Mệnh Các · Quầy Khởi Nguyên

> Trạng thái: Đề xuất. Bản thử nghiệm nội bộ trong PR; giá và lượng tặng có thể thay theo quyết định cân bằng của chủ dự án.

Màn tạo đạo thân có ba bước: **(01) Chọn đạo thân; (02) Thiên Mệnh Các — đổi Thiên Tinh; (03) Phân bổ thiên phú**. Lựa chọn một Dấu ấn Thiên Mệnh miễn phí vẫn còn ở bước 02, nhưng **Thiên Mệnh Các là cửa hàng thật**, không còn chỉ là ô chọn Thiên mệnh.

## Bảng đổi dự kiến giai đoạn test

| Món | Giá (Thiên Tinh) | Giới hạn trước khi tạo | Khi vào game |
|---|---:|---:|---|
| 1 điểm Thiên Phú | 4 | 4 điểm | Nâng tổng điểm phân bổ từ 8 lên tối đa 12; mỗi chỉ số vẫn tối đa 8 |
| Linh Thạch Nhập Thế | 2 | 2 túi | +200 linh thạch/túi |
| Tụ Khí Đan | 3 | 2 gói | +2 Tụ Khí Đan/gói |
| Bồi Nguyên Đan | 2 | 2 gói | +2 Bồi Nguyên Đan/gói |

**Ngân sách nhập môn thử nghiệm:** tài khoản chưa có đạo thân và chưa có sổ Thiên Mệnh được tặng **10 Thiên Tinh duy nhất khi đổi món starter đầu tiên**. Backend cấp tiền bằng `INSERT ... ON CONFLICT DO NOTHING`, không cấp thêm khi gửi lại request, tải lại trang, gieo lại tuổi/chủng tộc/linh căn hoặc bấm nhiều lần. Nếu không mua món nào, tiền thưởng chưa phát sinh trong database. Sau khi có nhân vật, quầy starter khóa; Thiên Mệnh Các trong game vẫn bán các cấp nâng cấp bằng Thiên Tinh theo luật cũ.

## Luật và giao dịch server

- Khách chỉ gửi `{kind:'starter',key,expectedVersion,requestId}`; backend quyết định toàn bộ giá, số lượng và giới hạn. Không nhận trường `extraTalentPoints` hoặc vật phẩm từ request tạo nhân vật.
- Một `pavilion_account` dùng chung cho số dư và hàng chờ nhận trong JSON `relics` (tương thích schema hiện hành, **không cần migration SQL**). Tên trường `relics` là kho kỹ thuật cũ; không còn cơ chế chuyển kiếp/trọng sinh.
- Mọi lần mua dùng giao dịch khóa account, optimistic `version`, và receipt chống mua lặp. Gửi lại `requestId` phải trả kết quả replay mà không trừ tiền lần hai.
- Khi tạo đạo thân bằng creation ticket hợp lệ, server áp dụng `relics` cho `talent`, `stone`, `bag`, rồi xóa hàng chờ trong **cùng transaction** với INSERT nhân vật. Nếu tạo thất bại, dữ liệu hàng chờ không mất.
- Đạo thân đã tạo không thể mua món starter; sau tử vong reset như luật hiện hành, không giữ tiền hoặc hàng cũ. Không cấp lại hàng chỉ vì reload/sync.
- `starterTalentPoints` trong state chỉ do server ghi. `normalize` giữ số điểm đã mua để không mất chỉ số sau reload, giới hạn số điểm bổ sung tối đa 4.

## Nghiệm thu

`tests/creation-pavilion-shop.test.cjs` kiểm tra cả SQLite và PostgreSQL/PGlite: giá + quà nhập môn đúng một lần, receipt replay, version conflict, mã hàng không hợp lệ, từ chối tạo khi phân bổ thiếu điểm, cấp thuốc khi tạo nhân vật, không cấp lại khi tạo xong, và reload giữ điểm. Mọi thay đổi chỉ lên nhánh tính năng, **không tự deploy Edge/Cloudflare hay chỉnh Supabase đang dùng**.

**Cần chủ dự án duyệt** mức 10 Thiên Tinh tặng, giá 4/2/3/2 và giới hạn 4 điểm trước khi phát hành công khai; đây là giá mặc định đề xuất để test nội bộ, không phải luật game đã chốt.
