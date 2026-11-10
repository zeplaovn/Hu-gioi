# Kiểm kê gameplay trước phát hành online — Bước 0

> **Trạng thái: CHỜ DUYỆT THIẾT KẾ. Không sửa engine, dữ liệu hay API trong bước này.**
>
> Ngày kiểm kê: **10/11/2026**. Nguồn kiểm kê là `main` ở commit `0668d337399069e534dc4c9e980497c04195effd`; PR [#31 — Thiên Mệnh Các](https://github.com/zeplaovn/Hugioi/pull/31) **chưa merge**, nên được ghi riêng, không tính là tính năng của `main`.
>
> Tài liệu đã đối chiếu: `README.md`, `docs/architecture.md`, `docs/engine-contract.md`, `docs/design-integration.md`, `docs/backend-plan.md` (§8–§9), `docs/design-audit.md`, `docs/gameplay-v9.md`, `data/README.md`; các file `engine/rules/*.js`, `engine/state/player.js`, `engine/protocol/commands.js`, `engine/game.js`, `data/*.js`, `server/services/player-service.js`, `server/http/router.js`, màn UI và test.
>
> **Quy ước:** “Đã có” = đã thấy luật/dữ liệu chạy trong mã; **không** đồng nghĩa đã cân bằng hoặc đạt chuẩn phát hành. “Chỉ UI” = màn mô tả tương tác mạnh hơn khả năng backend hiện có. Độ ưu tiên P0/P1/P2 là đề xuất kiểm kê, **chưa phê duyệt phạm vi**.

## 0. Chốt nguồn sự thật trước khi làm

1. **Mã thực tế là V9 / protocol v2 / 48 lệnh / 9 miền**, không phải V8 / 51 lệnh. Đối chiếu `engine/state/player.js:16`, `engine/protocol/commands.js:11`, `docs/engine-contract.md:38`, `tests/engine.test.cjs`. `normalize()` chấp nhận V4–V9. Một số chú thích và `docs/architecture.md`, `docs/design-integration.md` vẫn ghi V8/51/LocalSession: **tài liệu lỗi thời**, không nên quay lại phiên bản cũ.
2. Online-only server-authoritative hiện có `PlayerService`, SQLite, JWT, ticket, revision/receipt và `RemoteSession`. Offline/tab ẩn **đóng băng** tuổi tác và tiến trình; đây là luật V9, không được tự đổi thành catch-up offline.
3. `main` áp dụng **tử vong vĩnh viễn từng nhân vật** và `reset-after-death` để tạo đạo thân mới, **không có lệnh** `reincarnate`/`prestige`. PR #31 bổ sung **Thiên Tinh và Thiên Mệnh Các cấp tài khoản** giữ sau reset; chưa được merge. Kiểu “trọng sinh” trong yêu cầu mới phải được xác nhận là **kiếp mới, không hồi sinh đạo thân** hay đổi luật tử vong V9.
4. Vì schema **đã là V9**, nếu thêm state kinh mạch phải cân nhắc **V10 + normalize V4–V9**, không thể “tăng lên V9” lần nữa. Cập nhật header lịch sử không thay thế migration và triển khai contentVersion.
5. `data/character.js` còn các tham số RNG mặc định `Math.random`; `data/formulas.js` còn `craft_quality(..., rng=Math.random)`. Luật mới phải truyền RNG rõ ràng. **Lỗ hổng kiểm tra:** `tests/sources.test.cjs` hiện chỉ cấm `Math.random()` và đồng hồ/DOM trong `engine/`, chưa quét `data/` hoặc tham chiếu `Math.random` không có dấu `(`. Cần xử lý P0 theo ràng buộc mới, với test.

## A. Ma trận hệ thống

| Hệ thống | Đã có (luật/dữ liệu + điểm vào UI) | Thiếu cần làm | Mâu thuẫn dữ liệu–luật / chỉ UI | Ưu tiên |
|---|---|---|---|---|
| **Tu luyện** | `progression.gainExp/rate`, `time.advance`, thanh tu vi và tăng tầng tự động; clock server | Mô phỏng 30 ngày, chặn faucet bất thường | Thọ nguyên Luyện Khí khắc nghiệt **có chủ ý**, không tự giảm; `data/meridians` chưa ảnh hưởng tốc tu | P0 |
| **Cảnh giới** | 14 bậc 0–13, `STAGES`, `ZONES` và khóa tính năng | Mục tiêu/nghề/nhiệm vụ cụ thể ở mỗi bậc 5–13 | `Kết Đan` là tên trong code; yêu cầu người thiết kế gọi “Kim Đan” | P0 |
| **Đột phá / độ kiếp** | Tiểu cảnh giới tự lên; đại cảnh giới bấm tay, `tribulation` và `breakthroughOdds`; có tử vong | Kiểm định độ khó/sink hộ kiếp cuối game, mã lỗi định danh | Độ kiếp thiếu hộ kiếp chết chắc là **luật chủ ý** (`docs/design-audit.md`), không phải lỗi; `main` chưa thưởng Thiên Tinh | P0 |
| **Linh căn** | Ngũ hành, Dị, quan hệ khắc, xác suất hóa Hỗn Độn sau lôi kiếp; UI mô tả | Kết nối độ tinh khiết và quan hệ mạch vào luật | Quy tắc từ `data/meridians.js` mới dùng **xem trước**; không được nhân chồng tốc tu hai bộ dữ liệu | P0 |
| **Kinh mạch** | Dữ liệu 12 chính kinh, 8 kỳ kinh, Hỗn Độn Thiên Mạch; preview quan hệ và tạp chất; test dữ liệu | State độ thông/tạp chất, lệnh khai thông/tẩy tủy, tài nguyên, UI và migration | **Chưa là luật engine**. `Z>=100` mô tả tẩu hỏa nhập ma; áp ngay cho người chơi cũ có thể phá cân bằng/giết đột ngột | **P0 — chờ duyệt** |
| **Công pháp** | `learn/activate/castManual`, tối đa 3 ô, mastery, hệ số chênh cảnh giới và hiệu ứng bị động/chủ động | Tương hợp/khắc **ngũ hành** định lượng, kiểm theo bậc 5–13 | `CP_MISMATCH` đang áp dụng **chênh cảnh giới**, không chứng minh đã có phạt khác hệ; dữ liệu không định lượng | **P0 — chờ duyệt** |
| **Pháp bảo** | Trang bị 4 ô; 30 pháp bảo gói thiết kế có chỉ số/hiệu ứng; `activateArtifact` | Kiểm tính đủ các hiệu ứng, hệ số phẩm/ngũ hành/độ hiếm, vật phẩm Tiên Giới | `item_flat_bonus` là fallback ngoài bộ thiết kế; hiệu ứng chỉ có dữ liệu mới được áp | P0/P1 |
| **Đan dược** | 60 đan toàn game, 25 trong snapshot; `craft/use`, chất lượng, giới hạn đan tu vi mỗi cảnh giới | Độ tinh khiết/tuổi dược tác động **dược lực**; thử nghiệm các sink và item thọ nguyên | `F.herb_price(...years)` ảnh hưởng **giá** một số linh thảo, không chứng minh đã tính vào hiệu lực đan | **P0 — chờ duyệt** |
| **Luyện khí** | `forge`, vật liệu, bí tịch `BT-900`, 30 công thức rèn mới | Định lượng hệ số phù hợp pháp bảo, bổ sung công thức/đích đến cao cảnh | Công thức ngoài thiết kế dùng nhánh dự phòng; không đồng nhất điều kiện | P0/P1 |
| **Chế phù** | `forge` nhận `TAL`, `BT-901`, `TAL-PL-001`; phù thường có trong catalog | Chuẩn hóa nguyên liệu/mực, phẩm chất/xác suất theo tất cả cấp | Snapshot thiết kế chỉ có **1 phù + 1 công thức vẽ phù**; phần còn lại dùng cơ chế cũ | P0/P1 |
| **Linh điền** | 4 ô; nước, đất, sâu bệnh, phẩm chất; 30 loại hạt có thời gian/đất/độ khó/sản lượng riêng | Định nghĩa toàn bộ hạt còn lại, migration an toàn cho cây đang lớn | 69 hạt gốc nhưng snapshot chỉ định nghĩa 30; `crafting.plant/gardenInfo` vẫn có nhánh fallback | **P0** |
| **Lịch luyện** | `startExploration`, kết toán chuyến 10 phút, sự kiện quái/NPC/kỳ ngộ | Đa dạng encounter theo giới và chiến lực, kiểm trần nguồn thu | NPC ngẫu nhiên dùng danh sách 10 NPC thiết kế Hạ Giới; tính toán nền từ zone còn chung | P0/P1 |
| **Bí cảnh** | 9 bí cảnh, `startDungeon` kết toán và `enterDungeon/dungeonAct` theo lượt; RNG server | Bí cảnh thật ở **Chân Tiên–Đạo Tổ**, boss/cơ chế/loot riêng, thử tải lượt | Bí cảnh cao nhất mở tại `realm=8`; thủ lĩnh không có trong snapshot phải dùng chỉ số/cơ chế tổng quát | **P0** |
| **Kỳ ngộ** | 23 sự kiện, bốn cấp hiếm; `advanceEncounters`, phần thưởng có seed | Biến thể cốt truyện/quà theo Linh/Tiên Giới | Phần thưởng hiện dựa realm; **danh sách sự kiện không gắn vùng/giới** | P1 |
| **Tông môn** | 3 tông môn, danh vọng/cống hiến/nhiệm vụ cá nhân, shop/tự lặp | Roster/chức vụ/nhiệm vụ chung thật, đóng góp có ledger | **Mô phỏng per-player**; `state.sect` chưa phải projection từ dữ liệu dùng chung | P1 (flag) |
| **NPC** | 10 NPC + hội thoại 3 mốc thiện cảm, `npcGift/Offer/Quest` | NPC Linh/Tiên Giới; dịch vụ/nhiệm vụ riêng theo nhân vật | **Cả 10 NPC thuộc Hạ Giới**; một số vai trò dẫn tới nhiệm vụ chung thay vì dịch vụ riêng | **P0/P1** |
| **Xã hội / bạn bè** | Tri kỷ/đạo hữu cố định, `meetFriend/giftFriend/discuss` | Bạn bè người thật, presence, mail idempotent, block | Màn có tương tác nhưng lưu `state.social` **riêng từng player**, không phải hệ xã hội chung | P1 (flag) |
| **Chat** | UI `screens/chat.js`, `ChatSession` dùng SSE + POST demo | Backend chat xác thực, kênh, moderation/mute/report, rate limit | **Chỉ UI/transport kỳ vọng**: `server/http/router.js` không route `/api/chat/*` (trả 404) | P1 (flag) |
| **PvP** | `duel` với đối thủ `data/social.js`, rating/cooldown, UI | PvP bất đồng bộ người thật, seed audit, matchmaking, chống win-trading | **Chỉ PvP NPC mô phỏng**, chưa có hai người chơi cùng giao dịch | P1 (flag) |
| **Bảng xếp hạng** | Tab giao du, danh sách xếp hạng | Board thật server tính, loại flagged, phân trang/season | **Chỉ UI giả lập**: `client/ui/screens/more.js` khai báo `RANKS` tĩnh | P1 (flag) |
| **Đấu giá** | `bid/lots` và tab đấu giá, kết phiên NPC tự động | Chợ dùng chung với escrow, giá sàn/trần, ledger/outbox; đấu giá thật làm sau | **Mô phỏng riêng từng player**, không có người mua/bán khác | P1 (flag) |
| **Thiên mệnh** | 4 lựa chọn miễn phí khi tạo nhân vật; `meta` lưu thành tựu kiếp | Cơ chế tích lũy Thiên Tinh/khả năng hỗ trợ kiếp mới | Thiên Mệnh Các ở **PR #31 chưa merge**; trên main thành tựu không phát điểm | **P0 — quyết định nguồn** |
| **Trọng sinh / chuyển kiếp** | Tọa hóa → chủ tài khoản `reset-after-death` → ticket tạo mới | Vòng lặp có mục tiêu/đổi build và kế thừa tài khoản đã thống nhất | Không có `reincarnate` engine; vẫn có dữ liệu cũ `TRONG_SINH`, `rebirthKeep`, `daoVan`, màn nhân vật dẫn `meta:prestige` **không tồn tại** | **P0 — xung đột luật** |
| **Thiên Thư** | 14 chương, NPC thoại, `storyMark`, flags/read, UI | Tác động nhỏ có trần + test chống nhận lại | **Ba lựa chọn chỉ ghi cờ**, chưa cấp hiệu ứng/thưởng | **P0 — chờ duyệt** |
| **Nội dung Linh Giới/Tiên Giới** | 14 zone; catalog **492 vật phẩm** (Hạ 225 / Linh 124 / Tiên 143), đan/công pháp các bậc | Mở quái/bảng rơi theo giới, NPC, boss, bí cảnh mới, nhiệm vụ và “mục tiêu tiếp theo” | Snapshot thiết kế chỉ có **5 quái thường + 7 boss + 10 NPC Hạ Giới**; quái cao cảnh dùng fallback chung, không đồng nghĩa không có item cao cảnh | **P0** |
| **Kết thúc Đạo Tổ** | `completed=true` khi đột phá cuối, Hỗn Độn linh căn có cơ chế thức tỉnh | Động lực sau khi chứng đạo, thử thách kiếp khác nhau, mục tiêu không lạm phát | `progression.breakthrough` chặn đột phá tiếp khi completed; chưa có luồng hậu kỳ riêng | P1 (chờ duyệt) |
| **Độ an toàn state / cân bằng** | `assertStateSafe` JSON-safe và ≤64 KB, receipt/revision/RNG, test engine | Bất biến ngữ nghĩa mỗi giao dịch, bot 30 ngày, faucet/sink, flag bất thường | Kiểm JSON-safe **không đồng nghĩa** đã kiểm bag nguyên, trang bị nằm trong bag, quy tắc realm/stage; hiện chưa có script cân bằng 30 ngày | **P0** |

**Nhận xét:** Đây không phải 24 tính năng “chưa làm”; phần lớn đã có vòng chơi cơ bản và UI. Các nhóm P0 thiếu thật tập trung vào kinh mạch, công thức chưa định lượng, hạt fallback, nội dung cao giới, lỗi có mã, kiểm bất biến/bot. Nhóm xã hội chia sẻ là một hệ backend khác và cần feature flag trước khi công bố là tính năng nhiều người.

## B. Dữ liệu đã có nhưng chưa dùng hết

1. `data/meridians.js`: 12 chính kinh, 8 kỳ kinh, Thiên Mạch; hệ số `SAME_SPEED=1.25`, `SINH_SPEED=1.10`, `zPerMinute`, `zPenalty`, `BONUS_TU_LUYEN`; hiện chỉ `client/ui/boot.js` dùng xem trước. State V9 không chứa `meridians`; không có lệnh khai thông/tẩy mạch.
2. `data/design-raw.js`: 30 hạt được định lượng nhưng `data/items.js` có 69 hạt; ít nhất 39 hạt không có định nghĩa chi tiết tương đương và được `crafting.js` xử lý bằng thời gian/cây/độ khó mặc định. Không tự gán các hạt này vào dữ liệu nhà thiết kế.
3. `data/design-raw.js`: 5 quái thường chỉ Hạ Giới; quái Linh/Tiên Giới trong `data/catalog.js` có tên và hàm CP tổng quát nhưng chưa có design row + bảng rơi riêng. 7 boss và 21 hàng pha boss: các bí cảnh có boss **không trùng tên** với snapshot (ví dụ `Lôi Đình Cổ Thú`, `Thủ Hộ Tiên Linh`, `Thiên Môn Kiếp Chủ`) dùng nhánh fallback, không có cơ chế pha thiết kế.
4. `data/design-raw.js`: 10 NPC đều có giới = Hạ Giới; `data/social.js` còn NPC mô phỏng `FRIENDS`, `DAO` trải các bậc nhưng không thay thế NPC thế giới, bán/dạy, nhiệm vụ và đối thoại Linh/Tiên Giới.
5. `data/story.js`: 14 chương, ba lựa chọn và nhiều nhánh hội thoại đã có nội dung; `world.storyMark` chỉ cập nhật `read/flags`. Chưa có hiệu ứng gameplay từ cờ.
6. `data/formulas.js`: hàm `F.herb_price` có ảnh hưởng **tuổi dược lên giá** khi `years` tồn tại; **hiệu lực đan/công pháp khác hệ** chưa được nối với tuổi dược và tinh khiết. Các hệ số `CP_MISMATCH`/`DAN_MISMATCH` hiện dùng cho **chênh cảnh giới**; không tự diễn giải đó là ngũ hành.
7. Tàn dư cơ chế cũ: `TRONG_SINH` trong `data/balance.js` và nhánh `inventory.use`, `rebirthKeep`/`daoVan` trong state, công thức `prestige` trong `data/formulas.js` nhưng V9 **không có hành động trọng sinh**. Cần quyết định dọn/hạn chế, không kích hoạt lại ngầm.
8. `data/character.js` và `data/formulas.js` còn giá trị RNG mặc định toàn cục (`Math.random`). Đây là **vi phạm ràng buộc mới** nếu hiểu “data/ không được dùng Math.random” theo cả tham chiếu/default; test nguồn hiện chưa bắt được.

## C. Lệnh/UI có nhưng luật rỗng hoặc không đúng lời dẫn

- **Không có lệnh protocol bị bỏ trống**: `engine/game.js` bắt buộc mỗi lệnh đúng một miền; 48 lệnh đều có owner, `HU_GAME.READY` trong test. `creation` có `commands=[]` là **đúng hợp đồng**: tạo nhân vật qua server ticket/`createCharacter`, không phải game command.
- `storyMark` là lệnh có hành vi **ghi read/flags**, không phải no-op; nhưng **hiệu ứng thưởng/nhánh hậu quả còn trống**.
- `setPreference` làm đổi settings trong state, dù định hướng online mới muốn lưu UI preference riêng; cần rà soát để không tăng revision gameplay vì đổi âm thanh/mùa.
- `client/ui/screens/more.js`: `RANKS` khai báo tĩnh, PvP dùng `RIVALS`, bạn bè/đạo hữu là NPC; không quảng bá là leaderboard/bạn bè người thật.
- `client/ui/screens/chat.js` và `client/session/chat-session.js` có form, SSE và gửi yêu cầu `/api/chat/*`; `server/http/router.js` chưa có service đó → 404. **UI hiện vượt khả năng backend.**
- `client/ui/screens/world.js`: đấu giá NPC per-player, không phải chợ chung.
- `client/ui/screens/character.js` có liên kết `meta:prestige` nhưng `client/ui/screens/meta.js` không có tab `prestige`; màn Cài đặt còn lời dẫn trọng sinh V8. Cần sửa sau khi chốt quy tắc.
- `inventory.use` nhận `TRONG_SINH` và sửa `rebirthKeep`, nhưng không tồn tại lệnh tạo lại kiếp dùng trường này. Cần kiểm định/vô hiệu hoá đường này thay vì quảng bá hiệu lực.

## D. Quyết định thiết kế đang chờ chủ dự án

| Mã | Mâu thuẫn/câu hỏi | Quyết định cần xác nhận trước code |
|---|---|---|
| **D1 — cơ sở triển khai** | `main` chưa có Thiên Mệnh Các; PR #31 đang mở, chưa merge | Bước 1 làm sau khi PR #31 được duyệt/merge, hay chỉ dựa vào main và hoãn Thiên Mệnh Các? Không cherry-pick ngầm. |
| **D2 — schema** | Main đã là V9, yêu cầu lại “tăng lên V9” | Chấp nhận **V10** + `normalize` V4–V9 và kế hoạch migrate state V9 đang sống? |
| **D3 — kinh mạch/tạp chất** | `zPenalty(50)=10%`, `(80)=30%`, `(100)=100%` và mô tả “tẩu hỏa nhập ma”; chưa có hành động tẩy; cho người cũ tác động ngay nguy hiểm | Đồng ý khởi tạo **độ thông = 0, tạp chất = 0** cho state đang tồn tại, chỉ tích tạp chất từ giờ online sau migrate? Ngưỡng Z=100 là **tử vong** hay chỉ khóa tốc tu tới khi tẩy? Chi phí khai thông/tẩy phải duyệt. |
| **D4 — tương hợp công pháp/dược liệu** | Dữ liệu không có hệ số cùng/sinh/khắc và cách tính độ tinh khiết/tuổi dược vào phần thưởng | Duyệt hoặc chỉnh **ĐỀ XUẤT** công thức thử nghiệm ở mục E trước khi áp dụng; **không** thay đổi `CP_MISMATCH` hiện tại mà không test parity. |
| **D5 — lore/Thiên Thư** | `storyMark` chỉ ghi lựa chọn; cần thưởng nhỏ nhưng không có mức nào được duyệt | Duyệt **ĐỀ XUẤT** 3 nhánh giới hạn ở mục E; cờ phải lấy từ `data/story.js`, một lần/kiếp, không gửi thưởng từ client. |
| **D6 — hậu kỳ / tử vong** | V9 chết vĩnh viễn; yêu cầu “trọng sinh/hậu Đạo Tổ” có thể hiểu khác luật | Giữ **xóa đạo thân chết và tạo mới** (PR #31 giữ Thiên Tinh) hay yêu cầu một lệnh `reincarnate` khác? Sau `completed`, được tiếp tục thu nhập, được chủ động chuyển kiếp, hay chỉ nhìn thành tựu? |
| **D7 — mục tiêu phát hành** | Multiplayer thật P1 nhưng tiêu chí nghiệm thu nói mọi mục phải có UI+luật+data+test; chat/ranking hiện chỉ UI hoặc giả lập | Cho phép **ẩn/khóa bằng feature flag** đối với các mục P1 chưa làm trước phát hành hay bắt buộc hoàn thành toàn bộ multiplayer? |
| **D8 — cân bằng khó chủ ý** | `docs/design-audit.md` coi Luyện Khí tử vong sớm và lôi kiếp thiếu hộ kiếp là có chủ ý | Giữ nguyên “khó Phàm Nhân” khi đưa cơ chế kinh mạch/Thiên Mệnh Các vào, hay cho phép nới chỉ sau bot 30 ngày? |
| **D9 — thuật ngữ** | Engine dùng `Kết Đan`, nội dung bạn dùng `Kim Đan` | Giữ mã/nội dung theo `Kết Đan`, hoặc thống nhất nhãn giao diện thành `Kim Đan` (không đổi index)? |

## E. Công thức và nội dung **ĐỀ XUẤT — CHƯA ĐƯỢC PHÊ DUYỆT**

Những con số dưới đây là **giả thuyết cân bằng để thử bằng bot**, **không phải luật đã cài**, và **không được tự đưa vào `data/formulas.js` trước khi duyệt**.

1. **ĐỀ XUẤT — kinh mạch trước migration:** người chơi V4–V9 nhận `thong=0`, `Z=0`; không truy thu tạp chất cho thời gian quá khứ. Sau đó dùng **công thức tạp chất đã có trong `data/meridians.js`** theo thời gian *online*. Ví dụ Tam linh căn (3 hệ), tinh khiết 70%: `Z/phút = (3−1) × 0,5 × (1−0,70) = 0,30`; từ Z=0 tới Z=50 là ~167 phút online **nếu chưa có cách tẩy**. Mốc 100/tử vong hay khóa tốc phải duyệt.
2. **ĐỀ XUẤT — tương hợp công pháp ngũ hành:** giữ nguyên phạt **chênh cảnh giới** hiện tại; nhân thêm `M_he` chỉ cho công pháp có nguyên tố xác định: cùng hệ = 1,00; hệ sinh = 0,95; trung hòa = 1,00; khác hệ = 0,90; hệ khắc = 0,85. Ví dụ công pháp cộng 12% công kích, gặp khắc hệ thì còn +10,2% (12% × 0,85), không thay đổi hiệu lực phép không có hệ. Cần kiểm tra nguồn gốc nguyên tố và ngăn cộng dồn nhiều tầng phạt.
3. **ĐỀ XUẤT — dược liệu:** khi có metadata tinh khiết **được engine xác minh** từ linh thảo/linh điền, hệ số dược lực `M_purity = 0,90 + 0,10 × purity/100` (trần [0,90; 1,00]); tuổi dược lấy hệ số từ bảng tuổi thiết kế nếu có, thử `M_age ∈ [0,95; 1,05]`. Ví dụ thuốc cơ bản +100 tu vi, tinh khiết 80% và dược ưa niên đại (+5%) → `100 × 0,98 × 1,05 = 102,9` trước cap đan. **Không** lấy metadata năm tuổi, phẩm chất hay giá do client gửi. Đây mới là ví dụ minh họa, chưa xác định cách lưu mỗi mẻ.
4. **ĐỀ XUẤT — chế tạo hạt ngoài snapshot:** mỗi mã hạt phải có bảng `thời gian, loại đất, độ khó, min/max sản lượng` khai báo *đích danh* trong `data/`; ban đầu chỉ đề xuất tạo bảng đối chiếu theo tier dựa trên fallback cũ (thời gian `max(60, craft_time(tier)×2)` giây), sau đó designer sửa tay. Không đổi cây đã gieo; áp định nghĩa mới cho **lượt gieo sau khi phát hành**.
5. **ĐỀ XUẤT — hệ quả Thiên Thư:** mỗi một trong 3 lựa chọn chỉ mở **một trong ba buff nhỏ, độc quyền, một lần/kiếp**, ví dụ (a) +1% tốc tu, (b) +1% hiệu quả thu hoạch, (c) +1% giới hạn công kích; không phát linh thạch hay vật phẩm trực tiếp, không tăng bonus quá mức khi chuyển kiếp. Đây là **ví dụ cân bằng**, tên nhánh và điều kiện chọn phải lấy chính xác từ `data/story.js` sau khi duyệt.
6. **ĐỀ XUẤT — nội dung cao giới:** ưu tiên 1 “đường tiến” đủ quái/bảng rơi → mục tiêu nghề → 1 bí cảnh/1 NPC có nhiệm vụ cho **mỗi bậc từ 5 đến 13**. Toàn bộ tên, vật phẩm/boss sinh thêm phải mang nhãn `DỰ THẢO THIẾT KẾ` trong data và được duyệt trước khi phát hành. Không xem 492 vật phẩm là bằng chứng đủ vòng chơi.
7. **ĐỀ XUẤT — endgame:** hoàn thành Đạo Tổ mở sảnh chọn thử thách **kiếp mới** và chỉ thay đổi phần thưởng **cấp tài khoản** đã có trong PR #31; không tự tạo phép hồi sinh đạo thân. Nếu chọn cơ chế “chứng đạo rồi chuyển kiếp chủ động”, cần API reset riêng có xác nhận, idempotency và quyền sở hữu.
8. **ĐỀ XUẤT — chống lạm phát:** trước hết đo bot theo chiến lược, **không hard-code trần tài nguyên** khi chưa có p95/p99 và độ khó mục tiêu. Khi có kết quả, flag review các khoản vượt trần lý thuyết từ engine, tuyệt đối không tự ban. Ví dụ thước đo: exp/giờ, stone/giờ, vật phẩm/giờ và thời gian/đại cảnh giới.

## F. Ưu tiên P0/P1/P2 và ước lượng

> **Ước lượng sơ bộ**, đơn vị ngày công kỹ sư có hiểu repo, **không phải cam kết tiến độ**; bao gồm code + test + sửa tài liệu, **không** bao gồm thời gian thiết kế duyệt, sáng tác hoặc kiểm QA thủ công. Chưa bắt đầu các hạng mục dưới đây.

| Ưu tiên | Hạng mục / thứ tự phụ thuộc | Ước lượng |
|---|---|---:|
| **P0** | Chốt D1–D9, đồng bộ tài liệu nguồn sự thật; siết `data/` RNG và test nguồn | 1–2 ngày |
| **P0** | Thiết kế dữ liệu kinh mạch, schema V10/migration, luật, UI, test | 5–8 ngày |
| **P0** | Công pháp/dược liệu/pháp bảo định lượng theo công thức đã duyệt | 3–5 ngày |
| **P0** | Mã lỗi rule ổn định + chi tiết `GAME_RULE_VIOLATION.details.code`, UI map tiếng Việt | 2–3 ngày |
| **P0** | 69 hạt: định nghĩa đủ + migration cây đang trồng + test | 2–4 ngày |
| **P0** | Thiên Thư: nhánh có hệ quả nhỏ, chống nhận lại, UI | 2–3 ngày |
| **P0** | Nội dung Linh/Tiên Giới: quái/loot, NPC, bí cảnh, nhiệm vụ nghề, liên kết design | 8–15 ngày + duyệt sáng tác |
| **P0** | Kiểm bất biến state 64 KB + property/regression và sai lệch di trú | 2–4 ngày |
| **P0** | Bot 30 ngày nhiều chiến lược, báo cáo faucet/sink/tử vong, CI bot ngắn | 4–7 ngày |
| **P1** | Endgame Đạo Tổ, Hỗn Độn, thử thách kiếp mới, thành tựu (sau D1/D6) | 4–7 ngày |
| **P1** | Leaderboard thật + flag & snapshot score; bạn bè/mail/presence | 6–11 ngày |
| **P1** | Chat thật (đăng nhập, moderation, report, SSE/polling) | 4–7 ngày |
| **P1** | PvP bất đồng bộ, tông môn thật, fixed-price market + escrow/ledger/outbox | 18–30 ngày |
| **P2** | Đấu giá thật, sự kiện thế giới, season rollover, mỹ thuật mới/hiệu ứng đa giới | 10–18+ ngày |

**Phụ thuộc bắt buộc:** luật và dữ liệu P0 phải được duyệt và vượt bot cân bằng trước khi bật xã hội chung; chưa có ledger/outbox thì không triển khai chuyển tài nguyên giữa hai tài khoản. Với một process SQLite có thể khởi đầu leaderboard/presence tối giản, nhưng kiến trúc transaction nhiều người cần quyết định PostgreSQL hoặc migration SQLite có khóa/ledger rõ ràng.

## G. Tiêu chí đóng audit trước khi chuyển sang Bước 1

- [x] Đã kiểm tra hợp đồng V9/protocol 2, 48 lệnh và 9 miền, phân biệt rõ `main` với PR #31.
- [x] Đã có ma trận đầy đủ các hệ thống gameplay, danh sách dữ liệu chưa dùng, UI mô phỏng/route thiếu và kế hoạch P0/P1/P2.
- [ ] Chủ dự án duyệt **D1–D9**, đặc biệt luật Z=100/tử vong, V10, vai trò Thiên Mệnh Các và scope multiplayer.
- [ ] Chủ dự án duyệt hoặc hiệu chỉnh **các công thức ĐỀ XUẤT** ở mục E trước khi mã hóa.
- [ ] Sau khi duyệt mới chia commit theo từng hạng mục, thêm test, chạy `npm run check && npm test` sau mỗi thay đổi và cập nhật audit khi từng P0 hoàn thành.
- [ ] Khi bắt đầu gameplay code: chứng minh `State <= 65536 B`, di trú state V4–V9 và không gửi state, thời gian, giá, phần thưởng, RNG từ client.

**Đặc biệt:** `docs/design-audit.md` ghi nhận thọ nguyên Nhân tộc Luyện Khí khoảng **41 phút liên tục** với hồ sơ tham chiếu (không phải một mốc “25 phút” chung); và độ kiếp không hộ kiếp có thể chắc thất bại. Đây là mục tiêu khó có chủ ý. Không điều chỉnh khi chưa có kết quả mô phỏng và duyệt riêng.
