-- SINH TỰ ĐỘNG bởi tools/gen-static.mjs từ data/*.csv. KHÔNG sửa tay; sửa CSV rồi chạy `pnpm gen`.
-- Dữ liệu đã apply lên database thật thì thay đổi bằng migration mới (upsert), không sửa file này.

insert into game.stages (idx, stage_id, name, world, day_start, day_end, lifespan_cap_after, clean_consumed_years, p_death_tang9) values
  (0, 'HG00', 'Phàm Nhân', 'Hạ Giới', 0, 1, 120, 10, 0),
  (1, 'HG01', 'Luyện Khí', 'Hạ Giới', 1, 3, 160, 30, 0.005),
  (2, 'HG02', 'Trúc Cơ', 'Hạ Giới', 3, 6, 220, 60, 0.008),
  (3, 'HG03', 'Kim Đan', 'Hạ Giới', 6, 10, 300, 100, 0.01),
  (4, 'HG04', 'Nguyên Anh', 'Hạ Giới', 10, 13, 360, 130, 0.012),
  (5, 'HG05', 'Hóa Thần', 'Hạ Giới', 13, 15, 400, 150, 0.03),
  (6, 'LG01', 'Luyện Hư', 'Linh Giới', 15, 20, 500, 200, 0.01),
  (7, 'LG02', 'Hợp Thể', 'Linh Giới', 20, 27, 640, 270, 0.012),
  (8, 'LG03', 'Đại Thừa', 'Linh Giới', 27, 33, 760, 330, 0.015),
  (9, 'LG04', 'Độ Kiếp / Phi Thăng', 'Linh Giới', 33, 35, 800, 350, 0.06),
  (10, 'TG01', 'Ngụy Tiên', 'Tiên Giới', 35, 39, 880, 390, 0.01),
  (11, 'TG02', 'Chân Tiên', 'Tiên Giới', 39, 45, 1000, 450, 0.012),
  (12, 'TG03', 'Kim Tiên', 'Tiên Giới', 45, 51, 1120, 510, 0.015),
  (13, 'TG04', 'Thái Ất', 'Tiên Giới', 51, 56, 1220, 560, 0.02),
  (14, 'TG05', 'Đại La sơ nhập / Đài Quy Hương', 'Tiên Giới', 56, 60, 1300, 600, 0.025)
on conflict (idx) do update set stage_id = excluded.stage_id, name = excluded.name, world = excluded.world,
  day_start = excluded.day_start, day_end = excluded.day_end, lifespan_cap_after = excluded.lifespan_cap_after,
  clean_consumed_years = excluded.clean_consumed_years, p_death_tang9 = excluded.p_death_tang9;

insert into game.tm_catalog (id, name, kind, stat_key, base_cost, step_cost, level_cap, cost, per_life_limit, effect) values
  ('TMSTAT-001', 'Quán Đỉnh Tướng Mạo', 'stat', 'TuongMao', 6, 1, 20, null, null, '+1 Tướng Mạo vĩnh viễn'),
  ('TMSTAT-002', 'Quán Đỉnh Phúc Duyên', 'stat', 'PhucDuyen', 7, 1, 20, null, null, '+1 Phúc Duyên vĩnh viễn'),
  ('TMSTAT-003', 'Quán Đỉnh Căn Cốt', 'stat', 'CanCot', 8, 2, 20, null, null, '+1 Căn Cốt vĩnh viễn'),
  ('TMSTAT-004', 'Quán Đỉnh Ngộ Tính', 'stat', 'NgoTinh', 8, 2, 20, null, null, '+1 Ngộ Tính vĩnh viễn'),
  ('TMSTAT-005', 'Quán Đỉnh Vận Khí', 'stat', 'VanKhi', 9, 2, 20, null, null, '+1 Vận Khí vĩnh viễn'),
  ('TMITEM-001', 'Định Linh Châu', 'item', null, null, null, null, 20, 1, 'Chọn một thuộc tính ưu tiên khi tinh luyện linh căn trong kiếp'),
  ('TMITEM-002', 'Thiên Cơ Lệnh', 'item', null, null, null, null, 25, 2, 'Mở một kỳ ngộ Thiên Cơ đặc biệt'),
  ('TMITEM-003', 'Phá Vọng Kính', 'item', null, null, null, null, 28, 2, 'Hiện một đường ẩn/bẫy quan trọng trong bí cảnh'),
  ('TMITEM-004', 'Nghịch Mệnh Phù', 'item', null, null, null, null, 35, 1, 'Một lần chuyển lethal breakthrough failure thành trọng thương; phải kích hoạt trước lần đột phá'),
  ('TMITEM-005', 'Thần Hành Phù', 'item', null, null, null, null, 30, 1, 'Cho phép rút khỏi bí cảnh lethal khi chưa tử vong; không dùng sau HP=0'),
  ('TMITEM-006', 'Vạn Tượng Phôi', 'item', null, null, null, null, 40, 1, 'Phôi chế tạo trang bị hiếm với affix đặc biệt'),
  ('TMITEM-007', 'Đạo Văn Mặc', 'item', null, null, null, null, 45, 1, 'Khắc một dòng Đạo Văn hiếm lên trang bị đủ điều kiện'),
  ('TMITEM-008', 'Vô Tự Cổ Quyển', 'item', null, null, null, null, 55, 1, 'Mở lựa chọn học một công pháp Thiên Mệnh hiếm trong kiếp'),
  ('TMITEM-009', 'Tẩy Tủy Thiên Đan', 'item', null, null, null, null, 60, 2, '+1 chỉ số gốc của kiếp hiện tại, không tính vào permanent TM stat'),
  ('TMITEM-010', 'Linh Hồn Định Châm', 'item', null, null, null, null, 65, 1, 'Giảm một bậc hình phạt tâm ma trong một lần thử'),
  ('TMITEM-011', 'Thiên Mệnh Trận Kỳ', 'item', null, null, null, null, 75, 1, 'Mở một trận pháp phụ trợ hiếm cho bí cảnh'),
  ('TMITEM-012', 'Cổ Ấn Vấn Đạo', 'item', null, null, null, null, 90, 1, 'Mở thử thách account-lore đặc biệt; phần thưởng không phải TM')
on conflict (id) do update set name = excluded.name, kind = excluded.kind, stat_key = excluded.stat_key, base_cost = excluded.base_cost,
  step_cost = excluded.step_cost, level_cap = excluded.level_cap, cost = excluded.cost, per_life_limit = excluded.per_life_limit, effect = excluded.effect;

insert into game.rules (key, value) values
  ('offline', '{"full_hours":8,"mid_efficiency":0.7,"low_efficiency":0.4,"cap_hours":24}'::jsonb),
  ('tang_per_stage', '9'::jsonb),
  ('tho_nguyen', '{"start_years":100,"use_years_per_credited_day":10}'::jsonb),
  ('stat_effects', '{"CanCot":{"speed":0.002,"risk":0.01},"NgoTinh":{"speed":0.004,"risk":0},"VanKhi":{"speed":0,"risk":0.005},"TuongMao":{"speed":0,"risk":0},"PhucDuyen":{"speed":0,"risk":0}}'::jsonb),
  ('speed_cap', '1.25'::jsonb),
  ('risk_floor', '0.5'::jsonb),
  ('hazard_scale', '1'::jsonb),
  ('time_scale', '1'::jsonb),
  ('intent_ttl_s', '120'::jsonb)
on conflict (key) do update set value = excluded.value;
