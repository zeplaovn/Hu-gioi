# DỰ THẢO THIẾT KẾ — Nội dung cao giới 5–13

> **Chờ chủ dự án duyệt.** Chỉ là tài liệu; **không** nhập vào `data/`, **không** đổi `engine/`, V9/protocol v2/48 lệnh hoặc quyết định P0/P1. Các ô **chờ duyệt** tuyệt đối không phải thông số đã được cân bằng.

## 1. Khảo sát độ phủ nguồn hiện có (trước khi soạn)

Đối chiếu trực tiếp `data/design-raw.js` (bảng `quái vật`, `npc`, `boss`), `data/catalog.js` (`ZONES`, `ENEMY_NAMES`), `data/adventures.js` (`DUNGEONS`) và `data/social.js` (`NPC_QUESTS`); đối chiếu cách sử dụng trong `engine/rules/combat.js` và `engine/rules/adventures.js`. Có **5 quái thường đặc thù ở r=0–4**, **10 NPC Hạ Giới**, **7 boss mô tả thiết kế không thuộc các bí cảnh cao giới mới**. Chuỗi nhiệm vụ NPC hiện định nghĩa theo **vai trò**, chưa có NPC r=5–13. `ENEMY_NAMES` ở catalog chỉ cung cấp **tên dự phòng**, không phải bản ghi quái đặc thù ở `design-raw.js`.

| Cảnh giới | Quái thường đặc thù? · nguồn | NPC có nhiệm vụ tại cảnh giới? · nguồn | Bí cảnh tại cảnh giới? · nguồn |
| --- | --- | --- | --- |
| r=5 · Luyện Hư | Thiếu quái đặc thù (design-raw.js: quái vật; catalog.js: ENEMY_NAMES dự phòng) | Thiếu NPC/nhiệm vụ cao giới (design-raw.js: npc; social.js: NPC_QUESTS theo vai trò) | Đã có: Lôi Đình Cổ Điện (adventures.js: DUNGEONS) |
| r=6 · Hợp Thể | Thiếu quái đặc thù (design-raw.js: quái vật; catalog.js: ENEMY_NAMES dự phòng) | Thiếu NPC/nhiệm vụ cao giới (design-raw.js: npc; social.js: NPC_QUESTS theo vai trò) | Thiếu (adventures.js: DUNGEONS) |
| r=7 · Đại Thừa | Thiếu quái đặc thù (design-raw.js: quái vật; catalog.js: ENEMY_NAMES dự phòng) | Thiếu NPC/nhiệm vụ cao giới (design-raw.js: npc; social.js: NPC_QUESTS theo vai trò) | Đã có: Thái Cổ Tiên Phủ (adventures.js: DUNGEONS) |
| r=8 · Độ Kiếp | Thiếu quái đặc thù (design-raw.js: quái vật; catalog.js: ENEMY_NAMES dự phòng) | Thiếu NPC/nhiệm vụ cao giới (design-raw.js: npc; social.js: NPC_QUESTS theo vai trò) | Đã có: Thiên Môn Kiếp Hải (adventures.js: DUNGEONS) |
| r=9 · Chân Tiên | Thiếu quái đặc thù (design-raw.js: quái vật; catalog.js: ENEMY_NAMES dự phòng) | Thiếu NPC/nhiệm vụ cao giới (design-raw.js: npc; social.js: NPC_QUESTS theo vai trò) | Thiếu (adventures.js: DUNGEONS) |
| r=10 · Kim Tiên | Thiếu quái đặc thù (design-raw.js: quái vật; catalog.js: ENEMY_NAMES dự phòng) | Thiếu NPC/nhiệm vụ cao giới (design-raw.js: npc; social.js: NPC_QUESTS theo vai trò) | Thiếu (adventures.js: DUNGEONS) |
| r=11 · Thái Ất | Thiếu quái đặc thù (design-raw.js: quái vật; catalog.js: ENEMY_NAMES dự phòng) | Thiếu NPC/nhiệm vụ cao giới (design-raw.js: npc; social.js: NPC_QUESTS theo vai trò) | Thiếu (adventures.js: DUNGEONS) |
| r=12 · Đại La | Thiếu quái đặc thù (design-raw.js: quái vật; catalog.js: ENEMY_NAMES dự phòng) | Thiếu NPC/nhiệm vụ cao giới (design-raw.js: npc; social.js: NPC_QUESTS theo vai trò) | Thiếu (adventures.js: DUNGEONS) |
| r=13 · Đạo Tổ | Thiếu quái đặc thù (design-raw.js: quái vật; catalog.js: ENEMY_NAMES dự phòng) | Thiếu NPC/nhiệm vụ cao giới (design-raw.js: npc; social.js: NPC_QUESTS theo vai trò) | Thiếu (adventures.js: DUNGEONS) |

**Phạm vi phải bổ sung:** 9 quái thường, 9 NPC với 9 nhiệm vụ; chỉ 6 bí cảnh cho r=6, 9, 10, 11, 12, 13 (r=5, 7, 8 đã có). Kèm 6 boss **dự thảo** để gắn với 6 bí cảnh mới. Nguồn chốt danh sách: `data/adventures.js:DUNGEONS`.

## 2. Quy ước số liệu và giới hạn chưa được định nghĩa

- **Quái thường:** `F.stat_scale(r,0) = P.K_STAT^r × P.K_STAGE^(0/STAGES[r]) = 8^r`; `F.stats(r,0)` cho `HP=100×8^r`, `ATK=10×8^r`, `DEF=5×8^r`. Dùng `MONSTER_MULT['thường']=0,6`: `hp=60×8^r`, `atk=6×8^r`, `def=3×8^r` (nguồn: `data/balance.js:P,MONSTER_MULT,STAGES`; `data/formulas.js:F.stat_scale,F.stats`; `engine/rules/combat.js:enemy()`).

- **Boss bản nháp:** cùng `F.stats(r,0)` nhưng nhân `MONSTER_MULT.boss=2,0`: `hp=200×8^r`, `atk=20×8^r`, `def=10×8^r`. Đây là **mức tham khảo** theo hệ số boss đang có, **không khẳng định** cân bằng/luật boss bí cảnh mới đã được triển khai.

- **Các trường thiếu công thức:** `cấp`, `mp`, `sta`, `exp`, kỹ năng, nguồn ảnh, thời lượng và số tầng bí cảnh **chờ duyệt**; không nội suy từ vài dòng mẫu. `eva=0`, `crit=0`, `crit_dame=150` ghi theo **fallback giao chiến** (`engine/rules/combat.js:enemy(),attack`), không tự thêm hiệu ứng. Dấu `null` chỉ chưa ánh xạ mã ảnh.

- **Bí cảnh tương tác, hộ vệ tầng 1:** `engine/rules/adventures.js:runEnemy()` dùng `F.stats(r,0)`, `mult=0,5+0,08×(floor−1)`, `RUN.mobHp=0,6`, `RUN.mobAtk=0,75`. Do đó tầng 1 có `HP=100×8^r×0,5×0,6`, `ATK=10×8^r×0,5×0,75`, `DEF=5×8^r×0,5`. Tầng cuối dùng `RUN.bossHp=1,8` và `RUN.bossAtk=0,8`, phụ thuộc số tầng **chưa duyệt**. Không đặt tùy tiện `floors` hoặc `seconds`.

- **Nhiệm vụ NPC:** đề nghị **tái sử dụng nguyên mẫu đang có** `data/social.js:NPC_QUESTS['giao nhiệm vụ'][0]`: `need={type:'kill',count:25}`, `minAffinity=0`, `reward={affinity:10,stone:600}` (stone là **số giây thu nhập**, không phải số linh thạch cố định). Đây chưa phải hệ nhiệm vụ phân theo cảnh giới; phải duyệt tích hợp. `thiện cảm ban đầu=0` và `vai trò='giao nhiệm vụ'` theo `data/design-raw.js:npc`.

- **Hệ** chỉ lấy từ `kim, mộc, thủy, hỏa, thổ, không hệ`. Đối với bảng `DUNGEONS` hiện có, mã số hệ tương ứng `Kim=0, Mộc=1, Thủy=2, Hỏa=3, Thổ=4, không hệ=-1` (`data/adventures.js:ELEMENT_NAMES,DUNGEONS`).

## 3. Bảng ánh xạ cảnh giới/hệ/khu vực cho mọi mã tạm

Bảng phụ này cung cấp **cảnh giới** và **hệ** cho cả NPC và bí cảnh, vì schema `data/design-raw.js:npc` không có cột riêng cho hai trường đó. Các bảng nhập thiết kế phía dưới **giữ nguyên tên và thứ tự cột** của nguồn.

| Mã tạm | Cảnh giới | Hệ | Khu vực | Loại |
| --- | --- | --- | --- | --- |
| DRAFT-QV-005 | Luyện Hư | không hệ | Hư Không Cảnh | Quái thường |
| DRAFT-NPC-005 | Luyện Hư | không hệ | Hư Không Cảnh | NPC giao nhiệm vụ |
| DRAFT-QV-006 | Hợp Thể | thổ | Hợp Thể Sơn | Quái thường |
| DRAFT-NPC-006 | Hợp Thể | không hệ | Hợp Thể Sơn | NPC giao nhiệm vụ |
| DRAFT-BC-006 | Hợp Thể | thổ | Hợp Thể Sơn | Bí cảnh |
| DRAFT-BS-006 | Hợp Thể | thổ | Hợp Thể Sơn | Boss bí cảnh |
| DRAFT-QV-007 | Đại Thừa | kim | Đại Thừa Thiên | Quái thường |
| DRAFT-NPC-007 | Đại Thừa | không hệ | Đại Thừa Thiên | NPC giao nhiệm vụ |
| DRAFT-QV-008 | Độ Kiếp | thổ | Cửu Cửu Kiếp Đài | Quái thường |
| DRAFT-NPC-008 | Độ Kiếp | không hệ | Cửu Cửu Kiếp Đài | NPC giao nhiệm vụ |
| DRAFT-QV-009 | Chân Tiên | hỏa | Chân Tiên Điện | Quái thường |
| DRAFT-NPC-009 | Chân Tiên | không hệ | Chân Tiên Điện | NPC giao nhiệm vụ |
| DRAFT-BC-009 | Chân Tiên | hỏa | Chân Tiên Điện | Bí cảnh |
| DRAFT-BS-009 | Chân Tiên | hỏa | Chân Tiên Điện | Boss bí cảnh |
| DRAFT-QV-010 | Kim Tiên | kim | Kim Tiên Hải | Quái thường |
| DRAFT-NPC-010 | Kim Tiên | không hệ | Kim Tiên Hải | NPC giao nhiệm vụ |
| DRAFT-BC-010 | Kim Tiên | kim | Kim Tiên Hải | Bí cảnh |
| DRAFT-BS-010 | Kim Tiên | kim | Kim Tiên Hải | Boss bí cảnh |
| DRAFT-QV-011 | Thái Ất | mộc | Thái Ất Cung | Quái thường |
| DRAFT-NPC-011 | Thái Ất | không hệ | Thái Ất Cung | NPC giao nhiệm vụ |
| DRAFT-BC-011 | Thái Ất | mộc | Thái Ất Cung | Bí cảnh |
| DRAFT-BS-011 | Thái Ất | mộc | Thái Ất Cung | Boss bí cảnh |
| DRAFT-QV-012 | Đại La | thủy | Đại La Thiên | Quái thường |
| DRAFT-NPC-012 | Đại La | không hệ | Đại La Thiên | NPC giao nhiệm vụ |
| DRAFT-BC-012 | Đại La | thủy | Đại La Thiên | Bí cảnh |
| DRAFT-BS-012 | Đại La | thủy | Đại La Thiên | Boss bí cảnh |
| DRAFT-QV-013 | Đạo Tổ | thổ | Hồng Mông Đạo Vực | Quái thường |
| DRAFT-NPC-013 | Đạo Tổ | không hệ | Hồng Mông Đạo Vực | NPC giao nhiệm vụ |
| DRAFT-BC-013 | Đạo Tổ | không hệ | Hồng Mông Đạo Vực | Bí cảnh |
| DRAFT-BS-013 | Đạo Tổ | không hệ | Hồng Mông Đạo Vực | Boss bí cảnh |

## 4. Quái thường — đúng 16 trường và thứ tự `data/design-raw.js['quái vật']`

| mã quái | tên quái | cấp | hệ | khu vực | hp | mp | atk | def | eva (%) | sta | crit (%) | crit_dame (%) | kỹ năng | exp | mã ảnh cũ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DRAFT-QV-005 | Hư Sa Lân Dẫn | chờ duyệt | không hệ | Hư Không Cảnh | 1,966,080 | chờ duyệt | 196,608 | 98,304 | 0 (fallback) | chờ duyệt | 0 (fallback) | 150 (fallback) | **DỰ THẢO THIẾT KẾ** — Ẩn dưới lớp cát rỗng và dò chuyển động bằng lân giáp. Kỹ năng: chờ duyệt. | chờ duyệt | null |
| DRAFT-QV-006 | Thiết Bì Nham Trùng | chờ duyệt | thổ | Hợp Thể Sơn | 15,728,640 | chờ duyệt | 1,572,864 | 786,432 | 0 (fallback) | chờ duyệt | 0 (fallback) | 150 (fallback) | **DỰ THẢO THIẾT KẾ** — Đào mạch đá ở sườn núi và làm rung mặt đất khi bị quấy nhiễu. Kỹ năng: chờ duyệt. | chờ duyệt | null |
| DRAFT-QV-007 | Thạch Vân Phi Điệp | chờ duyệt | kim | Đại Thừa Thiên | 125,829,120 | chờ duyệt | 12,582,912 | 6,291,456 | 0 (fallback) | chờ duyệt | 0 (fallback) | 150 (fallback) | **DỰ THẢO THIẾT KẾ** — Bay quanh các thềm đá cao, phản chiếu ánh kim từ lớp cánh mỏng. Kỹ năng: chờ duyệt. | chờ duyệt | null |
| DRAFT-QV-008 | Khuyết Đài Thổ Giáp | chờ duyệt | thổ | Cửu Cửu Kiếp Đài | 1,006,632,960 | chờ duyệt | 100,663,296 | 50,331,648 | 0 (fallback) | chờ duyệt | 0 (fallback) | 150 (fallback) | **DỰ THẢO THIẾT KẾ** — Ẩn trong vết nứt của kiếp đài và chỉ xuất hiện khi nền đá rung. Kỹ năng: chờ duyệt. | chờ duyệt | null |
| DRAFT-QV-009 | Vọng Nhật Hỏa Linh | chờ duyệt | hỏa | Chân Tiên Điện | 8,053,063,680 | chờ duyệt | 805,306,368 | 402,653,184 | 0 (fallback) | chờ duyệt | 0 (fallback) | 150 (fallback) | **DỰ THẢO THIẾT KẾ** — Tụ hỏa nơi mái điện và đổi hướng theo ánh bình minh. Kỹ năng: chờ duyệt. | chờ duyệt | null |
| DRAFT-QV-010 | Kim Hải Trảo Ngư | chờ duyệt | kim | Kim Tiên Hải | 64,424,509,440 | chờ duyệt | 6,442,450,944 | 3,221,225,472 | 0 (fallback) | chờ duyệt | 0 (fallback) | 150 (fallback) | **DỰ THẢO THIẾT KẾ** — Men theo dòng kim quang dưới biển, để lại vệt sáng trên nước. Kỹ năng: chờ duyệt. | chờ duyệt | null |
| DRAFT-QV-011 | Tụ Mộc Vân Sùng | chờ duyệt | mộc | Thái Ất Cung | 515,396,075,520 | chờ duyệt | 51,539,607,552 | 25,769,803,776 | 0 (fallback) | chờ duyệt | 0 (fallback) | 150 (fallback) | **DỰ THẢO THIẾT KẾ** — Trú trong tán cây dày và dệt màng mộc khí qua khe lá. Kỹ năng: chờ duyệt. | chờ duyệt | null |
| DRAFT-QV-012 | Lưu Ngân Thủy Giáp | chờ duyệt | thủy | Đại La Thiên | 4,123,168,604,160 | chờ duyệt | 412,316,860,416 | 206,158,430,208 | 0 (fallback) | chờ duyệt | 0 (fallback) | 150 (fallback) | **DỰ THẢO THIẾT KẾ** — Mang vỏ thủy quang, trườn theo dòng chảy giữa các vân đài. Kỹ năng: chờ duyệt. | chờ duyệt | null |
| DRAFT-QV-013 | Hồng Nham Địa Tằm | chờ duyệt | thổ | Hồng Mông Đạo Vực | 32,985,348,833,280 | chờ duyệt | 3,298,534,883,328 | 1,649,267,441,664 | 0 (fallback) | chờ duyệt | 0 (fallback) | 150 (fallback) | **DỰ THẢO THIẾT KẾ** — Đào xuyên nền nham cổ, bảo vệ các mạch đất yên tĩnh. Kỹ năng: chờ duyệt. | chờ duyệt | null |

## 5. NPC — đúng 14 trường và thứ tự `data/design-raw.js:npc`

| mã NPC | tên NPC | bối cảnh | quan hệ | thích (mã vật phẩm) | không thích (mã vật phẩm) | không thích khác | thiện cảm ban đầu | vai trò | mã hàng/dạy/đan | địa điểm | giới | ảnh | mã ảnh cũ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DRAFT-NPC-005 | Phó Nghiễn Sa | **DỰ THẢO THIẾT KẾ** — Trông coi mốc đường hư cảnh và nhờ người qua lại dọn thú lạc. | người lạ | chờ duyệt | chờ duyệt | chờ duyệt | 0 | giao nhiệm vụ | null | Hư Không Cảnh | Linh Giới | chờ duyệt | null |
| DRAFT-NPC-006 | Đinh Vân Kỳ | **DỰ THẢO THIẾT KẾ** — Giữ lối lên núi hợp thể và nhờ tu sĩ bảo vệ mạch nham. | người lạ | chờ duyệt | chờ duyệt | chờ duyệt | 0 | giao nhiệm vụ | null | Hợp Thể Sơn | Linh Giới | chờ duyệt | null |
| DRAFT-NPC-007 | Lạc Mộc Hi | **DỰ THẢO THIẾT KẾ** — Quan sát tầng mây đại thừa và nhờ dẹp bầy trùng phá cây. | người lạ | chờ duyệt | chờ duyệt | chờ duyệt | 0 | giao nhiệm vụ | null | Đại Thừa Thiên | Linh Giới | chờ duyệt | null |
| DRAFT-NPC-008 | Chử Nguyệt Thâm | **DỰ THẢO THIẾT KẾ** — Ghi chép vết kiếp trên đài và nhờ thanh trừ thú bám nền đá. | người lạ | chờ duyệt | chờ duyệt | chờ duyệt | 0 | giao nhiệm vụ | null | Cửu Cửu Kiếp Đài | Linh Giới | chờ duyệt | null |
| DRAFT-NPC-009 | Trần Tịnh Thư | **DỰ THẢO THIẾT KẾ** — Giữ sân lửa trong tiên điện và cần người dọn linh thú thất lạc. | người lạ | chờ duyệt | chờ duyệt | chờ duyệt | 0 | giao nhiệm vụ | null | Chân Tiên Điện | Tiên Giới | chờ duyệt | null |
| DRAFT-NPC-010 | Dương Mạch Khiêm | **DỰ THẢO THIẾT KẾ** — Chăm tuyến đường ven biển kim quang và nhờ bảo vệ thương lộ. | người lạ | chờ duyệt | chờ duyệt | chờ duyệt | 0 | giao nhiệm vụ | null | Kim Tiên Hải | Tiên Giới | chờ duyệt | null |
| DRAFT-NPC-011 | Thẩm Khê Ngọc | **DỰ THẢO THIẾT KẾ** — Canh cổng vườn mộc trong cung và nhờ dẹp thú phá trận. | người lạ | chờ duyệt | chờ duyệt | chờ duyệt | 0 | giao nhiệm vụ | null | Thái Ất Cung | Tiên Giới | chờ duyệt | null |
| DRAFT-NPC-012 | Phan Ngân Trạch | **DỰ THẢO THIẾT KẾ** — Giữ nguồn nước trong đạo đài và nhờ thanh lọc dấu vết yêu thú. | người lạ | chờ duyệt | chờ duyệt | chờ duyệt | 0 | giao nhiệm vụ | null | Đại La Thiên | Tiên Giới | chờ duyệt | null |
| DRAFT-NPC-013 | Hạ Tinh Thoại | **DỰ THẢO THIẾT KẾ** — Trông lối về đạo vực và nhờ mở đường qua mạch nham. | người lạ | chờ duyệt | chờ duyệt | chờ duyệt | 0 | giao nhiệm vụ | null | Hồng Mông Đạo Vực | Tiên Giới | chờ duyệt | null |

**Nhiệm vụ đi kèm (mỗi NPC một nhiệm vụ):** `name, desc, need, minAffinity, reward` giữ đúng thứ tự trường mẫu `data/social.js:NPC_QUESTS`; cột `mã nháp`, `mã NPC` là khóa liên kết duyệt tài liệu, **chưa phải schema mới**.

| Mã nháp | Mã NPC | name | desc | need | minAffinity | reward |
| --- | --- | --- | --- | --- | --- | --- |
| DRAFT-NQ-005 | DRAFT-NPC-005 | Dọn mạch hư sa | **DỰ THẢO THIẾT KẾ** — Dẹp thú quanh cột mốc để giữ đường qua hư cảnh thông suốt. | {type:'kill', count:25} | 0 | {affinity:10, stone:600} |
| DRAFT-NQ-006 | DRAFT-NPC-006 | Hộ sơn đoạn nham | **DỰ THẢO THIẾT KẾ** — Đuổi thú phá mạch nham trước khi lối núi bị chặn. | {type:'kill', count:25} | 0 | {affinity:10, stone:600} |
| DRAFT-NQ-007 | DRAFT-NPC-007 | Trừ trùng đại thừa | **DỰ THẢO THIẾT KẾ** — Dẹp bầy thú bám tán cây trên thềm Đại Thừa. | {type:'kill', count:25} | 0 | {affinity:10, stone:600} |
| DRAFT-NQ-008 | DRAFT-NPC-008 | Tĩnh đài tránh kiếp | **DỰ THẢO THIẾT KẾ** — Thanh trừ thú bám đá để người ghi chép trở lại kiếp đài. | {type:'kill', count:25} | 0 | {affinity:10, stone:600} |
| DRAFT-NQ-009 | DRAFT-NPC-009 | Dọn lửa tịnh viên | **DỰ THẢO THIẾT KẾ** — Đẩy lùi thú tụ quanh lối vào khu vườn hỏa quang. | {type:'kill', count:25} | 0 | {affinity:10, stone:600} |
| DRAFT-NQ-010 | DRAFT-NPC-010 | Giữ đường kim hải | **DỰ THẢO THIẾT KẾ** — Dọn thú trên tuyến ven biển để hành trình không bị gián đoạn. | {type:'kill', count:25} | 0 | {affinity:10, stone:600} |
| DRAFT-NQ-011 | DRAFT-NPC-011 | Bảo vệ giám mộc | **DỰ THẢO THIẾT KẾ** — Đuổi thú phá mộc trận quanh cổng vườn. | {type:'kill', count:25} | 0 | {affinity:10, stone:600} |
| DRAFT-NQ-012 | DRAFT-NPC-012 | Thanh lọc thủy ấn | **DỰ THẢO THIẾT KẾ** — Thanh trừ thú quanh nơi thu nước trước khi mở lại đường dẫn. | {type:'kill', count:25} | 0 | {affinity:10, stone:600} |
| DRAFT-NQ-013 | DRAFT-NPC-013 | Thông lối hồng nham | **DỰ THẢO THIẾT KẾ** — Dọn sạch lối nham để người đi qua đạo vực an toàn. | {type:'kill', count:25} | 0 | {affinity:10, stone:600} |

## 6. Bí cảnh mới — đúng thứ tự `id,name,element,realm,floors,seconds,boss,desc` trong `data/adventures.js:DUNGEONS`

| id | name | element | realm | floors | seconds | boss | desc |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DRAFT-BC-006 | Tầng Nham Tương Dẫn | 4 | 6 | chờ duyệt | chờ duyệt | Nham Môn Thiết Linh | **DỰ THẢO THIẾT KẾ** — Một đường hầm nham nối các tầng đá của Hợp Thể Sơn. |
| DRAFT-BC-009 | Tịnh Viên Hỏa Lộ | 3 | 9 | chờ duyệt | chờ duyệt | Tịnh Viên Hỏa Trụ | **DỰ THẢO THIẾT KẾ** — Một khu vườn hỏa quang chia lối đi trong Chân Tiên Điện. |
| DRAFT-BC-010 | Kim Hải Kính Đài | 0 | 10 | chờ duyệt | chờ duyệt | Hải Kính Kim Giáp | **DỰ THẢO THIẾT KẾ** — Một đài gương nổi trên sóng kim quang của Kim Tiên Hải. |
| DRAFT-BC-011 | Giám Mộc Tàng Hành | 1 | 11 | chờ duyệt | chờ duyệt | Tĩnh Mộc Giám Thần | **DỰ THẢO THIẾT KẾ** — Một hành lang mộc ấn dẫn qua các sân kín ở Thái Ất Cung. |
| DRAFT-BC-012 | Đại La Thủy Ấn | 2 | 12 | chờ duyệt | chờ duyệt | Thủy Tượng Cổ Nhân | **DỰ THẢO THIẾT KẾ** — Một đài thủy ấn rẽ dòng chảy tại Đại La Thiên. |
| DRAFT-BC-013 | Hồng Nham Vô Môn | -1 | 13 | chờ duyệt | chờ duyệt | Lưỡng Nham Thủ Môn | **DỰ THẢO THIẾT KẾ** — Một cửa nham tĩnh lặng nằm sâu trong Hồng Mông Đạo Vực. |

**Định lượng hộ vệ tầng 1 (đã tính theo công thức hiện có, không đặt số tự do):**

| id | HP hộ vệ tầng 1 | ATK hộ vệ tầng 1 | DEF hộ vệ tầng 1 | Nguồn |
| --- | --- | --- | --- | --- |
| DRAFT-BC-006 | 7,864,320 | 983,040 | 655,360 | engine/rules/adventures.js: RUN, runEnemy() |
| DRAFT-BC-009 | 4,026,531,840 | 503,316,480 | 335,544,320 | engine/rules/adventures.js: RUN, runEnemy() |
| DRAFT-BC-010 | 32,212,254,720 | 4,026,531,840 | 2,684,354,560 | engine/rules/adventures.js: RUN, runEnemy() |
| DRAFT-BC-011 | 257,698,037,760 | 32,212,254,720 | 21,474,836,480 | engine/rules/adventures.js: RUN, runEnemy() |
| DRAFT-BC-012 | 2,061,584,302,080 | 257,698,037,760 | 171,798,691,840 | engine/rules/adventures.js: RUN, runEnemy() |
| DRAFT-BC-013 | 16,492,674,416,640 | 2,061,584,302,080 | 1,374,389,534,720 | engine/rules/adventures.js: RUN, runEnemy() |

## 7. Boss của sáu bí cảnh mới — đúng 16 trường và thứ tự `data/design-raw.js:boss`

| mã boss | tên boss | cấp | hệ | khu vực | hp | mp | atk | def | eva (%) | sta | crit (%) | crit_dame (%) | kỹ năng | exp | mã ảnh cũ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DRAFT-BS-006 | Nham Môn Thiết Linh | chờ duyệt | thổ | Hợp Thể Sơn | 52,428,800 | chờ duyệt | 5,242,880 | 2,621,440 | 0 (fallback) | chờ duyệt | 0 (fallback) | 150 (fallback) | **DỰ THẢO THIẾT KẾ** — Canh miệng đường nham và chống đỡ kẻ xâm nhập bằng giáp đá. Kỹ năng: chờ duyệt. | chờ duyệt | null |
| DRAFT-BS-009 | Tịnh Viên Hỏa Trụ | chờ duyệt | hỏa | Chân Tiên Điện | 26,843,545,600 | chờ duyệt | 2,684,354,560 | 1,342,177,280 | 0 (fallback) | chờ duyệt | 0 (fallback) | 150 (fallback) | **DỰ THẢO THIẾT KẾ** — Giữ ngọn hỏa quang ở lối cuối của khu vườn. Kỹ năng: chờ duyệt. | chờ duyệt | null |
| DRAFT-BS-010 | Hải Kính Kim Giáp | chờ duyệt | kim | Kim Tiên Hải | 214,748,364,800 | chờ duyệt | 21,474,836,480 | 10,737,418,240 | 0 (fallback) | chờ duyệt | 0 (fallback) | 150 (fallback) | **DỰ THẢO THIẾT KẾ** — Đứng giữa mặt gương kim hải và chặn đường qua đài. Kỹ năng: chờ duyệt. | chờ duyệt | null |
| DRAFT-BS-011 | Tĩnh Mộc Giám Thần | chờ duyệt | mộc | Thái Ất Cung | 1,717,986,918,400 | chờ duyệt | 171,798,691,840 | 85,899,345,920 | 0 (fallback) | chờ duyệt | 0 (fallback) | 150 (fallback) | **DỰ THẢO THIẾT KẾ** — Giữ trận mộc ấn tại sân sâu nhất của hành lang. Kỹ năng: chờ duyệt. | chờ duyệt | null |
| DRAFT-BS-012 | Thủy Tượng Cổ Nhân | chờ duyệt | thủy | Đại La Thiên | 13,743,895,347,200 | chờ duyệt | 1,374,389,534,720 | 687,194,767,360 | 0 (fallback) | chờ duyệt | 0 (fallback) | 150 (fallback) | **DỰ THẢO THIẾT KẾ** — Canh dòng nước đi vào tâm đạo đài. Kỹ năng: chờ duyệt. | chờ duyệt | null |
| DRAFT-BS-013 | Lưỡng Nham Thủ Môn | chờ duyệt | không hệ | Hồng Mông Đạo Vực | 109,951,162,777,600 | chờ duyệt | 10,995,116,277,760 | 5,497,558,138,880 | 0 (fallback) | chờ duyệt | 0 (fallback) | 150 (fallback) | **DỰ THẢO THIẾT KẾ** — Bảo vệ cửa nham tĩnh lặng ở cuối đạo vực. Kỹ năng: chờ duyệt. | chờ duyệt | null |

**Lưu ý tích hợp:** không phải cứ nhập các bảng này là game tự dùng chúng. `engine/rules/combat.js` chỉ tra quái thiết kế cho vùng r<5; `engine/rules/adventures.js` còn yêu cầu bí cảnh thực sự được thêm vào `DUNGEONS` và trỏ đúng boss. Toàn bộ bước này **ngoài phạm vi tài liệu** và phải duyệt P0/P1 trước khi đổi luật/dữ liệu.

## 8. Kiểm trùng tên và nguồn đối chiếu

Kiểm bằng script đọc **12 file** `data/*.js` (bao gồm `design-raw.js`, `catalog.js`, `adventures.js`, `social.js`, `items.js`, `story.js`), so khớp **39 tên mới** (quái 9, NPC 9, nhiệm vụ 9, bí cảnh 6, boss 6) với nội dung đã chuẩn hóa NFC/vi-VN và đối chiếu trùng nội bộ: **0 trùng với data/, 0 trùng nội bộ**. Đây là phép kiểm **chuỗi tên**, không phải bảo đảm pháp lý về mọi tác phẩm bên ngoài.

Các bản nháp tên được đặt mới cho tài liệu này; không dựa vào danh xưng nhân vật/tên địa điểm của tiểu thuyết hoặc trò chơi bên ngoài.

## 9. Checklist chủ dự án duyệt — để trống

Mỗi dòng giữ nguyên ba lựa chọn; chủ dự án đánh dấu **một** lựa chọn sau khi quyết định. Mọi mục đều là **DỰ THẢO THIẾT KẾ**.

- DRAFT-QV-005 — Hư Sa Lân Dẫn: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-QV-006 — Thiết Bì Nham Trùng: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-QV-007 — Thạch Vân Phi Điệp: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-QV-008 — Khuyết Đài Thổ Giáp: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-QV-009 — Vọng Nhật Hỏa Linh: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-QV-010 — Kim Hải Trảo Ngư: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-QV-011 — Tụ Mộc Vân Sùng: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-QV-012 — Lưu Ngân Thủy Giáp: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-QV-013 — Hồng Nham Địa Tằm: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-NPC-005 — Phó Nghiễn Sa: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-NPC-006 — Đinh Vân Kỳ: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-NPC-007 — Lạc Mộc Hi: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-NPC-008 — Chử Nguyệt Thâm: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-NPC-009 — Trần Tịnh Thư: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-NPC-010 — Dương Mạch Khiêm: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-NPC-011 — Thẩm Khê Ngọc: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-NPC-012 — Phan Ngân Trạch: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-NPC-013 — Hạ Tinh Thoại: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-NQ-005 — Dọn mạch hư sa: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-NQ-006 — Hộ sơn đoạn nham: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-NQ-007 — Trừ trùng đại thừa: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-NQ-008 — Tĩnh đài tránh kiếp: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-NQ-009 — Dọn lửa tịnh viên: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-NQ-010 — Giữ đường kim hải: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-NQ-011 — Bảo vệ giám mộc: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-NQ-012 — Thanh lọc thủy ấn: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-NQ-013 — Thông lối hồng nham: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-BC-006 — Tầng Nham Tương Dẫn: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-BC-009 — Tịnh Viên Hỏa Lộ: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-BC-010 — Kim Hải Kính Đài: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-BC-011 — Giám Mộc Tàng Hành: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-BC-012 — Đại La Thủy Ấn: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-BC-013 — Hồng Nham Vô Môn: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-BS-006 — Nham Môn Thiết Linh: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-BS-009 — Tịnh Viên Hỏa Trụ: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-BS-010 — Hải Kính Kim Giáp: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-BS-011 — Tĩnh Mộc Giám Thần: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-BS-012 — Thủy Tượng Cổ Nhân: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

- DRAFT-BS-013 — Lưỡng Nham Thủ Môn: [ ] Duyệt  [ ] Sửa  [ ] Bỏ

**Ngoài danh sách mục:** chủ dự án còn phải chọn số tầng/thời lượng bí cảnh, `cấp`, `mp`, `sta`, `exp`, kỹ năng, vật phẩm thích/ghét, hình ảnh và cách nối nhiệm vụ cao giới: [ ] Duyệt  [ ] Sửa  [ ] Bỏ.

