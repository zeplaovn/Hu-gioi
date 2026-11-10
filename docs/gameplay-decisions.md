# Sổ quyết định gameplay trước phát hành — Hư Giới · Tiên Lộ Vô Tận

> Trạng thái: Đề xuất.
> **Cần chủ dự án duyệt; chưa phải lệnh triển khai.** File này là **đầu mối duy nhất để ghi lựa chọn** về các luật/nội dung còn thiếu. Bản kiểm kê đầy đủ ở [gameplay-audit.md](gameplay-audit.md); thiết kế sách nghề ở [profession-manuals-proposal.md](profession-manuals-proposal.md).
>
> **Đối chiếu repository ngày 10/11/2026**, `main` commit `132158529d221a1241aef9d8ab52beb671053926`. **PR #31 Thiên Mệnh Các và PR #32 kiểm kê đều đã MERGE** — một số ghi chú trước đó nói “chưa merge” đã lỗi thời; mục này cập nhật theo code mới, không giả định source V8/51 lệnh.
>
> **Cách duyệt:** Giữ `[ ]` và đổi thành `[x]` ở lựa chọn phù hợp, hoặc ghi ở `Khác:`. Một lựa chọn **ĐỀ XUẤT** chưa trở thành yêu cầu game cho đến khi chủ dự án xác nhận. Nếu có quyết định đối nghịch đặc tả, **dừng lập trình phần liên quan và hỏi**, không ngầm chọn A. Với nội dung chưa có số liệu, chỉ chốt *nguyên tắc* trước; bảng số cuối phải dựa trên bot và được phê duyệt riêng.
>
> **Trạng thái:** `CHỐT` = xác nhận trực tiếp từ chủ dự án/luật hiện hành không xin đổi; `MỞ P0` = phải chốt trước khi sửa luật liên quan/phát hành; `MỞ P1` = cần chốt trước khi triển khai tính năng xã hội/hậu kỳ; `HOÃN P2` = có thể hoãn nếu bản phát hành không công bố tính năng đó. `A` luôn là khuyến nghị, không phải đã duyệt.

## 0. Phạm vi đã được chốt — không hỏi lại

| ID | Trạng thái | Quyết định được xác nhận | Mã nguồn/tài liệu |
|---|---|---|---|
| **K01** | **CHỐT** | Game **online-only**, Node/SQLite server-authoritative, Supabase JWT; đồng hồ/RNG/giá/thưởng do máy chủ giữ. **Không tính thời gian offline/ẩn tab.** | `docs/gameplay-v9.md`, `PlayerService`, `RemoteSession` |
| **K02** | **CHỐT hiện trạng** | Engine hiện **state V9**, protocol **v2**, **48 lệnh/9 miền**. Không quay lại V8/51 lệnh do tài liệu cũ. | `engine/state/player.js`, `engine/protocol/commands.js`, `engine/game.js` |
| **K03** | **CHỐT** | Mỗi đạo thân **một mạng**. Tọa hóa → server xác minh → xóa đạo thân đã chết → tạo đạo thân mới. Không hồi sinh người cũ; tạo kiếp mới **không mất Thiên Tinh**. | `docs/gameplay-v9.md`, `server/services/player-service.js` |
| **K04** | **CHỐT & ĐÃ CÀI** | Thưởng **Thiên Tinh đầy đủ trong mỗi kiếp**, khi đột phá đại cảnh giới lên bậc `r` nhận `5×r`: Trúc Cơ +5, Kết Đan/Kim Đan +10, Nguyên Anh +15...; không giảm thưởng qua các kiếp, không thuế chuyển kiếp. | `docs/thien-menh-cac.md` (PR #31 đã merge) |
| **K05** | **CHỐT & ĐÃ CÀI** | Thiên Mệnh Các thuộc **tài khoản**; 6 thuộc tính tối đa 20 cấp, hiệu quả chính tối đa +50% tương đối; Thiên Tinh, nâng cấp và Kỳ Trân chưa dùng được giữ sau khi xóa đạo thân; xóa toàn bộ dữ liệu tài khoản thì xóa luôn. | `data/character.js`, `server/repositories/sqlite-players.js` |
| **K06** | **CHỐT** | Khi tạp chất **Z đạt 100**, nhân vật **bị phế tu vi, thành phàm nhân**, **không tu luyện**, **không dùng vật phẩm**; **không chết ngay** mà chỉ chết khi thọ nguyên cạn. **Chưa cài luật này** vào engine. | Quyết định người thiết kế sau Bước 0; `data/meridians.js` hiện chỉ preview |
| **K07** | **CHỐT** | Khi phế tu vi, **giữ số năm thọ nguyên còn lại tại thời điểm đó**; không đổi ngưỡng tử vong ngay theo tuổi thọ phàm nhân. **Tốc độ tiêu hao số năm này chưa chốt.** | Quyết định người thiết kế; `engine/rules/time.js` chưa hỗ trợ |
| **K08** | **CHỐT** | **12 sách nghề**: Luyện đan, Luyện khí, Chế phù, Linh điền; **mỗi nghề 3 tập** theo **Hạ Giới (0–4), Linh Giới (5–8), Tiên Giới (9–13)**. Mỗi quyển dạy **nhiều công thức**; loại phương án một cuốn/một công thức. **Chưa cài.** | `docs/profession-manuals-proposal.md` |
| **K09** | **CHỐT ràng buộc** | `engine/` và luật `data/` thuần, không DOM/network/timer/RNG toàn cục; lệnh thêm phải có schema, đúng một miền, test/docs/UI; state JSON-safe ≤64 KB; không thêm dependency. | Yêu cầu phát hành, `tests/sources.test.cjs` |
| **K10** | **CHỐT nguyên tắc** | Tên/mô tả/nhiệm vụ tiếng Việt tiên hiệp; không tự sáng tác luật thiếu dữ liệu rồi coi là đã duyệt; nội dung phát sinh được đánh dấu dự thảo để duyệt trước công bố. | Yêu cầu phát hành |

## 1. P0 — phải chốt trước khi viết luật lõi, sửa save hoặc phát hành

### A. Vòng đời, phàm nhân và kinh mạch

**P0-01 · Phiên bản save/migration sau khi bổ sung kinh mạch + sách nghề** — `main` đã ở V9, không thể “nâng lên V9”.  
[ ] **A — ĐỀ XUẤT:** tăng `state.version` lên **V10**, giữ nhận V4–V9, normalize một lần phía server, kiểm tra 64 KB và contentVersion, không cho client upload state.  
[ ] B: tiếp tục V9 bằng optional field, không bump schema (nguy cơ cache/version mismatch).  Khác: __________  
**Nguồn:** `engine/state/player.js`, `docs/engine-contract.md`. **Trạng thái: MỞ P0.**

**P0-02 · Người chơi đang có trước migration kinh mạch** — tránh tạp chất tự xuất hiện khiến đạo thân đang sống bị phế.  
[ ] **A — ĐỀ XUẤT:** khởi tạo **Z=0**, độ thông các mạch = 0, chỉ tích lũy **từ thời gian online sau migration**; bảo toàn tu vi/cảnh giới/tuổi/thọ hiện có.  
[ ] B: suy ra tiến độ kinh mạch theo cảnh giới cũ nhưng đặt Z=0; cần quy tắc bồi hoàn.  Khác: __________  
**Nguồn:** `data/meridians.js`, `engine/state/player.js`. **Trạng thái: MỞ P0.**

**P0-03 · Nhịp hao thọ nguyên khi đã thành phàm nhân** — **đã chốt giữ số năm còn lại**, **chưa chốt tốc độ trôi**.  
[ ] **A — ĐỀ XUẤT:** chốt `lifeRemainingYears` tại thời điểm phế; tiêu hao theo **`F.aging_speed(realm)` ngay trước lúc phế**, chỉ khi online; hiển thị thời gian sống còn lại trên UI. Ví dụ còn 30 năm, tốc độ 2 năm/giờ online → ~15 giờ online trước khi chết (chỉ ví dụ, không phải tốc độ mặc định).  
[ ] B: tiêu hao theo nhịp phàm nhân cố định, dù bị phế từ cảnh giới nào (cần chọn con số và test).  Khác: __________  
**Ràng buộc:** không làm giảm số năm **ngay lúc** phế, không gây tử vong tức thì, Đạo Tổ `completed` cũng phải hết thọ khi phế (trước đây `completed` không già). **Trạng thái: MỞ P0.**

**P0-04 · Phàm nhân còn được thao tác những gì?**  
[ ] **A — ĐỀ XUẤT:** chỉ đọc hồ sơ, Thiên Thư/sách đã học, nhật ký, chat (nếu có), cài đặt, xem thọ nguyên và tự tạm dừng; khóa **mọi hành động gameplay có thể tăng tu vi, nhận vật phẩm/tài nguyên, chiến đấu, chế tạo, trồng, mua/bán, học sách, hoàn thành nhiệm vụ** để không lách luật “không tu luyện/không dùng vật phẩm”.  
[ ] B: vẫn được sinh hoạt/đi lại/giao tiếp và giao dịch nhưng không tu luyện hoặc kích hoạt vật phẩm; cần bảng whitelist lệnh không mang thưởng.  Khác: __________  
**Nguồn:** 48 lệnh `engine/protocol/commands.js`, `time.advance`. **Trạng thái: MỞ P0.**

**P0-05 · Phế tu vi có thể cứu chữa sau khi Z=100 hay không?**  
[ ] **A — ĐỀ XUẤT:** **không hồi phục trong kiếp**; khai thông/tẩy tủy chỉ dùng **trước khi chạm ngưỡng 100**. Phù hợp “làm phàm nhân chờ cạn thọ nguyên”; tránh mua đan để thoát trạng thái không dùng vật phẩm.  
[ ] B: cứu được bằng cơ chế ngoài vật phẩm đặc biệt (NPC/nghi lễ); **mâu thuẫn ý định chờ chết** nên chỉ làm nếu chủ dự án muốn sửa luật.  Khác: __________  
**Trạng thái: MỞ P0.**

**P0-06 · Khi nào tích tạp chất Z và cấu trúc lưu theo 12 chính kinh + 8 kỳ kinh?**  
[ ] **A — ĐỀ XUẤT:** mỗi mạch có `thong` (0–100) và `z` (0–100), có chỉ số Z tổng hợp xác định rõ (trọng số hoặc lớn nhất); chỉ tích lũy khi **có tu luyện thực** trong thời gian online, không tích khi offline/đọc hồ sơ. Cần chốt tổng hợp để biết đúng lúc Z=100.  
[ ] B: Z là **một chỉ số toàn thân** theo `zPerMinute`, các mạch chỉ có tiến độ thông; đơn giản hơn nhưng không đủ yêu cầu “tạp chất theo từng mạch”.  Khác: __________  
**Ví dụ gốc:** 3 hệ, tinh khiết 70% → `(3−1)×0,5×(1−0,70)=0,30 Z/phút`; thời điểm áp dụng/cộng gộp cần duyệt. **Trạng thái: MỞ P0.**

**P0-07 · Ngưỡng và hình phạt Z trước khi phế**  
[ ] **A — ĐỀ XUẤT:** giữ `zPenalty` sẵn có: Z <50 không phạt, 50–79 giảm tốc tu 10%, 80–99 giảm 30%, 100 → **phàm nhân vĩnh viễn**, không tự chết.  
[ ] B: thay ngưỡng/hình phạt khác, kèm ví dụ và bot cân bằng.  Khác: __________  
**Nguồn:** `data/meridians.js`; số 50/80 có trong data nhưng chưa là engine rule. **Trạng thái: MỞ P0.**

**P0-08 · Khai thông kinh mạch/tẩy tủy: giá, tài nguyên, thao tác và giới hạn**  
[ ] **A — ĐỀ XUẤT:** hai lệnh chủ động riêng: khai thông tiêu hao linh thạch + tài nguyên tương ứng realm, tẩy tủy tiêu hao linh thạch/thảo dược để giảm Z; có tỷ lệ chặn spam, một giao dịch idempotent; **không dùng Thiên Tinh tài khoản để xóa Z**. Giá/hiệu quả cụ thể cần lập bảng và duyệt sau khi bot đo thu nhập.  
[ ] B: dùng vật phẩm `Tẩy Tủy Đan` hiện có như đường tẩy chính; phải thay/định nghĩa lại `PILL-007` hiện đang có hiệu ứng `BUFF_TOC` (thay đổi cân bằng và tương thích).  Khác: __________  
**Trạng thái: MỞ P0.**

**P0-09 · Quan hệ cùng hệ/sinh hệ và trần cộng dồn kinh mạch**  
[ ] **A — ĐỀ XUẤT:** ưu tiên dùng hệ số đã có `SAME_SPEED=1,25`, `SINH_SPEED=1,10`, `BONUS_TU_LUYEN` (12 chính + 8 kỳ, max xem trước 51%); chốt thứ tự áp multiplier trước/sau thưởng linh căn, công pháp và Thiên Mệnh Các; tất cả phải có test upper bound và giá trị biên Hỗn Độn.  
[ ] B: thay bằng công thức cộng tuyến tính với trần kinh mạch thấp hơn, tính lại qua bot.  Khác: __________  
**Trạng thái: MỞ P0.**

### B. Công thức, sách nghề, linh điền và Thiên Thư

**P0-10 · Công pháp khác ngũ hành: công thức thưởng/phạt**  
[ ] **A — ĐỀ XUẤT:** multiplier hiệu quả công pháp **cùng hệ 1,00; sinh hệ 0,95; trung hòa 1,00; khác hệ 0,90; khắc hệ 0,85**. Giữ phạt `CP_MISMATCH` **do chênh cảnh giới** đang có; không dùng lại làm phạt ngũ hành. Ví dụ buff ATK 12% × 0,85 = 10,2%.  
[ ] B: chỉ công pháp đúng hệ mới có lợi, không áp phạt khác hệ; cần mức thưởng khác.  Khác: __________  
**Nguồn:** `data/formulas.js`, `data/meridians.js`, `docs/design-integration.md`. **Trạng thái: MỞ P0.**

**P0-11 · Độ tinh khiết/tuổi dược có tác động đến hiệu lực đan không? Lưu metadata thế nào?**  
[ ] **A — ĐỀ XUẤT:** dược lực nhân `0,90 + 0,10×(purity/100)` (trong [0,90;1]); hệ số tuổi `M_age` trong [0,95;1,05] từ dữ liệu server; công thức được kẹp bởi cap `DAN_REALM_CAP` hiện có. Ví dụ hiệu quả 100, tinh khiết 80%, tuổi đạt mức +5% → 102,9 trước cap. Metadata nén theo lô hoặc phẩm, không trộn nhiều mã cùng chất lượng vào một key không phân biệt; phải đo kích thước ≤64 KB.  
[ ] B: tuổi và tinh khiết chỉ ảnh hưởng **giá/khả năng luyện thành công**, không ảnh hưởng dược lực; tránh thêm metadata vào túi.  Khác: __________  
**Trạng thái: MỞ P0.**

**P0-12 · Hệ số luyện khí/pháp bảo/chế phù, phẩm chất và ngũ hành**  
[ ] **A — ĐỀ XUẤT:** hiệu ứng theo `data/design.js` trước, ngoài snapshot dùng fallback cũ; ưu tiên chuẩn hóa về dữ liệu hiệu ứng có **trần theo nhóm** để tránh nhân chồng chỉ số; tỷ lệ luyện thành công không vượt 95%, không rớt dưới 5% (theo `F.craft_success` hiện tại). Các multiplier cụ thể phải được mô phỏng, liệt kê từng nhóm (ATK/HP/DEF, choáng, độc, hộ kiếp).  
[ ] B: giữ nguyên toàn bộ pháp bảo/phù hiện tại tới khi có đủ dữ liệu chi tiết, không thêm multiplier mới trong P0.  Khác: __________  
**Trạng thái: MỞ P0.**

**P0-13 · 39 hạt còn thiếu bảng trồng**  
[ ] **A — ĐỀ XUẤT:** định nghĩa **tường minh cho đủ 69 hạt**, giữ 30 hạt thiết kế gốc; cho 39 hạt còn lại một bảng dự thảo thời gian–đất–độ khó–min/max sản lượng theo tier và xin duyệt từng nhóm. Cây đang trồng giữ `end`/đất ban đầu, **chỉ lượt gieo mới** dùng bảng mới.  
[ ] B: dừng ở 30 hạt có định nghĩa, khóa 39 hạt cũ không thể gieo — rủi ro save cũ/kinh tế.  Khác: __________  
**Trạng thái: MỞ P0.**

**P0-14 · Danh sách công thức trong 12 quyển (đã chốt số quyển, chưa chốt nội dung)**  
[ ] **A — ĐỀ XUẤT:** mỗi quyển chứa **tất cả mã thành phẩm/hạt thuộc giới tương ứng** trong `catalog` và có recipe hợp lệ; tên sách theo `profession-manuals-proposal.md`, phải sinh bảng `quyển → mã công thức → vật liệu → bậc` và gắn `DỰ THẢO THIẾT KẾ` cho mã chưa có dữ liệu.  
[ ] B: chỉ dạy một tập công thức trọng điểm mỗi quyển, còn công thức đặc biệt đi qua boss/NPC/sách bổ sung (sẽ vượt 12 quyển nếu dùng sách phụ).  Khác: __________  
**Trạng thái: MỞ P0.**

**P0-15 · Sách nghề: nơi nhận, mức giá, độ hiếm, khả năng trao đổi**  
[ ] **A — ĐỀ XUẤT:** tập Hạ Giới có đường mua/nhận nhiệm vụ NPC **chắc chắn**, tập Linh/Tiên Giới mở qua nhiệm vụ hoặc boss có tỉ lệ rơi công khai; sách tiêu hao khi học, không thể giao dịch giữa người chơi trước khi có market+ledger. **Chưa định giá hay tỉ lệ**; chúng phải dựa trên bot để không khóa nghề/người chơi nghèo.  
[ ] B: tất cả tập đều bán trong cửa hàng theo cảnh giới; giảm RNG nhưng mất giá trị khám phá.  Khác: __________  
**Trạng thái: MỞ P0.**

**P0-16 · Học sách, lưu công thức và tránh softlock nghề mới**  
[ ] **A — ĐỀ XUẤT:** học một lần bằng `learn` (inventory), ghi mã công thức vào `learnedRecipes` trong state V10; một sách mở nhiều recipe, không chiếm 3 ô công pháp; **mỗi nghề có ít nhất một công thức nhập môn được cấp miễn phí hoặc sẵn mở**; `craft/forge/use(SEED)` kiểm đã học trong server.  
[ ] B: sách chỉ để xem công thức/thưởng kỹ năng, không là điều kiện cứng để craft — khác yêu cầu “chứa công thức để học”.  Khác: __________  
**Trạng thái: MỞ P0.**

**P0-17 · Đã học nghề có qua kiếp sau không?**  
[ ] **A — ĐỀ XUẤT:** công thức nghề là **kiến thức đạo thân**, mất khi tọa hóa; chỉ Thiên Mệnh Các/Kỳ Trân thuộc tài khoản được kế thừa. Tránh ngầm tăng sức mạnh vĩnh viễn ngoài Thiên Mệnh Các.  
[ ] B: công thức được mở vĩnh viễn theo tài khoản, tức tính năng kế thừa mới; cần kho account idempotent riêng và kiểm kinh tế.  Khác: __________  
**Trạng thái: MỞ P0.**

**P0-18 · Bồi hoàn nhân vật cũ và xử lý `BT-900`/`BT-901`**  
[ ] **A — ĐỀ XUẤT:** khi migrate, **giữ toàn bộ quyền chế tạo vật phẩm mà nhân vật đã có trước cập nhật**, dựa trên realm/learned cũ; đơn đang luyện/cây đang trồng vẫn hoàn tất. `BT-900`/`BT-901` đã học được **công nhận tương đương** quyền công thức, không bắt mua cả bí tịch cũ và sách mới cho cùng một thao tác.  
[ ] B: cấp 12 sách bồi hoàn vào hành trang theo realm, nhưng có rủi ro quá 64 KB/mất nguyên liệu nếu inventory đầy.  Khác: __________  
**Trạng thái: MỞ P0.**

**P0-19 · Thiên Thư: ba lời chọn có hiệu ứng gameplay gì?**  
[ ] **A — ĐỀ XUẤT:** đúng **một** trong ba buff nhỏ *một lần/kiếp* theo cờ định nghĩa tại `data/story.js`: +1% tốc tu **hoặc** +1% sản lượng linh điền **hoặc** +1% ATK, tùy lời đáp; không cấp tài nguyên trực tiếp, không cộng xuyên kiếp, cap và test chống replay. **Lưu ý:** phải đối chiếu câu chuyện gốc rồi mới gán đúng nhánh, không tự chọn ý nghĩa.  
[ ] B: chỉ thưởng narrative/mở quest có loot được định lượng; không tác động chỉ số trực tiếp.  Khác: __________  
**Trạng thái: MỞ P0.**

### C. Nội dung theo giới, luật phát hành và cân bằng

**P0-20 · Mức nội dung tối thiểu Hạ/Linh/Tiên Giới**  
[ ] **A — ĐỀ XUẤT:** **mỗi bậc 5–13** có tối thiểu 1 mục tiêu nhiệm vụ, 1 quái có bảng rơi, 1 boss/bí cảnh tương ứng hoặc chuỗi nhiều bậc, 1 NPC có hội thoại/dịch vụ nghề, và vật phẩm/đan/phù khả dụng; các tên/loot mới đánh dấu `DỰ THẢO THIẾT KẾ` để duyệt riêng.  
[ ] B: chỉ một chuỗi dài theo *giới* thay vì theo 9 bậc (ít nội dung hơn nhưng cần cơ chế tái chơi).  Khác: __________  
**Hiện trạng:** 492 vật phẩm, 14 zone, 9 bí cảnh mở cao nhất realm 8, 10 NPC thiết kế đều Hạ Giới. **Trạng thái: MỞ P0.**

**P0-21 · Bí cảnh: hai chế độ và boss mới**  
[ ] **A — ĐỀ XUẤT:** giữ **`startDungeon` kết toán theo tầng** và **`enterDungeon/dungeonAct` theo lượt** như hai đường chơi khác nhau, không cấp trùng phần thưởng trên một lượt; boss Linh/Tiên Giới cần giai đoạn kỹ năng/loot riêng, lưu seed server.  
[ ] B: chỉ giữ chế độ theo lượt, chuyển chế độ thời gian thành ủy thác/bí cảnh tự động không có cùng thưởng; thay đổi trải nghiệm idle.  Khác: __________  
**Trạng thái: MỞ P0.**

**P0-22 · NPC, kỳ ngộ, nhiệm vụ nghề cao giới: cách duyệt nội dung**  
[ ] **A — ĐỀ XUẤT:** duyệt theo **bảng dữ liệu** `NPC/zone/realm/quest/reward/loot/recipe`, giữ định danh cố định; NPC Linh/Tiên Giới có ít nhất một nhiệm vụ và vai trò thật, không chỉ mở màn nhiệm vụ chung; kỳ ngộ gắn điều kiện giới để tránh sự kiện Hạ Giới lặp vô hạn.  
[ ] B: duyệt theo tuyến truyện trước rồi mới lập bảng loot; phụ thuộc thêm văn bản lore.  Khác: __________  
**Trạng thái: MỞ P0.**

**P0-23 · Ngưỡng khó đời đầu / cửa lôi kiếp**  
[ ] **A — ĐỀ XUẤT:** giữ nguyên **độ khó đã kiểm toán** (`docs/design-audit.md`): nhiều linh căn yếu chết ở Luyện Khí sau ~41 phút online tham chiếu; độ kiếp thiếu bảo hộ có thể chắc thất bại; **chỉ điều chỉnh khi bot 30 ngày đưa bằng chứng và được duyệt lại**.  
[ ] B: định nghĩa lại mục tiêu sống sót tối thiểu cho mọi loại linh căn và hộ kiếp trước khi phát hành; phải đổi luật/thưởng/cửa hỗ trợ.  Khác: __________  
**Trạng thái: MỞ P0 (nếu muốn đổi).**

**P0-24 · Chỉ tiêu bot 30 ngày và “đủ cân bằng”**  
[ ] **A — ĐỀ XUẤT:** bot gồm tu thuần, luyện nghề, lịch luyện, bí cảnh và nhiều kiếp, báo cáo **p50/p95 thời gian/đại cảnh giới, tỉ lệ chết theo linh căn, Thiên Tinh/kiếp, stone faucet–sink, item/giờ và độ phân hóa build**. Chủ dự án **phải đặt khoảng chấp nhận** trước khi đánh giá pass/fail, không xem bot xanh cú pháp là cân bằng.  
[ ] B: lấy kết quả bot làm mốc quan sát trước phát hành thử nghiệm, chốt target bằng dữ liệu người chơi beta sau.  Khác: __________  
**Cần ghi mục tiêu bằng số (chưa chốt):** thời gian Trúc Cơ [___], Kim Đan [___], Đạo Tổ [___], tỷ lệ chết/kiếp [___], stone net [___], số kiếp/tháng [___]. **Trạng thái: MỞ P0.**

**P0-25 · Trần kinh tế và chính sách chống gian lận**  
[ ] **A — ĐỀ XUẤT:** tính trần hợp lý từ luật + bot theo realm/online-time (tu vi, stone, vật phẩm/giờ); vượt trần thì **flag để admin duyệt**, không auto-ban hay âm số dư; có ledger/receipt cho thay đổi tiền quan trọng và các giao dịch account.  
[ ] B: hard cap cứng mọi nguồn thưởng (dễ bóp lối chơi hợp lệ, cần công bố trần).  Khác: __________  
**Trạng thái: MỞ P0 trước mở rộng thị trường, mức cụ thể chưa chốt.**

**P0-26 · Mã lỗi gameplay và tính tương thích**  
[ ] **A — ĐỀ XUẤT:** engine ném lỗi có `code` ổn định (ví dụ `INSUFFICIENT_STONE`, `ITEM_NOT_FOUND`, `REALM_TOO_LOW`, `RECIPE_NOT_LEARNED`, `MORTAL_CANNOT_CULTIVATE`, `DUNGEON_BUSY`); PlayerService giữ HTTP `GAME_RULE_VIOLATION` và đặt `details.code` cho UI. Không đổi message tiếng Việt đang hiển thị, không đổi atomic rollback/idempotency.  
[ ] B: trả mã lỗi riêng trực tiếp làm top-level API `code` (phải version contract client).  Khác: __________  
**Trạng thái: MỞ P0.**

**P0-27 · Chặn softlock/thay đổi điều kiện tử vong V9**  
[ ] **A — ĐỀ XUẤT:** giữ quy tắc cũ về **HP = 0 trong chiến đấu/bí cảnh và độ kiếp thất bại = tử vong**; tab ẩn/offline tạm dừng; khảo sát các đường lách `advance`, `autoStage`, tu vi từ đan, EXP nhiệm vụ để phàm nhân không được nhận thưởng.  
[ ] B: bổ sung trạng thái trọng thương thay chết cho một số hoạt động, phải cập nhật cả server/engine/UI/save.  Khác: __________  
**Nguồn:** `docs/gameplay-v9.md` mục “quyết định tạm thời”. **Trạng thái: MỞ P0 để xác nhận, không tự đổi code.**

**P0-28 · Số lượng tính năng xã hội thật bắt buộc có lúc phát hành**  
[ ] **A — ĐỀ XUẤT:** trước phát hành public phải hoàn tất P0; các P1 chưa có service **ẩn hoặc khóa rõ bằng feature flag**, không hiển thị bảng xếp hạng giả/đấu giá NPC là dữ liệu nhiều người; có thể ra bản online PvE trước rồi mở social theo giai đoạn.  
[ ] B: phát hành public chỉ sau khi **đủ toàn bộ shared multiplayer P1** (bảng xếp hạng, mail, bạn bè, chat, PvP, tông môn và chợ) với test race/escrow.  Khác: __________  
**Trạng thái: MỞ P0 — khóa phạm vi và tiêu chí nghiệm thu.**

**P0-29 · Thuật ngữ cảnh giới “Kết Đan”/“Kim Đan”**  
[ ] **A — ĐỀ XUẤT:** giữ mã bậc **realm=2**, đổi nhãn UI và lời dẫn sang **Kim Đan** nhất quán theo người thiết kế, không đổi dữ liệu/migration numeric IDs.  
[ ] B: giữ **Kết Đan** chính thức như `data/balance.js`; chỉ chấp nhận “Kim Đan” trong văn bản lore.  Khác: __________  
**Trạng thái: MỞ P0 nếu biên tập toàn game.**

**P0-30 · Tàn dư trọng sinh/legacy trong state, item và UI**  
[ ] **A — ĐỀ XUẤT:** không hồi sinh lệnh `reincarnate/prestige`; vô hiệu hiệu ứng item `TRONG_SINH` không có đường sử dụng, giữ đọc field cũ để migrate; sửa nút `meta:prestige` và lời dẫn V8 thành liên kết Thiên Mệnh Các.  
[ ] B: biến các item cũ thành vật phẩm chỉ tăng Thiên Tinh có giới hạn (cần giá và ledger riêng).  Khác: __________  
**Trạng thái: MỞ P0 để tránh UI sai/đường thưởng vô hiệu.**

## 2. P1 — chốt trước khi làm hậu kỳ hoặc dùng chung dữ liệu nhiều người

**P1-01 · Đạo Tổ `completed`: vòng lặp hậu kỳ?**  
[ ] **A — ĐỀ XUẤT:** hoàn tất Đạo Tổ mở sảnh tổng kết, nhiệm vụ thử thách tự chọn và **chuyển kiếp chủ động** có xác nhận server, giữ Thiên Mệnh Các; **không hồi sinh nhân vật cũ**. Chuyển chủ động cần endpoint riêng có receipt để không bị lợi dụng reset miễn phí khi chưa đạt.  
[ ] B: Đạo Tổ là kết thúc kiếp hiện tại, chỉ tiếp tục giao du/khám phá chờ tuổi thọ; chuyển kiếp chỉ sau chết như V9.  Khác: __________  
**Trạng thái: MỞ P1.**

**P1-02 · Hỗn Độn linh căn/thiên kiếp/nhánh đổi build qua kiếp**  
[ ] **A — ĐỀ XUẤT:** giữ xác suất thức tỉnh server-side hiện có sau lôi kiếp, mở thử thách theo nhánh Thiên Mệnh Các có giới hạn/kiếp, không thêm khả năng mua chắc chắn Hỗn Độn bằng Thiên Tinh.  
[ ] B: thêm vật phẩm hiếm bảo hiểm thức tỉnh, phải công bố giá/xác suất và chống auto thắng.  Khác: __________  
**Trạng thái: MỞ P1.**

**P1-03 · Mất PvP thật có tử vong không?**  
[ ] **A — ĐỀ XUẤT:** PvP **giữa người thật** bất đồng bộ không làm đạo thân bị tọa hóa; trừ rating/nhận thưởng hạn chế. PvP NPC `duel` hiện hành vẫn có luật tử vong V9 cho tới khi sửa có duyệt.  
[ ] B: PvP người thật cũng tử vong; rủi ro griefing/win-trading và yêu cầu chống thao túng nghiêm ngặt hơn.  Khác: __________  
**Trạng thái: MỞ P1 — quyết định ảnh hưởng trực tiếp vòng đời.**

**P1-04 · Bảng xếp hạng: tiêu chí và chu kỳ**  
[ ] **A — ĐỀ XUẤT:** 3 board `realm/stage/totalRunExp`, chiến lực tính từ server, PvP Elo; top 100 và hạng cá nhân, loại tài khoản flagged; mùa giải tách khỏi bảng trường tồn.  
[ ] B: chỉ bảng cảnh giới và chiến lực không reset, thêm Elo về sau.  Khác: __________  
**Trạng thái: MỞ P1.**

**P1-05 · Quan hệ bạn bè có đi qua cái chết không?**  
[ ] **A — ĐỀ XUẤT:** bạn bè **theo tài khoản** để đổi đạo thân vẫn giữ liên lạc; NPC thiện cảm thuộc mỗi đạo thân và không kế thừa. Trạng thái online theo phiên JWT/heartbeat, không công bố email/IP.  
[ ] B: bạn bè theo `playerId`; khi chết phải kết bạn lại.  Khác: __________  
**Trạng thái: MỞ P1.**

**P1-06 · Thư hệ thống và quà: hết hạn/nhận khi phàm nhân?**  
[ ] **A — ĐỀ XUẤT:** mail theo account, quá hạn tự ghi nhận/hoàn về kho theo quy định; claim idempotent trong giao dịch; **phàm nhân chỉ đọc mail, không nhận vật phẩm** tới kiếp sau (nếu còn).  
[ ] B: quà hết hạn bị xóa, phàm nhân có thể nhận về kho account; cần chống chuyển tài nguyên sang kiếp mới trái luật.  Khác: __________  
**Trạng thái: MỞ P1.**

**P1-07 · Chat: phạm vi, lọc nội dung và lưu trữ**  
[ ] **A — ĐỀ XUẤT:** world + tông môn + system trước, private sau; JWT, lọc spam/ngôn từ/URL, mute/report/admin queue; lưu nội dung có hạn **30 ngày** theo kế hoạch kế hoạch backend cũ (git 1bd987b:docs/archive/backend-plan.md) (con số chưa duyệt), hỗ trợ xóa/ẩn theo quy định dữ liệu; chọn SSE/polling nếu không cần WS realtime.  
[ ] B: chỉ world chat lúc mở beta, các kênh khác feature flag.  Khác: __________  
**Trạng thái: MỞ P1.**

**P1-08 · Tông môn thật: chỉ số và chức vị xuyên kiếp?**  
[ ] **A — ĐỀ XUẤT:** membership/chức vị/cống hiến theo **đạo thân**, chết thì ghi lịch sử và giải nhiệm vụ/roster; `state.sect` chỉ projection, mọi thay đổi roster + số dư phải atomic.  
[ ] B: membership theo tài khoản, đạo thân mới giữ chức vị; cần cap chống tông môn “bất tử”.  Khác: __________  
**Trạng thái: MỞ P1.**

**P1-09 · Chợ thật: mặt hàng, giới hạn, phí và khóa escrow**  
[ ] **A — ĐỀ XUẤT:** **fixed-price trước**, chỉ giao dịch tài sản trong danh sách cho phép; khóa tài sản bên bán, trừ tiền bên mua, thưởng bên bán, phí và receipt **cùng transaction/ledger**; lock player theo thứ tự định danh; cấm chuyển Thiên Tinh và Kỳ Trân tài khoản. Giá sàn/trần/thuế chờ bot và duyệt.  
[ ] B: mọi item được giao dịch kể cả Kỳ Trân; tăng nguy cơ luân chuyển sức mạnh xuyên kiếp/đa tài khoản.  Khác: __________  
**Trạng thái: MỞ P1.**

**P1-10 · Thời điểm làm đấu giá người thật**  
[ ] **A — ĐỀ XUẤT:** hoãn tới sau fixed-price/escrow/test concurrency; giữ đấu giá NPC dưới nhãn mô phỏng hoặc ẩn khi bật market thật.  
[ ] B: có đấu giá thật ngay khi phát hành đầu, phải thêm bid escrow, gia hạn và hoàn tiền idempotent.  Khác: __________  
**Trạng thái: MỞ P1/P2 tùy phạm vi.**

**P1-11 · Hạ tầng shared: SQLite mở rộng hay PostgreSQL?**  
[ ] **A — ĐỀ XUẤT:** bắt đầu với **một writer SQLite** cho PvE & board read; trước PvP/chợ/tông môn nhiều account chọn schema ledger/outbox và kiểm transaction thật; chuyển PostgreSQL khi concurrent writers/scale yêu cầu. Không cho multi-instance cùng ghi SQLite không có quy tắc.  
[ ] B: bắt buộc PostgreSQL trước khi bật bất kỳ shared social nào; tốn migration sớm nhưng dễ row lock hơn.  Khác: __________  
**Trạng thái: MỞ P1 (quyết định kiến trúc trước social).**

**P1-12 · Giới hạn trận PvP/ngày và kiểm win-trading**  
[ ] **A — ĐỀ XUẤT:** snapshot combat server + seed audit + Elo `K=32` như kế hoạch backend cũ (git 1bd987b:docs/archive/backend-plan.md); giới hạn trận có thưởng/ngày, chống cặp lặp/đa tài khoản; chỉ **flag/review**, không auto-ban. **Số trận và mức thưởng chưa duyệt.**  
[ ] B: PvP không thưởng vật phẩm/linh thạch, chỉ danh vọng; giảm rủi ro farm.  Khác: __________  
**Trạng thái: MỞ P1.**

**P1-13 · Kỳ ngộ, thế giới event và chu kỳ mùa**  
[ ] **A — ĐỀ XUẤT:** sau nội dung PvE P0, bổ sung kỳ ngộ theo giới trước; season/event có lịch server, seed, kill switch, reward receipt và chính sách kết thúc mùa; không cho event cấp thưởng offline.  
[ ] B: không chạy event/season lúc mở public, chỉ nội dung thường và cập nhật thủ công.  Khác: __________  
**Trạng thái: MỞ P1/P2.**

**P1-14 · Quản trị nội dung, khiếu nại và thời gian lưu log**  
[ ] **A — ĐỀ XUẤT:** công bố quy trình report/mute/kháng nghị; lưu log đủ để replay trận/lệnh và xử lý market, giới hạn retention theo luật/chính sách; không lưu token hay state đầy đủ trong log. Mặc định log lệnh 30–90 ngày trong kế hoạch cũ **chưa phải giá trị được duyệt**.  
[ ] B: chỉ lưu aggregate, không hỗ trợ replay trận — không đủ điều tra tranh chấp có phần thưởng.  Khác: __________  
**Trạng thái: MỞ P1 trước multiplayer và thu phí.**

## 3. P2 — có thể hoãn, nhưng phải ghi rõ trước công bố

| ID | Vấn đề | **A — ĐỀ XUẤT** | B/Khác | Trạng thái |
|---|---|---|---|---|
| **P2-01** | Đấu giá realtime/đấu giá nhiều vòng | Hoãn sau chợ fixed-price | Bật ngay từ đầu | **HOÃN P2** |
| **P2-02** | Đại hội tông môn, boss server chung, chiến tranh tông môn | Hoãn, chỉ roster/nhiệm vụ chung P1 | Mở đủ từ đợt đầu | **HOÃN P2** |
| **P2-03** | Quà nạp/IAP/cosmetic | Không bán sức mạnh; chưa bật thanh toán khi chưa có legal/webhook/hoàn tiền | Bật IAP sau review riêng | **HOÃN P2** |
| **P2-04** | Sự kiện mùa, world boss, mỹ thuật Linh/Tiên Giới | Dùng artwork hiện có và nội dung PvE tối thiểu; mỹ thuật mới đi sau | Đợi mỹ thuật đầy đủ mới phát hành | **HOÃN P2** |

## 4. Những phần **không cần người thiết kế chọn số lúc này** nhưng bắt buộc kỹ sư hoàn thành

Các mục này là **tiêu chí kỹ thuật**, không phải giấy phép tự thay đổi cân bằng:

- **E01:** Mọi tăng/giảm tài nguyên, mua sách, nhận thưởng, chuyển kiếp phải server-authoritative, receipt và expected revision/version, atomicity; kiểm replay, hai tab và restart.
- **E02:** `normalize` của state mới phải nhận V4–V9, không thay độ khó cũ, không tạo chết đột ngột; đo byte state sau mọi lệnh; hard cap 64 KB; migration có rollback/backup plan.
- **E03:** `tests/sources.test.cjs` cần kiểm cả `data/` không `Math.random`/đồng hồ/DOM, kể cả default param; RNG luôn được inject.
- **E04:** Kiểm invariants realm/stage, qi, age, HP, số dư ≥0, bag count nguyên, equipment nằm trong bag, activeManuals ≤3, learned keys hợp lệ, quest/dungeon/sect không overlap trái phép; lỗi phải rollback.
- **E05:** Test mỗi lệnh mới đúng **một miền**; cập nhật `commands.js`, `game.js`, `index.html` (nếu thêm module), `engine-contract.md` và UI tiếng Việt; không thêm dependency.
- **E06:** Bot mô phỏng 30 ngày ở các seed/chiến lược và chế độ CI ngắn ≤1–2 phút; xuất báo cáo faucet/sink, time-to-realm, chết/kiếp, Thiên Tinh, exploit nổi bật. **Chỉ tiêu đỗ/doanh thu phải được chủ dự án chốt ở P0-24.**
- **E07:** Xóa dữ liệu tài khoản phải xóa đủ player/account pavilion/receipts/mail/quan hệ phù hợp; reset đạo thân chỉ xóa progression kiếp hiện tại; export phản ánh dữ liệu thực.
- **E08:** Sửa tài liệu cũ `docs/architecture.md`, `docs/design-integration.md` khi luật mới được duyệt; không để lời dẫn offline/prestige V8 trở lại UI online.

## 5. Thứ tự duyệt thuận tiện

**Đợt 1 — mở khóa Bước 1:** P0-01→09 (save, tẩu hỏa, kinh mạch), P0-10→12 (công pháp/dược liệu/pháp bảo), P0-13→18 (linh điền và sách nghề), P0-19 (Thiên Thư), P0-26→27 (mã lỗi/tử vong).  
**Đợt 2 — nội dung & nghiệm thu PvE:** P0-20→25 (nội dung cao giới/bí cảnh/NPC/bot/anti-cheat), P0-29→30 (tên gọi/legacy).  
**Đợt 3 — phạm vi phát hành:** P0-28 (feature flag hay đủ social).  
**Đợt 4 — phát hành nâng cao:** P1-01→14, các P2 nếu chọn bật.

**Cách ghi lời duyệt:** ví dụ “P0-01 A, P0-03 B với tốc độ [___], P0-05 A, P0-16 A...”. Những mục chưa duyệt vẫn ở trạng thái MỞ; không suy diễn chọn A. **Các bảng chỉ số, giá, tỷ lệ rơi và danh sách tên/nhiệm vụ cần phê duyệt dữ liệu riêng** ngay cả khi khung hệ thống đã được chốt.

## 6. Bảng tiến độ duyệt

| Cụm | Đã chốt | Còn mở | Bắt đầu code được chưa? |
|---|---:|---:|---|
| Kiến trúc/vòng đời/Thiên Mệnh Các | K01–K05 (5) | P0-01, P0-27, P0-28 | **Chưa**, nếu liên quan P0 mở |
| Phàm nhân & kinh mạch | K06–K07 (2) | P0-02→09 | **Chưa** |
| Sách nghề | K08 (1) | P0-14→18 | **Chưa** |
| Dữ liệu & công thức PvE | Nguyên tắc K09–K10 | P0-10→13, P0-19→25, P0-29→30 | **Chưa** |
| Lỗi/kiểm thử | Ràng buộc K09 | P0-24→26, E01–E08 | Có thể chuẩn bị test/thống kê, **không tự điều chỉnh luật** |
| Multiplayer/hậu kỳ | Chưa chốt mức phát hành | P1-01→14 và P2 | **Chưa bật** các tính năng chưa có service |

**Lưu ý:** Trạng thái “chưa” có nghĩa là **chưa đủ quyết định cho phần code có tác động gameplay tương ứng**, không có nghĩa phải duyệt mọi P1/P2 mới được viết bất cứ dòng test P0 nào. Có thể bổ sung kiểm thử/đo lường không thay đổi hành vi trong lúc chờ.
