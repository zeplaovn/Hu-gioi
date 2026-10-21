# Thân mật và hội thoại ba giới — bản đầy đủ v2.1

## Nội dung được nhập

Giữ 9 NPC hiện hành;5 NPC có bộ thoại Hạ Giới: Trần Minh, Tô Nhược Vân, Diệp Hồng Y, Bạch Tử Yên, Tạ Thiên Cơ. Mỗi người có5 cảnh quan hệ,4 thoại ngày và2 sự kiện. Bản2.1 bổ sung Cơ Vô Ngôn, Tư Mệnh, Mạnh Bà và Người Gác Đài, không vượt giới hạn9 NPC. Tổng45 cảnh truyện,36 thoại ngày,18 sự kiện,297 lựa chọn. Giữ20 quà có liên hệ với5 người và45 phản ứng quà viết tay. Các quà còn lại dùng phản ứng neutral. Không nhập14 hồ sơ NPC ngoài danh sách hiện hành; tệp gốc vẫn còn riêng để lấy lại sau nếu đổi phạm vi.

Dữ liệu có ID cảnh gốc, NPC được ánh xạ sang NPC-01..09. Không thay tên nhân vật máy móc trong lời thoại. Nhân vật phụ được nhắc đến như Dược Vô Trần hoặc Cao Thành là bối cảnh/cổ sử; không mở một cuộc hội thoại hoặc shop riêng. Nếu chọn phương án mời họ đối chất thì chỉ ghi ý định, quest engine phải triển khai kết quả bằng thư/sự kiện qua NPC hiện hành.

## Lịch, phạm vi và khả dụng

Tất cả reset lúc00:00 Asia/Ho_Chi_Minh, dùng thời gian server; không dùng00:00UTC của gói nguồn. Tuần thứ Hai00:00. Quan hệ affection/trust trong[-100,100], theo life_id, reset khi chết thật, không reset khi phi thăng. Hạn mức tương tác ngày và cooldown quà theo tài khoản, không reset bằng trùng sinh.

Chỉ hội thoại trực tiếp nếu người chơi ở đúng thế giới đã có nội dung cho NPC và NPC đang có mặt/đã gặp/không bị khóa theo nhánh; xem npc_presence.json. Cùng NPC không có hai bản sao ở hai giới; điều kiện hiện diện thuộc state server. Không lấy thư dự phòng nhiệm vụ để tự cho phép tặng quà khi NPC vắng mặt. Nút thoại chỉ hiện đúng thế giới và trạng thái có mặt của NPC; không tạo bản sao NPC xuyên giới.

## Hội thoại hằng ngày

Mỗi NPC một lần chọn đáp án/ngày, quay vòng4 chủ đề không lặp trước khi hết vòng. Mở thoại không tiêu lượt; chọn một đáp án hợp lệ mới ghi lượt và cộng điểm. Replay cùng interaction_id không phát thưởng lại, cũng không đổi chủ đề đã chọn. Người đang có quan hệ âm vẫn được thoại thường để có đường hồi phục: min_affection của thoại ngày đặt thành-100 thay cho0 trong nguồn.

A:+5 thiện cảm/+1 tín nhiệm; B:+3/+2; C:-4/-2. Điểm clamp vào[-100,100]. Không thưởng tiền, TM, EXP nghề hay vật phẩm từ thoại xã hội.

## Cảnh quan hệ/cốt truyện

Năm cảnh mỗi NPC cần thiện cảm0/20/50/80/100 và cảnh trước đã hoàn thành. Mỗi cảnh một lần/kiếp, không có quota ngày riêng. Giữ choice delta viết tay. Chọn đáp án ghi intent_flag và trạng thái cảnh đã xong, không trực tiếp phi thăng, hoàn nhiệm vụ chính hoặc mở boss ẩn. dialogue_intents.json là registry ý định, quest engine xác thực thêm chứng cứ/điều kiện sống và quyền truy cập.

Quan hệ100 không thay điều kiện nhiệm vụ. Tuyến chính không bắt buộc grind tình cảm; cảnh quan hệ chỉ bổ sung nhánh nhân vật. Một lựa chọn không cho flag vẫn có thể hoàn cảnh để tránh khóa nhánh vô ý. Ghi cờ hiểu biết tài khoản riêng nếu luật lore cho phép, không biến ký ức thành tài sản kiếp cũ.

## Quà tặng

Mỗi NPC nhận một món/ngày. Cùng gift_id cho cùng NPC chỉ lặp sau3 ngày server; khóa cooldown theo account/npc/gift xuyên life_id. Quà bị trừ đúng một khi giao dịch hợp lệ và được nhận. Xem trước số lượng, giá và tác động quan hệ; hủy, thiếu đồ, NPC vắng hoặc request cũ không trừ gì.

favorite:+6/+2; liked:+4/+1; neutral:+1/0; disliked:-4/-2.20 quà ở item_catalog.json, giá đề xuất5 LT_HP cho loại phổ thông và12 LT_HP cho loại tốt, mua tại Vạn Bảo Các. Mỗi quà tối đa5/ngày/tài khoản; không bán lại NPC. Không tự thêm công thức nghề cho quà nếu chưa có recipe định lượng.

Quà xã giao không là nguyên liệu, vật chứng, cổ vật Lục Mệnh hoặc vật phẩm TM. Không tự tịch thu đồ vì taboo trong lời văn; những bằng chứng giả/hồ sơ lấy trộm không nằm trong danh mục quà thường. Kiêng kỵ đã giữ theo NPC trong gift_preferences.json để biên tập tiếp.

## Sự kiện ngẫu nhiên

Sự kiện1 cần affection≥20; sự kiện2 cần≥50. Chỉ chọn NPC khả dụng và event chưa hoàn trong kiếp. Sau tương tác xã hội hợp lệ đầu tiên của ngày: nếu có ứng viên thì roll một lần toàn tài khoản, xác suất20%. Nếu không có ứng viên thì không roll, không tiêu lượt và không tăng pity; tương tác hợp lệ sau trong ngày có thể xét lại ứng viên.

Sau4 ngày đủ điều kiện liên tiếp bị hụt, lần xét đủ điều kiện tiếp theo bảo đảm có sự kiện. Trọng số NPC:20–49 là1;50–79 là1,5;≥80 là2. Mỗi ngày tối đa1 sự kiện, cùng NPC cách ít nhất3 ngày; mỗi event một lần/kiếp. Tránh hiểu thành20% nhân với số NPC.

Khi roll trúng, tạo pending_event_id đã giữ chỗ ngày đó, chưa cấp điểm. Người chơi có thể trả lời sau nhưng vẫn chỉ ghi completion một lần; pending chưa xử lý chặn roll mới. Nếu chết, hủy pending của đời cũ mà không giải phóng quota ngày đã giữ. Nếu NPC không còn khả dụng trước trả lời, giữ pending chờ khả dụng trở lại, không reroll miễn phí. Pity reset khi tạo sự kiện thành công; không lợi dụng bỏ qua hộp thoại để tích bảo đảm tiếp.

A:+9/+5; B:+4/+2; C:-6/-3. Không phát tiền/TM/item hoặc làm NPC chết trong các sự kiện này. Đây là nhánh xã hội an toàn, khác khu chiến đấu lethal.

## Backend và nghiệm thu

Bảng cần có relationship(life,npc), daily_interaction(account,npc,date,kind), topic_rotation(life,npc), gift_cooldown(account,npc,gift), scene_completion(life,scene), event_roll(account,date), pending_event(life,event), intent_flag(life,flag). Mọi mutation dùng request_id, khóa quota tài khoản và trạng thái alive cùng item/điểm/cờ; log kết quả để retry trả biên nhận cũ.

Kiểm thử bắt buộc: thiếu quà/đa thiết bị, bấm đôi, điểm âm và cap100, đổi đồng hồ client, ranh giới ngày mới, trùng sinh trong ngày, phi thăng không reset quan hệ, event không có ứng viên, pity ngày thứ5, pending qua reset, NPC vắng, cảnh trước chưa hoàn, nhánh không cóflag, gift cooldown3 ngày và dữ liệu lời thoại không mở quyền bí mật. Validator đi kèm kiểm liên kết dữ liệu; không thay test đồng thời trong game thật.
