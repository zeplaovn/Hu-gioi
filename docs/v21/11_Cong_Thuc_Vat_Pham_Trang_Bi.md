# Công thức, hiệu ứng và trang bị đã định lượng

## Phạm vi hoàn thiện

135 recipe:56 đan dược thường,70 trang bị thường,9 phù.17 item độc bản có quy tắc không craft và nguồn nhận cụ thể; không cố biến tất cả vật phẩm thành đồ sản xuất đại trà. Tiên Hồi Đan được bổ sung để Tiên Giới có thuốc hồi phục theo hệ tiền bản địa.

Mỗi recipe có định lượng tối đa3 loại vật liệu, ô catalyst tùy chọn, cấp nghề, cảnh giới, phí, thời gian và phương thức học. Công thức có2 loại để trống ô thứ3. Server gộp item_id/quantity không phụ thuộc thứ tự, từ chối đồ dư/sai hoặc cùng instance dùng hai ô. Vật liệu/catalyst phải thuộc đúng life và ở inventory. Không lấy item đang equipment/escrow/inbox để chế tạo.

Ba recipe đầu được học miễn phí sau Q-HG-02. Những recipe còn lại học tại thương các của giới với knowledge_unlock; tri thức giữ ở tài khoản, nhưng cấp nghề hiện tại vẫn phải đủ sau khi trùng sinh. Một job mỗi nghề, EXP cả thất bại, cap1.000 EXP/ngày/nghề. Tỷ lệ và lịch phù theo cấu hình đã có; lên cấp/cảnh giới không reset lượt ngày.

## Hiệu ứng có cấu trúc

item_effects.json có372 bản ghi, một cho mỗi item. activation phân consume, consume_in_battle, equip hoặc none. Resource/seed/ink/gift chỉ dùng bởi hệ tương ứng, không có hiệu ứng trực tiếp vô định. Mô tả effect cũ chỉ phục vụ hiển thị; backend dùng op và tham số typed.

Đơn vị amount_bp là phần10.000; coefficient_bp là hệ số ATK. duration_turns tính theo lượt đã commit, duration_seconds theo thời gian server, charges bị trừ ở hành động thực tế. Các op chuyên miền có handler rõ trong EFFECT_HANDLERS.md; không phân tích chữ “+10%” tại thời điểm chơi.

Chỉ quality_scalable mới nhân1/1.05/1.10/1.15. Không nhân EXP, thời gian, chỉ số vĩnh viễn, %tiến độ hoặc điểm%đột phá. Buff cùng stack_group lấy mức mạnh hơn và refresh thời hạn; bonus đột phá lấy một thuốc mạnh nhất rồi cộng pity trước khi clamp. PILL-020 không tự tăng chính nó hoặc nhân bonus vĩnh viễn.

PILL-032 tăng SPIRIT trong kiếp, không phải stat tài khoản. PILL-051 là ngoại lệ được ghi rõ: tiêu đan để ghi tối đa1 token memory_echo phi vật lý, cho+2% SPIRIT trận đầu của kiếp sau rồi mất; không chuyển item hoặc ví xuyên kiếp. Đây là đề xuất hiệu ứng để giải nghĩa mô tả cũ, chưa phải tham số beta đã xác nhận. PILL-060 là thời gian suy nghĩ24h do người chơi tự chọn; không bắt mọi người chờ24h để ở lại hoặc tiếp tục chơi.

## Chống mua thuốc cấp thấp dùng vô hạn ở giới cao

Thuốc và phù chỉ được dùng trong giới gốc, trừ một ngoại lệ được cấu hình rõ trong tương lai. Người chơi có thể giữ hoặc giao dịch vật phẩm hợp lệ nhưng không lấy thuốc Hạ Giới giá LT_HP rẻ để hồi toàn bộ HP Tiên Giới. Đây là quy tắc cân bằng mới được đánh dấu đề xuất. Thuốc hồi phục dùng một action, chung cooldown3 lượt; phù tối đa1 lần/trận và chỉ PvE.

## Trang bị và affix

equipment_rules.json định7 ô, điều kiện cảnh giới theo tier, số affix theo phẩm chất, pool/lăn trị số và cách cộng từ base bất biến trước cap. Không có durability hoặc phí sửa đồ chưa được thiết kế. MVP nâng sức mạnh bằng craft/drop tier mới; không thêm hệ cường hóa ghép đồ ngoài yêu cầu.

Dược Vương Đỉnh cộng5 điểm% chuyển sang phẩm cao cho luyện đan, gộp với catalyst và cấp nghề trong cap40 điểm%; không tăng tỷ lệ luyện thành. Pháp giới tăng số ô túi; output craft/quest vào inbox nếu túi đầy, không mất thưởng và không tạo kho miễn chết.

## Giá mua lại NPC

price_book.json là bảng giá chuẩn và trần mua lại cho mọi item. Đồ craft nhận tối đa min(20% giá chuẩn,50% toàn bộ tiền vật liệu+phí công thức); quà/hạt/phụ trợ và đồ khóa không bán lại NPC. Chất lượng không tự nâng giá bán NPC. Cách này chặn vòng mua nguyên liệu→craft→bán NPC có lãi tiền tức thời; người chơi vẫn có thể sử dụng hoặc bán đấu giá cho người khác. Giá thị trường người chơi phải là giao dịch ghép đối tác thật, không là tiền do hệ thống phát miễn phí.
