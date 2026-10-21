# Thiên Vân Đại Lục — đặc tả dev kinh tế và nghề phụ v2.1

Ngày cập nhật: 21/10/2026. Nối bản v1.7, giữ 9 NPC tương tác, 14 đại cảnh giới và không có cảnh giới Phàm Nhân. Đây là đặc tả và dữ liệu tham chiếu để phát triển; gói chưa có client/server game hoàn chỉnh. Nguồn import hiện hành duy nhất là JSON trong 02_DU_LIEU và 04_COMBAT. Cấu hình core/nghề/xã hội đã gộp trong data/v21/config.json; không cần chuỗi override lịch sử.

## 1. Quy tắc người dùng đã chốt và phần đề xuất

| Đã chốt theo yêu cầu | Diễn giải triển khai |
|---|---|
| Hạ Giới có Vạn Bảo Các | Thương các dùng linh thạch |
| Linh Giới có Linh Thiên Các | Thương các dùng linh thạch thượng phẩm theo hệ tiền v1.7 |
| Tiên Giới có Vạn Đạo Các | Thương các dùng tiên ngọc |
| Chợ đen ở Hạ Giới và Linh Giới | Có mua và bán, nguồn hàng khác thương các |
| Đấu giá chung server | Người chơi cùng server đăng bán và đấu giá; tách sổ giá theo đồng tiền |
| Hoàn thành nhiệm vụ tông môn có thưởng | Tiền và cống hiến; nhận một lần đúng chu kỳ |
| Linh điền 4×4, mở sẵn 2 ô và khóa 14 ô | Cảnh giới cao hơn là điều kiện; phải trả tiền mở từng ô |
| Mua ô bằng linh thạch và tiên ngọc | Hạ/Linh Giới mở ô bằng LT_HP; Tiên Giới mở bằng TN |
| Bốn thao tác linh điền | Gieo hạt, bón phân, tưới nước, bắt sâu |
| Luyện đan/luyện khí có 3 ô nguyên liệu + 1 ô tăng phẩm chất | Ô thứ tư tùy chọn, không thay thế nguyên liệu công thức |
| Vẽ phù khởi đầu 5 lần/ngày; tăng số lần theo cảnh giới | Đề xuất +1 mỗi **đại cảnh giới**, không phải mỗi tầng |
| Mỗi cấp vẽ phù tăng tỷ lệ hỏng | Áp dụng cả khi vẽ lại công thức cũ; tăng phẩm chất là phần đánh đổi |
| Các nghề đều tích EXP và tăng phẩm chất | Bốn nghề có cấp riêng: linh điền, luyện đan, luyện khí, vẽ phù |

Những giá mở ô, EXP, xác suất, thuế, hạn mức và thời gian dưới đây là **đề xuất cân bằng**. Mất tài sản khi chết được kế thừa; tỷ giá, đổi hai chiều và reset luyện hóa đã được người dùng chốt ở v1.9. Không hiểu mọi con số mới là đã được người dùng chốt hoặc kiểm chứng qua beta.

## 2. Linh thạch và tiên ngọc dùng ở đâu

Đã chốt `1 LT_TP = 1.000 LT_HP`, `1 TN = 1.000 LT_TP`. Đổi hai chiều, không phí, sau khi mở giới tương ứng trong kiếp hiện tại. Đổi lên cần đủ bội số nguyên; đổi xuống nhân chính xác, không làm tròn. Không tự đổi tiền khi bấm mua. Giá phải ghi đơn vị; thiếu đúng đồng tiền thì báo thiếu, không lấy nhầm tiền khác. Toàn bộ ví là tài sản của kiếp. Tiền lưu số nguyên chính xác; JSON dùng chuỗi thập phân, backend dùng kiểu số nguyên lớn/decimal chính xác, không dùng float.

| Hoạt động tiêu tiền | Hạ Giới | Linh Giới | Tiên Giới | Quy tắc |
|---|---|---|---|---|
| Mua hàng thương các | LT_HP | LT_TP | TN | Giá và hàng cụ thể ở ../data/v21/venue_stock.json |
| Mua/bán tại chợ đen | LT_HP | LT_TP | Không mở trong bản này | Hàng hiếm; giá mua đề xuất 125% giá chuẩn |
| Mở ô linh điền | LT_HP | LT_HP | TN | Ngoại lệ có chủ ý theo yêu cầu người dùng |
| Hạt giống, phân, mực, vật liệu tăng phẩm | LT_HP | LT_TP | TN | Chỉ tiêu khi mua hoặc thao tác hợp lệ |
| Phí luyện đan/luyện khí/vẽ phù | LT_HP | LT_TP | TN | Theo công thức; 8 công thức mẫu hiện mới thuộc Hạ Giới |
| Luyện hóa | LT_HP | LT_TP | TN | Đã chốt: 3×2^(tầng−1) theo tiền của giới hiện tại; đặt lại khi sang đại cảnh giới |
| Phí và thuế đấu giá | LT_HP | LT_TP | TN | Phí đăng 1%, thuế bán 5%, làm tròn lên |

Cống hiến là số dư riêng của kiếp, không đổi thành LT_HP/LT_TP/TN. Shop tông môn vẫn dùng cống hiến; thương các và chợ đen dùng tiền. Thưởng đã gộp vào quests.json, không áp dụng thêm bảng thưởng nào khác.

Nguồn tiền: nhiệm vụ, chiến đấu và hoạt động hợp lệ; bao gồm thưởng nhiệm vụ tông môn đã gộp. Bán cho NPC tạo tiền nên bị hạn mức và trần price_book; mua bán giữa người chơi chỉ chuyển tiền, phí/thuế mới là lượng tiền bị rút khỏi hệ thống. Đổi tiền hai chiều bảo toàn tổng giá trị, không sinh tiền. Chưa thêm ngân hàng hoặc kho miễn mất khi chết.

## 3. Thương các và chợ đen

| Mã | Địa điểm | Mở từ | Tiền | Định hướng hàng |
|---|---|---|---|---|
| VEN-HG | Vạn Bảo Các | Luyện Khí | LT_HP | Hạt thường/tốt, vật tư nghề, đan phổ thông |
| VEN-LG | Linh Thiên Các | Luyện Hư | LT_TP | Vật tư Linh Giới, hạt và đan theo giới |
| VEN-TG | Vạn Đạo Các | Ngụy Tiên | TN | Vật tư Tiên Giới, hạt thường/tốt và hạt hiếm hạn mức 1/ngày, đan theo giới |
| VEN-BH | Chợ đen Hạ Giới | Trúc Cơ | LT_HP | Hạt hiếm, phụ trợ tăng phẩm, đan hạn chế |
| VEN-BL | Chợ đen Linh Giới | Hợp Thể | LT_TP | Hàng hiếm Linh Giới và phụ trợ |

Đây là địa điểm/giao diện dịch vụ, không thêm người bán có tên hoặc ID NPC. Giao diện phân tab Mua/Bán, hiển thị giá, đơn vị, phẩm chất, tồn còn lại, điều kiện nghề/cảnh giới và trạng thái khóa giao dịch. Không giấu phí ở bước cuối.

Thương các làm mới quầy mỗi 2 giờ; chợ đen 24 giờ. Hạn mức mua theo tài khoản/ngày, không theo số lần refresh. Dữ liệu MVP dùng tồn cá nhân để tránh người chơi sớm vét sạch hạt giống; hàng hiếm chung server có thể thêm ở giai đoạn sau. Mua khóa ví và tồn cùng một giao dịch. Không cho client chọn kết quả roll kho hoặc tự đặt giá.

Bán NPC: chỉ vật phẩm không khóa, không trong escrow, không là vật chứng/TM/cổ vật Lục Mệnh/đồ nhiệm vụ hoặc hàng tông môn. Thương các mua lại tối đa 20% giá chuẩn, chợ đen 15%; làm tròn xuống. Phẩm chất cao không tự tăng giá mua lại ở MVP. Hạt giống và vật tư nghề mới không bán lại NPC, vẫn có thể trao đổi người chơi khi đủ điều kiện. Bán NPC nằm trong hạn mức rút tài sản 20% theo luật thương mại v1.7. Mua và bán có báo giá tách biệt; không tạo vòng mua rẻ tại chợ đen rồi bán NPC lời vô hạn.

Chợ đen không lừa hàng giả ngẫu nhiên, không tự gây permadeath và không bán vật phẩm ẩn bắt buộc. Các điều kiện nhiệm vụ chính không phụ thuộc hàng tồn ngẫu nhiên của bất kỳ quầy nào.

## 4. Thưởng nhiệm vụ tông môn

`../data/v21/quests.json` chứa khối thưởng hoàn chỉnh; nhiệm vụ sect dùng rewards_by_world, nhiệm vụ chính giữ khối thưởng của chính nó. Chỉ nhận nhóm nhiệm vụ của dòng tu hành đã chọn. Trên Tiên Giới vẫn là nhiệm vụ dòng tu hành đó, không nhân thêm phần thưởng do có nhiều thế lực mở quầy.

| Chu kỳ | Cống hiến | Hạ Giới | Linh Giới | Tiên Giới |
|---|---:|---:|---:|---:|
| Việc ngày 1 | 10 | 15 LT_HP | 2 LT_TP | 1 TN |
| Việc ngày 2 | 10 | 15 LT_HP | 2 LT_TP | 1 TN |
| Thử luyện tuần | 50 | 60 LT_HP | 8 LT_TP | 3 TN |

Tổng tối đa từ hai việc ngày: 20 cống hiến + 30 LT_HP / 4 LT_TP / 2 TN. Thử luyện tuần riêng, không phát mỗi ngày. Chọn bảng thưởng theo giới lúc nhận nhiệm vụ; phi thăng trước khi trả không nâng thưởng hồi tố. Mỗi nhóm việc/ngày hoặc tuần chỉ thưởng một lần trên tài khoản, kể cả đổi tông môn hoặc trùng sinh. Tất cả thưởng là của kiếp đang nhận.

Bản hiện hành dùng lịch server `Asia/Ho_Chi_Minh`, đổi ngày 00:00, đổi tuần thứ Hai 00:00. Nhiệm vụ tông môn đã chuyển khỏi chu kỳ “ngày nhận công” của v1.7; mức offline XP vẫn giữ nguyên, hai khái niệm không dùng chung bộ đếm. Khi nâng phiên bản giữa chu kỳ, gán nhiệm vụ đã trả vào khóa ngày/tuần tương ứng, không phát bù hoặc nhân đôi. Nhận lại nhiệm vụ đời mới không vượt khóa đã thưởng của tài khoản.

Trạng thái nhiệm vụ: khóa → có thể nhận → đang làm → có thể trả → đã trả. Thao tác trả nhiệm vụ khóa cờ hoàn thành, số dư thưởng, hành trang/hộp nhận cùng một giao dịch. Kết quả trả về gồm tiền, cống hiến, item, period_key và claim_id. Bấm lại cùng request_id trả lại biên nhận cũ.

## 5. Đấu giá chung server

Mỗi server có chợ đấu giá chung, không xuyên server. Tách các sổ LT_HP/LT_TP/TN; mở quyền LT_TP khi tới Linh Giới và TN khi tới Tiên Giới. Một phiên chỉ dùng một đồng tiền, không đặt giá bằng LT_HP vào phiên TN. Người đã phi thăng vẫn xem và dùng đồng tiền đã mở; không cần chuyển bản đồ để mua. Hàng còn phải đạt điều kiện sử dụng nếu cảnh giới thấp.

Đề xuất: 5 phiên đang mở mỗi tài khoản, thời lượng 6/12/24 giờ, mặc định 12 giờ. Có giá khởi điểm, giá mua ngay tùy chọn, bước giá tối thiểu `max(1, ceil(current_bid × 5%))`. Lượt đầu được đặt đúng giá khởi điểm; lần sau phải đạt giá hiện tại cộng bước giá. Giá mua ngay phải ≥ giá khởi điểm. Giá đăng không vượt 10 lần giá chuẩn server trên mỗi đơn vị; đồ chưa có giá chuẩn không được đăng cho đến khi có cấu hình. Kiểm tra giá trị nguyên không vượt 78 chữ số.

Phí đăng `max(1, ceil(total_start_price × 1%))`, trừ ngay khi đăng, không hoàn do hủy hoặc hết hạn. Thuế bán `ceil(final_price × 5%)`, trừ từ tiền bán; người mua trả đúng giá thắng, người bán nhận giá thắng trừ thuế. Giới hạn phiên nhỏ không làm số tiền nhận âm. Các giá ở đây tính cho cả lô, giao diện phải ghi số lượng và đơn giá để tránh nhầm.

Đưa nguyên lô hàng vào ký quỹ lúc đăng. Bid giữ toàn bộ giá đặt trong escrow; người đang dẫn nâng giá chỉ giữ thêm chênh lệch. Khi bị vượt giá, giải phóng khoản cũ đúng một lần về ví cùng kiếp còn sống. Nếu hai người bid đồng thời, khóa phiên và ví theo thứ tự cố định, chỉ một mức giá được xác nhận trước. Không tự bid phiên của mình hoặc nhân vật khác cùng account. Giao dịch còn phải qua tuổi tài khoản 72 giờ, khóa đồ nhận 24 giờ và hạn mức rút tài sản v1.7.

Chống đặt giá giây cuối: bid trong 120 giây cuối kéo dài 120 giây; tổng kéo dài tối đa 600 giây so với giờ kết thúc gốc. Hủy chỉ khi chưa có bid, trả hàng cùng kiếp và không hoàn phí đăng. Hết hạn không ai bid: trả hàng. Mua ngay cũng phải khóa phiên, đóng một lần, giải phóng người dẫn cũ và thanh toán người mua; nếu chính người dẫn mua ngay chỉ giữ thêm chênh lệch.

Trạng thái: DRAFT → ACTIVE → SOLD / EXPIRED / CANCELLED / CANCELLED_DEATH. Terminal state chỉ được ghi một lần. Delivery và refund là kết quả giao dịch, không phải lời hứa từ client. Không đợi cron nhiều phút mới đóng một phiên đã qua hạn: mọi bid/mua ngay phải kiểm tra thời gian server; worker và request cùng gọi một thủ tục kết thúc có idempotency.

### Tử vong, mất kết nối và nhận hàng

- Người bán chết khi ACTIVE: hủy phiên, hủy hàng thuộc kiếp đã chết, hoàn bid cho người đặt còn sống. Không chuyển đồ sang kiếp mới.
- Người dẫn giá chết: hủy khoản bid đang giữ như tài sản mất của kiếp; xóa giá dẫn, phục hồi mức giá hợp lệ gần nhất theo sổ bid còn hiệu lực hoặc về giá khởi điểm. Bid cũ đã được hoàn tiền không được tự khôi phục thành bid giữ tiền; MVP an toàn là xóa toàn bộ bid đã hoàn và về trạng thái chưa có người dẫn.
- Người mua hoặc người bán chết **sau SOLD đã commit**: giao dịch đã hoàn thành không đảo ngược. Mỗi bên chỉ mất hàng/tiền đang thuộc kiếp mình; không tước đồ của người mua khác còn sống.
- Nếu xử lý chết và chốt phiên trùng thời điểm, thứ tự commit của khóa life/auction quyết định, không theo thời gian máy khách. Đời chết trước không nhận thanh toán mới; đời còn sống trước có thể chốt rồi bị luật mất tài sản xử lý.
- Hàng/tiền chưa nhận trong hộp thư, escrow và output craft vẫn là tài sản vật lý, mất cùng kiếp. Hộp thư không trở thành kho miễn tử vong. Không có hạn hết hàng trong cùng kiếp để tránh xóa đồ vì người chơi chưa đăng nhập.
- Mất kết nối không hoàn bid hoặc hoàn nguyên liệu. Client tra trạng thái theo operation_id khi trở lại. Không gửi thư hoặc thông báo ra dịch vụ bên ngoài.

Log tối thiểu: auction_id, seller_life_id, bid_id, bidder_life_id, item_instance_id, lot_quantity, currency, gross, fee, tax, escrow_ledger_ids, closed_reason, config_version, request_id và thời gian server. Không ghi token hoặc seed RNG nhạy cảm vào log người dùng.

## 6. Linh điền 4×4

Đánh số ô từ trái sang phải, từ trên xuống dưới, 1–16. Ô 1 và 2 mở khi tạo kiếp; 14 ô còn lại khóa. Nút khóa ghi cả cảnh giới và giá. Đạt cảnh giới chỉ mở quyền mua, không tự mở ô miễn phí. Mua tuần tự, không bỏ qua ô trước.

| Ô | Cảnh giới tối thiểu | Giá đề xuất |
|---:|---|---:|
| 1–2 | Luyện Khí | Miễn phí |
| 3 | Trúc Cơ | 50 LT_HP |
| 4 | Kim Đan | 100 LT_HP |
| 5 | Nguyên Anh | 200 LT_HP |
| 6 | Hóa Thần | 400 LT_HP |
| 7 | Luyện Hư | 800 LT_HP |
| 8 | Hợp Thể | 1.600 LT_HP |
| 9 | Đại Thừa | 3.200 LT_HP |
| 10 | Độ Kiếp / Phi Thăng | 6.400 LT_HP |
| 11 | Ngụy Tiên | 1 TN |
| 12 | Chân Tiên | 2 TN |
| 13 | Kim Tiên | 4 TN |
| 14 | Thái Ất | 8 TN |
| 15 | Đại La sơ nhập | 16 TN |
| 16 | Đại La sơ nhập | 32 TN |

Hai ô cuối cùng cùng mở quyền ở Đại La nhưng vẫn mua riêng. Tổng mở đủ 14 ô: 12.750 LT_HP và 63 TN. Đồ mua là tài sản kiếp, mất khi chết; kiếp mới quay về hai ô ban đầu. Phi thăng giữ số ô đã mua và vụ đang trồng. Người chơi ở Linh Giới có thể chủ động đổi LT_TP xuống LT_HP không phí để mua ô; ở Tiên Giới có thể đổi TN xuống các đơn vị đã mở. Giao diện mua ô không tự thực hiện đổi tiền. Vẫn giữ giá mở ô đã ghi trong bảng.

### Vòng trồng và chăm sóc

`LOCKED → EMPTY → GROWING → READY → EMPTY`. Tại GROWING có ba cờ chăm sóc riêng: đã bón phân, đã tưới và đã bắt sâu. Một thao tác không sinh thêm vòng hoặc tự thu hoạch. Hủy cây đang trồng yêu cầu xác nhận, mất hạt/phân đã dùng, không nhận EXP.

1. **Gieo hạt:** chọn hạt, kiểm tra ô mở/trống, cảnh giới/cấp nghề, trừ đúng một hạt, tạo crop_cycle_id và thời điểm bắt đầu/kết thúc. Hai hạt Thanh Linh Thảo khóa giao dịch được cấp một lần khi tạo kiếp để dùng hai ô ban đầu; không phát lại khi đăng nhập.
2. **Bón phân:** dùng một Linh Phì cùng giới của cây, một lần/vụ, chỉ trước READY; giảm 10% thời gian gốc. Không có phân vẫn trồng được. Phân không đổi loại cây hoặc tự nâng phẩm chất.
3. **Tưới nước:** miễn phí, một lần/vụ, giảm 10% thời gian gốc. Chỉ thao tác có hiệu lực mới đánh dấu đã tưới. Bấm lại không giảm tiếp, không nhận EXP.
4. **Bắt sâu:** mỗi vụ server roll xác suất sâu 25% và ấn định thời điểm sâu xuất hiện ở 50% thời gian gốc. Hiển thị khi đã tới thời điểm và cây chưa thu. Bắt đúng một lần nếu có sâu; có thể bắt ở READY trước thu hoạch. Không cần mua vật phẩm để bắt sâu.

Thời điểm chín = bắt đầu + thời gian gốc × (1 − tổng giảm), tổng giảm tối đa 20%. Chăm sóc quá muộn có thể khiến cây chín ngay, nhưng không phát thêm lượt hoặc tính lại EXP. Thời điểm xuất hiện sâu không dịch chuyển khi chăm sóc; vì chín sớm nhất 80% thời gian gốc nên vẫn có khoảng xử lý sâu. Không có sâu thì nút bắt sâu bị vô hiệu, không tiêu gì.

Một hạt cho cơ sở 3 linh thảo. Nếu có sâu và chưa bắt khi thu thì giảm 20% sản lượng, làm tròn xuống, tối thiểu 1; với 3 cây cơ sở còn 2. Không tưới hoặc không bón không gây chết cây. Cây chín không héo chỉ vì offline; tăng trưởng theo giờ thực của server, độc lập cap offline tu luyện. Chăm sóc hoàn toàn là tùy chọn để MVP không buộc đăng nhập nhiều lần mỗi ngày.

Thu hoạch roll phẩm chất theo cấp linh điền, phát item và EXP đúng một lần. Túi đầy thì giữ READY, không mất cây, không phát EXP cho tới khi có chỗ; không tự chuyển sang hộp thư ở MVP. Không sinh hạt ngược từ thu hoạch để tránh vòng hạt tự nhân miễn phí. Hạt là item có nguồn bán cụ thể; seed_recipe ánh xạ 69 linh thảo trồng được cũ, không tạo thêm loại linh thảo trùng. Ba loại đặc biệt Luân Hồi Quả, Đại Đạo Hoa và Quy Hương Bạch Liên không có hạt, không trồng hoặc bán ở thương các; giữ nguồn đặc biệt và khóa giao dịch cũ.

Bulk gieo/chăm/thu trả kết quả cho từng ô; ô lỗi không trừ tiền/vật tư, các ô hợp lệ vẫn xử lý đúng một lần. Mua ô và gieo cùng lúc khóa chính ô đó; không cho hai crop_cycle trên một ô.

## 7. EXP nghề, cấp nghề và phẩm chất

Bốn thanh EXP tách riêng. Đề xuất cấp 1–20. EXP cần từ cấp L lên L+1 là `20 × L`, cộng dồn phần dư sang cấp tiếp theo. Cấp 20 không nhận cấp 21. Tổng EXP từ cấp 1 lên 20 là 3.800 trước giảm EXP công thức thấp; mức tăng cấp này cần mô phỏng cùng số lượt phù/ngày và tốc độ thu hoạch. EXP nghề là tài sản tiến độ của kiếp, mất khi chết theo thiết kế mặc định v1.7; thư viện công thức đã đọc có thể giữ như tư liệu tài khoản nhưng phải đủ cấp nghề trong kiếp mới mới chế tạo được.

| Nghề | Thao tác cho EXP | EXP đề xuất |
|---|---|---:|
| Linh điền | Thu hoạch vụ hợp lệ | 10 |
| Luyện đan | Mẻ thành công / thất bại | 20 / 8 |
| Luyện khí | Mẻ thành công / thất bại | 20 / 8 |
| Vẽ phù | Lượt vẽ thành công / thất bại | 20 / 8 |

EXP chỉ tăng ở thao tác hợp lệ đã commit; cho cả thất bại để người chơi không kẹt nghề. Bấm nút, công thức sai, thiếu vật tư, nhận lại biên nhận hoặc tưới lại không tạo EXP. Trần EXP mỗi nghề là 1.000/ngày server; chạm trần vẫn làm được sản phẩm nếu còn lượt/nguyên liệu, chỉ không nhận thêm EXP. Cấp nghề yêu cầu của công thức thấp hơn cấp nghề hiện tại ít nhất 5 cấp chỉ nhận 25% EXP gốc, tối thiểu 1. Linh điền so min_profession_level của hạt; công thức chế tạo so min_level. Giới hạn ngày không đặt lại khi lên cấp hoặc trùng sinh.

Phẩm chất độc lập với độ hiếm cố định của loại item. Ví dụ “linh thảo Hiếm” vẫn có phẩm chất thường/tốt/thượng/cực phẩm. Item instance phải lưu cả hai; không tự đổi ID linh thảo hoặc trang bị vì tăng phẩm.

Đề xuất xác suất **có điều kiện sản phẩm đã thành công**: thường 80%, tốt 15%, thượng 4,5%, cực phẩm 0,5%. Mỗi cấp nghề sau cấp 1 chuyển 1 điểm phần trăm từ thường sang nhóm phẩm cao; phụ trợ chuyển thêm 10 điểm phần trăm. Tổng chuyển tối đa 40 điểm phần trăm. Phân bổ phần chuyển theo tỷ lệ 70%/25%/5%, luôn giữ tổng 100%. Linh điền dùng cấp linh điền, không dùng ô phụ trợ chế tạo.

Hiệu lực thuộc tính phù hợp được nhân 1,00 / 1,05 / 1,10 / 1,15, vẫn chịu cap v1.7. Không nhân phần trăm tiến độ tu luyện, điểm % đột phá, stat vĩnh viễn, thời hạn và số lần dùng bằng phẩm chất ở MVP. Nguyên liệu phẩm cao còn cộng0–300bp chuyển phẩm theo trung bình có trọng số, không tăng luyện thành. Chỉ thuộc tính được đánh dấu quality_scalable mới nhận hệ số, như hồi HP đan, chỉ số trang bị, damage/shield phù; không lấy mọi số trong chuỗi mô tả rồi nhân. Đây là phần cần map vào effect schema khi triển khai combat thật.

## 8. Luyện đan và luyện khí: ba ô nguyên liệu, một ô phụ trợ

Giao diện dùng chung khung: chọn công thức → 3 ô nguyên liệu → 1 ô tăng phẩm → báo tỷ lệ thành công và tỷ lệ phẩm chất → xác nhận. Mỗi ô chứa một loại nguyên liệu cùng số lượng. Công thức có hai loại được để trống ô thứ ba; không tạo nguyên liệu rác để lấp UI. Ô phụ trợ có thể trống, hoặc một item tăng phẩm đúng loại/giới; không dùng để thay nguyên liệu thiếu.

So khớp bộ `(item_id, quantity)` không phụ thuộc thứ tự ô. Gộp các ô cùng item trước khi đối chiếu; không cho nhét nguyên liệu dư, vật phẩm khóa sai nguồn hoặc recipe giả. Công thức yêu cầu trên 3 loại nguyên liệu không được import trong phiên bản UI này.

Tỷ lệ thành công luyện đan/luyện khí: clamp(20%, 95%, base_success + 0,5 điểm % × (cấp nghề − cấp yêu cầu)). Phụ trợ **chỉ tăng tỷ lệ phẩm cao sau thành công**, không tăng tỷ lệ luyện thành. Ví dụ thành công 80% và tốt trở lên 30% có điều kiện, xác suất tuyệt đối nhận tốt trở lên là 24%; giao diện cần diễn đạt rõ.

Một mẻ mẫu kéo dài 30 giây, mỗi nghề chỉ có một job đang chạy. Khi bắt đầu hợp lệ: khóa nguyên liệu, phí, phụ trợ nếu có, ghi snapshot config và kết quả RNG server, tạo job_id. Thất bại vẫn mất các nguyên liệu, phí và phụ trợ, được EXP thất bại. Sai công thức/thiếu đồ trước khi start thì không mất gì. Sau start không hủy để hoàn nguyên liệu hoặc roll lại kết quả. Mất kết nối không dừng mẻ; khi hoàn thành, túi đầy thì đưa output vào hộp nhận của đúng kiếp. Client không tự báo thành công.

Cùng một job chỉ hoàn tất một lần dù hai worker cùng chạy. Phí và output không được cập nhật ở hai giao dịch rời rạc làm sinh bản sao. Nếu chết trước hoàn thành thì hủy job, mất nguyên liệu đã giữ, không cho đời sau nhận output/EXP; nếu hoàn thành trước tử vong thì output vừa tạo chịu luật chết bình thường.

Bộ hiện hành có135 công thức:56 đan thường,70 trang bị thường,9 phù.17 đồ độc bản không craft được ghi rõ trong recipe_exceptions.json, có nguồn nhận ở acquisition_rules.json. Recipe đã có định lượng, phí, cấp, thời gian và cách học; không suy recipe từ chuỗi mô tả cũ.

## 9. Vẽ phù

Giới hạn ngày = `5 + chỉ số đại cảnh giới từ 0`. Luyện Khí có 5, Trúc Cơ 6, … Đại La có 18 lượt/ngày. Qua tầng nhỏ không tăng lượt. Khi tăng đại cảnh giới trong ngày, tăng trần nhưng giữ số đã dùng; đã dùng 5 ở Luyện Khí thì khi lên Trúc Cơ còn 1 lượt. Không reset thành 6 lượt mới. Kiếp mới không reset bộ đếm tài khoản trong cùng ngày; nếu trần mới thấp hơn số đã dùng thì còn 0 lượt.

Mỗi lần **bắt đầu hợp lệ** giữ một lượt ở ngày bắt đầu, trừ nguyên liệu/phí và phụ trợ. Thất bại vẫn mất lượt, vẫn nhận EXP. Thiếu đồ hoặc request sai không giữ lượt. Job bắt đầu trước 00:00 nhưng xong sau 00:00 vẫn tính vào ngày cũ; EXP phát ở ngày hoàn thành. Không chuyển lượt chưa dùng sang hôm sau và không bán mua thêm lượt ở MVP.

Tỷ lệ hỏng = `min(60%, 10% + 1 điểm % × (cấp vẽ phù − 1) + 2 điểm % × (bậc công thức − 1))`. Ví dụ cùng công thức bậc 1: cấp nghề 1 hỏng 10%, cấp 2 hỏng 11%, cấp 10 hỏng 19%, cấp 20 hỏng 29%. Đây là chủ ý theo yêu cầu: cấp cao chấp nhận rủi ro lớn hơn để mở công thức và tăng cơ hội phẩm cao. Không áp dụng công thức tăng tỷ lệ thành công của luyện đan/luyện khí cho vẽ phù. Phụ trợ không giảm hỏng, không bí mật đảo quy tắc tăng hỏng khi lên cấp.

Chín phù có tác dụng PvE và giới hạn dùng trong trận được cấu hình riêng. Chưa bật PvP để tránh phá combat trước khi có kiểm thử. Mỗi người dùng tối đa 1 phù mỗi trận MVP, cooldown nhóm 3 lượt, cùng hiệu ứng không cộng dồn. Vật phẩm được khóa đến khi đủ cấp/cảnh giới sử dụng, không chỉ đủ điều kiện vẽ. Thứ tự đòn đánh, chặn hiệu ứng boss và cap sát thương phải do combat server xử lý.

## 10. Dữ liệu backend và giao dịch còn cần xây

| Nhóm dữ liệu | Trường tối thiểu / khóa |
|---|---|
| wallet_balance + wallet_ledger | account_id, life_id, currency, balance, delta, operation_id, reason, created_at; ledger bất biến |
| item_instance | item_id, instance_id, owner_life_id, quantity, rarity, quality, bind_reason, trade_unlock_at, location, version |
| daily_usage | account_id, group_code, date_key, used; unique theo account/group/date |
| weekly_claim | account_id, quest_group, week_key; unique dù có nhiều life_id |
| profession_state | life_id, profession_code, level, exp_in_level, daily_exp; unique life/profession |
| garden_plot | life_id, slot_id 1–16, unlock_operation_id, status, version; unique life/slot |
| crop_cycle | crop_cycle_id, plot_id, seed_id, started_at, ready_at, care_flags, pest_at, pest_rolled, pest_removed, harvested_operation_id |
| craft_job | job_id, life_id, profession, recipe_id/version, level_snapshot, reserved_items, fee_ledger_id, rng_outcome, started_at, ends_at, status, completion_operation_id |
| venue_stock_usage | account_id, venue_id, stock_id, date_key, purchased; không reset bằng refresh |
| quest_claim | account_id, life_id, quest_group, period_key, selected_reward_world, claim_id |
| auction + bid + escrow | server_id, auction_id, seller/bidder life_id, currency, amounts, item_instance_id, ends_at, original_ends_at, extension_used, state, version |
| delivery_inbox | delivery_id, owner_life_id, payload, source_operation_id, claimed_at; unique source_operation_id |
| config_registry | version, checksum, activated_at; job đang chạy dùng bản snapshot cũ |

Tiền nhập từ API phải là chuỗi số nguyên không âm, không ký hiệu khoa học, không dấu thập phân. Kiểm tra giới hạn chữ số trước parse. EXP, thời gian và tỷ lệ phải nằm miền hợp lệ. Không nhận balance/rarity/rates do client gửi để quyết định thưởng.

API cần có: đọc báo giá mua/bán, mua, bán, danh sách đấu giá, đăng/hủy/bid/mua ngay, tra operation, đọc linh điền, mở ô, gieo, chăm, thu, hủy vụ, danh sách công thức, báo giá craft, bắt đầu craft, tra job, nhận output, nhận thưởng nhiệm vụ. Mọi mutation nhận request_id và expected_version khi khóa lạc quan; trả operation_id, config_version, trạng thái và các thay đổi đã commit. Đọc dữ liệu không tiêu tiền/lượt.

Mã lỗi cần phân biệt: insufficient_currency, insufficient_materials, realm_locked, profession_locked, daily_limit, inventory_full, invalid_recipe, wrong_currency, expired_auction, outbid, life_dead, version_conflict, duplicate_request và not_ready. Duplicate request thành công trả lại kết quả trước, không hiện như lỗi cần người chơi bấm lại. Version conflict yêu cầu tải lại báo giá; không tự xác nhận giá mới cao hơn.

Khóa theo thứ tự: account quota → các life theo ID tăng dần → wallet theo currency → inventory theo instance ID → auction/plot/job. Mọi đường chết, giao dịch và worker phải dùng cùng thứ tự hoặc thiết kế locking tương đương có kiểm thử deadlock. Khóa cờ alive không chỉ kiểm tra ở đầu request. Outbox phục hồi delivery/worker không được phát thêm output khi retry. Backup/restore phải giữ ledger, idempotency và tiến độ job cùng thời điểm.

## 11. Phần còn thiếu cần đưa vào backlog dev

| Ưu tiên | Công việc | Tiêu chí xong |
|---|---|---|
| P0 | Ví, ledger, ownership theo kiếp, request idempotency | Retry và giao dịch đồng thời không âm tiền/nhân đồ |
| P0 | Đồng bộ tử vong với escrow, craft, cây và hộp nhận | Không còn kho giữ tài sản qua kiếp |
| P0 | Bộ import JSON, kiểm tra ID/công thức/xác suất | Thiếu recipe không bật nút craft; config có version |
| P0 | Reset ngày/tuần server và hạn mức tài khoản | Chuyển giờ máy, đổi tông, trùng sinh không reset lượt |
| P0 | Mua/bán NPC, thưởng tông môn và 16 ô linh điền | Kiểm đủ điều kiện, đủ tiền, mỗi claim đúng một lần |
| P1 | Job nghề, EXP, chất lượng và túi đầy | Offline hoàn tất, output đúng kiếp, không mất/nhân đồ |
| P1 | Đấu giá chung server và chống bid sát giờ | Escrow/hoàn/thuế/đóng phiên có test đồng thời |
| Hoàn tất đặc tả | Hiệu ứng phẩm chất và phù nối combat | Có effect schema, cap và demo PvE; PvP vẫn khóa |
| Hoàn tất dữ liệu |135 công thức và17 ngoại lệ độc bản | Định lượng nguyên liệu, cấp, phí, thời gian, nguồn mở |
| Hoàn tất dữ liệu | Nguồn hạt và công thức theo giới | Mỗi recipe/seed đang bật có nguồn nhận trong cấu hình |
| Hoàn tất mô hình tham chiếu | Mô phỏng nguồn–tiêu tiền |600 lượt; chưa thay cho beta |
| P2 | UX điện thoại, bulk thao tác, tìm kiếm/lọc chợ | Thấy rõ tiền/lượt/phẩm/chờ; thao tác lỗi không trừ tài sản |
| P2 | Telemetry và công cụ vận hành | Theo dõi phát hành tiền, sink, giá chợ, fail/craft, EXP/ngày, mở ô, thất lạc output |

Theo dõi riêng tiền vào/ra từ nhiệm vụ mới, mua lại NPC, phí craft, mở đất, thuế/phí đấu giá và luyện hóa. Đo giá trung vị giao dịch thật theo item/quality, tỷ lệ thành công theo cấp, số lượt phù dùng và tỷ lệ người mới đủ tiền mua hạt. Không khẳng định 30–45 ngày sau khi thêm sink: bản2.1 đã ghép nguồn tiền, sink, nghề và boss vào mô hình tham chiếu600 lượt. Xem05_KIEM_THU/ECONOMY_REPORT.md để đọc giả định và kết quả; vẫn cần beta để đo hành vi thật.

MVP không cần thêm nhà ở, thú cưng, minigame nghề hoặc tiền mới. Hoàn thiện luồng vật tư → nghề → sử dụng/bán → tiêu tiền trước khi mở thêm hệ thống.

## 12. Import và migration bản gộp

Đọc data/v21/LOAD_ORDER.json. File config.json đã gộp core, systems, social và sect; quests.json đã nhúng thưởng theo giới. Không trả thưởng cống hiến/tiền thêm lần nữa từ dữ liệu nguồn cũ. migration.json giữ ánh xạ mã tiền, bốn nguyên liệu và năm NPC có hội thoại được nhập.

Import catalog trước các bảng tham chiếu. Không suy ra EXP nghề từ vật tư đang có; không cấp lại tiền/hạt khởi đầu khi đăng nhập. Chỉ khởi tạo tính năng một lần cho life_id đủ điều kiện. Chuyển lịch xã hội từ UTC sang Asia/Ho_Chi_Minh phải hòa giải claim đã trả; giữ khóa hạn mức tài khoản qua trùng sinh. Đọc báo cáo gộp để biết nội dung nào đã loại.

## 13. Ca nghiệm thu bắt buộc trong game thật

- Hai request mua ô cuối cùng cùng lúc: chỉ trừ tiền và mở một lần; request thứ hai nhận trạng thái đã mở.
- Tài khoản tầng thấp có đủ tiền vẫn không mở ô vượt cảnh giới; tài khoản đủ cảnh giới nhưng thiếu tiền không mở miễn phí.
- Gieo vào ô khóa/đang có cây, bón/tưới lần hai hoặc bắt sâu khi không có sâu đều không tiêu thêm, không cấp EXP.
- Offline qua giờ chín, túi đầy và thu hai lần: cây không héo, không mất output, chỉ một lần nhận sản lượng/EXP.
- Công thức sai hoặc thiếu vật tư không giữ lượt; craft hợp lệ thất bại mất đúng nguyên liệu/phí/phụ trợ và nhận EXP thất bại.
- Cấp phù 1→2 làm tăng tỷ lệ hỏng của cùng recipe; tăng cảnh giới trong ngày chỉ tăng phần trần lượt mới, không xóa used.
- Lượt phù bắt đầu trước reset và xong sau reset vẫn trừ vào ngày bắt đầu; retry job không cấp EXP hai lần.
- Hai bid đồng thời, tự nâng bid, bị vượt giá, mua ngay giữa hai bid và worker chốt trùng thời điểm đều bảo toàn escrow.
- Chết khi đang bid, đang bán, có delivery hoặc craft đang chạy không chuyển tài sản sang đời mới; refund của người khác còn sống không mất.
- Tất cả tỷ lệ phẩm chất cộng đúng 100%; tỷ lệ hỏng nằm 0–100%; tiền lớn của luyện hóa không bị mất chữ số.
- Không bán được đồ tông môn, TM, vật chứng, Lục Mệnh; không vượt khóa giao dịch 24 giờ bằng chợ đen hoặc đấu giá.
- Nhiệm vụ ngày/tuần chỉ thưởng một lần qua đổi tông, đổi giới, reconnect và trùng sinh; hiển thị đúng bảng thưởng đã khóa lúc nhận.

Các kiểm tra JSON đi kèm chỉ kiểm tính nhất quán thiết kế và dữ liệu, không thay thế các ca đồng thời, bảo mật và trải nghiệm trong server/client thật.
