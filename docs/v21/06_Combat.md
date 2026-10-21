# Combat — dữ liệu và demo tham chiếu

Nguồn hiện hành trong 04_COMBAT:30 quái/boss, kỹ năng, kháng nguyên tố, ngưỡng pha, encounter và lore. Hệ số người chơi trong 02_DU_LIEU/realm_scalars.json. config.json trong 04_COMBAT là cấu hình combat riêng, core game trong 02_DU_LIEU/config.json.

Khác biệt an toàn/lethal phải hiện trước khi vào trận. HP0 trong vùng an toàn không mất kiếp; lethal có thể kết thúc kiếp và xử lý tài sản/escrow theo luật core. Tầng9/độ kiếp không tự kích hoạt offline. Ultimate báo trước một lượt, đòn đầu có cap55% HP trong demo; ngưỡng pha đọc từ boss_phases.json, không ép65/30 cho mọi boss.

Demo dùng RNG có seed để tái lập, không là game server hoặc RNG production. Bản2.1 thực thi50 dòng hiệu ứng pha có kiểu, cooldown, STUN, DoT, khiên và vật phẩm tiêu hao trong demo xác định bằng seed. Các handler vật phẩm đặc biệt ngoài combat và việc ghi trừ túi đồ cần tích hợp theo07_BACKEND/EFFECT_HANDLERS.md. Không dùng tỷ lệ thắng demo để chứng nhận cân bằng30–45 ngày hoặc tỷ lệ chết beta.

Lệnh tham chiếu: python 05_KIEM_THU/combat_demo.py --monster MON-012 --sample 420 (thêm khoảng trắng sau python và sample khi chạy; lệnh chính xác ở README). Validator mới kiểm demo chạy sau đổi đường dẫn và đối chiếu trận với nguồn trên cùng seed. Không giữ lại các bảng benchmark cũ để tránh coi chúng là kết quả của phiên bản gộp.
