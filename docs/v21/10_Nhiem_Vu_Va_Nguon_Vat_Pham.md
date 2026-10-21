# Nhiệm vụ, sự kiện server và nguồn vật phẩm

## Hợp đồng mục tiêu

20 nhiệm vụ trong quests.json đều có objective_tree. Nút all yêu cầu đủ tất cả con, any chỉ cần một nhánh. Lá gồm event_type, target_id, required_count, filters và distinct_event_ids. Các sự kiện được định danh trong event_registry.json; chỉ hệ server tương ứng phát, không có API cho client gửi “tôi đã xong”.

Một quest_instance khóa life_id, thời điểm nhận, period_key và giới thưởng. Event xảy ra trước khi nhận không tự tính hồi tố, trừ điều kiện trạng thái đã ghi rõ như đã vào tông môn. Envelope có event_id, account_id, life_id, quest_instance_id, config_version, server_time. Event cùng ID/nội dung là retry; cùng ID khác nội dung là conflict. Các mẫu nước dùng sample_id, trụ dùng pillar_id và bản sử dùng document_id để không đếm một vật nhiều lần dù có nhiều event_id.

Các filter allowed_values/allowed_sects kiểm value; online_ack và owner_confirmed phải là boolean do server đã xác thực; consent_id phải tham chiếu đồng thuận chưa bị rút; lineage_verified do quest handler tính từ dòng tu hành hiện tại. Không tin các cờ này từ request công khai. Dữ liệu giả ở fixture chỉ dùng trong kiểm thử nội bộ.

## Hai cửa phi thăng không bị vòng lặp

Q-HG-04: vá ba trụ **hoặc** thắng MON-012 → chuẩn bị độ kiếp → READY → trả thưởng MAT-008 → một lệnh xác nhận phi thăng riêng tiêu MAT-008 và mở LG01. Không đòi người chơi đã phi thăng để được trả vật liệu phi thăng.

Q-LG-03: thử trận → thắng MON-020 → chuẩn bị → nhận MAT-022 → xác nhận phi thăng riêng mở TG01. Phần thưởng không tự đẩy cảnh giới, không tự vượt kiếp. Roll thất bại dùng luật chết/cảnh báo đã chốt.

Q-LG-01 phát “trận thạch mượn” dưới dạng cờ nhiệm vụ khi nhận, không tạo vật phẩm phải loot mới hoàn được. Q-TG-02 cần consent_id hợp lệ trước khi phục hồi ký ức. Q-TG-03 chấp nhận defer hoặc prepare đều trả nhiệm vụ; defer không buộc Quy Phàm. Q-TG-04 có boss rồi lựa chọn remain/return_home riêng có xác nhận chi phí rõ ràng.

## Chu kỳ và nhận thưởng

Daily/weekly sect dùng account/quest_group/calendar_period, không theo life_id để tránh farm khi đổi tông hoặc chết. Nhóm SECT-1/2/3 dùng chung qua ba dòng TV/HS/VD, mỗi người chỉ hưởng một dòng. Khi nhận, kiểm dòng tu hành và khóa reward_world; chuyển giới không nâng thưởng hồi tố. once_per_life dùng period life:<life_id>. Nhận thưởng cùng giao dịch với cờ CLAIMED, tiền, item, cống hiến và biên nhận operation; túi đầy chuyển phần thưởng vật lý vào inbox của đúng kiếp.

## Nguồn nhận và đồ độc bản

acquisition_rules.json có một bản ghi cho mỗi item. Nguồn gồm vendor, gather, plant_and_gather, recipe, nhiệm vụ hoặc boss xác định. Gather có node, thời gian, sản lượng và quota; kỹ năng/công thức có điều kiện riêng. Không suy từ chuỗi mô tả “cổ lâm” thành một loot table ngẫu nhiên.

17 đồ độc bản gồm12 trang bị và5 đan đặc biệt được giữ ngoài hệ craft trong recipe_exceptions.json. Cờ quest/boss completion kích hoạt grant kiểm đúng lineage và per_life_cap; ledger grant theo account/item/period chống nhận lại sau reconnect. Vật phẩm dùng rồi không làm quota độc bản mở lại. Các dược liệu đặc biệt vẫn có nguồn: Luân Hồi Quả/Đại Đạo Hoa qua boss tuần, Quy Hương Bạch Liên qua nhiệm vụ cuối; không tạo hạt hoặc bán hạt cho chúng. Đại Đạo Hoa mở ở Thái Ất qua MON-028 để không tạo vòng yêu cầu Đại La mới chế đan chuẩn bị Đại La.

NPC-06 trao đổi bằng văn tự. NPC vắng chỉ có thư/sổ nhiệm vụ thay thế, không tạo thêm NPC; thư này không cho phép tặng quà hoặc roll sự kiện xã hội từ xa.

## Túi thuốc chuẩn bị tuyến chính

Q-HG-04, Q-LG-03 và Q-TG-04 cấp hai thuốc hồi phục cùng giới, nhận một lần khi nhiệm vụ ACTIVE/READY trước boss. Thuốc khóa giao dịch/bán lại, không đổi thành tiền; nhận dùng preparation_claims theo life/quest và request_id. Không yêu cầu đã thắng boss mới được nhận thuốc chuẩn bị. Không ép mua thêm thuốc hoặc grind quà quan hệ để mở tuyến chính. Nếu đã dùng hết, người chơi có thể chuẩn bị nghề/shop hoặc chọn tiếp tục với rủi ro được công bố; không phát lại vô hạn trong cùng kiếp.
