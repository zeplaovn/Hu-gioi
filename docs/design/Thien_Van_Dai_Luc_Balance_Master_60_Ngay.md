# THIÊN VÂN ĐẠI LỤC — MASTER BALANCE 60 NGÀY

**Bản FINAL v1.2 · 17/10/2026**

> Baseline v1.3: Phi Thăng chuyển map trong cùng một kiếp; tử vong lethal kết thúc kiếp và mất toàn bộ tài sản vật lý; Thiên Mệnh là meta progression. Không Gian Hỗn Độn nằm ngoài SLA tuyến chính. ID dữ liệu ổn định.

## 1. Mục tiêu
- Median người chơi chuẩn: ~60 ngày tới Đài Quy Hương/endgame Tiên Giới.
- Hồ sơ chuẩn: 2 lần đăng nhập/ngày, 30–60 phút tương tác/ngày, bỏ lỡ được khoảng 20% nhiệm vụ ngày.
- Phân bổ: Hạ 15 ngày → Linh 20 ngày → Tiên 25 ngày.
- Offline: 8h đầu 100%, 8–16h 70%, 16–24h 40%, cap 24h.

## 2. Progression
| ID | Cảnh giới | Map | Ngày bắt đầu | Ngày mục tiêu | Nội dung |
|---|---|---|---|---|---|
| HG00 | Phàm Nhân | Hạ Giới | 0 | 1 | Thức tỉnh linh căn; nhập môn |
| HG01 | Luyện Khí | Hạ Giới | 1 | 3 | Mở nghề phụ; tông môn |
| HG02 | Trúc Cơ | Hạ Giới | 3 | 6 | Bí cảnh; pháp bảo đầu |
| HG03 | Kim Đan | Hạ Giới | 6 | 10 | Build nguyên tố; nội tranh tông môn |
| HG04 | Nguyên Anh | Hạ Giới | 10 | 13 | Thần thức; boss cấp cao |
| HG05 | Hóa Thần | Hạ Giới | 13 | 15 | Đại tuyến Hạ Giới; phi thăng |
| LG01 | Luyện Hư | Linh Giới | 15 | 20 | Pháp tướng; Linh Tinh |
| LG02 | Hợp Thể | Linh Giới | 20 | 27 | Dung linh; chiến trường giới vực |
| LG03 | Đại Thừa | Linh Giới | 27 | 33 | Boss thế giới; di tích trận đạo |
| LG04 | Độ Kiếp / Phi Thăng | Linh Giới | 33 | 35 | Giới kiếp; lên Tiên Giới |
| TG01 | Ngụy Tiên | Tiên Giới | 35 | 39 | Chuyển tiên linh lực |
| TG02 | Chân Tiên | Tiên Giới | 39 | 45 | Tiên khiếu; pháp tắc |
| TG03 | Kim Tiên | Tiên Giới | 45 | 51 | Linh Vực; Ngũ Suy |
| TG04 | Thái Ất | Tiên Giới | 51 | 56 | Pháp tắc nâng cao; boss Tiên Giới |
| TG05 | Đại La sơ nhập / Đài Quy Hương | Tiên Giới | 56 | 60 | Hoàn tất tuyến chính; Quy Phàm/endgame |

## 3. Simulator v1.3 — Permadeath + Thiên Mệnh theo tầng + thọ nguyên

| Hazard | P10 | P25 | Median | P75 | P90 | Mean | Clear kiếp 1 | Chết TB | Kiếp sạch thứ 2+ (median) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ×0.5 | 50.22 | 55.26 | 61.94 | 71.04 | 89.7 | 67.03 | 84.1% | 0.189 | 58.71 |
| ×1.0 | 50.91 | 56.53 | 64.52 | 79.83 | 113.5 | 74.33 | 70.44% | 0.412 | 58.78 |
| ×1.5 | 51.78 | 57.9 | 67.36 | 94.34 | 131.17 | 81.87 | 59.62% | 0.664 | 58.58 |

> **Giả định:** xác suất chết (đại đột phá và bí cảnh/boss lethal) là **giả định**, chưa đo; bảng thử ×0,5/×1,0/×1,5. Thời gian có phân tán (mức chăm chỉ lognormal σ=0,15, nhiễu từng giai đoạn ±5%). TM tính +1 mỗi tầng (135/kiếp); chi TM theo thuật toán tham lam vào Căn Cốt/Ngộ Tính/Vận Khí. Hiệu ứng TM lên tốc độ bị chặn +25%. Mô hình không đo sức mạnh chiến đấu. Không thay thế engine/telemetry.

## 4. Linh căn
| ID | Tên | Loại | Tỷ lệ % | Hệ số tu luyện | Cấu trúc | Bản sắc |
|---|---|---|---|---|---|---|
| ROOT-001 | Ngũ Linh Căn | Ngũ hành | 30.0 | 0.9 | 5 hệ | Linh hoạt; nhiều công pháp |
| ROOT-002 | Tứ Linh Căn | Ngũ hành | 27.0 | 0.96 | 4 hệ | Linh hoạt |
| ROOT-003 | Tam Linh Căn | Ngũ hành | 22.0 | 1.02 | 3 hệ | Cân bằng |
| ROOT-004 | Song Linh Căn | Ngũ hành | 14.0 | 1.08 | 2 hệ | Chuyên môn hóa |
| ROOT-005 | Đơn Linh Căn | Ngũ hành | 6.0 | 1.14 | 1 hệ | Chuyên hệ mạnh |
| ROOT-006 | Thiên Linh Căn | Ngũ hành | 0.9 | 1.2 | 1 hệ cực thuần | Cộng hưởng cao; không bán |
| ROOT-007 | Biến Dị Linh Căn | Biến dị | 0.1 | 1.16 | Băng/Lôi/Phong/Quang/Ám | Bộ kỹ năng riêng; là tổng bucket 0.1% |

Quy tắc: purity 1–100; hiệu ứng cùng hệ `0.75 + purity×0.005`; không bán Thiên Linh Căn/biến dị bằng tiền thật; pháp tắc Tiên Giới không bị khóa cứng bởi linh căn.

| Hệ | Công pháp | Pháp tắc gợi ý | Combat | Cộng hưởng |
|---|---|---|---|---|
| Kim | Thanh Phong Kiếm Pháp | Kim / Không Gian / Hủy Diệt | ATK/PEN | +10% hiệu quả cùng hệ ở purity 70; +20% ở 100 |
| Mộc | Đông Ất Sinh Mệnh Quyết | Mộc / Sinh Mệnh / Độc | Heal/DoT | +10%/+20% |
| Thủy | Hắc Hải Trọng Thủy Kinh | Thủy / Băng / Thời Gian | CC/RES | +10%/+20% |
| Hỏa | Đại Viêm Phần Thiên Quyết | Hỏa / Hủy Diệt / Thời Gian | Burst/Crit | +10%/+20% |
| Thổ | Hỗn Nguyên Luyện Thổ Quyết | Thổ / Không Gian / Giam Cầm | HP/DEF | +10%/+20% |
| Băng | Tiêu Sơn Hàn Băng Quyết | Băng / Thời Gian | CC/DEF | +10%/+20% |
| Lôi | Ngũ Lôi Chính Pháp | Lôi / Hủy Diệt | Burst/PEN | +10%/+20% |
| Phong | Phong Vân Độn Pháp | Phong / Không Gian | SPD/EVA | +10%/+20% |
| Quang | Cửu Dương Thanh Tâm Kinh | Quang / Nhân Quả | Heal/RES | +10%/+20% |
| Ám | Huyền Sát Minh Linh Công | Ám / Linh Hồn | DoT/ACC | +10%/+20% |
| Kim+Hỏa | Cửu Thiên Lôi Pháp | Lôi / Hủy Diệt | Hybrid burst | +6% mỗi hệ phù hợp |
| Thủy+Mộc | Vạn Mộc Hồi Xuân Kinh | Sinh Mệnh / Thủy | Hybrid sustain | +6% mỗi hệ phù hợp |
| Thổ+Kim | Kim Cang Trấn Ngục Thể | Thổ / Kim | Hybrid tank | +6% mỗi hệ phù hợp |
| Phong+Lôi | Phong Lôi Thiên Dực | Không Gian / Lôi | Hybrid speed | +6% mỗi hệ phù hợp |

## 5. Chỉ số & cap
- Chỉ số gốc: Tướng Mạo, Phúc Duyên, Căn Cốt, Ngộ Tính, Vận Khí; tăng bằng vật phẩm tối đa +40/chỉ số.
- Combat: HP, ATK, DEF, SPD, ACC, EVA, CRIT, CRIT_DMG, RES, PEN, SPIRIT.
- Tu luyện từ gear cap +35%; Crit 75%; EVA 50% PvE/35% PvP; PEN 60%; CDR 35%.
```text
HP = realm_hp × (1 + CănCốt×0.035) × gear_hp
ATK = realm_atk × (1 + CănCốt×0.018 + NgộTính×0.008) × gear_atk
DEF = realm_def × (1 + CănCốt×0.020) × gear_def
SPIRIT = realm_spirit × (1 + NgộTính×0.030)
```

## 6. Linh dược / tiên dược
| ID | Tên | Map | Phẩm | Nguồn | Công dụng | Giá | Tiền | Giờ trồng | Giao dịch |
|---|---|---|---|---|---|---|---|---|---|
| HERB-001 | Thanh Linh Thảo | Hạ Giới | Phổ thông | Linh điền/rừng | Tu vi | 10 | LS | 2 | Có |
| HERB-002 | Huyết Diệp Hoa | Hạ Giới | Phổ thông | Yêu vực | Hồi phục | 12 | LS | 2 | Có |
| HERB-003 | Ngưng Lộ Thảo | Hạ Giới | Phổ thông | Ven suối linh | Ổn định linh lực | 12 | LS | 2 | Có |
| HERB-004 | Xích Dương Hoa | Hạ Giới | Tốt | Hỏa sơn | Hỏa hệ/luyện đan | 24 | LS | 4 | Có |
| HERB-005 | Hàn Nguyệt Diệp | Hạ Giới | Tốt | Đầm lạnh | Thủy/Băng | 25 | LS | 4 | Có |
| HERB-006 | Kim Tuyến Thảo | Hạ Giới | Tốt | Khoáng mạch | Kim hệ | 26 | LS | 4 | Có |
| HERB-007 | Thổ Linh Sâm | Hạ Giới | Tốt | Hang động | Thổ/DEF | 28 | LS | 4 | Có |
| HERB-008 | Mộc Tâm Nha | Hạ Giới | Tốt | Cổ lâm | Mộc/hồi phục | 28 | LS | 4 | Có |
| HERB-009 | Trúc Cơ Quả | Hạ Giới | Hiếm | Bí cảnh | Đột phá Trúc Cơ | 90 | LS | 8 | Hạn chế |
| HERB-010 | Kim Dương Chi | Hạ Giới | Hiếm | Núi lửa | Kim Đan/Hỏa | 95 | LS | 8 | Hạn chế |
| HERB-011 | Âm Nguyệt Liên | Hạ Giới | Hiếm | Đầm đêm | Thần thức/tâm ma | 100 | LS | 8 | Hạn chế |
| HERB-012 | Hóa Anh Hoa | Hạ Giới | Cực hiếm | Boss Nguyên Anh | Nguyên Anh | 300 | LS | 18 | Hạn chế |
| HERB-013 | Thọ Nguyên Quả | Hạ Giới | Cực hiếm | Kỳ ngộ | Thọ nguyên | 360 | LS | 18 | Hạn chế |
| HERB-014 | Ngũ Sắc Linh Chi | Hạ Giới | Cực hiếm | Sự kiện/bí cảnh | Tinh luyện linh căn | 420 | LS | 18 | Hạn chế |
| HERB-015 | Lôi Văn Quả | Hạ Giới | Hiếm | Lôi vực | Lôi hệ | 120 | LS | 8 | Hạn chế |
| HERB-016 | Phong Linh Hoa | Hạ Giới | Hiếm | Vách núi | Phong/SPD | 115 | LS | 8 | Hạn chế |
| HERB-017 | Tâm Tĩnh Trúc | Hạ Giới | Hiếm | Thanh Vân | Tâm ma | 110 | LS | 8 | Hạn chế |
| HERB-018 | Huyết Linh Sâm | Hạ Giới | Hiếm | Huyết Sát | Luyện thể | 125 | LS | 8 | Hạn chế |
| HERB-019 | Bách Dược Tâm | Hạ Giới | Hiếm | Vạn Dược | Đan đạo | 130 | LS | 8 | Hạn chế |
| HERB-020 | Giới Mạch Thảo | Hạ Giới | Cực hiếm | Giới bích | Phi thăng | 450 | LS | 18 | Hạn chế |
| HERB-021 | Cửu Diệp Chi | Hạ Giới | Hiếm | Cổ động | Tu vi cao cấp | 140 | LS | 8 | Hạn chế |
| HERB-022 | Thanh Hồn Quả | Hạ Giới | Hiếm | Mộ cổ | Thần thức | 135 | LS | 8 | Hạn chế |
| HERB-023 | Hỏa Tủy Liên | Hạ Giới | Hiếm | Dung nham | Hỏa/kháng | 145 | LS | 8 | Hạn chế |
| HERB-024 | Địa Mạch Sâm | Hạ Giới | Hiếm | Địa mạch | HP/DEF | 145 | LS | 8 | Hạn chế |
| HERB-025 | Tinh Huy Thảo | Linh Giới | Tốt | Tinh nguyên cốc | Thần thức | 5 | LT | 4 | Có |
| HERB-026 | Vạn Hồn Thảo | Linh Giới | Hiếm | Hồn vực | Thần hồn | 22 | LT | 8 | Hạn chế |
| HERB-027 | Huyền Chỉ Hoa | Linh Giới | Hiếm | Sát vực | Giảm sát khí | 24 | LT | 8 | Hạn chế |
| HERB-028 | Lưỡng Sinh Diệp | Linh Giới | Cực hiếm | Sinh tử cốc | Bảo mệnh | 95 | LT | 18 | Hạn chế |
| HERB-029 | Hư Không Lan | Linh Giới | Hiếm | Không gian liệt phùng | Không gian | 28 | LT | 8 | Hạn chế |
| HERB-030 | Pháp Tướng Quả | Linh Giới | Hiếm | Boss pháp tướng | Pháp tướng | 32 | LT | 8 | Hạn chế |
| HERB-031 | Thái Hư Chi | Linh Giới | Tốt | Thái Hư Kiếm Cung | Tu vi/kiếm | 10 | LT | 4 | Có |
| HERB-032 | Ma Tâm Liên | Linh Giới | Hiếm | Vô Tướng Ma Điện | Ma công | 27 | LT | 8 | Hạn chế |
| HERB-033 | Bách Thảo Tinh | Linh Giới | Tốt | Bách Thảo Thánh Viện | Luyện đan | 12 | LT | 4 | Có |
| HERB-034 | Thiên Cơ Hoa | Linh Giới | Hiếm | Thiên Cơ Các | Ngộ tính | 35 | LT | 8 | Hạn chế |
| HERB-035 | Tẩy Linh Quả | Linh Giới | Cực hiếm | Cổ bí cảnh | Linh căn | 120 | LT | 18 | Hạn chế |
| HERB-036 | Giới Tâm Liên | Linh Giới | Cực hiếm | Giới tâm | Phi thăng | 150 | LT | 18 | Hạn chế |
| HERB-037 | Không Minh Thảo | Linh Giới | Hiếm | Hư không | RES/không gian | 30 | LT | 8 | Hạn chế |
| HERB-038 | Hợp Nguyên Quả | Linh Giới | Hiếm | Hợp Thể bí cảnh | Hợp Thể | 40 | LT | 8 | Hạn chế |
| HERB-039 | Đại Thừa Kim Liên | Linh Giới | Cực hiếm | Đại Thừa boss | Đại Thừa | 130 | LT | 18 | Hạn chế |
| HERB-040 | Hồn Ngọc Lan | Linh Giới | Hiếm | Hồn trì | SPIRIT | 34 | LT | 8 | Hạn chế |
| HERB-041 | Tinh Không Diệp | Linh Giới | Tốt | Tinh không vực | ACC/EVA | 13 | LT | 4 | Có |
| HERB-042 | Sát Tâm Thảo | Linh Giới | Hiếm | Chiến trường cổ | Sát khí | 38 | LT | 8 | Hạn chế |
| HERB-043 | Ngũ Hành Linh Quả | Linh Giới | Cực hiếm | Ngũ hành bí cảnh | Affinity | 110 | LT | 18 | Hạn chế |
| HERB-044 | Hư Linh Mộc Tâm | Linh Giới | Hiếm | Hư Linh lâm | DEF | 36 | LT | 8 | Hạn chế |
| HERB-045 | Cửu Khúc Linh Sâm | Linh Giới | Cực hiếm | Cổ dược viên | Tu vi | 125 | LT | 18 | Hạn chế |
| HERB-046 | Vấn Tâm Hoa | Linh Giới | Hiếm | Tâm cảnh | Tâm ma | 42 | LT | 8 | Hạn chế |
| HERB-047 | Thiên Hồn Quả | Linh Giới | Cực hiếm | Hồn giới | Thần hồn | 140 | LT | 18 | Hạn chế |
| HERB-048 | Giới Kiếp Tử Liên | Linh Giới | Cực hiếm | Giới kiếp | Phi thăng Tiên Giới | 180 | LT | 18 | Hạn chế |
| HERB-049 | Vân Hạc Tiên Thảo | Tiên Giới | Tốt | Tiên dược viên | Tiên linh lực | 3 | TN | 4 | Có |
| HERB-050 | Thổ Tôn Quả | Tiên Giới | Hiếm | Thổ pháp vực | Thổ pháp tắc | 15 | TN | 8 | Hạn chế |
| HERB-051 | Đản Hồn Hoa | Tiên Giới | Hiếm | U Minh Cổ Điện | Linh hồn | 18 | TN | 8 | Hạn chế |
| HERB-052 | Cầu Long Thảo | Tiên Giới | Hiếm | Long mạch | Luyện thể | 16 | TN | 8 | Hạn chế |
| HERB-053 | Thiên Linh Trúc Diệp | Tiên Giới | Hiếm | Độc cốc | Độc/giải độc | 14 | TN | 8 | Hạn chế |
| HERB-054 | Cuồng Diễm Thảo | Tiên Giới | Hiếm | Hỏa pháp vực | Hỏa pháp tắc | 18 | TN | 8 | Hạn chế |
| HERB-055 | Tinh Huy Tiên Thảo | Tiên Giới | Hiếm | Tinh vực | Tinh thần | 16 | TN | 8 | Hạn chế |
| HERB-056 | Lộc Nhung Tiên Thảo | Tiên Giới | Tốt | Tiên lâm | Hồi phục | 5 | TN | 4 | Có |
| HERB-057 | Vạn Hồn Tiên Thảo | Tiên Giới | Cực hiếm | U Minh | Thần hồn | 75 | TN | 18 | Hạn chế |
| HERB-058 | Huyền Chỉ Tiên Hoa | Tiên Giới | Cực hiếm | Sát vực | Sát suy | 82 | TN | 18 | Hạn chế |
| HERB-059 | Lưỡng Sinh Tiên Quả | Tiên Giới | Cực hiếm | Sinh tử giới | Bảo mệnh/suy kiếp | 95 | TN | 18 | Hạn chế |
| HERB-060 | Kim Tu Thập Diệp | Tiên Giới | Hiếm | Dược viên | Trồng trọt | 20 | TN | 8 | Hạn chế |
| HERB-061 | Khổ Lạc Hoa | Tiên Giới | Cực hiếm | Khổ hải | Túc Sát Đan | 100 | TN | 18 | Hạn chế |
| HERB-062 | Huyền Chân Chi Tinh | Tiên Giới | Cực hiếm | Đại La di tích | Đại La | 130 | TN | 18 | Hạn chế |
| HERB-063 | U Thủy Tiên Liên | Tiên Giới | Cực hiếm | U thủy vực | Thủy pháp tắc | 115 | TN | 18 | Hạn chế |
| HERB-064 | Thời Sa Hoa | Tiên Giới | Cực hiếm | Thời gian khe nứt | Thời Gian | 150 | TN | 18 | Hạn chế |
| HERB-065 | Không Gian Bồ Đề | Tiên Giới | Cực hiếm | Không gian cổ điện | Không Gian | 150 | TN | 18 | Hạn chế |
| HERB-066 | Luân Hồi Quả | Tiên Giới | Đạo phẩm | U Minh cấm địa | Luân Hồi | 0 | TN | 0 | Không |
| HERB-067 | Đạo Tâm Liên | Tiên Giới | Cực hiếm | Vấn đạo đài | Tâm ma | 120 | TN | 18 | Hạn chế |
| HERB-068 | Tiên Khiếu Quả | Tiên Giới | Hiếm | Tiên khiếu bí cảnh | Tiên khiếu | 28 | TN | 8 | Hạn chế |
| HERB-069 | Kim Hồn Tiên Quả | Tiên Giới | Cực hiếm | Kim Tiên boss | Kim Tiên | 90 | TN | 18 | Hạn chế |
| HERB-070 | Thái Ất Ngọc Chi | Tiên Giới | Cực hiếm | Thái Ất bí cảnh | Thái Ất | 120 | TN | 18 | Hạn chế |
| HERB-071 | Đại Đạo Hoa | Tiên Giới | Đạo phẩm | Endgame | Pháp tắc cao cấp | 0 | TN | 0 | Không |
| HERB-072 | Quy Hương Bạch Liên | Tiên Giới | Đạo phẩm | Đài Quy Hương | Cốt truyện | 0 | TN | 0 | Không |

## 7. Đan dược
| ID | Tên | Map | Cảnh giới | Hiệu quả | Giá | Tiền | Nguyên liệu | Giới hạn | Shop |
|---|---|---|---|---|---|---|---|---|---|
| PILL-001 | Hồi Huyết Đan | Hạ Giới | Phàm | Hồi 60% HP | 15 | LS | Huyết Diệp Hoa + Thanh Linh Thảo | Không giới hạn shop; CD combat | Có/Hạn chế |
| PILL-002 | Tụ Khí Đan | Hạ Giới | Phàm | +6% tiến độ tầng | 20 | LS | Thanh Linh Thảo + Ngưng Lộ Thảo | 5/ngày | Có/Hạn chế |
| PILL-003 | Phá Cảnh Đan | Hạ Giới | Luyện Khí | +12 điểm % lần đột phá kế | 90 | LS | Trúc Cơ Quả + Tâm Tĩnh Trúc | 2/đại cảnh | Có/Hạn chế |
| PILL-004 | Trường Thọ Đan | Hạ Giới | Luyện Khí | +6 năm thọ nguyên quy đổi | 160 | LS | Thọ Nguyên Quả + Cửu Diệp Chi | 1/đại cảnh | Có/Hạn chế |
| PILL-005 | Ngưng Nguyên Đan | Hạ Giới | Trúc Cơ | +5% tiến độ tầng | 140 | LS | Trúc Cơ Quả + Kim Tuyến Thảo | 4/ngày | Có/Hạn chế |
| PILL-006 | Đại Hồi Đan | Hạ Giới | Trúc Cơ | Hồi đầy HP ngoài PvP | 70 | LS | Huyết Diệp Hoa + Địa Mạch Sâm | 5/ngày | Có/Hạn chế |
| PILL-007 | Dịch Cân Đan | Hạ Giới | Kim Đan | +1 chỉ số gốc ngẫu nhiên trong cap +40 | 420 | LS | Huyết Linh Sâm + Ngũ Sắc Linh Chi | 1/kiếp Hạ Giới | Có/Hạn chế |
| PILL-008 | Kim Đan Cố Nguyên | Hạ Giới | Kim Đan | Giảm 30% tổn thất đột phá thất bại | 520 | LS | Kim Dương Chi + Địa Mạch Sâm | 2/đại cảnh | Có/Hạn chế |
| PILL-009 | Hóa Anh Đan | Hạ Giới | Nguyên Anh | +4.5% tiến độ tầng | 650 | LS | Hóa Anh Hoa + Thanh Hồn Quả | 3/ngày | Có/Hạn chế |
| PILL-010 | Dưỡng Hồn Đan | Hạ Giới | Nguyên Anh | +15% SPIRIT trong 2 giờ | 720 | LS | Âm Nguyệt Liên + Thanh Hồn Quả | 2/ngày | Có/Hạn chế |
| PILL-011 | Tục Mệnh Đan | Hạ Giới | Nguyên Anh | +12 năm thọ nguyên quy đổi | 800 | LS | Thọ Nguyên Quả + Hóa Anh Hoa | 1/đại cảnh | Có/Hạn chế |
| PILL-012 | Thiên Cơ Đan | Hạ Giới | Hóa Thần | +20 điểm % đột phá | 1600 | LS | Ngũ Sắc Linh Chi + Tâm Tĩnh Trúc | 1/đại cảnh | Có/Hạn chế |
| PILL-013 | Thái Hư Đan | Hạ Giới | Hóa Thần | +4% tiến độ tầng | 3200 | LS | Giới Mạch Thảo + Cửu Diệp Chi | 2/ngày | Có/Hạn chế |
| PILL-014 | Tạo Hóa Dịch | Hạ Giới | Hóa Thần | +1 chỉ số gốc ngẫu nhiên trong cap +40 | 5200 | LS | Ngũ Sắc Linh Chi + Bách Dược Tâm | 1/kiếp | Có/Hạn chế |
| PILL-015 | Độ Kiếp Đan | Hạ Giới | Hóa Thần | +25 điểm % phi thăng Linh Giới | 9000 | LS | Giới Mạch Thảo + Lôi Văn Quả | 1/lần phi thăng | Có/Hạn chế |
| PILL-016 | Tĩnh Tâm Đan | Hạ Giới | Trúc Cơ+ | Giảm 35% tác động tâm ma 1 lần | 300 | LS | Tâm Tĩnh Trúc + Âm Nguyệt Liên | 3/tuần | Có/Hạn chế |
| PILL-017 | Cường Cốt Đan | Hạ Giới | Trúc Cơ+ | +8% HP trong 4 giờ | 260 | LS | Địa Mạch Sâm + Huyết Linh Sâm | 2/ngày | Có/Hạn chế |
| PILL-018 | Phong Hành Đan | Hạ Giới | Kim Đan+ | +8% SPD trong 2 giờ | 480 | LS | Phong Linh Hoa + Ngưng Lộ Thảo | 2/ngày | Có/Hạn chế |
| PILL-019 | Lôi Dương Đan | Hạ Giới | Kim Đan+ | +10% PEN trong 2 giờ | 520 | LS | Lôi Văn Quả + Xích Dương Hoa | 2/ngày | Có/Hạn chế |
| PILL-020 | Vạn Dược Linh Đan | Hạ Giới | Nguyên Anh+ | +10% hiệu quả đan khác trong 1 giờ | 1100 | LS | Bách Dược Tâm + Cửu Diệp Chi | 1/ngày | Có/Hạn chế |
| PILL-021 | Luyện Hư Đan | Linh Giới | Luyện Hư | +5% tiến độ tầng | 25 | LT | Thái Hư Chi + Tinh Huy Thảo | 4/ngày | Có/Hạn chế |
| PILL-022 | Hợp Nguyên Đan | Linh Giới | Hợp Thể | +8% hiệu suất pháp tướng 2 giờ | 60 | LT | Hợp Nguyên Quả + Pháp Tướng Quả | 2/ngày | Có/Hạn chế |
| PILL-023 | Dưỡng Thần Đan | Linh Giới | Luyện Hư | +18% SPIRIT 2 giờ | 40 | LT | Vạn Hồn Thảo + Hồn Ngọc Lan | 2/ngày | Có/Hạn chế |
| PILL-024 | Phá Hư Đan | Linh Giới | Luyện Hư | +15 điểm % đột phá | 180 | LT | Hư Không Lan + Không Minh Thảo | 2/đại cảnh | Có/Hạn chế |
| PILL-025 | Pháp Tướng Đan | Linh Giới | Hợp Thể | Tăng 1 cấp hiệu dụng pháp tướng cho 1 trận | 120 | LT | Pháp Tướng Quả + Bách Thảo Tinh | 2/tuần | Có/Hạn chế |
| PILL-026 | Đại Thừa Đan | Linh Giới | Đại Thừa | +18 điểm % đại đột phá | 420 | LT | Đại Thừa Kim Liên + Cửu Khúc Linh Sâm | 1/đại cảnh | Có/Hạn chế |
| PILL-027 | Giới Kiếp Đan | Linh Giới | Độ Kiếp | +20 điểm % phi thăng Tiên Giới | 1200 | LT | Giới Kiếp Tử Liên + Giới Tâm Liên | 1/lần | Có/Hạn chế |
| PILL-028 | Tẩy Linh Dịch | Linh Giới | Luyện Hư+ | Tái phân phối 5–10 điểm purity | 800 | LT | Tẩy Linh Quả + Ngũ Hành Linh Quả | 2/map | Có/Hạn chế |
| PILL-029 | Vấn Tâm Đan | Linh Giới | Hợp Thể+ | Pity tâm ma +1 bậc | 220 | LT | Vấn Tâm Hoa + Thiên Cơ Hoa | 1/tuần | Có/Hạn chế |
| PILL-030 | Sát Khí Tán | Linh Giới | Đại Thừa | Giảm 25% sát khí 1 giờ | 180 | LT | Sát Tâm Thảo + Huyền Chỉ Hoa | 2/ngày | Có/Hạn chế |
| PILL-031 | Hư Linh Hộ Mạch | Linh Giới | Luyện Hư+ | Giảm 20% damage không gian 2 giờ | 160 | LT | Hư Linh Mộc Tâm + Không Minh Thảo | 2/ngày | Có/Hạn chế |
| PILL-032 | Thiên Hồn Đan | Linh Giới | Đại Thừa | +10% thần hồn vĩnh viễn trong cap | 650 | LT | Thiên Hồn Quả + Vạn Hồn Thảo | 1/map | Có/Hạn chế |
| PILL-033 | Tinh Không Đan | Linh Giới | Hợp Thể+ | +10% ACC/EVA 2 giờ | 95 | LT | Tinh Không Diệp + Hư Không Lan | 2/ngày | Có/Hạn chế |
| PILL-034 | Ngũ Hành Dung Linh | Linh Giới | Hợp Thể+ | Mở thử nghiệm biến dị linh căn | 980 | LT | Ngũ Hành Linh Quả + Tẩy Linh Quả | 1/map | Có/Hạn chế |
| PILL-035 | Lưỡng Sinh Đan | Linh Giới | Đại Thừa | Sống sót 1 lần ở 1 HP trong PvE | 880 | LT | Lưỡng Sinh Diệp + Vấn Tâm Hoa | 1/tuần | Có/Hạn chế |
| PILL-036 | Cửu Khúc Linh Đan | Linh Giới | Đại Thừa | +8% tiến độ tầng | 240 | LT | Cửu Khúc Linh Sâm + Bách Thảo Tinh | 3/ngày | Có/Hạn chế |
| PILL-037 | Ma Tâm Phá Chướng | Linh Giới | Hợp Thể+ | +12% ATK, -8% RES trong 2 giờ | 110 | LT | Ma Tâm Liên + Sát Tâm Thảo | 2/ngày | Có/Hạn chế |
| PILL-038 | Thái Hư Kiếm Đan | Linh Giới | Hợp Thể+ | +12% kiếm kỹ trong 2 giờ | 130 | LT | Thái Hư Chi + Tinh Không Diệp | 2/ngày | Có/Hạn chế |
| PILL-039 | Bách Thảo Hồi Thiên | Linh Giới | Luyện Hư+ | Hồi đầy HP + xóa 1 debuff PvE | 75 | LT | Bách Thảo Tinh + Lưỡng Sinh Diệp | 3/ngày | Có/Hạn chế |
| PILL-040 | Thiên Cơ Minh Tâm | Linh Giới | Đại Thừa | +15% Ngộ Tính hiệu dụng 1 giờ | 300 | LT | Thiên Cơ Hoa + Vấn Tâm Hoa | 1/ngày | Có/Hạn chế |
| PILL-041 | Xuân Lâm Tiên Đan | Tiên Giới | Chân Tiên | +4% tiến độ tầng | 8 | TN | Vân Hạc Tiên Thảo + Lộc Nhung Tiên Thảo | 5/ngày | Có/Hạn chế |
| PILL-042 | Thống Nguyên Tiên Đan | Tiên Giới | Chân Tiên | +12% tiên linh lực 2 giờ | 10 | TN | Tiên Khiếu Quả + Vân Hạc Tiên Thảo | 3/ngày | Có/Hạn chế |
| PILL-043 | Vạn Luân Đan | Tiên Giới | Chân Tiên hậu kỳ | +10% tiến độ tầng | 30 | TN | Thời Sa Hoa + Tiên Khiếu Quả | 2/ngày | Có/Hạn chế |
| PILL-044 | Kim Hồn Đan | Tiên Giới | Chân Tiên | +18 điểm % lên Kim Tiên | 120 | TN | Kim Hồn Tiên Quả + Vạn Hồn Tiên Thảo | 1/đại cảnh | Có/Hạn chế |
| PILL-045 | Túc Sát Đan | Tiên Giới | Kim Tiên | Giảm 40% tác hại Sát Suy | 160 | TN | Khổ Lạc Hoa + Huyền Chỉ Tiên Hoa | 2/suy kiếp | Có/Hạn chế |
| PILL-046 | Thái Ất Đan | Tiên Giới | Kim Tiên | +15 điểm % lên Thái Ất | 300 | TN | Thái Ất Ngọc Chi + Lưỡng Sinh Tiên Quả | 1/đại cảnh | Có/Hạn chế |
| PILL-047 | Ngọc Thanh Đan | Tiên Giới | Thái Ất | +4% tiến độ tầng | 45 | TN | Thái Ất Ngọc Chi + Vân Hạc Tiên Thảo | 4/ngày | Có/Hạn chế |
| PILL-048 | Đạo Tâm Đan | Tiên Giới | Thái Ất | Chặn 1 lần tâm ma/suy kiếp | 0 | TN | Đạo Tâm Liên + Đại Đạo Hoa | Quest/Boss | Không |
| PILL-049 | Thời Gian Đạo Đan | Tiên Giới | Endgame | Cộng hưởng Thời Gian tạm; không bán | 0 | TN | Thời Sa Hoa + Đại Đạo Hoa | Unique | Không |
| PILL-050 | Không Gian Đạo Đan | Tiên Giới | Endgame | Cộng hưởng Không Gian tạm; không bán | 0 | TN | Không Gian Bồ Đề + Đại Đạo Hoa | Unique | Không |
| PILL-051 | Luân Hồi Đạo Đan | Tiên Giới | Endgame | Bảo lưu 1 buff xuyên kiếp giới hạn | 0 | TN | Luân Hồi Quả + Đại Đạo Hoa | Unique | Không |
| PILL-052 | Tiên Khiếu Đan | Tiên Giới | Chân Tiên | +1 điểm tiến độ tiên khiếu | 18 | TN | Tiên Khiếu Quả + Kim Tu Thập Diệp | 3/ngày | Có/Hạn chế |
| PILL-053 | Ngũ Suy Hộ Mệnh | Tiên Giới | Kim Tiên+ | Giảm 20% tác hại Ngũ Suy | 90 | TN | Lưỡng Sinh Tiên Quả + Đạo Tâm Liên | 1/ngày | Có/Hạn chế |
| PILL-054 | Huyền Chân Đan | Tiên Giới | Thái Ất | +10% tiến độ chuẩn bị Đại La | 220 | TN | Huyền Chân Chi Tinh + Đại Đạo Hoa | 1/tuần | Có/Hạn chế |
| PILL-055 | U Thủy Tiên Đan | Tiên Giới | Kim Tiên+ | +15% Thủy pháp 2 giờ | 70 | TN | U Thủy Tiên Liên + Thổ Tôn Quả | 2/ngày | Có/Hạn chế |
| PILL-056 | Cuồng Diễm Tiên Đan | Tiên Giới | Kim Tiên+ | +15% Hỏa pháp 2 giờ | 70 | TN | Cuồng Diễm Thảo + Đạo Tâm Liên | 2/ngày | Có/Hạn chế |
| PILL-057 | Cầu Long Luyện Thể Đan | Tiên Giới | Chân Tiên+ | +12% HP/DEF 2 giờ | 55 | TN | Cầu Long Thảo + Lộc Nhung Tiên Thảo | 2/ngày | Có/Hạn chế |
| PILL-058 | Đản Hồn Tiên Đan | Tiên Giới | Kim Tiên+ | +15% SPIRIT 2 giờ | 65 | TN | Đản Hồn Hoa + Vạn Hồn Tiên Thảo | 2/ngày | Có/Hạn chế |
| PILL-059 | Vô Trần Giải Độc Đan | Tiên Giới | Chân Tiên+ | Xóa độc +30% độc RES 2 giờ | 20 | TN | Thiên Linh Trúc Diệp + Kim Tu Thập Diệp | 3/ngày | Có/Hạn chế |
| PILL-060 | Quy Hương Tĩnh Tâm | Tiên Giới | Endgame | Khóa lựa chọn Quy Phàm 24h để xác nhận; không bán | 0 | TN | Quy Hương Bạch Liên + Đạo Tâm Liên | Cốt truyện | Không |

## 8. Nguyên liệu
| ID | Tên | Map | Phẩm | Công dụng | Giá trị | Tiền | Nguồn | Giao dịch |
|---|---|---|---|---|---|---|---|---|
| MAT-001 | Hạt Linh Thảo | Hạ Giới | Phổ thông | Trồng linh dược | 5 | LS | Linh điền | Có |
| MAT-002 | Quặng Linh Thiết | Hạ Giới | Phổ thông | Luyện khí | 12 | LS | Mỏ/quái | Có |
| MAT-003 | Giấy Phù | Hạ Giới | Phổ thông | Vẽ phù | 4 | LS | Shop/craft | Có |
| MAT-004 | Yêu Đan | Hạ Giới | Tốt | Pháp bảo/đan | 30 | LS | Yêu thú | Có |
| MAT-005 | Kiếm Phôi Thanh Vân | Hạ Giới | Tốt | Rèn kiếm | 45 | LS | Thanh Vân | Có |
| MAT-006 | Huyết Tinh | Hạ Giới | Tốt | Luyện thể/ma công | 40 | LS | Huyết Sát | Có |
| MAT-007 | Vạn Dược Lệnh | Hạ Giới | Hiếm | Đổi đan phương | 80 | LS | Vạn Dược | Hạn chế |
| MAT-008 | Giới Thạch | Hạ Giới | Hiếm | Phi thăng | 120 | LS | Bí cảnh giới bích | Hạn chế |
| MAT-009 | Lôi Tinh | Hạ Giới | Tốt | Lôi pháp | 35 | LS | Lôi vực | Có |
| MAT-010 | Hỏa Tủy | Hạ Giới | Tốt | Hỏa/luyện khí | 35 | LS | Hỏa sơn | Có |
| MAT-011 | Hàn Tinh | Hạ Giới | Tốt | Băng/thủy | 35 | LS | Hàn vực | Có |
| MAT-012 | Phong Thạch | Hạ Giới | Tốt | Phong/thân pháp | 35 | LS | Phong cốc | Có |
| MAT-013 | Ngũ Hành Tinh Bột | Hạ Giới | Hiếm | Affinity/craft | 75 | LS | Ngũ hành bí cảnh | Hạn chế |
| MAT-014 | Linh Mộc | Hạ Giới | Phổ thông | Craft | 15 | LS | Cổ lâm | Có |
| MAT-015 | Yêu Cốt | Hạ Giới | Phổ thông | Craft | 15 | LS | Yêu thú | Có |
| MAT-016 | Yêu Bì | Hạ Giới | Phổ thông | Craft | 12 | LS | Yêu thú | Có |
| MAT-017 | Tinh Huyết | Hạ Giới | Hiếm | Luyện thể | 90 | LS | Tinh anh/boss | Hạn chế |
| MAT-018 | Trận Kỳ Phôi | Hạ Giới | Tốt | Trận pháp | 30 | LS | Craft/shop | Có |
| MAT-019 | Hư Không Tinh Sa | Linh Giới | Tốt | Không gian/trận pháp | 4 | LT | Không gian liệt phùng | Có |
| MAT-020 | Pháp Tướng Linh Tủy | Linh Giới | Hiếm | Nâng pháp tướng | 18 | LT | Boss pháp tướng | Hạn chế |
| MAT-021 | Vạn Hồn Tinh | Linh Giới | Hiếm | Thần thức | 16 | LT | Hồn vực | Hạn chế |
| MAT-022 | Giới Tâm Thạch | Linh Giới | Cực hiếm | Phi thăng | 80 | LT | Giới tâm | Hạn chế |
| MAT-023 | Cổ Trận Tàn Văn | Linh Giới | Hiếm | Trận pháp/lore | 20 | LT | Di tích | Hạn chế |
| MAT-024 | Linh Bảo Phôi | Linh Giới | Hiếm | Rèn Linh Bảo | 28 | LT | Boss/craft | Hạn chế |
| MAT-025 | Tinh Không Thiết | Linh Giới | Tốt | Craft | 8 | LT | Tinh không vực | Có |
| MAT-026 | Hư Linh Mộc | Linh Giới | Tốt | Craft | 8 | LT | Hư linh lâm | Có |
| MAT-027 | Ma Tinh | Linh Giới | Tốt | Ma công | 10 | LT | Ma điện | Có |
| MAT-028 | Kiếm Ý Tinh | Linh Giới | Tốt | Kiếm đạo | 10 | LT | Kiếm cung | Có |
| MAT-029 | Thiên Cơ Đồng | Linh Giới | Tốt | Trận pháp | 9 | LT | Thiên Cơ Các | Có |
| MAT-030 | Hồn Sa | Linh Giới | Tốt | Thần hồn | 9 | LT | Hồn trì | Có |
| MAT-031 | Sát Tinh | Linh Giới | Hiếm | Sát khí | 18 | LT | Chiến trường cổ | Hạn chế |
| MAT-032 | Ngũ Hành Linh Tủy | Linh Giới | Hiếm | Affinity | 22 | LT | Ngũ hành bí cảnh | Hạn chế |
| MAT-033 | Giới Lực Kết Tinh | Linh Giới | Cực hiếm | Phi thăng | 75 | LT | Giới kiếp | Hạn chế |
| MAT-034 | Pháp Tướng Mảnh | Linh Giới | Hiếm | Pháp tướng | 15 | LT | Tinh anh | Hạn chế |
| MAT-035 | Linh Văn Mực | Linh Giới | Tốt | Phù/trận | 7 | LT | Craft | Có |
| MAT-036 | Cổ Giới Thạch | Linh Giới | Cực hiếm | Mở bí cảnh cao cấp | 60 | LT | Cổ bí cảnh | Hạn chế |
| MAT-037 | Tiên Linh Ngọc Tủy | Tiên Giới | Tốt | Tiên linh lực | 3 | TN | Tiên mạch | Có |
| MAT-038 | Pháp Tắc Tinh Sa | Tiên Giới | Hiếm | Pháp tắc | 14 | TN | Pháp tắc vực | Hạn chế |
| MAT-039 | Đại Đạo Tàn Phiến | Tiên Giới | Cực hiếm | Đại đạo skill tree | 60 | TN | Boss/endgame | Hạn chế |
| MAT-040 | Tiên Khí Phôi | Tiên Giới | Hiếm | Rèn Tiên Khí | 20 | TN | Boss/craft | Hạn chế |
| MAT-041 | Suy Kiếp Chi Tức | Tiên Giới | Hiếm | Đan chống suy | 16 | TN | Suy kiếp | Hạn chế |
| MAT-042 | Đạo Văn | Tiên Giới | Hiếm | Khắc trang bị | 18 | TN | Đạo viện | Hạn chế |
| MAT-043 | Tiên Kim | Tiên Giới | Tốt | Craft | 6 | TN | Tiên khoáng | Có |
| MAT-044 | Hư Không Tiên Tinh | Tiên Giới | Hiếm | Không gian | 18 | TN | Không gian vực | Hạn chế |
| MAT-045 | Thời Sa | Tiên Giới | Cực hiếm | Thời Gian | 65 | TN | Thời gian khe nứt | Hạn chế |
| MAT-046 | Luân Hồi Tinh | Tiên Giới | Cực hiếm | Luân Hồi | 65 | TN | U Minh | Hạn chế |
| MAT-047 | Linh Hồn Ngọc | Tiên Giới | Hiếm | Thần hồn | 18 | TN | U Minh | Hạn chế |
| MAT-048 | Thiên Lôi Tinh | Tiên Giới | Hiếm | Lôi pháp | 18 | TN | Lôi kiếp | Hạn chế |
| MAT-049 | Ngũ Hành Đạo Tinh | Tiên Giới | Hiếm | Ngũ hành | 20 | TN | Ngũ hành tiên vực | Hạn chế |
| MAT-050 | Linh Vực Tinh Hạch | Tiên Giới | Cực hiếm | Nâng Linh Vực | 55 | TN | Boss Linh Vực | Hạn chế |
| MAT-051 | Tiên Khiếu Ngọc | Tiên Giới | Hiếm | Tiên khiếu | 16 | TN | Tiên khiếu bí cảnh | Hạn chế |
| MAT-052 | Đạo Tâm Mảnh | Tiên Giới | Cực hiếm | Tâm ma | 50 | TN | Vấn đạo đài | Hạn chế |
| MAT-053 | Đại La Kim Sa | Tiên Giới | Cực hiếm | Đại La | 80 | TN | Đại La di tích | Hạn chế |
| MAT-054 | Quy Hương Tinh Trần | Tiên Giới | Đạo phẩm | Cốt truyện | 0 | TN | Đài Quy Hương | Không |

## 9. Trang bị/pháp bảo
| ID | Tên | Map | Phẩm | Slot | Tier | Hiệu ứng | Focus | Giá | Tiền | Nguồn |
|---|---|---|---|---|---|---|---|---|---|---|
| EQ-001 | Thanh Vân Vũ khí I | Hạ Giới | Phàm | Vũ khí | 1 | ATK +6%, PEN +1% | ATK/PEN | 80 | LS | Shop/Craft/Drop |
| EQ-002 | Huyết Sát Pháp bào I | Hạ Giới | Phàm | Pháp bào | 1 | HP +7%, DEF +4% | HP/DEF | 80 | LS | Shop/Craft/Drop |
| EQ-003 | Vạn Dược Giày I | Hạ Giới | Phàm | Giày | 1 | SPD +2%, EVA +1% | SPD/EVA | 80 | LS | Shop/Craft/Drop |
| EQ-004 | Ngũ Hành Hộ phù I | Hạ Giới | Phàm | Hộ phù | 1 | RES +4%, SPIRIT +6% | RES/SPIRIT | 80 | LS | Shop/Craft/Drop |
| EQ-005 | Thanh Vân Pháp giới I | Hạ Giới | Phàm | Pháp giới | 1 | Kho +6, tu luyện +2% | Kho/tu luyện | 80 | LS | Shop/Craft/Drop |
| EQ-006 | Huyết Sát Pháp bảo chính I | Hạ Giới | Phàm | Pháp bảo chính | 1 | Kỹ năng chủ động tier 1 | Active | 80 | LS | Shop/Craft/Drop |
| EQ-007 | Vạn Dược Pháp bảo phụ I | Hạ Giới | Phàm | Pháp bảo phụ | 1 | Passive hiệu quả +4% | Passive | 80 | LS | Shop/Craft/Drop |
| EQ-008 | Huyết Sát Vũ khí II | Hạ Giới | Hạ phẩm | Vũ khí | 2 | ATK +8%, PEN +2% | ATK/PEN | 114 | LS | Shop/Craft/Drop |
| EQ-009 | Vạn Dược Pháp bào II | Hạ Giới | Hạ phẩm | Pháp bào | 2 | HP +9%, DEF +5% | HP/DEF | 114 | LS | Shop/Craft/Drop |
| EQ-010 | Ngũ Hành Giày II | Hạ Giới | Hạ phẩm | Giày | 2 | SPD +3%, EVA +1% | SPD/EVA | 114 | LS | Shop/Craft/Drop |
| EQ-011 | Thanh Vân Hộ phù II | Hạ Giới | Hạ phẩm | Hộ phù | 2 | RES +5%, SPIRIT +8% | RES/SPIRIT | 114 | LS | Shop/Craft/Drop |
| EQ-012 | Huyết Sát Pháp giới II | Hạ Giới | Hạ phẩm | Pháp giới | 2 | Kho +7, tu luyện +3% | Kho/tu luyện | 114 | LS | Shop/Craft/Drop |
| EQ-013 | Vạn Dược Pháp bảo chính II | Hạ Giới | Hạ phẩm | Pháp bảo chính | 2 | Kỹ năng chủ động tier 2 | Active | 114 | LS | Shop/Craft/Drop |
| EQ-014 | Ngũ Hành Pháp bảo phụ II | Hạ Giới | Hạ phẩm | Pháp bảo phụ | 2 | Passive hiệu quả +5% | Passive | 114 | LS | Shop/Craft/Drop |
| EQ-015 | Vạn Dược Vũ khí III | Hạ Giới | Trung phẩm | Vũ khí | 3 | ATK +10%, PEN +2% | ATK/PEN | 161 | LS | Shop/Craft/Drop |
| EQ-016 | Ngũ Hành Pháp bào III | Hạ Giới | Trung phẩm | Pháp bào | 3 | HP +11%, DEF +6% | HP/DEF | 161 | LS | Shop/Craft/Drop |
| EQ-017 | Thanh Vân Giày III | Hạ Giới | Trung phẩm | Giày | 3 | SPD +3%, EVA +2% | SPD/EVA | 161 | LS | Shop/Craft/Drop |
| EQ-018 | Huyết Sát Hộ phù III | Hạ Giới | Trung phẩm | Hộ phù | 3 | RES +6%, SPIRIT +10% | RES/SPIRIT | 161 | LS | Shop/Craft/Drop |
| EQ-019 | Vạn Dược Pháp giới III | Hạ Giới | Trung phẩm | Pháp giới | 3 | Kho +8, tu luyện +4% | Kho/tu luyện | 161 | LS | Shop/Craft/Drop |
| EQ-020 | Ngũ Hành Pháp bảo chính III | Hạ Giới | Trung phẩm | Pháp bảo chính | 3 | Kỹ năng chủ động tier 3 | Active | 161 | LS | Shop/Craft/Drop |
| EQ-021 | Thanh Vân Pháp bảo phụ III | Hạ Giới | Trung phẩm | Pháp bảo phụ | 3 | Passive hiệu quả +6% | Passive | 161 | LS | Shop/Craft/Drop |
| EQ-022 | Ngũ Hành Vũ khí IV | Hạ Giới | Thượng phẩm | Vũ khí | 4 | ATK +12%, PEN +3% | ATK/PEN | 229 | LS | Shop/Craft/Drop |
| EQ-023 | Thanh Vân Pháp bào IV | Hạ Giới | Thượng phẩm | Pháp bào | 4 | HP +13%, DEF +7% | HP/DEF | 229 | LS | Shop/Craft/Drop |
| EQ-024 | Huyết Sát Giày IV | Hạ Giới | Thượng phẩm | Giày | 4 | SPD +4%, EVA +2% | SPD/EVA | 229 | LS | Shop/Craft/Drop |
| EQ-025 | Vạn Dược Hộ phù IV | Hạ Giới | Thượng phẩm | Hộ phù | 4 | RES +7%, SPIRIT +12% | RES/SPIRIT | 229 | LS | Shop/Craft/Drop |
| EQ-026 | Ngũ Hành Pháp giới IV | Hạ Giới | Thượng phẩm | Pháp giới | 4 | Kho +9, tu luyện +5% | Kho/tu luyện | 229 | LS | Shop/Craft/Drop |
| EQ-027 | Thanh Vân Pháp bảo chính IV | Hạ Giới | Thượng phẩm | Pháp bảo chính | 4 | Kỹ năng chủ động tier 4 | Active | 229 | LS | Shop/Craft/Drop |
| EQ-028 | Huyết Sát Pháp bảo phụ IV | Hạ Giới | Thượng phẩm | Pháp bảo phụ | 4 | Passive hiệu quả +7% | Passive | 229 | LS | Shop/Craft/Drop |
| EQ-029 | Thái Hư Vũ khí I | Linh Giới | Thượng phẩm | Vũ khí | 5 | ATK +14%, PEN +3% | ATK/PEN | 488 | LT | Shop/Craft/Drop |
| EQ-030 | Vô Tướng Pháp bào I | Linh Giới | Thượng phẩm | Pháp bào | 5 | HP +15%, DEF +8% | HP/DEF | 488 | LT | Shop/Craft/Drop |
| EQ-031 | Thiên Cơ Giày I | Linh Giới | Thượng phẩm | Giày | 5 | SPD +4%, EVA +2% | SPD/EVA | 488 | LT | Shop/Craft/Drop |
| EQ-032 | Tinh Không Hộ phù I | Linh Giới | Thượng phẩm | Hộ phù | 5 | RES +8%, SPIRIT +14% | RES/SPIRIT | 488 | LT | Shop/Craft/Drop |
| EQ-033 | Thái Hư Pháp giới I | Linh Giới | Thượng phẩm | Pháp giới | 5 | Kho +10, tu luyện +6% | Kho/tu luyện | 488 | LT | Shop/Craft/Drop |
| EQ-034 | Vô Tướng Pháp bảo chính I | Linh Giới | Thượng phẩm | Pháp bảo chính | 5 | Kỹ năng chủ động tier 5 | Active | 488 | LT | Shop/Craft/Drop |
| EQ-035 | Thiên Cơ Pháp bảo phụ I | Linh Giới | Thượng phẩm | Pháp bảo phụ | 5 | Passive hiệu quả +8% | Passive | 488 | LT | Shop/Craft/Drop |
| EQ-036 | Vô Tướng Vũ khí II | Linh Giới | Cực phẩm | Vũ khí | 6 | ATK +16%, PEN +4% | ATK/PEN | 693 | LT | Shop/Craft/Drop |
| EQ-037 | Thiên Cơ Pháp bào II | Linh Giới | Cực phẩm | Pháp bào | 6 | HP +17%, DEF +9% | HP/DEF | 693 | LT | Shop/Craft/Drop |
| EQ-038 | Tinh Không Giày II | Linh Giới | Cực phẩm | Giày | 6 | SPD +5%, EVA +3% | SPD/EVA | 693 | LT | Shop/Craft/Drop |
| EQ-039 | Thái Hư Hộ phù II | Linh Giới | Cực phẩm | Hộ phù | 6 | RES +9%, SPIRIT +16% | RES/SPIRIT | 693 | LT | Shop/Craft/Drop |
| EQ-040 | Vô Tướng Pháp giới II | Linh Giới | Cực phẩm | Pháp giới | 6 | Kho +11, tu luyện +7% | Kho/tu luyện | 693 | LT | Shop/Craft/Drop |
| EQ-041 | Thiên Cơ Pháp bảo chính II | Linh Giới | Cực phẩm | Pháp bảo chính | 6 | Kỹ năng chủ động tier 6 | Active | 693 | LT | Shop/Craft/Drop |
| EQ-042 | Tinh Không Pháp bảo phụ II | Linh Giới | Cực phẩm | Pháp bảo phụ | 6 | Passive hiệu quả +9% | Passive | 693 | LT | Shop/Craft/Drop |
| EQ-043 | Thiên Cơ Vũ khí III | Linh Giới | Linh bảo | Vũ khí | 7 | ATK +18%, PEN +4% | ATK/PEN | 984 | LT | Boss/Craft |
| EQ-044 | Tinh Không Pháp bào III | Linh Giới | Linh bảo | Pháp bào | 7 | HP +19%, DEF +10% | HP/DEF | 984 | LT | Boss/Craft |
| EQ-045 | Thái Hư Giày III | Linh Giới | Linh bảo | Giày | 7 | SPD +5%, EVA +3% | SPD/EVA | 984 | LT | Boss/Craft |
| EQ-046 | Vô Tướng Hộ phù III | Linh Giới | Linh bảo | Hộ phù | 7 | RES +10%, SPIRIT +18% | RES/SPIRIT | 984 | LT | Boss/Craft |
| EQ-047 | Thiên Cơ Pháp giới III | Linh Giới | Linh bảo | Pháp giới | 7 | Kho +12, tu luyện +8% | Kho/tu luyện | 984 | LT | Boss/Craft |
| EQ-048 | Tinh Không Pháp bảo chính III | Linh Giới | Linh bảo | Pháp bảo chính | 7 | Kỹ năng chủ động tier 7 | Active | 984 | LT | Boss/Craft |
| EQ-049 | Thái Hư Pháp bảo phụ III | Linh Giới | Linh bảo | Pháp bảo phụ | 7 | Passive hiệu quả +10% | Passive | 984 | LT | Boss/Craft |
| EQ-050 | Cửu Tiêu Vũ khí I | Tiên Giới | Cực phẩm | Vũ khí | 8 | ATK +20%, PEN +5% | ATK/PEN | 1746 | TN | Shop/Craft/Drop |
| EQ-051 | Vạn Pháp Pháp bào I | Tiên Giới | Cực phẩm | Pháp bào | 8 | HP +21%, DEF +11% | HP/DEF | 1746 | TN | Shop/Craft/Drop |
| EQ-052 | U Minh Giày I | Tiên Giới | Cực phẩm | Giày | 8 | SPD +6%, EVA +3% | SPD/EVA | 1746 | TN | Shop/Craft/Drop |
| EQ-053 | Quy Hương Hộ phù I | Tiên Giới | Cực phẩm | Hộ phù | 8 | RES +11%, SPIRIT +20% | RES/SPIRIT | 1746 | TN | Shop/Craft/Drop |
| EQ-054 | Cửu Tiêu Pháp giới I | Tiên Giới | Cực phẩm | Pháp giới | 8 | Kho +13, tu luyện +9% | Kho/tu luyện | 1746 | TN | Shop/Craft/Drop |
| EQ-055 | Vạn Pháp Pháp bảo chính I | Tiên Giới | Cực phẩm | Pháp bảo chính | 8 | Kỹ năng chủ động tier 8 | Active | 1746 | TN | Shop/Craft/Drop |
| EQ-056 | U Minh Pháp bảo phụ I | Tiên Giới | Cực phẩm | Pháp bảo phụ | 8 | Passive hiệu quả +11% | Passive | 1746 | TN | Shop/Craft/Drop |
| EQ-057 | Vạn Pháp Vũ khí II | Tiên Giới | Tiên phẩm | Vũ khí | 9 | ATK +22%, PEN +5% | ATK/PEN | 2480 | TN | Boss/Craft |
| EQ-058 | U Minh Pháp bào II | Tiên Giới | Tiên phẩm | Pháp bào | 9 | HP +23%, DEF +12% | HP/DEF | 2480 | TN | Boss/Craft |
| EQ-059 | Quy Hương Giày II | Tiên Giới | Tiên phẩm | Giày | 9 | SPD +6%, EVA +4% | SPD/EVA | 2480 | TN | Boss/Craft |
| EQ-060 | Cửu Tiêu Hộ phù II | Tiên Giới | Tiên phẩm | Hộ phù | 9 | RES +12%, SPIRIT +22% | RES/SPIRIT | 2480 | TN | Boss/Craft |
| EQ-061 | Vạn Pháp Pháp giới II | Tiên Giới | Tiên phẩm | Pháp giới | 9 | Kho +14, tu luyện +10% | Kho/tu luyện | 2480 | TN | Boss/Craft |
| EQ-062 | U Minh Pháp bảo chính II | Tiên Giới | Tiên phẩm | Pháp bảo chính | 9 | Kỹ năng chủ động tier 9 | Active | 2480 | TN | Boss/Craft |
| EQ-063 | Quy Hương Pháp bảo phụ II | Tiên Giới | Tiên phẩm | Pháp bảo phụ | 9 | Passive hiệu quả +12% | Passive | 2480 | TN | Boss/Craft |
| EQ-064 | U Minh Vũ khí III | Tiên Giới | Đạo phẩm | Vũ khí | 10 | ATK +24%, PEN +6% | ATK/PEN | 3521 | TN | Boss/Craft |
| EQ-065 | Quy Hương Pháp bào III | Tiên Giới | Đạo phẩm | Pháp bào | 10 | HP +25%, DEF +13% | HP/DEF | 3521 | TN | Boss/Craft |
| EQ-066 | Cửu Tiêu Giày III | Tiên Giới | Đạo phẩm | Giày | 10 | SPD +7%, EVA +4% | SPD/EVA | 3521 | TN | Boss/Craft |
| EQ-067 | Vạn Pháp Hộ phù III | Tiên Giới | Đạo phẩm | Hộ phù | 10 | RES +13%, SPIRIT +24% | RES/SPIRIT | 3521 | TN | Boss/Craft |
| EQ-068 | U Minh Pháp giới III | Tiên Giới | Đạo phẩm | Pháp giới | 10 | Kho +15, tu luyện +10% | Kho/tu luyện | 3521 | TN | Boss/Craft |
| EQ-069 | Quy Hương Pháp bảo chính III | Tiên Giới | Đạo phẩm | Pháp bảo chính | 10 | Kỹ năng chủ động tier 10 | Active | 3521 | TN | Boss/Craft |
| EQ-070 | Cửu Tiêu Pháp bảo phụ III | Tiên Giới | Đạo phẩm | Pháp bảo phụ | 10 | Passive hiệu quả +13% | Passive | 3521 | TN | Boss/Craft |
| EQ-071 | Thanh Phong Kiếm | Hạ Giới | Trung phẩm | Vũ khí | 99 | Kiếm kỹ +12%, ATK +8% | Unique | 0 | LS | Thanh Vân tuyến |
| EQ-072 | Huyết Ma Đao | Hạ Giới | Thượng phẩm | Vũ khí | 99 | ATK +12%; active đổi HP lấy burst | Unique | 0 | LS | Huyết Sát tuyến |
| EQ-073 | Dược Vương Đỉnh | Hạ Giới | Thượng phẩm | Pháp bảo chính | 99 | Tăng xác suất chất lượng luyện đan | Unique | 0 | LS | Vạn Dược tuyến |
| EQ-074 | Ngũ Lôi Lệnh | Hạ Giới | Cực phẩm | Pháp bảo chính | 99 | Lôi kích + phá giáp PvE | Unique | 0 | LS | Boss Hóa Thần |
| EQ-075 | Thái Hư Kiếm Trận Đồ | Linh Giới | Linh bảo | Pháp bảo chính | 99 | Triệu hồi kiếm trận | Unique | 0 | LT | Thái Hư tuyến |
| EQ-076 | Vô Tướng Ma Ấn | Linh Giới | Linh bảo | Pháp bảo phụ | 99 | Đổi HP lấy burst có cooldown | Unique | 0 | LT | Vô Tướng tuyến |
| EQ-077 | Thiên Cơ Kính | Linh Giới | Linh bảo | Pháp bảo phụ | 99 | ACC + phát hiện bẫy/cấm chế | Unique | 0 | LT | Thiên Cơ tuyến |
| EQ-078 | Giới Tâm Chung | Linh Giới | Linh bảo | Pháp bảo chính | 99 | Kháng không gian/giới kiếp | Unique | 0 | LT | Boss cuối Linh Giới |
| EQ-079 | Cửu Tiêu Tiên Kiếm | Tiên Giới | Tiên phẩm | Vũ khí | 99 | Pháp tắc damage +15% PvE | Unique | 0 | TN | Cửu Tiêu Tiên Đình |
| EQ-080 | Vạn Pháp Luân | Tiên Giới | Tiên phẩm | Pháp bảo chính | 99 | Đổi stance pháp tắc | Unique | 0 | TN | Vạn Pháp Đạo Viện |
| EQ-081 | U Minh Luân Hồi Đăng | Tiên Giới | Tiên phẩm | Pháp bảo phụ | 99 | Bảo hộ thần hồn | Unique | 0 | TN | U Minh Cổ Điện |
| EQ-082 | Quy Hương Bạch Ngọc Bội | Tiên Giới | Đạo phẩm | Hộ phù | 99 | Cốt truyện; không cấp lợi thế PvP | Unique | 0 | TN | Đài Quy Hương |

## 10. Affix
| ID | Tên | Stat | Đơn vị | Min | Max | Slot | Ghi chú |
|---|---|---|---|---|---|---|---|
| AFX-001 | Sinh Mệnh | HP | % | 3 | 18 | Trang bị phù hợp | Tuân thủ cap hệ thống |
| AFX-002 | Công Kích | ATK | % | 2 | 15 | Trang bị phù hợp | Tuân thủ cap hệ thống |
| AFX-003 | Phòng Ngự | DEF | % | 2 | 15 | Trang bị phù hợp | Tuân thủ cap hệ thống |
| AFX-004 | Tật Phong | SPD | % | 1 | 8 | Trang bị phù hợp | Tuân thủ cap hệ thống |
| AFX-005 | Tinh Chuẩn | ACC | % | 2 | 12 | Trang bị phù hợp | Tuân thủ cap hệ thống |
| AFX-006 | Hư Ảnh | EVA | % | 2 | 10 | Trang bị phù hợp | Tuân thủ cap hệ thống |
| AFX-007 | Bạo Kích | CRIT | điểm % | 1 | 7 | Trang bị phù hợp | Tuân thủ cap hệ thống |
| AFX-008 | Cuồng Bạo | CRIT_DMG | % | 5 | 30 | Trang bị phù hợp | Tuân thủ cap hệ thống |
| AFX-009 | Kháng Tính | RES | % | 2 | 12 | Trang bị phù hợp | Tuân thủ cap hệ thống |
| AFX-010 | Phá Giáp | PEN | % | 2 | 12 | Trang bị phù hợp | Tuân thủ cap hệ thống |
| AFX-011 | Thần Niệm | SPIRIT | % | 3 | 18 | Trang bị phù hợp | Tuân thủ cap hệ thống |
| AFX-012 | Tụ Linh | CULTIVATION | % | 2 | 10 | Trang bị phù hợp | Tuân thủ cap hệ thống |
| AFX-013 | Kim Thân | KIM_RES | % | 4 | 18 | Trang bị phù hợp | Tuân thủ cap hệ thống |
| AFX-014 | Mộc Linh | MOC_RES | % | 4 | 18 | Trang bị phù hợp | Tuân thủ cap hệ thống |
| AFX-015 | Thủy Mạc | THUY_RES | % | 4 | 18 | Trang bị phù hợp | Tuân thủ cap hệ thống |
| AFX-016 | Hỏa Giáp | HOA_RES | % | 4 | 18 | Trang bị phù hợp | Tuân thủ cap hệ thống |
| AFX-017 | Địa Mạch | THO_RES | % | 4 | 18 | Trang bị phù hợp | Tuân thủ cap hệ thống |
| AFX-018 | Linh Căn Cộng Hưởng | AFFINITY | % | 2 | 10 | Trang bị phù hợp | Tuân thủ cap hệ thống |
| AFX-019 | Đan Tâm | ALCHEMY | % | 2 | 10 | Trang bị phù hợp | Tuân thủ cap hệ thống |
| AFX-020 | Luyện Khí Tinh Thông | FORGE | % | 2 | 10 | Trang bị phù hợp | Tuân thủ cap hệ thống |

## 11. Set
| ID | Tên | Map | Bonus |
|---|---|---|---|
| SET-001 | Thanh Vân Kiếm Tâm | Hạ Giới | 2: ATK+6%; 4: kiếm kỹ+12%; 6: đỡ 1 đòn chí mạng PvE/180s |
| SET-002 | Huyết Sát Chiến Thể | Hạ Giới | 2: HP+8%; 4: ATK+8%; 6: dưới 30% HP hút máu+6% |
| SET-003 | Vạn Dược Linh Y | Hạ Giới | 2: heal+10%; 4: đan hiệu quả+8%; 6: hồi phục đội nhẹ |
| SET-004 | Thái Hư Kiếm Vực | Linh Giới | 2: PEN+6%; 4: SPIRIT+10%; 6: kiếm trận giảm DEF boss |
| SET-005 | Vô Tướng Ma Khu | Linh Giới | 2: HP+10%; 4: damage+8%; 6: đổi 5% HP lấy burst |
| SET-006 | Thiên Cơ Trận Sư | Linh Giới | 2: ACC+8%; 4: RES+10%; 6: giảm cooldown pháp bảo 10% |
| SET-007 | Cửu Tiêu Tiên Uy | Tiên Giới | 2: tiên lực+8%; 4: pháp tắc+8%; 6: damage boss+10% |
| SET-008 | Vạn Pháp Quy Nhất | Tiên Giới | 2: affinity+8%; 4: giảm phạt đổi pháp tắc; 6: cộng hưởng kép |
| SET-009 | U Minh Bất Diệt | Tiên Giới | 2: SPIRIT+10%; 4: RES+10%; 6: hồi sinh PvE 1 lần/ngày |

## 12. Drop table
| ID | Enemy ID | Enemy | Loại | Item | Tỷ lệ % | Số lượng | Pity |
|---|---|---|---|---|---|---|---|
| DROP-001 | MON-001 | Hắc Lang | Currency | LS | 100 | 20-40 | Không |
| DROP-002 | MON-001 | Hắc Lang | Material | Hạt Linh Thảo | 70 | 1-3 | Không |
| DROP-003 | MON-001 | Hắc Lang | Herb | Thanh Linh Thảo | 25 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-004 | MON-002 | Độc Xà | Currency | LS | 100 | 20-40 | Không |
| DROP-005 | MON-002 | Độc Xà | Material | Quặng Linh Thiết | 70 | 1-3 | Không |
| DROP-006 | MON-002 | Độc Xà | Herb | Ngưng Lộ Thảo | 25 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-007 | MON-003 | Hoang Thử Yêu | Currency | LS | 100 | 20-40 | Không |
| DROP-008 | MON-003 | Hoang Thử Yêu | Material | Giấy Phù | 70 | 1-3 | Không |
| DROP-009 | MON-003 | Hoang Thử Yêu | Herb | Hàn Nguyệt Diệp | 25 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-010 | MON-004 | Thiết Giáp Hùng | Currency | LS | 100 | 40-80 | Không |
| DROP-011 | MON-004 | Thiết Giáp Hùng | Material | Yêu Đan | 90 | 1-3 | Không |
| DROP-012 | MON-004 | Thiết Giáp Hùng | Herb | Thổ Linh Sâm | 45 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-013 | MON-004 | Thiết Giáp Hùng | Equipment | Ngũ Hành Giày II | 8 | 1 | Pity 12 boss/cùng tier |
| DROP-014 | MON-005 | Huyết Điêu | Currency | LS | 100 | 40-80 | Không |
| DROP-015 | MON-005 | Huyết Điêu | Material | Kiếm Phôi Thanh Vân | 90 | 1-3 | Không |
| DROP-016 | MON-005 | Huyết Điêu | Herb | Trúc Cơ Quả | 45 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-017 | MON-005 | Huyết Điêu | Equipment | Vạn Dược Pháp bảo chính II | 8 | 1 | Pity 12 boss/cùng tier |
| DROP-018 | MON-006 | Kiếm Xỉ Hổ | Currency | LS | 100 | 40-80 | Không |
| DROP-019 | MON-006 | Kiếm Xỉ Hổ | Material | Huyết Tinh | 90 | 1-3 | Không |
| DROP-020 | MON-006 | Kiếm Xỉ Hổ | Herb | Âm Nguyệt Liên | 45 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-021 | MON-006 | Kiếm Xỉ Hổ | Equipment | Ngũ Hành Pháp bào III | 8 | 1 | Pity 12 boss/cùng tier |
| DROP-022 | MON-007 | Ma Hầu | Currency | LS | 100 | 80-160 | Không |
| DROP-023 | MON-007 | Ma Hầu | Material | Vạn Dược Lệnh | 90 | 1-3 | Không |
| DROP-024 | MON-007 | Ma Hầu | Herb | Thọ Nguyên Quả | 75 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-025 | MON-007 | Ma Hầu | Equipment | Vạn Dược Pháp giới III | 28 | 1 | Pity 12 boss/cùng tier |
| DROP-026 | MON-007 | Ma Hầu | Pill | Dịch Cân Đan | 12 | 1 | Pity 8 boss |
| DROP-027 | MON-008 | Thanh Giao | Currency | LS | 100 | 140-280 | Không |
| DROP-028 | MON-008 | Thanh Giao | Material | Giới Thạch | 90 | 1-3 | Không |
| DROP-029 | MON-008 | Thanh Giao | Herb | Lôi Văn Quả | 75 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-030 | MON-008 | Thanh Giao | Equipment | Ngũ Hành Vũ khí IV | 28 | 1 | Pity 12 boss/cùng tier |
| DROP-031 | MON-008 | Thanh Giao | Pill | Kim Đan Cố Nguyên | 12 | 1 | Pity 8 boss |
| DROP-032 | MON-009 | Hỏa Lân Thú | Currency | LS | 100 | 140-280 | Không |
| DROP-033 | MON-009 | Hỏa Lân Thú | Material | Lôi Tinh | 90 | 1-3 | Không |
| DROP-034 | MON-009 | Hỏa Lân Thú | Herb | Tâm Tĩnh Trúc | 75 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-035 | MON-009 | Hỏa Lân Thú | Equipment | Vạn Dược Hộ phù IV | 28 | 1 | Pity 12 boss/cùng tier |
| DROP-036 | MON-009 | Hỏa Lân Thú | Pill | Hóa Anh Đan | 12 | 1 | Pity 8 boss |
| DROP-037 | MON-010 | Cửu Vĩ Hồ | Currency | LS | 100 | 140-280 | Không |
| DROP-038 | MON-010 | Cửu Vĩ Hồ | Material | Hỏa Tủy | 90 | 1-3 | Không |
| DROP-039 | MON-010 | Cửu Vĩ Hồ | Herb | Bách Dược Tâm | 75 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-040 | MON-010 | Cửu Vĩ Hồ | Equipment | Huyết Sát Pháp bảo phụ IV | 28 | 1 | Pity 12 boss/cùng tier |
| DROP-041 | MON-010 | Cửu Vĩ Hồ | Pill | Dưỡng Hồn Đan | 12 | 1 | Pity 8 boss |
| DROP-042 | MON-011 | Kim Dực Bằng | Currency | LS | 100 | 140-280 | Không |
| DROP-043 | MON-011 | Kim Dực Bằng | Material | Hàn Tinh | 90 | 1-3 | Không |
| DROP-044 | MON-011 | Kim Dực Bằng | Herb | Cửu Diệp Chi | 75 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-045 | MON-011 | Kim Dực Bằng | Equipment | Vạn Dược Giày I | 28 | 1 | Pity 12 boss/cùng tier |
| DROP-046 | MON-011 | Kim Dực Bằng | Pill | Tục Mệnh Đan | 12 | 1 | Pity 8 boss |
| DROP-047 | MON-012 | Huyền Quy | Currency | LS | 100 | 240-480 | Không |
| DROP-048 | MON-012 | Huyền Quy | Material | Phong Thạch | 90 | 1-3 | Không |
| DROP-049 | MON-012 | Huyền Quy | Herb | Hỏa Tủy Liên | 75 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-050 | MON-012 | Huyền Quy | Equipment | Huyết Sát Pháp bảo chính I | 28 | 1 | Pity 12 boss/cùng tier |
| DROP-051 | MON-012 | Huyền Quy | Pill | Thiên Cơ Đan | 12 | 1 | Pity 8 boss |
| DROP-052 | MON-013 | Hư Không Thú | Currency | LT | 100 | 3-6 | Không |
| DROP-053 | MON-013 | Hư Không Thú | Material | Sát Tinh | 70 | 1-3 | Không |
| DROP-054 | MON-013 | Hư Không Thú | Herb | Tinh Huy Thảo | 25 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-055 | MON-014 | Tinh Hồn Lang | Currency | LT | 100 | 6-12 | Không |
| DROP-056 | MON-014 | Tinh Hồn Lang | Material | Ngũ Hành Linh Tủy | 90 | 1-3 | Không |
| DROP-057 | MON-014 | Tinh Hồn Lang | Herb | Huyền Chỉ Hoa | 45 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-058 | MON-014 | Tinh Hồn Lang | Equipment | Thiên Cơ Pháp giới III | 8 | 1 | Pity 12 boss/cùng tier |
| DROP-059 | MON-015 | Vô Tướng Ma Khôi | Currency | LT | 100 | 6-12 | Không |
| DROP-060 | MON-015 | Vô Tướng Ma Khôi | Material | Giới Lực Kết Tinh | 90 | 1-3 | Không |
| DROP-061 | MON-015 | Vô Tướng Ma Khôi | Herb | Hư Không Lan | 45 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-062 | MON-015 | Vô Tướng Ma Khôi | Equipment | Thái Hư Vũ khí I | 8 | 1 | Pity 12 boss/cùng tier |
| DROP-063 | MON-016 | Pháp Tướng Cự Linh | Currency | LT | 100 | 21-42 | Không |
| DROP-064 | MON-016 | Pháp Tướng Cự Linh | Material | Pháp Tướng Mảnh | 90 | 1-3 | Không |
| DROP-065 | MON-016 | Pháp Tướng Cự Linh | Herb | Thái Hư Chi | 75 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-066 | MON-016 | Pháp Tướng Cự Linh | Equipment | Tinh Không Hộ phù I | 28 | 1 | Pity 12 boss/cùng tier |
| DROP-067 | MON-016 | Pháp Tướng Cự Linh | Pill | Cửu Khúc Linh Đan | 12 | 1 | Pity 8 boss |
| DROP-068 | MON-017 | Giới Ngoại Dị Trùng | Currency | LT | 100 | 6-12 | Không |
| DROP-069 | MON-017 | Giới Ngoại Dị Trùng | Material | Linh Văn Mực | 90 | 1-3 | Không |
| DROP-070 | MON-017 | Giới Ngoại Dị Trùng | Herb | Bách Thảo Tinh | 45 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-071 | MON-017 | Giới Ngoại Dị Trùng | Equipment | Thiên Cơ Pháp bảo phụ I | 8 | 1 | Pity 12 boss/cùng tier |
| DROP-072 | MON-018 | Cổ Kiếm Linh | Currency | LT | 100 | 21-42 | Không |
| DROP-073 | MON-018 | Cổ Kiếm Linh | Material | Cổ Giới Thạch | 90 | 1-3 | Không |
| DROP-074 | MON-018 | Cổ Kiếm Linh | Herb | Tẩy Linh Quả | 75 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-075 | MON-018 | Cổ Kiếm Linh | Equipment | Tinh Không Giày II | 28 | 1 | Pity 12 boss/cùng tier |
| DROP-076 | MON-018 | Cổ Kiếm Linh | Pill | Thái Hư Kiếm Đan | 12 | 1 | Pity 8 boss |
| DROP-077 | MON-019 | Sát Hồn Vương | Currency | LT | 100 | 21-42 | Không |
| DROP-078 | MON-019 | Sát Hồn Vương | Material | Hư Không Tinh Sa | 90 | 1-3 | Không |
| DROP-079 | MON-019 | Sát Hồn Vương | Herb | Không Minh Thảo | 75 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-080 | MON-019 | Sát Hồn Vương | Equipment | Thiên Cơ Pháp bảo chính II | 28 | 1 | Pity 12 boss/cùng tier |
| DROP-081 | MON-019 | Sát Hồn Vương | Pill | Bách Thảo Hồi Thiên | 12 | 1 | Pity 8 boss |
| DROP-082 | MON-020 | Giới Kiếp Lôi Linh | Currency | LT | 100 | 36-72 | Không |
| DROP-083 | MON-020 | Giới Kiếp Lôi Linh | Material | Pháp Tướng Linh Tủy | 90 | 1-3 | Không |
| DROP-084 | MON-020 | Giới Kiếp Lôi Linh | Herb | Đại Thừa Kim Liên | 75 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-085 | MON-020 | Giới Kiếp Lôi Linh | Equipment | Tinh Không Pháp bào III | 28 | 1 | Pity 12 boss/cùng tier |
| DROP-086 | MON-020 | Giới Kiếp Lôi Linh | Pill | Thiên Cơ Minh Tâm | 12 | 1 | Pity 8 boss |
| DROP-087 | MON-021 | Tiên Linh Hạc | Currency | TN | 100 | 1-2 | Không |
| DROP-088 | MON-021 | Tiên Linh Hạc | Material | Tiên Khí Phôi | 70 | 1-3 | Không |
| DROP-089 | MON-021 | Tiên Linh Hạc | Herb | Kim Hồn Tiên Quả | 25 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-090 | MON-022 | Kim Giáp Tiên Vệ | Currency | TN | 100 | 2-4 | Không |
| DROP-091 | MON-022 | Kim Giáp Tiên Vệ | Material | Suy Kiếp Chi Tức | 90 | 1-3 | Không |
| DROP-092 | MON-022 | Kim Giáp Tiên Vệ | Herb | Vân Hạc Tiên Thảo | 45 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-093 | MON-022 | Kim Giáp Tiên Vệ | Equipment | Cửu Tiêu Vũ khí I | 8 | 1 | Pity 12 boss/cùng tier |
| DROP-094 | MON-023 | Sát Suy Ma Ảnh | Currency | TN | 100 | 2-4 | Không |
| DROP-095 | MON-023 | Sát Suy Ma Ảnh | Material | Đạo Văn | 90 | 1-3 | Không |
| DROP-096 | MON-023 | Sát Suy Ma Ảnh | Herb | Đản Hồn Hoa | 45 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-097 | MON-023 | Sát Suy Ma Ảnh | Equipment | Quy Hương Hộ phù I | 8 | 1 | Pity 12 boss/cùng tier |
| DROP-098 | MON-024 | Thời Sa Cổ Thú | Currency | TN | 100 | 7-14 | Không |
| DROP-099 | MON-024 | Thời Sa Cổ Thú | Material | Tiên Kim | 90 | 1-3 | Không |
| DROP-100 | MON-024 | Thời Sa Cổ Thú | Herb | Thiên Linh Trúc Diệp | 75 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-101 | MON-024 | Thời Sa Cổ Thú | Equipment | U Minh Pháp bảo phụ I | 28 | 1 | Pity 12 boss/cùng tier |
| DROP-102 | MON-024 | Thời Sa Cổ Thú | Pill | Ngũ Suy Hộ Mệnh | 12 | 1 | Pity 8 boss |
| DROP-103 | MON-025 | Hư Không Long Ảnh | Currency | TN | 100 | 7-14 | Không |
| DROP-104 | MON-025 | Hư Không Long Ảnh | Material | Hư Không Tiên Tinh | 90 | 1-3 | Không |
| DROP-105 | MON-025 | Hư Không Long Ảnh | Herb | Tinh Huy Tiên Thảo | 75 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-106 | MON-025 | Hư Không Long Ảnh | Equipment | Quy Hương Giày II | 28 | 1 | Pity 12 boss/cùng tier |
| DROP-107 | MON-025 | Hư Không Long Ảnh | Pill | Huyền Chân Đan | 12 | 1 | Pity 8 boss |
| DROP-108 | MON-026 | Luân Hồi Hồn Tướng | Currency | TN | 100 | 7-14 | Không |
| DROP-109 | MON-026 | Luân Hồi Hồn Tướng | Material | Thời Sa | 90 | 1-3 | Không |
| DROP-110 | MON-026 | Luân Hồi Hồn Tướng | Herb | Vạn Hồn Tiên Thảo | 75 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-111 | MON-026 | Luân Hồi Hồn Tướng | Equipment | U Minh Pháp bảo chính II | 28 | 1 | Pity 12 boss/cùng tier |
| DROP-112 | MON-026 | Luân Hồi Hồn Tướng | Pill | U Thủy Tiên Đan | 12 | 1 | Pity 8 boss |
| DROP-113 | MON-027 | Đạo Tắc Hóa Thân | Currency | TN | 100 | 7-14 | Không |
| DROP-114 | MON-027 | Đạo Tắc Hóa Thân | Material | Luân Hồi Tinh | 90 | 1-3 | Không |
| DROP-115 | MON-027 | Đạo Tắc Hóa Thân | Herb | Lưỡng Sinh Tiên Quả | 75 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-116 | MON-027 | Đạo Tắc Hóa Thân | Equipment | Quy Hương Pháp bào III | 28 | 1 | Pity 12 boss/cùng tier |
| DROP-117 | MON-027 | Đạo Tắc Hóa Thân | Pill | Cuồng Diễm Tiên Đan | 12 | 1 | Pity 8 boss |
| DROP-118 | MON-028 | Cửu Tiêu Phản Tiên | Currency | TN | 100 | 7-14 | Không |
| DROP-119 | MON-028 | Cửu Tiêu Phản Tiên | Material | Linh Hồn Ngọc | 90 | 1-3 | Không |
| DROP-120 | MON-028 | Cửu Tiêu Phản Tiên | Herb | Khổ Lạc Hoa | 75 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-121 | MON-028 | Cửu Tiêu Phản Tiên | Equipment | U Minh Pháp giới III | 28 | 1 | Pity 12 boss/cùng tier |
| DROP-122 | MON-028 | Cửu Tiêu Phản Tiên | Pill | Cầu Long Luyện Thể Đan | 12 | 1 | Pity 8 boss |
| DROP-123 | MON-029 | Đại La Tàn Ảnh | Currency | TN | 100 | 15-30 | Không |
| DROP-124 | MON-029 | Đại La Tàn Ảnh | Material | Thiên Lôi Tinh | 90 | 1-3 | Không |
| DROP-125 | MON-029 | Đại La Tàn Ảnh | Herb | U Thủy Tiên Liên | 75 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-126 | MON-029 | Đại La Tàn Ảnh | Equipment | Cửu Tiêu Vũ khí I | 28 | 1 | Pity 12 boss/cùng tier |
| DROP-127 | MON-029 | Đại La Tàn Ảnh | Pill | Đản Hồn Tiên Đan | 12 | 1 | Pity 8 boss |
| DROP-128 | MON-030 | Đài Quy Hương Thủ Ảnh | Currency | TN | 100 | 10-20 | Không |
| DROP-129 | MON-030 | Đài Quy Hương Thủ Ảnh | Material | Ngũ Hành Đạo Tinh | 90 | 1-3 | Không |
| DROP-130 | MON-030 | Đài Quy Hương Thủ Ảnh | Herb | Không Gian Bồ Đề | 75 | 1-2 | 10–20 nếu dùng cho progression |
| DROP-131 | MON-030 | Đài Quy Hương Thủ Ảnh | Equipment | Quy Hương Hộ phù I | 28 | 1 | Pity 12 boss/cùng tier |
| DROP-132 | MON-030 | Đài Quy Hương Thủ Ảnh | Pill | Vô Trần Giải Độc Đan | 12 | 1 | Pity 8 boss |

**Không đưa sáu cổ vật Hỗn Độn vào drop table công khai.** Hệ đó do backend riêng quản lý và không khóa tuyến chính.

## 13. Shop curve
| ID | Stage | Cảnh giới | Map | Loại | Giá | Tiền | Refresh giờ | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| SHOP-001 | HG00 | Phàm Nhân | Hạ Giới | Consumable | 14 | LS | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-002 | HG00 | Phàm Nhân | Hạ Giới | Material | 9 | LS | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-003 | HG00 | Phàm Nhân | Hạ Giới | Equipment | 63 | LS | 8 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-004 | HG00 | Phàm Nhân | Hạ Giới | Craft Fee | 7 | LS | 0 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-005 | HG01 | Luyện Khí | Hạ Giới | Consumable | 18 | LS | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-006 | HG01 | Luyện Khí | Hạ Giới | Material | 12 | LS | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-007 | HG01 | Luyện Khí | Hạ Giới | Equipment | 81 | LS | 8 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-008 | HG01 | Luyện Khí | Hạ Giới | Craft Fee | 9 | LS | 0 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-009 | HG02 | Trúc Cơ | Hạ Giới | Consumable | 34 | LS | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-010 | HG02 | Trúc Cơ | Hạ Giới | Material | 21 | LS | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-011 | HG02 | Trúc Cơ | Hạ Giới | Equipment | 149 | LS | 8 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-012 | HG02 | Trúc Cơ | Hạ Giới | Craft Fee | 17 | LS | 0 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-013 | HG03 | Kim Đan | Hạ Giới | Consumable | 81 | LS | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-014 | HG03 | Kim Đan | Hạ Giới | Material | 51 | LS | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-015 | HG03 | Kim Đan | Hạ Giới | Equipment | 355 | LS | 8 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-016 | HG03 | Kim Đan | Hạ Giới | Craft Fee | 41 | LS | 0 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-017 | HG04 | Nguyên Anh | Hạ Giới | Consumable | 192 | LS | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-018 | HG04 | Nguyên Anh | Hạ Giới | Material | 120 | LS | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-019 | HG04 | Nguyên Anh | Hạ Giới | Equipment | 841 | LS | 8 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-020 | HG04 | Nguyên Anh | Hạ Giới | Craft Fee | 96 | LS | 0 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-021 | HG05 | Hóa Thần | Hạ Giới | Consumable | 357 | LS | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-022 | HG05 | Hóa Thần | Hạ Giới | Material | 223 | LS | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-023 | HG05 | Hóa Thần | Hạ Giới | Equipment | 1560 | LS | 8 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-024 | HG05 | Hóa Thần | Hạ Giới | Craft Fee | 178 | LS | 0 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-025 | LG01 | Luyện Hư | Linh Giới | Consumable | 8 | LT | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-026 | LG01 | Luyện Hư | Linh Giới | Material | 5 | LT | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-027 | LG01 | Luyện Hư | Linh Giới | Equipment | 37 | LT | 8 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-028 | LG01 | Luyện Hư | Linh Giới | Craft Fee | 4 | LT | 0 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-029 | LG02 | Hợp Thể | Linh Giới | Consumable | 21 | LT | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-030 | LG02 | Hợp Thể | Linh Giới | Material | 13 | LT | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-031 | LG02 | Hợp Thể | Linh Giới | Equipment | 91 | LT | 8 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-032 | LG02 | Hợp Thể | Linh Giới | Craft Fee | 10 | LT | 0 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-033 | LG03 | Đại Thừa | Linh Giới | Consumable | 54 | LT | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-034 | LG03 | Đại Thừa | Linh Giới | Material | 34 | LT | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-035 | LG03 | Đại Thừa | Linh Giới | Equipment | 238 | LT | 8 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-036 | LG03 | Đại Thừa | Linh Giới | Craft Fee | 27 | LT | 0 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-037 | LG04 | Độ Kiếp / Phi Thăng | Linh Giới | Consumable | 98 | LT | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-038 | LG04 | Độ Kiếp / Phi Thăng | Linh Giới | Material | 61 | LT | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-039 | LG04 | Độ Kiếp / Phi Thăng | Linh Giới | Equipment | 430 | LT | 8 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-040 | LG04 | Độ Kiếp / Phi Thăng | Linh Giới | Craft Fee | 49 | LT | 0 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-041 | TG01 | Ngụy Tiên | Tiên Giới | Consumable | 2 | TN | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-042 | TG01 | Ngụy Tiên | Tiên Giới | Material | 1 | TN | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-043 | TG01 | Ngụy Tiên | Tiên Giới | Equipment | 9 | TN | 8 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-044 | TG01 | Ngụy Tiên | Tiên Giới | Craft Fee | 1 | TN | 0 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-045 | TG02 | Chân Tiên | Tiên Giới | Consumable | 4 | TN | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-046 | TG02 | Chân Tiên | Tiên Giới | Material | 2 | TN | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-047 | TG02 | Chân Tiên | Tiên Giới | Equipment | 16 | TN | 8 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-048 | TG02 | Chân Tiên | Tiên Giới | Craft Fee | 2 | TN | 0 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-049 | TG03 | Kim Tiên | Tiên Giới | Consumable | 8 | TN | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-050 | TG03 | Kim Tiên | Tiên Giới | Material | 5 | TN | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-051 | TG03 | Kim Tiên | Tiên Giới | Equipment | 33 | TN | 8 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-052 | TG03 | Kim Tiên | Tiên Giới | Craft Fee | 4 | TN | 0 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-053 | TG04 | Thái Ất | Tiên Giới | Consumable | 15 | TN | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-054 | TG04 | Thái Ất | Tiên Giới | Material | 9 | TN | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-055 | TG04 | Thái Ất | Tiên Giới | Equipment | 65 | TN | 8 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-056 | TG04 | Thái Ất | Tiên Giới | Craft Fee | 7 | TN | 0 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-057 | TG05 | Đại La sơ nhập / Đài Quy Hương | Tiên Giới | Consumable | 26 | TN | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-058 | TG05 | Đại La sơ nhập / Đài Quy Hương | Tiên Giới | Material | 16 | TN | 2 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-059 | TG05 | Đại La sơ nhập / Đài Quy Hương | Tiên Giới | Equipment | 113 | TN | 8 | Giá baseline; telemetry điều chỉnh ±15% |
| SHOP-060 | TG05 | Đại La sơ nhập / Đài Quy Hương | Tiên Giới | Craft Fee | 13 | TN | 0 | Giá baseline; telemetry điều chỉnh ±15% |

Refresh chuẩn: phổ thông 2h, tông môn 8h, hiếm 24h; 1 refresh miễn phí/ngày; không bán refresh vô hạn.

## 14. Kinh tế v1.2

Tỷ giá quy ước: `1 LT = 1.000 LS`; `1 TN = 1.000 LT`. Chỉ đổi lên tại NPC. Death-loss được tính như một sink kinh tế kỳ vọng, nhưng **không được dùng để biện minh cho sink hệ thống quá nhẹ**.

| Ngày | Map | Source | System Sink | Expected Death Loss | Total Sink | Net | Tiền | Source/Sink |
|---:|---|---:|---:|---:|---:|---:|---|---:|
| 1 | Hạ Giới | 180 | 149 | 5 | 154 | 26 | LS | 1.169 |
| 2 | Hạ Giới | 230 | 189 | 7 | 196 | 34 | LS | 1.173 |
| 3 | Hạ Giới | 295 | 242 | 9 | 251 | 44 | LS | 1.175 |
| 4 | Hạ Giới | 377 | 308 | 11 | 319 | 58 | LS | 1.182 |
| 5 | Hạ Giới | 483 | 393 | 14 | 407 | 76 | LS | 1.187 |
| 6 | Hạ Giới | 618 | 501 | 19 | 520 | 98 | LS | 1.188 |
| 7 | Hạ Giới | 792 | 640 | 24 | 664 | 128 | LS | 1.193 |
| 8 | Hạ Giới | 1013 | 818 | 30 | 848 | 165 | LS | 1.195 |
| 9 | Hạ Giới | 1297 | 1046 | 39 | 1085 | 212 | LS | 1.195 |
| 10 | Hạ Giới | 1660 | 1339 | 50 | 1389 | 271 | LS | 1.195 |
| 11 | Hạ Giới | 2125 | 1716 | 64 | 1780 | 345 | LS | 1.194 |
| 12 | Hạ Giới | 2720 | 2200 | 82 | 2282 | 438 | LS | 1.192 |
| 13 | Hạ Giới | 3482 | 2825 | 104 | 2929 | 553 | LS | 1.189 |
| 14 | Hạ Giới | 4457 | 3626 | 134 | 3760 | 697 | LS | 1.185 |
| 15 | Hạ Giới | 5704 | 4659 | 171 | 4830 | 874 | LS | 1.181 |
| 16 | Linh Giới | 85 | 68 | 4 | 72 | 13 | LT | 1.181 |
| 17 | Linh Giới | 99 | 81 | 4 | 85 | 14 | LT | 1.165 |
| 18 | Linh Giới | 114 | 93 | 5 | 98 | 16 | LT | 1.163 |
| 19 | Linh Giới | 133 | 109 | 6 | 115 | 18 | LT | 1.157 |
| 20 | Linh Giới | 154 | 127 | 7 | 134 | 20 | LT | 1.149 |
| 21 | Linh Giới | 179 | 148 | 8 | 156 | 23 | LT | 1.147 |
| 22 | Linh Giới | 207 | 172 | 9 | 181 | 26 | LT | 1.144 |
| 23 | Linh Giới | 240 | 200 | 11 | 211 | 29 | LT | 1.137 |
| 24 | Linh Giới | 279 | 233 | 13 | 246 | 33 | LT | 1.134 |
| 25 | Linh Giới | 323 | 271 | 15 | 286 | 37 | LT | 1.129 |
| 26 | Linh Giới | 375 | 316 | 17 | 333 | 42 | LT | 1.126 |
| 27 | Linh Giới | 435 | 366 | 20 | 386 | 49 | LT | 1.127 |
| 28 | Linh Giới | 505 | 426 | 23 | 449 | 56 | LT | 1.125 |
| 29 | Linh Giới | 585 | 494 | 26 | 520 | 65 | LT | 1.125 |
| 30 | Linh Giới | 679 | 572 | 31 | 603 | 76 | LT | 1.126 |
| 31 | Linh Giới | 788 | 663 | 35 | 698 | 90 | LT | 1.129 |
| 32 | Linh Giới | 914 | 767 | 41 | 808 | 106 | LT | 1.131 |
| 33 | Linh Giới | 1060 | 886 | 48 | 934 | 126 | LT | 1.135 |
| 34 | Linh Giới | 1229 | 1023 | 55 | 1078 | 151 | LT | 1.14 |
| 35 | Linh Giới | 1426 | 1182 | 64 | 1246 | 180 | LT | 1.144 |
| 36 | Tiên Giới | 22 | 18 | 1 | 19 | 3 | TN | 1.158 |
| 37 | Tiên Giới | 25 | 19 | 2 | 21 | 4 | TN | 1.19 |
| 38 | Tiên Giới | 28 | 22 | 2 | 24 | 4 | TN | 1.167 |
| 39 | Tiên Giới | 32 | 25 | 2 | 27 | 5 | TN | 1.185 |
| 40 | Tiên Giới | 36 | 28 | 2 | 30 | 6 | TN | 1.2 |
| 41 | Tiên Giới | 41 | 32 | 2 | 34 | 7 | TN | 1.206 |
| 42 | Tiên Giới | 46 | 35 | 3 | 38 | 8 | TN | 1.211 |
| 43 | Tiên Giới | 52 | 40 | 3 | 43 | 9 | TN | 1.209 |
| 44 | Tiên Giới | 58 | 45 | 3 | 48 | 10 | TN | 1.208 |
| 45 | Tiên Giới | 66 | 50 | 4 | 54 | 12 | TN | 1.222 |
| 46 | Tiên Giới | 75 | 58 | 4 | 62 | 13 | TN | 1.21 |
| 47 | Tiên Giới | 84 | 64 | 5 | 69 | 15 | TN | 1.217 |
| 48 | Tiên Giới | 95 | 72 | 6 | 78 | 17 | TN | 1.218 |
| 49 | Tiên Giới | 108 | 83 | 6 | 89 | 19 | TN | 1.213 |
| 50 | Tiên Giới | 122 | 93 | 7 | 100 | 22 | TN | 1.22 |
| 51 | Tiên Giới | 138 | 106 | 8 | 114 | 24 | TN | 1.211 |
| 52 | Tiên Giới | 155 | 119 | 9 | 128 | 27 | TN | 1.211 |
| 53 | Tiên Giới | 176 | 135 | 11 | 146 | 30 | TN | 1.205 |
| 54 | Tiên Giới | 199 | 154 | 12 | 166 | 33 | TN | 1.199 |
| 55 | Tiên Giới | 224 | 175 | 13 | 188 | 36 | TN | 1.191 |
| 56 | Tiên Giới | 254 | 199 | 15 | 214 | 40 | TN | 1.187 |
| 57 | Tiên Giới | 286 | 225 | 17 | 242 | 44 | TN | 1.182 |
| 58 | Tiên Giới | 324 | 256 | 19 | 275 | 49 | TN | 1.178 |
| 59 | Tiên Giới | 366 | 291 | 22 | 313 | 53 | TN | 1.169 |
| 60 | Tiên Giới | 413 | 329 | 25 | 354 | 59 | TN | 1.167 |

Mục tiêu rolling source/sink 7 ngày: **0,9–1,35**, ưu tiên vùng khỏe **1,05–1,25**. `death_loss_expected` là giá trị mô hình hóa để kiểm tra kinh tế, không phải khoản trừ thêm khi người chơi đã chết — death transaction thực tế đã tiêu hủy tài sản.

## 15. Đột phá
```text
p = base_realm + 0.004×NgộTính + 0.0025×VậnKhí + pill_bonus + preparation_bonus - tribulation_penalty
```
- Tầng nhỏ: 35–95%; đại đột phá: 15–85%; phi thăng/đại kiếp: 10–75%.
- Mỗi thất bại cùng bình cảnh +8 điểm %; thất bại thứ 3 cộng thêm +15; lần 5 bảo đảm nếu điều kiện nền hợp lệ.
- RNG tạo cảm xúc, không được phá mục tiêu 60 ngày.

## 16. Craft & market
- Luyện đan: 2–3 dược liệu + phí; quality roll server-side.
- Luyện khí: phôi + 2–4 nguyên liệu + phí; Cực phẩm+ roll affix server-side.
- Reroll affix khóa tối đa 2 dòng; salvage gear thường trả 20–35% vật liệu.
- Không giao dịch: quest item, Đạo Đan, sáu cổ vật Hỗn Độn, Hỗn Độn Nguyên Ấn, first-clear reward.

## 17. KPI nghiệm thu
- Median endgame 56–66 ngày; P25 ≥45; P75 ≤78.
- <20% người chơi kẹt một bình cảnh >72h.
- Không linh căn >35% build endgame; một set không >45% usage.
- Matchup PvP cùng BP mục tiêu 45–55% khi sample đủ.

## 18. Server authority
Drop, craft high-tier, reroll affix, market settlement, breakthrough ảnh hưởng leaderboard/PvP và toàn bộ Lục Mệnh/Hỗn Độn phải được backend xác thực. Frontend chỉ gửi intent.

## 19. Trạng thái
**FINAL BASELINE v1.3:** dữ liệu được rà bằng `scripts/qa_check.py` (số lượng, ID duy nhất, chỉ ba map, dải kinh tế, thông số Thiên Mệnh, mô phỏng tái lập). Cân bằng thực tế **chưa được kiểm chứng**.
## 20. Lifecycle, tử vong và Trùng Sinh — v1.2

- Phi Thăng chỉ đổi `current_map`, không tạo life mới.
- Death lethal ở đột phá/Độ Kiếp/PvP sinh tử/bí cảnh lethal/boss lethal kết thúc kiếp.
- Death transaction xóa toàn bộ wallet, inventory, equipment của life; item Thiên Mệnh cũng mất nếu chưa dùng.
- Chỉ account meta giữ lại: TM balance, permanent TM stat, achievement/lore/unlock.
- Nội dung safe như Luận Đạo không phát death thật.

## 21. Thiên Mệnh Các

Điểm TM: **+1 cho mỗi tầng thành công**; 9 tầng mỗi cảnh giới × 15 cảnh giới = **135 TM/kiếp hoàn tất**. Mỗi milestone chỉ phát một lần trong cùng một life. TM không mất khi trùng sinh.

| Stat | Giá cấp 1 | +/cấp | Cap | Tổng đến cap |
|---|---:|---:|---:|---:|
| Tướng Mạo | 6 | 1 | 20 | 310 |
| Phúc Duyên | 7 | 1 | 20 | 330 |
| Căn Cốt | 8 | 2 | 20 | 540 |
| Ngộ Tính | 8 | 2 | 20 | 540 |
| Vận Khí | 9 | 2 | 20 | 560 |
| Tổng | | | | 2.280 (≈17 kiếp hoàn tất) |

Vật phẩm độc quyền (20–90 TM) không shop thường, không quái/boss drop, mặc định không market; là tài sản của life và mất khi chết, không hoàn TM.
Hiệu ứng: +20 mọi stat TM ≈ HP +25%, ATK +23%, DEF +20%, SPIRIT +24% so với build đầy trần vật phẩm (giả định gốc + vật phẩm = 50). Tốc độ tu luyện từ TM tối đa +25%; kiếp sạch thứ 2+ median ≥45 ngày. PvP xếp hạng: TM stat 50%.

Source-of-truth: `data/thien_menh_cac.csv`, `data/balance_config.json`.

## 22. Kiến trúc

Stack/frontend/API/database **OPEN**. Balance master chỉ yêu cầu authority cho death, TM, breakthrough, drop, craft, market và Lục Mệnh. Không coi Svelte/Go/Node/Fastify là canonical. Database làm mới từ đầu, không migration save cũ.

## 23. Thọ nguyên [Đề xuất v1.3]

Khởi đầu 100 năm; tiêu hao 10 năm mỗi ngày thời gian tu luyện được tính; cấp thêm `100 + 20 × ngày_mục_tiêu` năm tối đa theo giai đoạn (`data/tho_nguyen.csv`). Người chơi chậm hơn khoảng 2,2 lần so với đường sạch sẽ chạm tọa hóa gần cuối.

## 24. Offline, lethal và chống lạm dụng [Đề xuất v1.3]

- Offline không gây tử vong; auto-tu luyện dừng trước tầng 9 và Độ Kiếp.
- Mất kết nối: PvP Sinh Tử >30 s = thua nhưng không mất kiếp; PvE lethal tạm dừng tối đa 120 s.
- PvP Sinh Tử không loot xác; ghép BP ±10%.
- Giao dịch: tài khoản ≥72 giờ; item nhận khóa 24 giờ; chuyển ròng ra ≤20% tài sản/ngày; flag cặp tài khoản >3 lần/ngày.
- Lục Mệnh: tài khoản ≥14 ngày; hàng chờ ghép đội; tín hiệu thiết bị/IP chỉ để cảnh báo.
