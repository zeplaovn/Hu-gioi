# Thiên Vân Đại Lục — cách một trận đấu vận hành

*Công thức và benchmark lấy từ Combat & Lore v1.4.1 (19/10/2026) trên nền FINAL v1.3. Lời dẫn được biên tập lại; các số trong bảng, ngưỡng pha và ID không đổi.*

Trận đánh trong Thiên Vân Đại Lục cần rõ ràng ở hai cấp. Ở cấp đầu tiên, người chơi phải hiểu vì sao mình đánh trượt, trúng chí mạng hoặc bị boss làm chậm. Ở cấp thứ hai, họ phải hiểu trận nào có thể khiến mình mất cả kiếp trước khi đặt chân vào chiến trường. Hệ số trong tài liệu này chỉ là ngôn ngữ để triển khai hai việc đó, không phải tấm vé bảo đảm mọi trận đã công bằng.

Nguyên tắc so sánh: cùng gear, cùng seed và cùng phiên bản logic. Khi nguồn combat thay đổi, kết quả mới phải được lưu cạnh kết quả cũ để biết chính xác thay đổi nào làm trận dài hay ngắn hơn.

## 1. Vì sao phải cân lại trận đánh
Trong benchmark cũ, 24/30 quái/boss có tỷ lệ thắng của người chơi **100%** ở mức gear `1.30` (120 seed mỗi đối thủ). Các boss cấp cao không khác biệt rõ với quái thường. Điều này khiến cơ chế chết-trắng trong v1.3 gần như không tạo được quyết định chiến thuật ở đa số encounter.
Điểm đối chiếu mới dùng **cùng 420 seed cho mỗi monster và mỗi cấu hình gear** ở cả bộ cũ lẫn bộ mới. Không đối chiếu 120 seed cũ trực tiếp với 420 seed mới để tuyên bố thay đổi chính xác.

## 2. Mỗi loại đối thủ phải tạo ra cảm giác gì

| Nhóm | Mục tiêu gear 1.30 (tham khảo) | Chiều dài mong muốn | Cơ chế |
|---|---|---|---|
| Quái thường | 97–100% | 3–8 lượt | Farm, chủ yếu an toàn |
| Tinh anh | 85–96% | 11–17 lượt | Có khắc chế; rủi ro theo zone |
| Boss nhỏ | 78–92% | 17–27 lượt | Telegraph + debuff |
| Boss | 77–89% | 18–28 lượt | Ba pha, một ultimate có báo trước |
| Boss cuối map | 70–82% | 22–32 lượt | Chuẩn bị thuốc/kháng, xác nhận lethal |
| Boss endgame | 55–73% | 20–33 lượt | Endgame optional, rủi ro đáng kể |
| Boss cốt truyện | 77–89% | 20–32 lượt | Đối thoại/lựa chọn thay thế: đề xuất, chưa canonical |

Mốc ở trên là **mục tiêu thiết kế theo bot**, không phải xác suất server. Với gear chuẩn bị `1.45`, người chơi thử nghiệm hầu như luôn thắng; điều đó chỉ chứng tỏ trang bị rất có ý nghĩa trong mô hình hiện có, chưa chứng tỏ real combat dễ.

## 3. Công thức nào được giữ, công thức nào đã đổi
Vẫn giữ công thức HP/ATK/DEF player, 15 giai đoạn × 9 tầng, hệ số linh căn/purity, tương khắc nguyên tố, kháng, cap, TM, luật trùng sinh và Phi Thăng của v1.3. Các thay đổi v1.4 nằm ở **quái/boss, kỹ năng quái, đồng bộ mốc pha và hiệu ứng SLOW**.
**Đối với quái thường và boss** (không phải tinh anh):
```text
HP_v1.4  = round(HP_v1.3  * (1 + 0.32*k))
ATK_v1.4 = round(ATK_v1.3 * (1 + 0.17*k))
DEF_v1.4 = round(DEF_v1.3 * (1 + 0.07*k))
```
`k` là thông số điều chỉnh theo từng con, tối ưu qua seeded solo sim, không phải hệ số dùng trực tiếp trong runtime. `k` có thể âm ở boss cực mạnh cũ để hạ độ khó.
**Tinh anh** ưu tiên trận ngắn và có sức sát thương rõ: HP `×1.55`, DEF `×1.22`, tìm ATK theo seed cho tỷ lệ thắng mục tiêu. Điều này khác cách tăng HP rất cao của công thức k; mục đích tránh 20+ lượt tinh anh khiến tốc độ farm đè nặng mục tiêu 30–45 ngày.
**Kỹ năng quái:** `monster_skills_v14.csv` có coefficient riêng theo trạng thái/loại; không thay số lượng 106 kỹ năng. `SLOW` giảm 12 SPD **khi xác định thứ tự hành động**, không làm mất lượt; bản v1.3 chỉ ghi trạng thái nhưng chưa dùng SPD này.
**Pha boss:** ngưỡng chuyển pha đọc trực tiếp trường `hp_pct_range` từ `boss_phases.csv` (ví dụ Huyền Quy 70% và 40%), không ép mọi boss 65% và 30%. Các hiệu ứng pha đặc thù phức tạp trong nội dung chữ (phản sát thương, summon, đổi pháp tắc, cộng sát thương) **vẫn chưa được engine demo thực thi trọn vẹn**; CSV là nguồn thiết kế, không phải mã hoàn tất.
**Ultimate:** vẫn telegraph một lượt trước khi gây sát thương, cộng guard khi người chơi chọn phòng thủ. Ultimate chỉ kích hoạt khi đã tới pha cuối có trong bảng (boss nhỏ pha 2). Đòn ultimate đầu có cap 55% HP tối đa để tránh hạ gục bất ngờ từ đầy máu.

## 4. Ba mươi đối thủ và kết quả benchmark

Đây là bảng đối chiếu **trên bot**, không phải tỷ lệ chết thực tế ở máy chủ. Một trận thắng 83% trong môi trường solo thử nghiệm có thể vẫn quá khắc nghiệt nếu nó là nhiệm vụ bắt buộc và người thua mất sạch hành trang. Ngược lại, boss phụ 68% có thể chấp nhận được nếu người chơi có đủ thông tin để chuẩn bị và được phép không tham gia.

| ID | Quái/Boss | Vai trò | HP cũ→mới | ATK cũ→mới | DEF cũ→mới | Win cũ→mới (gear 1.30) | Win gear 1.45 | Lượt median |
|---|---|---|---|---|---|---|---|---|
| MON-001 | Hắc Lang | Thường | 135→154 | 18→19 | 11→11 | 100.0%→100.0% | 100.0% | 4.0 |
| MON-002 | Độc Xà | Thường | 135→154 | 18→19 | 11→11 | 100.0%→100.0% | 100.0% | 4.0 |
| MON-003 | Hoang Thử Yêu | Thường | 237→271 | 32→34 | 20→21 | 100.0%→100.0% | 100.0% | 4.0 |
| MON-004 | Thiết Giáp Hùng | Tinh anh | 716→1110 | 72→175 | 42→51 | 100.0%→93.81% | 100.0% | 14.0 |
| MON-005 | Huyết Điêu | Tinh anh | 716→1110 | 72→177 | 42→51 | 100.0%→87.14% | 99.76% | 14.0 |
| MON-006 | Kiếm Xỉ Hổ | Tinh anh | 1251→1939 | 125→239 | 73→89 | 100.0%→93.81% | 100.0% | 17.0 |
| MON-007 | Ma Hầu | Boss nhỏ | 2060→3198 | 162→210 | 90→101 | 100.0%→82.38% | 100.0% | 24.0 |
| MON-008 | Thanh Giao | Boss | 4526→5871 | 287→332 | 167→178 | 100.0%→84.52% | 100.0% | 24.0 |
| MON-009 | Hỏa Lân Thú | Boss | 4526→5099 | 287→306 | 167→172 | 99.52%→81.43% | 100.0% | 23.0 |
| MON-010 | Cửu Vĩ Hồ | Boss | 7925→10176 | 501→577 | 291→309 | 100.0%→86.19% | 100.0% | 24.0 |
| MON-011 | Kim Dực Bằng | Boss | 7925→9745 | 501→562 | 291→306 | 100.0%→82.14% | 99.76% | 23.0 |
| MON-012 | Huyền Quy | Boss cuối map | 9540→9881 | 527→537 | 323→326 | 90.48%→78.33% | 100.0% | 26.0 |
| MON-013 | Hư Không Thú | Thường | 3883→4442 | 516→555 | 312→322 | 100.0%→100.0% | 100.0% | 4.0 |
| MON-014 | Tinh Hồn Lang | Tinh anh | 6706→10394 | 675→1549 | 389→475 | 100.0%→96.43% | 100.0% | 13.0 |
| MON-015 | Vô Tướng Ma Khôi | Tinh anh | 11736→18191 | 1182→2780 | 682→832 | 100.0%→87.38% | 100.0% | 14.0 |
| MON-016 | Pháp Tướng Cự Linh | Boss | 24267→31115 | 1537→1767 | 892→947 | 100.0%→81.9% | 100.0% | 23.0 |
| MON-017 | Giới Ngoại Dị Trùng | Tinh anh | 20538→31834 | 2067→5732 | 1194→1457 | 100.0%→93.33% | 100.0% | 12.0 |
| MON-018 | Cổ Kiếm Linh | Boss | 42467→44020 | 2689→2741 | 1560→1572 | 90.48%→83.81% | 99.76% | 24.0 |
| MON-019 | Sát Hồn Vương | Boss | 42467→54530 | 2689→3095 | 1560→1657 | 100.0%→79.29% | 100.0% | 23.0 |
| MON-020 | Giới Kiếp Lôi Linh | Boss cuối map | 89451→95454 | 4955→5132 | 3027→3071 | 92.86%→74.29% | 99.52% | 24.0 |
| MON-021 | Tiên Linh Hạc | Thường | 63723→72899 | 8472→9120 | 5129→5291 | 100.0%→100.0% | 100.0% | 4.0 |
| MON-022 | Kim Giáp Tiên Vệ | Tinh anh | 110066→170602 | 11079→21091 | 6396→7803 | 100.0%→90.48% | 100.0% | 16.0 |
| MON-023 | Sát Suy Ma Ảnh | Tinh anh | 192616→298555 | 19388→43907 | 11194→13657 | 100.0%→85.48% | 99.76% | 13.0 |
| MON-024 | Thời Sa Cổ Thú | Boss | 398281→488268 | 25224→28252 | 14628→15351 | 100.0%→85.48% | 99.76% | 22.0 |
| MON-025 | Hư Không Long Ảnh | Boss | 398281→491255 | 25224→28352 | 14628→15375 | 100.0%→83.81% | 100.0% | 22.0 |
| MON-026 | Luân Hồi Hồn Tướng | Boss | 696989→860999 | 44143→49661 | 25600→26918 | 100.0%→80.24% | 100.0% | 22.0 |
| MON-027 | Đạo Tắc Hóa Thân | Boss | 696989→841396 | 44143→49002 | 25600→26760 | 100.0%→84.29% | 100.0% | 22.0 |
| MON-028 | Cửu Tiêu Phản Tiên | Boss | 696989→855772 | 44143→49485 | 25600→26876 | 100.0%→84.76% | 100.0% | 22.0 |
| MON-029 | Đại La Tàn Ảnh | Boss endgame | 1671481→1601200 | 82670→80823 | 53834→53339 | 45.95%→68.1% | 100.0% | 24.0 |
| MON-030 | Đài Quy Hương Thủ Ảnh | Boss cốt truyện | 1558543→1582676 | 71150→71735 | 49317→49484 | 92.14%→84.05% | 100.0% | 25.0 |

## 5. Nói rõ điều gì sẽ xảy ra nếu thua
- **Safe**: HP bằng 0 chỉ kết thúc trận, không trùng sinh.
- **Zone-based**: chỉ lethal nếu khu vực được đánh dấu sinh tử và người chơi đã xác nhận. Cột `estimated_ref_death_pct` của bot là tử vong khi chạy ở mode mặc định; với khu lethal phải đọc `estimated_death_if_lethal_pct` = death + safe_ko.
- **Lethal**: HP bằng 0 kết thúc kiếp, mất toàn bộ vật phẩm/tiền/trang bị của kiếp; TM chưa tiêu, stat TM, thành tựu vẫn tồn tại. Nếu player và boss đồng thời về 0 HP, trận vẫn tính mất kiếp, không được phát thưởng WIN.
- Cần 2 lần xác nhận trước encounter lethal; không được ép người chơi bắt boss khi không nhìn thấy trạng thái sát thương dự kiến.
- Mất kết nối không tự động gây chết theo đề xuất v1.3. Không đánh dấu timeout QA 40 vòng là chiến thắng/rút an toàn.
- **Đài Quy Hương / Quy Phàm** là lựa chọn cốt truyện; giải pháp đối thoại tránh boss lethal là đề xuất nội dung mới, không tự động đổi cờ lethal ở v1.3.

## 6. Cảm giác chiến đấu thay đổi qua ba giới
- **Hạ Giới:** quái thường cho học telegraph, tinh anh 12–17 lượt, boss 23–26 lượt, Huyền Quy cuối map yêu cầu đọc khiên 70% và 40%.
- **Linh Giới:** quái Không Gian khác ma khôi; Giới Kiếp Lôi Linh khó hơn đa số boss thường nhưng người chuẩn bị phải có đường counterplay rõ.
- **Tiên Giới:** boss pháp tắc không chỉ tăng số: cần đổi kháng/nguyên tố, chạm vào câu hỏi đạo đức/hồ sơ; Đại La Tàn Ảnh là mục tiêu tối ưu endgame và không được tự động khóa Quy Phàm.

## 7. Một cái chết làm thay đổi lịch 30–45 ngày ra sao
- Công thức progression/Thiên Mệnh **không bị đổi**. +1 TM cho mỗi tầng thành công, TM mua stat/vật phẩm độc quyền trong Thiên Mệnh Các.
- Nếu boss story bắt buộc đánh lethal liên tiếp, xác suất chết tích lũy có thể làm median tăng rất mạnh; không được quảng cáo đã chứng minh 30–45 ngày từ các test 1v1 này.
- Cần beta có mẫu player thật, thống kê thắng/số trận/gear theo boss, số lần tử vong theo nguồn, số ngày phải xây lại kiếp và tỷ lệ bỏ game sau chết.
- Quái farm không làm chết khi offline; tầng 9/Độ Kiếp chỉ xác nhận khi online theo v1.3.

## 8. Cách đọc và chạy lại số liệu
```bash
python 06_MO_PHONG_KIEM_THU/qa_package.py
python 06_MO_PHONG_KIEM_THU/combat_engine_demo_v1.4.1.py --monster MON-012 --sample 420
```
Thông số gear: `1.18` (thiếu đồ), `1.30` (tham chiếu), `1.45` (đã chuẩn bị); 420 seed độc lập/gear/quái. Bot dùng 2 thuốc, đánh kỹ năng cơ bản/xen kỹ năng mạnh, tự guard trước ultimate, max 40 vòng. Chỉ `Python random.Random` cho QA local; production phải quyết định RNG từ backend, không tin seed client.

## 9. Những việc simulator chưa chứng minh được
1. AI thực chiến và toàn bộ cây 30 kỹ năng player chưa được tích hợp vào một combat engine production.
2. Các cơ chế riêng của 50 pha boss chưa thực thi 100% bằng code. File `boss_phase_story_v14.csv` chỉ mở rộng lời thoại/hiệu ứng thị giác.
3. Đội hình PvE 2–4 người, PvP đa build và Hỗn Độn 6 người chưa thể suy luận cân bằng từ solo bot.
4. Tỷ lệ tử vong/tải kinh tế server, ảnh hưởng lên 30–45 ngày phải kiểm thử riêng. Các tỷ lệ zone_based chỉ đổi thành tử vong khi khu vực lethal.
5. Lịch sử quái/boss mới sáng tác cần chủ dự án duyệt trước khi đưa wiki hoặc script nhiệm vụ.


## Phụ lục cập nhật v1.5 — chỉ thay nhịp tu luyện, không đổi sức mạnh boss

Các hệ số chiến đấu cùng 30 đối thủ trong bảng này vẫn là **v1.4.1**. Lịch tiến độ rút còn 33 ngày cho đường không chết có thể khiến người chơi chưa kịp tích đủ vật liệu trang bị trước khi gặp boss. Vì vậy, trước khi phát hành phải thử lại **tỷ lệ có được gear 1,30 / 1,45** theo ngày mới. Không tự nhận là combat đã được cân lại chỉ vì giảm `xp_required`. Các benchmark thắng/thua ở đây giữ nguyên mục đích đối chiếu trên cùng cấu hình trang bị.

## Ghi chú kiểm toán v1.6

Demo chạy được từ gói này sau khi sửa đường dẫn dữ liệu. Logic combat được giữ để replay bộ 37.800 trận cũ; không đồng nghĩa mọi hiệu ứng đã đúng: cooldown được ghi nhưng chưa kiểm tra khi chọn kỹ năng; xử lý STUN nằm sau dùng thuốc/guard; hard CC chuyển SLOW cho mọi quái thay vì chỉ boss. Benchmark vẫn là số đo của demo này. Xem báo cáo kiểm toán trước khi dùng làm engine.
