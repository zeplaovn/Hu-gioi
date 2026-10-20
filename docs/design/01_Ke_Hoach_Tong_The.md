# Thiên Vân Đại Lục — kế hoạch phát triển tổng thể

*Bản biên tập tiên hiệp v1.5 · 19/10/2026. Luật nguồn: FINAL v1.3; combat tham chiếu: v1.4.1. Tiến độ 30–45 ngày là baseline cân bằng mới, chưa phải số đo production.*

## 1. Trò chơi mà chúng ta đang làm

Một buổi sáng bình thường trên Trái Đất kết thúc bằng Thiên Biến. Bầu trời nứt ra, toàn bộ nhân loại bị cuốn sang Thiên Vân Đại Lục và tỉnh dậy ở những nơi khác nhau. Người chơi không được trao sẵn tư cách anh hùng: trước hết họ phải tìm nước, chỗ trú và một người chịu chỉ đường. Tu luyện đến sau, rồi mới tới câu hỏi ai đã đưa tất cả tới đây.

Thiên Vân Đại Lục là game tu tiên idle theo thời gian thật, nhưng câu chuyện không được để hệ thống tự động chơi hộ. Thời gian ngoại tuyến giúp tích lũy công lực; chuyện chọn tông môn, đặt cược sinh mạng vào bí cảnh hay mạo hiểm đột phá phải là quyết định của người đang cầm nhân vật.

Một kiếp là hành trình liên tục qua **Hạ Giới → Linh Giới → Tiên Giới**. Phi Thăng mở sang vùng đất khác và giữ nguyên người tu sĩ ấy. Kiếp chỉ chấm dứt khi nhân vật chết thật, tọa hóa hoặc chủ động lựa chọn Quy Phàm ở cuối tuyến chính. Khi chết thật hoặc tọa hóa, người chơi trở về vạch xuất phát với tài sản của đời cũ đã tiêu tán. Quy Phàm đóng hành trình bằng lựa chọn trở về; việc mở kiếp chơi tiếp theo sau kết thúc này cần quy tắc riêng, không tự xem là tử vong. Thứ còn lại là Thiên Mệnh, kinh nghiệm của tài khoản và những nâng cấp vĩnh viễn đã mua.

Trò chơi cần tạo ra hai cảm giác cùng tồn tại: một quyết định liều lĩnh có thể khiến người chơi mất nhiều ngày gây dựng, nhưng thất bại vẫn để lại một phần tiến bộ lâu dài. Vì thế, mọi chỗ có nguy cơ tử vong phải thông báo thẳng, không giấu trong một dòng chú thích khó thấy.

## 2. Con đường qua ba giới — 30 đến 45 ngày

Mọi kẻ lạc đến Thiên Vân đều nhìn thấy cùng một bầu trời, nhưng không ai đi trên cùng một con đường. Trong Hạ Giới, một miếng bánh khô có khi quý hơn pháp bảo. Qua Linh Giới, người tu sĩ học cách nghi ngờ cổ sử. Đến Tiên Giới, điều khó đối mặt nhất không còn là kiếm của kẻ thù, mà là quyền lựa chọn của chính mình.

| Giới | Cảnh giới chính | Thời lượng kiếp không tử vong | Điểm kết của hồi truyện |
|---|---|---:|---|
| Hạ Giới | Phàm Nhân → Hóa Thần | **8,25 ngày** | Hóa giải tai họa địa mạch; mở giới môn |
| Linh Giới | Luyện Hư → Độ Kiếp | **11 ngày** | Chứng minh dấu vết cổ trận; vượt giới kiếp |
| Tiên Giới | Ngụy Tiên → Đại La sơ nhập | **13,75 ngày** | Mở đường đến Đài Quy Hương |
| **Tổng một kiếp không chết** | **15 giai đoạn × 9 tầng** | **33 ngày** | **Quy Phàm hoặc tiếp tục endgame** |

**Mục tiêu sản phẩm mới là 30–45 ngày tính trên tài khoản người chơi, bao gồm cả các lần trùng sinh.** Mốc trung vị khoảng 35,49 ngày; P75 khoảng 43,91 ngày trong simulator 20.000 lượt ở hazard ×1,0. P90 là 62,43 ngày. Người chết liên tiếp, nhất là cuối Tiên Giới, không thể được bảo đảm hoàn thành trong 45 ngày. Mọi mốc này là giả định để thử, phải kiểm nghiệm sau closed beta.

Phi Thăng sang một giới mới vẫn giữ nguyên **cùng một kiếp**. Nhân vật, tài sản, quan hệ NPC, nhiệm vụ, thân phận và dấu vết lựa chọn thuộc cùng `life_id`. Mỗi lần vượt giới, giao diện thay theo `current_map`; không gọi `endLife`, không cấp thưởng luân hồi. Thiên Mệnh chỉ ghi nhận mốc tăng tầng thành công đúng một lần, không cộng thêm vì thao tác chuyển map.

Đài Quy Hương là điểm đến của truyện chính. **Quy Phàm** cho phép người chơi từ bỏ tu vi trong kiếp hiện tại để trở lại Trái Đất; ở lại tu luyện và tìm con đường ẩn cũng là quyền của họ. Không Gian Hỗn Độn vẫn nằm ngoài lịch 30–45 ngày và giữ nguyên sáu điều kiện hội tụ khắt khe.

## 3. Khi một kiếp chấm dứt

Người chơi cần phân biệt một trận đấu tập thất bại với cái chết thật. **Luận Đạo** và khu tập luyện kết thúc khi HP về 0, không trùng sinh. Ngược lại, PvP Sinh Tử, bí cảnh có `lethal=true`, trận boss sinh tử và những lần đột phá dẫn đến tử vong có thể chấm dứt kiếp. Tọa hóa khi cạn thọ nguyên cũng kết thúc như vậy. Không tự động coi mọi lần đột phá thất bại là đã chết; kết quả `failure` và `death` phải được tách trong dữ liệu và chốt luật riêng cho Độ Kiếp.

Khi chết thật, tài sản vật lý của **kiếp hiện tại** mất toàn bộ: Linh Thạch, Linh Tinh, Tiên Ngọc; hành trang, trang bị, pháp bảo, đan dược, nguyên liệu; vật phẩm đã đổi tại Thiên Mệnh Các nhưng chưa sử dụng; và cả cổ vật Lục Mệnh đang mang. Nhân vật bắt đầu lại ở Hạ Giới. Những thứ được ghi trên tài khoản — số dư Điểm Thiên Mệnh, stat vĩnh viễn đã nâng, thành tựu, danh hiệu tài khoản, lịch sử các kiếp, tư liệu đã mở — không bị xóa. **Không tồn tại kho vật phẩm vật lý được miễn mất mặc định.**

Quy tắc này phải áp dụng đồng nhất. Thua một boss trong khu an toàn không được âm thầm đổi thành cái chết thật. Một boss có nhiều điểm spawn cần công bố rõ phiên bản nào lethal. Vật phẩm cất trong kho tông môn hoặc gửi ngân hàng vẫn được tính là tài sản thuộc kiếp; chúng không trở thành lối lách hệ thống tử vong.

**Những hàng rào an toàn dưới đây là đề xuất v1.3, chưa phải quyết định cuối của chủ dự án:**

- Tu luyện ngoại tuyến không khiến nhân vật chết. Tầng 1–8 có thể tăng tự động; trước tầng 9 hoặc Độ Kiếp, tiến độ dừng chờ xác nhận khi online.
- Nội dung lethal hiện cảnh báo hai lần, nêu mức nguy cơ và vật phẩm có thể mất.
- Death transaction chỉ chạy sau khi kết quả chiến đấu hoặc đột phá được máy chủ xác thực. Đứt mạng không đồng nghĩa tử vong: PvP quá 30 giây có thể xử thua không mất kiếp; PvE tạm dừng tối đa 120 giây rồi rút lui/hủy trận không thưởng nếu không thể tiếp tục.
- PvP Sinh Tử không cướp đồ từ xác. Tài sản người thua bị tiêu hủy; người thắng nhận thưởng riêng từ hệ thống để tránh tổ chức các tài khoản phụ tự thua chuyển tài sản.
- Ghép trận xếp hạng giới hạn khoảng ±10% BP. Stat mua bằng Thiên Mệnh tính 50% hiệu lực trong PvP có xếp hạng để người mới không bị tài khoản lâu năm chèn ép quá mạnh.

**Thọ nguyên, đề xuất v1.3:** nhân vật khởi đầu 100 năm, mỗi ngày tu luyện hiệu dụng tiêu hao 10 năm, giới hạn thọ nguyên nâng theo `100 + 20 × d` ở mốc tiến độ thiết kế ngày `d`. Vắng mặt quá cap không tiếp tục già. Bảng chính xác nằm trong `03_DU_LIEU_GOC_v1.3/tho_nguyen.csv`. Đan tăng thọ chưa được tính đầy đủ trong simulator; không nên đưa quy tắc này vào production chỉ vì bảng tính trông hợp lý.

## 4. Thiên Mệnh: điều còn lại sau nhiều kiếp

Thiên Mệnh là điểm của tài khoản, nhận khi **tăng tầng thành công**. Baseline là `+1 TM` cho mỗi tầng được hệ thống công nhận. Mỗi cảnh giới gồm chín tầng, tính cả mốc tầng 9; toàn bộ lộ trình 15 cảnh giới có 135 mốc, vì vậy một kiếp hoàn tất có thể nhận **135 TM** theo đề xuất v1.3. Không cộng thêm một khoản TM riêng chỉ vì Phi Thăng. Mỗi `breakthrough_milestone_key` trả thưởng một lần trong mỗi kiếp; sang đời sau người chơi lại có thể chinh phục mốc đó. Chết sớm không mang lại khoản thưởng an ủi tự động.

Người chơi tiêu TM tại **Thiên Mệnh Các**. Một hướng là **Quán Đỉnh**, mua chỉ số gốc vĩnh viễn. Hướng khác là mua vật phẩm đặc biệt, không xuất hiện ở shop thông thường và không rơi từ quái hay boss. Những món ấy vẫn là vật phẩm của kiếp; nếu nhân vật chết trước khi dùng, món đồ mất và TM đã trả không hoàn lại.

| Chỉ số vĩnh viễn | Giá cấp đầu | Tăng giá mỗi cấp | Trần cộng vĩnh viễn | Tổng chi phí tới trần |
|---|---:|---:|---:|---:|
| Tướng Mạo | 6 TM | +1 TM | +20 | 310 TM |
| Phúc Duyên | 7 TM | +1 TM | +20 | 330 TM |
| Căn Cốt | 8 TM | +2 TM | +20 | 540 TM |
| Ngộ Tính | 8 TM | +2 TM | +20 | 540 TM |
| Vận Khí | 9 TM | +2 TM | +20 | 560 TM |
| **Tổng** | | | | **2.280 TM** |

Bảng giá này chưa chốt. Nó dự kiến phải mất nhiều kiếp mới đạt hết các trần, nhưng một người mới cũng có thể mua những cấp đầu tương đối sớm. Bonus từ Thiên Mệnh đứng độc lập với giới hạn `+40` chỉ số được tăng bằng vật phẩm trong một kiếp. Hiệu ứng TM lên tốc độ tu luyện đề xuất giới hạn ở +25%; sức mạnh TM chỉ nên giúp bù rủi ro, không được rút ngắn cả hành trình một tháng xuống vài ngày.

Thiên Mệnh Các cần mô tả rõ vật phẩm là **nâng cấp tài khoản** hay **vật phẩm tiêu hao của kiếp**. Mọi ô mua hàng phải hiện chi phí, giới hạn, và một cảnh báo gọn: “Vật phẩm này sẽ mất nếu kiếp hiện tại kết thúc trước khi sử dụng.” Dữ liệu giá và danh sách vật phẩm nằm trong `thien_menh_cac.csv`.

## 5. Các thế lực giữ cho thế giới có người sống

Ở Hạ Giới, ba tông môn đưa ra ba cách đối phó với Thiên Biến. **Thanh Vân Tông** tin rằng người có kiếm phải bảo vệ kẻ yếu, nhưng các trưởng lão cũng biết che giấu sự thật nhân danh ổn định. **Huyết Sát Môn** cho người lạc giới một con đường tự bảo vệ bằng sức mạnh, với cái giá là nguy cơ đánh mất chính mình. **Vạn Dược Cốc** cứu người bằng y thuật và luyện đan, rồi phải trả lời câu hỏi liệu nghiên cứu có được phép vượt quá giới hạn đạo đức.

Lên Linh Giới, người chơi gặp **Thái Hư Kiếm Cung**, **Vô Tướng Ma Điện**, **Bách Thảo Thánh Viện** và **Thiên Cơ Các**. Từ đây, chuyện cứu một làng hay tìm một người thân mở rộng thành cuộc điều tra ai từng vận hành trận pháp dịch chuyển nhân loại. Ở Tiên Giới, **Cửu Tiêu Tiên Đình**, **Vạn Pháp Đạo Viện**, **U Minh Cổ Điện** và **Quy Hương Thủ Điện** tranh luận bằng quyền lực, học thuật và ký ức về việc thế giới có quyền che giấu sự thật hay không.

Không NPC nào được trở thành “nút thắt chết”: khi một nhân vật chết hoặc mất tích, thư từ, di vật, đồ đệ hay bản ghi phải tiếp tục được tuyến nhiệm vụ bắt buộc. Việc một NPC Phi Thăng sang giới trên vẫn là hành trình của chính NPC đó; nó không đồng nghĩa kiếp mới. Hồ sơ nhân vật đầy đủ nằm trong tài liệu Cốt truyện & NPC.

## 6. Tài nguyên và kinh tế

Ba đơn vị tiền sử dụng theo vùng là **Linh Thạch (LS)** ở Hạ Giới, **Linh Tinh (LT)** ở Linh Giới và **Tiên Ngọc (TN)** ở Tiên Giới. Giá quy đổi thiết kế là `1 LT = 1.000 LS`, `1 TN = 1.000 LT`; NPC chỉ hỗ trợ đổi lên. Người chơi không bị tịch thu tiền khi Phi Thăng, nhưng toàn bộ ví của kiếp mất khi chết thật.

Tiền rời nền kinh tế qua shop, luyện đan, luyện khí, khắc/reroll thuộc tính, phí bí cảnh và thuế chợ. Mất tài sản vì tử vong là một dòng sink riêng cần đo; không được cộng lặp giá trị của cùng món đồ vào hai loại sink. Tỷ lệ source/sink mục tiêu trên cửa sổ bảy ngày là 0,9–1,35, tốt nhất quanh 1,05–1,25. Đó là chỉ báo vận hành, chưa phải lời hứa cân bằng trong mọi thời điểm.

Shop phổ thông làm mới mỗi hai giờ, shop tông môn mỗi tám giờ, quầy hiếm mỗi ngày và mỗi người có một lần làm mới miễn phí mỗi ngày. Thuế chợ dự kiến 5–10%; vật phẩm nhiệm vụ, vật phẩm Thiên Mệnh, sáu cổ vật Lục Mệnh, Đạo Đan và thưởng độc bản không được giao dịch theo mặc định. Vật phẩm bắt buộc để đi tuyến chính phải có nguồn nhận bảo đảm hoặc cơ chế pity, vì chờ một món loot vô thời hạn sẽ làm mục tiêu 30–45 ngày trở nên vô nghĩa.

Các giới hạn chống chuyển tài sản là **đề xuất v1.3**: tài khoản đủ 72 giờ mới được giao dịch; đồ nhận từ giao dịch khóa bán lại trong 24 giờ; tổng giá trị chuyển ra ngoài qua giao dịch tối đa khoảng 20% tài sản/ngày; giao dịch hai chiều bất thường giữa hai tài khoản chỉ gắn cờ xem xét, không tự động kết tội. Ngưỡng thật cần kiểm chứng bằng dữ liệu chợ và tình trạng tài khoản phụ.

## 7. Nhịp một tháng đến một tháng rưỡi — phép tính và cái giá của sự liều lĩnh

Nhãn “33 ngày” trên đường không tử vong không có nghĩa người chơi chỉ cần mở game đúng 33 lần. Nó là tổng thời gian giả định để trải qua mười lăm giai đoạn tu luyện với lịch đăng nhập khoảng hai lần mỗi ngày và 30–60 phút thao tác chủ động. Thất bại trong trận sinh tử vẫn có thể xóa cả một kiếp; điểm Thiên Mệnh đã nhận và các stat vĩnh viễn giúp đời sau đi xa hơn, nhưng không được âm thầm hồi sinh một tu sĩ đã chết.

Mô hình cân bằng v1.5 nén các khoảng tu luyện v1.3 còn **55%**, giữ nguyên hazard đầu vào. Để người chơi vẫn đủ tiền chế tạo, kinh tế được tái phân bổ theo từng giới; không tăng sức chiến đấu của quái và boss chỉ vì lịch ngắn lại.

| Mức nguy hiểm thử nghiệm | P25 | Trung vị | P75 | P90 | Về đích kiếp đầu |
|---|---:|---:|---:|---:|---:|
| Hazard ×0,5 | 30,39 | 34,07 | 39,07 | 49,33 | 84,10% |
| **Hazard ×1,0** | **31,09** | **35,49** | **43,91** | **62,43** | **70,44%** |
| Hazard ×1,5 | 31,84 | 37,05 | 51,89 | 72,15 | 59,62% |

**Điều kiện nghiệm thu thiết kế:** median trong khoảng 30–40 ngày; P75 không quá 45 ngày ở hazard chuẩn, nếu P90 kéo quá dài phải phân tích nhóm chết muộn. Đây chưa phải kết quả combat thật: kỹ năng của người chơi, phương án rút lui, chọn boss, trận nhiều người và tác dụng đầy đủ của stat Thiên Mệnh vẫn là nguồn sai số.

Giữ thông số offline đã chốt: 8 giờ đầu 100%, giờ 8–16 đạt 70%, giờ 16–24 đạt 40%, trần 24 giờ. Không tự động kích hoạt thử thách lethal khi người chơi vắng mặt. Các nút xác nhận phải hiển thị nguy cơ trước khi người chơi đặt cả kiếp lên bàn cân.

## 8. Quái, boss, bí cảnh và PvP

Hồ sơ chiến đấu v1.4.1 có 30 đối thủ theo ba giới, 106 kỹ năng quái và 50 pha boss. Đây là số liệu thiết kế đã chạy thử với bot và gear tham chiếu, chưa phải tỷ lệ thắng thật trên máy chủ. Kỹ năng, trạng thái, kháng nguyên tố và ngưỡng đổi pha có ID dữ liệu riêng; các trận lethal cần báo rõ trước khi vào, kể cả khi người chơi đang cầm build rất mạnh.

Bảng điều chỉnh mới không nên khiến quái thường thành cỗ máy giết người. Nhịp đề xuất: quái thường đủ nhanh để farm; tinh anh buộc người chơi hiểu một cơ chế; boss có dấu hiệu trước đòn nặng và ít nhất một cách hóa giải có thể học được. Trong trận sinh tử, trường hợp hai bên cùng về 0 HP phải xử lý theo luật tử vong của người chơi — không tự ưu tiên WIN chỉ vì boss cũng ngã xuống.

## 9. Đài Quy Hương và cửa ẩn

Quy Phàm là kết thúc chính hợp lệ. Nội dung Không Gian Hỗn Độn chỉ mở khi **đúng sáu tài khoản thật khác nhau**, mỗi người giữ **một trong sáu loại cổ vật không trùng**, cả sáu đều ở Tiên Giới, đạt sức mạnh yêu cầu, **đồng thời online và cùng có mặt tại Đài Quy Hương**, tự tay xác nhận trận, cùng vào Hỗn Độn và cùng chiến đấu với **Kẻ Trấn Giữ Cổ Môn**. Không có NPC, bot hoặc đóng góp bất đồng bộ thay người. Một người không được lấp hai vị trí dù sở hữu nhiều loại mảnh.

Cổ vật Lục Mệnh là vật phẩm vật lý của kiếp ở baseline v1.3: chết thật thì mất; mỗi loại có thể xuất hiện ở nhiều tài khoản để server không kẹt vĩnh viễn. **Thua một lượt thử mà chưa chết không tự động phá cổ vật**; mất cổ vật do tử vong là một trường hợp khác. Nếu đội có người chết, người ấy phải trùng sinh và tìm lại điều kiện. Sau thất bại, muốn thử lại vẫn phải tập hợp đủ sáu người hợp lệ online đồng thời. Sáu người hoàn thành đầu tiên được ghi ở Bia Thiên Mệnh, cùng danh hiệu và phần thưởng theo hồ sơ spoiler nội bộ.

Các biện pháp chống tài khoản phụ chỉ mới là gợi ý: tuổi tài khoản ít nhất 14 ngày, hỗ trợ bảng tìm đồng đội, sự kiện hội tụ theo khung giờ; trùng IP/thiết bị chỉ là tín hiệu kiểm tra, không được dùng một mình làm bằng chứng cấm. **Không viết spoiler Hỗn Độn vào frontend hoặc wiki công khai.**

## 10. Công nghệ chưa được chọn

Frontend, API, cơ sở dữ liệu và hosting **vẫn để OPEN**. Không ghi Svelte, Go, Node hay Fastify như stack đã chốt. Điều đã rõ là yêu cầu hệ thống: những thao tác quyết định cái chết, đột phá, điểm Thiên Mệnh, drop, chợ, craft cấp cao và Lục Mệnh phải do server kiểm chứng; phát thưởng và death transaction có khả năng chạy lặp an toàn; mọi thay đổi dữ liệu đều có version; account và life không được lẫn nhau.

Dự án đã quyết định **tạo dữ liệu mới từ đầu**, không chuyển save cũ sang chuẩn ba giới. Điều đó không miễn trách nhiệm thông báo người chơi hiện tại rằng tiến độ cũ sẽ mất trước ngày thay hệ thống. Admin Console và wiki cần được cập nhật theo schema mới. Công nghệ thực thi cho database mới vẫn chưa chốt.

## 11. Cấu trúc dữ liệu tối thiểu

Ở mức thiết kế, dữ liệu **tài khoản** gồm `account_id`, số dư và lịch sử chi tiêu Thiên Mệnh, cấp stat TM, thành tựu, cờ lore, cờ mở tính năng và số kiếp. Dữ liệu **kiếp hiện tại** gồm `life_id`, `current_map`, cảnh giới/tầng, trang bị, kho, ví ba loại tiền, quan hệ NPC/tông môn, mốc đột phá đã lĩnh TM và `is_alive`.

Mọi lần tử vong hợp lệ cần nằm trong một transaction: khóa life đang sống, ghi nguyên nhân, chụp snapshot lịch sử, tiêu hủy tài sản của kiếp, giữ nguyên meta và điểm TM, tăng bộ đếm kiếp rồi tạo life mới. Retry request phải không tạo thêm cái chết hoặc trùng sinh thứ hai. Đây là bất biến nghiệp vụ; chưa phụ thuộc ngôn ngữ API nào.

## 12. Thứ tự công việc và cách biết hệ thống đã ổn

Triển khai trước vòng đời `alive → death → rebirth` và ranh giới account/life. Đồng thời bật telemetry cho nguồn tiền, mức tiêu hao, rủi ro, tỷ lệ mua đồ TM và tiến độ cảnh giới. Sau đó mới đưa Thiên Mệnh Các và toàn bộ vòng Hạ Giới vào gameplay. Khi Hạ Giới đã chạy ổn, mở Linh Giới, kế tiếp là Tiên Giới và Đài Quy Hương. PvP Sinh Tử, bí cảnh lethal và sự kiện sáu người cần dựa trên death transaction đã kiểm thử, không nên ra mắt trước.

Tối thiểu phải theo dõi: ngày thực tới mỗi cảnh giới và tổng số lần trùng sinh, số kiếp đến endgame, nơi tử vong, giá trị tài sản bị xóa, TM kiếm/tiêu, vật phẩm Thiên Mệnh mất trước khi dùng, churn sau một lần chết nặng, số người chủ động tránh nội dung lethal, tỷ lệ thắng theo build và hoạt động thực tế của kinh tế. Hệ thống cần đo từ đầu, không chờ lúc mở Tiên Giới mới bổ sung.

## 13. Những quyết định còn treo

- Công nghệ frontend, API, database và hosting.
- Duyệt chi phí Quán Đỉnh, số TM tối đa mỗi kiếp theo 135 tầng, mức 50% stat TM trong PvP xếp hạng, thọ nguyên và các hàng rào giao dịch.
- Chốt cách xử lý **Độ Kiếp thất bại mà nhân vật chưa chết**, reconnect và trận draw; phân biệt rõ thất bại thường với kết quả tử vong thật.
- Đo hazard thật của bí cảnh, PvP Sinh Tử và boss để kiểm chứng mục tiêu 30–45 ngày; số liệu bot không thay thế người chơi.
- Ngưỡng chiến lực Lục Mệnh, phòng lạm dụng nhiều tài khoản, cách cấp thưởng khi thành viên tử trận.
- Thông báo chuyển database mới cho người chơi và nâng cấp công cụ admin/wiki.

## 14. Đọc tài liệu tiếp theo

Để hiểu câu chuyện và nhân vật, đọc *Cốt truyện NPC & tông môn*. Muốn lấy chỉ số chính xác, tra *Balance Master* và CSV v1.3. Quy tắc trận, quái, boss và lời giải thích đổi pha nằm trong *Hệ thống combat* và *Bách Quái Chí*. Những gì nằm sau Cổ Môn được giữ trong thư mục nội bộ riêng. Các bảng số và simulator đi kèm gói này **giữ nguyên dữ liệu nguồn**, không được âm thầm coi một câu văn biên tập là thay đổi hệ số runtime.
