# Thiên Vân Đại Lục — thiết kế hợp nhất v2.1

## Quy tắc đã chốt

Ba giới Hạ/Linh/Tiên dùng LT_HP (Linh Thạch hạ phẩm), LT_TP (Linh Thạch thượng phẩm), TN (Tiên Ngọc). Mỗi bậc tỷ giá 1.000. Đổi hai chiều không phí sau mở giới tương ứng trong kiếp hiện tại; không tự đổi khi mua. Không có hai phẩm cấp Tiên Ngọc trong bản hiện hành.

Bắt đầu Luyện Khí tầng 1 với 3 LT_HP; không có cảnh giới Phàm Nhân. 14 đại cảnh giới, mỗi cảnh giới 9 tầng. Chi phí luyện hóa theo tầng1–9 là 3,6,12,24,48,96,192,384,768 đồng tiền của giới hiện tại, đặt lại khi sang đại cảnh giới. Xem refining_costs.json.

Giữ 9 NPC tương tác. Gói mới19 NPC chỉ nhập nội dung của5 người trùng danh sách đang dùng: Trần Minh, Tô Nhược Vân, Diệp Hồng Y, Bạch Tử Yên, Tạ Thiên Cơ. Cả9 NPC đã có thoại xã hội; NPC-06 ở Linh Giới, NPC-07/08/09 ở Tiên Giới. Các nhân vật được nhắc trong truyện không tự trở thành thực thể giao nhiệm vụ. Không gán lời thoại của người bị loại sang một người khác.

Thương các: Vạn Bảo Các, Linh Thiên Các, Vạn Đạo Các. Chợ đen ở Hạ và Linh Giới. Đấu giá chung server, tách đồng tiền, không xuyên server. Nhiệm vụ tông môn có tiền/cống hiến; thưởng hiện hành đã nhúng trong quests.json.

Linh điền 4×4: mở 2 ô đầu, khóa 14 ô; mua theo cảnh giới bằng LT_HP và TN. Bốn thao tác: gieo, bón, tưới, bắt sâu. Luyện đan/luyện khí có 3 ô vật liệu và 1 ô tăng phẩm. Bốn nghề có EXP riêng. Vẽ phù bắt đầu 5 lượt/ngày, +1 mỗi đại cảnh giới, tỷ lệ hỏng tăng theo cấp nghề.

## Luật kiếp và tiến trình

Phi thăng chuyển giới trong cùng kiếp, giữ tài sản/quan hệ của kiếp. Chết thật mất tiền, đồ, escrow, hộp nhận, ô đất đã mua, cây và EXP nghề; giữ TM/stat tài khoản cùng tư liệu theo luật gốc. Không có kho miễn mất mặc định. Kiếp mới không đặt lại hạn mức ngày tài khoản.

Tầng9 và độ kiếp cần xác nhận online; không tự xảy ra chết thật khi offline. 33 ngày là mốc XP cơ sở, mục tiêu tài khoản 30–45 ngày vẫn cần mô phỏng tích hợp. Không dùng kết quả cũ để chứng nhận kinh tế/nghề/quà/đấu giá mới.

## Thứ tự đọc và nguồn dữ liệu

Đọc README, thiết kế kinh tế/nghề và thiết kế thân mật. Dữ liệu import duy nhất: JSON trong 02_DU_LIEU,03_HOI_THOAI,04_COMBAT; thứ tự ở LOAD_ORDER.json. Không còn CSV/Excel lịch sử hoặc chuỗi override. Bảng giá quà và các hệ số mới chưa được người dùng duyệt là đề xuất cân bằng, không tự coi là thông số production.

Gói bao gồm tài liệu nội bộ có spoiler, không phải bản phát hành công khai hay game backend/frontend hoàn chỉnh.
