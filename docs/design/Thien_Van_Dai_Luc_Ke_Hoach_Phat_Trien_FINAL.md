# THIÊN VÂN ĐẠI LỤC — KẾ HOẠCH PHÁT TRIỂN GAME

**FINAL DESIGN BASELINE v1.3 · 17/10/2026 · Chủ dự án: zeplaovn**

> Đây là tài liệu canonical cấp cao. Khi mâu thuẫn với các bản trước, **v1.3 được ưu tiên**. Stack frontend/API/database hiện **CHƯA CHỐT** và không phải quyết định thiết kế game. Mục gắn **[Đề xuất v1.3]** là thông số/luật do tài liệu chốt tạm để có thể triển khai và đo; chờ chủ dự án duyệt. Thay đổi so với v1.2 nằm trong `CHANGELOG_v1.3.md`.

## 1. Tầm nhìn

Thiên Vân Đại Lục là game tu tiên idle theo thời gian thật, kết hợp tiến trình dài hạn, rủi ro mất kiếp và meta progression. Sau **Thiên Biến**, toàn bộ nhân loại bị dịch chuyển khỏi Trái Đất tới Thiên Vân Đại Lục. Người chơi bắt đầu một kiếp tu sĩ, sống sót, tu luyện và đi xuyên ba đại giới trong **cùng một kiếp**.

Trụ cột:
- Hạ Giới → Linh Giới → Tiên Giới là một hành trình liên tục của cùng nhân vật.
- **Phi Thăng chỉ chuyển map, không kết thúc kiếp.**
- Tử vong thật sự kết thúc kiếp và đưa người chơi vào trùng sinh.
- Thiên Mệnh là meta progression bền vững giữa các kiếp.
- NPC/tông môn có lựa chọn và hậu quả.
- Kinh tế có sink, mất tài sản khi tử vong và chợ người chơi có kiểm soát.
- Nội dung nguy hiểm phải báo rõ nguy cơ trước khi người chơi xác nhận tham gia.

## 2. Ba map chính và Phi Thăng

| Map | Cảnh giới trọng tâm | Mốc thiết kế | Ý nghĩa |
|---|---|---:|---|
| **Hạ Giới** | Phàm Nhân → Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần | ~15 ngày đường sạch | Sinh tồn, nhập đạo, tông môn |
| **Linh Giới** | Luyện Hư → Hợp Thể → Đại Thừa → Độ Kiếp | ~20 ngày đường sạch | Pháp tướng, trận pháp, chân tướng Thiên Biến |
| **Tiên Giới** | Ngụy Tiên → Chân Tiên → Kim Tiên → Thái Ất → Đại La sơ nhập | ~25 ngày đường sạch | Tiên khiếu, pháp tắc, Đài Quy Hương |

### Luật Phi Thăng — ĐÃ CHỐT

```text
Một kiếp
  Hạ Giới
     ↓ Phi Thăng — không reset
  Linh Giới
     ↓ Phi Thăng — không reset
  Tiên Giới
     ↓
  Đài Quy Hương / Endgame
```

- Phi Thăng giữ nguyên nhân vật, vật phẩm, tiền, trang bị, quan hệ và tiến trình của **kiếp hiện tại**.
- UI/giao diện thế giới phải theo `current_map`/map hiện tại, không theo cờ “đã phi thăng ở kiếp trước”.
- Chuyển cảnh Phi Thăng chạy mỗi lần nhân vật thực sự chuyển Hạ → Linh hoặc Linh → Tiên.
- Phi Thăng **không gọi end-life**, không phát thưởng luân hồi và không tự tính là một kiếp mới.

## 3. Tử vong, mất trắng và Trùng Sinh

### 3.1. Luật cốt lõi — ĐÃ CHỐT

Khi nhân vật **chết thật sự**, kiếp hiện tại kết thúc:

1. Tọa hóa do hết thọ nguyên.
2. Chết khi thăng cảnh giới/đại đột phá.
3. Độ Kiếp thất bại dẫn đến tử vong.
4. Chết trong PvP có tử vong thật.
5. Chết trong bí cảnh có cờ `lethal`.
6. Chết trong boss/nội dung có cờ `lethal`.
7. Chết trong nội dung endgame sinh tử, bao gồm Hỗn Độn nếu đã bước vào trận sinh tử.

### 3.2. Hậu quả

**Mất khi trùng sinh:**
- toàn bộ LS/LT/TN của kiếp;
- toàn bộ vật phẩm trong inventory;
- toàn bộ trang bị/pháp bảo;
- toàn bộ linh dược, đan dược, nguyên liệu;
- toàn bộ item mua từ Thiên Mệnh Các nếu item đó chưa tiêu thụ;
- sáu cổ vật Lục Mệnh nếu đang sở hữu dưới dạng vật phẩm vật lý;
- cảnh giới, tầng tu luyện, map hiện tại và phần lớn tiến trình nhân vật;
- quan hệ/tông môn theo kiếp, trừ lore/achievement account-level.

**Giữ qua trùng sinh:**
- số dư Điểm Thiên Mệnh chưa tiêu;
- stat vĩnh viễn đã mua bằng Thiên Mệnh;
- achievement, danh hiệu account-level, lore đã mở;
- các unlock hệ thống được đánh dấu `account_unlock`;
- lịch sử các kiếp và Bia Thiên Mệnh.

> **Không có vật phẩm vật lý nào mặc định miễn mất khi chết.** Nếu sau này muốn có cơ chế bảo lưu, đó phải là quyết định thiết kế mới và không được tự suy diễn từ hệ thống hiện tại.

### 3.3. Nội dung an toàn và sinh tử

- **Luận Đạo / luyện tập:** không tạo trạng thái chết thật; HP về 0 = kết thúc trận, không trùng sinh.
- **PvP sinh tử:** khi đã xác nhận, tử vong = kết thúc kiếp và mất trắng.
- **Bí cảnh thường có lethal flag:** trước khi vào phải hiện cảnh báo tử vong.
- **Khu an toàn:** không cho hành động có thể gây permadeath ngoài ý muốn.
- Nội dung nguy hiểm phải có bước xác nhận rõ ràng; không dùng bẫy UI khiến người chơi mất kiếp mà không biết.

### 3.4. Offline và nội dung lethal [Đề xuất v1.3]

- **Offline/idle không bao giờ gây tử vong.** Tầng nhỏ (tầng 1–8) không có tử vong; auto-tu luyện **dừng trước tầng 9 (đại đột phá) và Độ Kiếp**, chờ người chơi xác nhận khi online.
- Mọi nội dung lethal cần **xác nhận hai bước** và hiện mức rủi ro ước tính trước khi vào.
- **Chết chỉ khi server xác nhận** HP = 0 hoặc kết quả đột phá = death. Mất kết nối không tự gây tử vong:
  - PvP Sinh Tử: mất kết nối quá 30 giây = thua trận (mất điểm/phần thưởng), không mất kiếp.
  - PvE lethal: encounter tạm dừng trên server tối đa 120 giây; hết hạn thì tự rút lui nếu có thể, nếu không thì hủy encounter, không thưởng, không tính tử vong.
- **PvP Sinh Tử không có loot xác:** tài sản người chết bị tiêu hủy; người thắng nhận thưởng cố định theo bậc, không lấy từ tài sản kẻ thua (chặn farm/mule bằng cách tự thua).
- **Công bằng:** ghép đối thủ theo BP chênh tối đa ±10%; chỉ số từ Thiên Mệnh chỉ tính **50%** trong PvP Sinh Tử và Luận Đạo xếp hạng.

### 3.5. Thọ nguyên [Đề xuất v1.3]

- Khởi đầu **100 năm**. Mỗi ngày thời gian tu luyện được tính (đã áp hiệu suất offline và cap 24h) tiêu hao **10 năm**; vắng mặt quá cap không làm già thêm.
- Hoàn tất giai đoạn kết thúc ở ngày mục tiêu *d* thì thọ nguyên tối đa là `100 + 20 × d` năm (cấp qua đại đột phá). Bảng trong `data/tho_nguyen.csv`.
- Ý nghĩa: đường sạch dùng khoảng một nửa thọ nguyên; người chơi chậm hơn **khoảng 2,2 lần** so với đường sạch sẽ chạm tọa hóa gần cuối. Đan thọ nguyên kéo dài thêm (chưa mô hình hóa trong simulator).

### 3.6. Chống chuyển tài sản [Đề xuất v1.3]

- Tài khoản phải tồn tại ít nhất **72 giờ** mới được giao dịch/đấu giá.
- Vật phẩm/tiền nhận qua giao dịch bị **khóa giao dịch lại 24 giờ**.
- Giá trị ròng chuyển ra khỏi kiếp qua giao dịch tối đa **20% tổng tài sản mỗi ngày** (tính theo giá baseline).
- Cặp tài khoản giao dịch qua lại bất thường (hơn 3 lần/ngày) bị flag cho admin, không tự động cấm.
- Không có kho "ngoài kiếp": kho tông môn/ngân hàng vẫn thuộc kiếp và mất khi chết.

## 4. Thiên Mệnh và Thiên Mệnh Các

### 4.1. Cách nhận Điểm Thiên Mệnh — ĐÃ CHỐT

- Mỗi **tầng** tăng thành công được hệ progression xác nhận: **+1 Điểm Thiên Mệnh (TM)**.
- **Mỗi cảnh giới có 9 tầng** (tầng 9 là đại đột phá). 15 cảnh giới × 9 tầng = **135 TM cho một kiếp hoàn tất** (**[Đề xuất v1.3]** để khớp quy tắc "mỗi tầng +1 TM"; mô hình v1.2 chỉ đếm 15 mốc).
- Phi Thăng không cộng bonus TM riêng; nếu đồng thời là một tầng đột phá hợp lệ thì chỉ tính event đó một lần.
- Trong cùng một kiếp, mỗi `breakthrough_milestone_key` chỉ phát TM một lần. Sang kiếp mới có thể kiếm lại.
- TM là account currency: chết/trùng sinh không làm mất TM chưa tiêu.

### 4.2. Hai cách sử dụng TM

**A. Quán Đỉnh Thiên Mệnh — stat vĩnh viễn** **[Đề xuất v1.3]**

| Stat | Giá cấp 1 | Tăng giá mỗi cấp | Cap | Tổng giá đến cap |
|---|---:|---:|---:|---:|
| Tướng Mạo | 6 TM | +1 | +20 | 310 |
| Phúc Duyên | 7 TM | +1 | +20 | 330 |
| Căn Cốt | 8 TM | +2 | +20 | 540 |
| Ngộ Tính | 8 TM | +2 | +20 | 540 |
| Vận Khí | 9 TM | +2 | +20 | 560 |
| **Tổng** | | | | **2.280 TM** |

- 2.280 TM ≈ **17 kiếp hoàn tất**; người chơi không cần đạt cap để có sức mạnh đáng kể (một kiếp hoàn tất mua được khoảng 5–6 cấp Căn Cốt hoặc phân bổ tùy ý).
- Bonus TM là lớp riêng, không thay thế cap +40 từ vật phẩm của một kiếp. Nâng stat TM tồn tại vĩnh viễn trên tài khoản.
- Giá lưu data-driven (`data/thien_menh_cac.csv`, `data/balance_config.json`) để cân lại sau beta.

**B. Thiên Mệnh Các — vật phẩm độc quyền**

- Vật phẩm trong Thiên Mệnh Các **không bán ở shop thường**, **không rơi từ quái, boss hoặc drop table**, không vào market nếu không được chỉ định riêng.
- Giá giữ nguyên 20–90 TM (khoảng 15–67% một kiếp hoàn tất, nhất quán với 135 TM/kiếp).
- Mua bằng TM và trở thành vật phẩm vật lý của kiếp hiện tại. **Chết trước khi dùng thì mất, không hoàn TM**; UI phải cảnh báo rõ khi mua.

Danh sách nguồn chuẩn: `data/thien_menh_cac.csv`.

### 4.3. Cân bằng và guardrail [Đề xuất v1.3]

- **Sức mạnh:** nếu xem gốc + vật phẩm = 50 mỗi stat, thì +20 TM ở cả năm stat cho khoảng **HP +25%, ATK +23%, DEF +20%, SPIRIT +24%** so với build đã đầy trần vật phẩm (theo công thức chỉ số trong Balance Master).
- **Tốc độ:** hiệu ứng TM lên tốc độ tu luyện bị chặn tối đa **+25%**, tức kiếp sạch không nhanh hơn 48 ngày; mục tiêu: kiếp sạch thứ 2 trở đi median ≥ 45 ngày.
- **PvP:** chỉ số TM tính 50% trong PvP xếp hạng (mục 3.4).
- **Chống farm kiếp ngắn:** TM tính theo tầng nên bỏ dở sớm chỉ nhận ít; không có thưởng cố định cho việc chết.

## 5. Tông môn và NPC

### Hạ Giới
- Thanh Vân Tông — chính đạo/kiếm tu.
- Huyết Sát Môn — ma đạo/luyện thể.
- Vạn Dược Cốc — đan đạo/y thuật.

### Linh Giới
Thái Hư Kiếm Cung, Vô Tướng Ma Điện, Bách Thảo Thánh Viện, Thiên Cơ Các.

### Tiên Giới
Cửu Tiêu Tiên Đình, Vạn Pháp Đạo Viện, U Minh Cổ Điện, Quy Hương Thủ Điện.

NPC có thể chết/mất tích trong một kiếp; thông tin bắt buộc phải có cơ chế kế thừa để không khóa tuyến chính. NPC phi thăng là chuyển giới trong cùng đời của NPC nếu họ còn sống, không phải “mở lại ở kiếp sau”.

## 6. Kinh tế và vật phẩm

- Tiền: LS → LT → TN; `1 LT = 1.000 LS`, `1 TN = 1.000 LT`; chỉ đổi lên tại NPC.
- Mất tiền và vật phẩm khi tử vong là một **sink kinh tế thực tế** và phải được đưa vào telemetry.
- Target rolling source/sink sau khi tính cả sink hệ thống + expected death-loss: **0,9–1,35**, vùng khỏe ưu tiên **1,05–1,25**.
- Shop phổ thông 2h; tông môn 8h; hiếm 24h; 1 refresh miễn phí/ngày.
- Item bắt buộc tuyến chính có pity/nguồn đảm bảo.
- Market thuế 5–10%; item Thiên Mệnh, quest, Lục Mệnh, Đạo Đan, unique reward không giao dịch mặc định.
- Giao dịch tuân theo quy tắc chống chuyển tài sản ở mục 3.6.

## 7. Progression ~2 tháng

Mục tiêu sản phẩm vẫn là **khoảng 2 tháng tài khoản chạm endgame Tiên Giới** cho hồ sơ chơi đều. Permadeath làm phân phối có đuôi dài, nên simulator báo đồng thời thời gian đến endgame lần đầu, số lần chết và TM tích lũy.

**Kết quả mô hình v1.3** (20.000 lượt, seed 20261017; thời gian là tổng ngày của tài khoản, gồm các kiếp đã chết). **Xác suất chết là giả định chưa đo**, nên bảng thử ba mức:

| Hazard | P10 | P25 | Median | P75 | P90 | Mean | Clear kiếp 1 | Chết TB | Kiếp sạch thứ 2+ (median) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ×0.5 | 50.22 | 55.26 | 61.94 | 71.04 | 89.7 | 67.03 | 84.1% | 0.189 | 58.71 |
| ×1.0 | 50.91 | 56.53 | 64.52 | 79.83 | 113.5 | 74.33 | 70.44% | 0.412 | 58.78 |
| ×1.5 | 51.78 | 57.9 | 67.36 | 94.34 | 131.17 | 81.87 | 59.62% | 0.664 | 58.58 |

Cách đọc:
- Với hazard giả định mặc định (×1,0): median ≈ 64,5 ngày, P90 ≈ 113 ngày, khoảng 70% người chơi chạm endgame ngay kiếp đầu. Đường sạch khoảng 60 ngày nhân với mức chăm chỉ của từng người.
- Trong mô hình này Thiên Mệnh chỉ rút ngắn rất ít thời gian (kiếp sạch thứ 2+ median ≈ 58,8 ngày). Tác dụng thật nằm ở sức mạnh chiến đấu và xác suất đột phá, **chưa được mô hình hóa**.
- Đây vẫn là mô hình thiết kế, không thay thế engine và telemetry. Kết quả: `data/simulation_result_v1_3.json`.

## 8. Không Gian Hỗn Độn / Lục Mệnh

Giữ độ khó đã chốt:
1. Sáu tài khoản khác nhau.
2. Sáu loại cổ vật khác nhau.
3. Cả sáu tới Tiên Giới và đủ điều kiện sức mạnh.
4. Cùng online tại Đài Quy Hương.
5. Cùng kích hoạt đại trận và cùng chiến đấu.
6. Không NPC thay thế.

**Cập nhật v1.2:** cổ vật là vật phẩm vật lý của kiếp. Nếu người giữ cổ vật chết trước nghi thức, cổ vật đó mất cùng inventory và phải được tìm lại ở một kiếp sau. Mỗi loại vẫn có thể tồn tại ở nhiều tài khoản để server không bị khóa vĩnh viễn.

**Điều kiện tham gia [Đề xuất v1.3]:** tài khoản tối thiểu 14 ngày tuổi; có hàng chờ tìm đồng đội và cửa sổ sự kiện định kỳ tại Đài Quy Hương để sáu người thật gặp nhau khi cộng đồng còn nhỏ; tín hiệu trùng thiết bị/IP chỉ để cảnh báo admin, không tự động cấm.

## 9. Kiến trúc kỹ thuật — OPEN

**Chưa chốt:** frontend framework, API language/framework, topology dịch vụ và hosting.

Tài liệu game-design chỉ yêu cầu các capability sau:
- server-authoritative hoặc server-verified cho breakthrough, death, TM, drop, craft, PvP sinh tử, market và Lục Mệnh;
- transaction/idempotency cho tử vong, phát TM, market, first-clear;
- migration versioned cho save/schema;
- account/life separation rõ ràng;
- UI không được tự quyết định death, TM balance hoặc reward.

Không ghi Svelte, Go, Node/Fastify hay công nghệ cụ thể thành baseline cho tới khi chủ dự án chốt.

## 10. Data model thiết kế tối thiểu

### Account/meta
- `account_id`
- `heaven_mandate_balance`
- `heaven_mandate_spent`
- `heaven_mandate_stat_levels`
- `account_unlocks`
- `achievements`
- `lore_flags`
- `life_count`

### Current life
- `life_id`
- `current_map`
- `realm`
- `minor_stage`
- `inventory`
- `equipment`
- `wallet_ls/lt/tn`
- `sect_membership`
- `npc_relations`
- `breakthrough_milestones_claimed`
- `is_alive`

### Death transaction
Một death transaction hợp lệ phải:
1. khóa life đang sống;
2. ghi nguyên nhân tử vong;
3. snapshot lịch sử kiếp;
4. xóa/tiêu hủy inventory, equipment, wallet của kiếp;
5. không xóa TM/meta stat;
6. tăng `life_count`;
7. tạo life mới idempotently.

## 11. Database làm mới từ đầu

Chủ dự án quyết định **tạo database mới từ đầu: không còn save cũ, không có migration save legacy**.

- Schema v2 bắt đầu từ migration đầu tiên, tách rõ account và life (mục 10).
- Người chơi hiện tại mất tiến trình; cần thông báo trước ngày chuyển.
- Phải dựng lại các cơ chế bảo vệ: revision, giới hạn kích thước save, rate limit, sổ cái thời gian tin cậy, chặn tụt tiến trình, RLS khóa ghi từ client.
- Admin Console và wiki hiện phụ thuộc schema cũ nên phải cập nhật theo.

## 12. Telemetry bắt buộc

Telemetry phải có **trước hoặc cùng lúc với Hạ Giới v1.2**, không để cuối roadmap:
- time-to-realm và time-to-first-endgame;
- số kiếp trước endgame;
- death rate theo nguyên nhân/map/cảnh giới;
- % death PvP / bí cảnh / đột phá / Độ Kiếp;
- TM earned/spent/balance theo tuổi tài khoản;
- stat TM distribution;
- item Thiên Mệnh nào được mua và tỷ lệ mất trước khi dùng;
- source/sink tiền, bao gồm `death_loss_value`;
- churn sau tử vong lớn;
- tỷ lệ người chơi tránh toàn bộ nội dung lethal.

## 13. Lộ trình thiết kế/triển khai

1. Chuẩn hóa lifecycle `alive → death → rebirth` và separation account/life.
2. Instrument telemetry/economy/death/TM ngay từ Hạ Giới.
3. Database v2 từ đầu (schema account/life, death transaction, thời gian tin cậy); không có migration save cũ.
4. Hệ Thiên Mệnh + Thiên Mệnh Các.
5. Hạ Giới data-driven NPC/tông môn/combat.
6. Linh Giới + Phi Thăng cùng kiếp.
7. Tiên Giới + Đài Quy Hương.
8. PvP sinh tử/bí cảnh lethal sau khi death transaction ổn định.
9. Hỗn Độn tách biệt.
10. Chốt stack/API khi chủ dự án quyết định; game-design không phụ thuộc lựa chọn này.

## 14. Open Decisions

1. Stack frontend/API/database/hosting (database làm mới từ đầu; công nghệ chưa chốt).
2. **Duyệt các giá trị [Đề xuất v1.3]:** giá Quán Đỉnh, 135 TM/kiếp (9 tầng mỗi cảnh giới), TM stat 50% trong PvP xếp hạng, thọ nguyên, chống chuyển tài sản, quy tắc mất kết nối, không loot xác PvP.
3. Xác suất chết thật của từng bí cảnh/boss/Độ Kiếp: hiện là giả định, đo trong closed beta.
4. Ngưỡng chiến lực Lục Mệnh: lấy theo percentile endgame thật sau beta.
5. Giá cuối Quán Đỉnh và item Thiên Mệnh sau telemetry.
6. Cập nhật Admin Console/wiki theo schema mới và thông báo mất tiến trình.

## 15. Tài liệu canonical v1.3

1. `Thien_Van_Dai_Luc_Ke_Hoach_Phat_Trien_FINAL.md`
2. `Thien_Van_Dai_Luc_Cot_Truyen_NPC_Tong_Mon_3_Map.md`
3. `Thien_Van_Dai_Luc_Khong_Gian_Hon_Don_BI_MAT.md` — spoiler nội bộ, không đưa vào repo công khai, wiki hay bundle frontend
4. `Thien_Van_Dai_Luc_Balance_Master_60_Ngay.md`
5. `Thien_Van_Dai_Luc_Balance_Master_60_Ngay.xlsx` (dựng lại từ dữ liệu v1.3)
6. `data/*.csv/json`
7. `Thien_Van_Dai_Luc_Simulator_60_Ngay.py`
8. `scripts/qa_check.py`, `QA_REPORT.md`, `CHANGELOG_v1.3.md`
