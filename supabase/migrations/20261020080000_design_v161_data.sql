begin;
-- SINH TỰ ĐỘNG bởi tools/gen-static.mjs từ data/*.csv. KHÔNG sửa tay; sửa CSV rồi chạy `pnpm gen`.
-- Forward-only upgrade. Historical migrations stay immutable.
-- Preserve stage/tier, fraction of lifespan used, wallet, TM and fraction of current tier.
lock table game.lives in share row exclusive mode;
-- v1.3 used integral days; v1.6.1 has fractional day/year milestones.
alter table game.stages
  alter column day_start type numeric(10,4),
  alter column day_end type numeric(10,4),
  alter column clean_consumed_years type numeric(12,4);
create temporary table v161_progress on commit drop as
select life_id, least(1.0, greatest(0.0, progress_s / nullif(game.tang_seconds(stage_idx), 0))) fraction,
       credited_s / nullif(game.lifespan_cap(stage_idx)::double precision, 0) age_per_cap
from game.lives where status = 'alive';

insert into game.stages (idx, stage_id, name, world, day_start, day_end, lifespan_cap_after, clean_consumed_years, p_death_tang9) values
  (0, 'HG00', 'Phàm Nhân', 'Hạ Giới', 0, 0.55, 111, 5.5, 0),
  (1, 'HG01', 'Luyện Khí', 'Hạ Giới', 0.55, 1.65, 133, 16.5, 0.005),
  (2, 'HG02', 'Trúc Cơ', 'Hạ Giới', 1.65, 3.3, 166, 33, 0.008),
  (3, 'HG03', 'Kim Đan', 'Hạ Giới', 3.3, 5.5, 210, 55, 0.01),
  (4, 'HG04', 'Nguyên Anh', 'Hạ Giới', 5.5, 7.15, 243, 71.5, 0.012),
  (5, 'HG05', 'Hóa Thần', 'Hạ Giới', 7.15, 8.25, 265, 82.5, 0.03),
  (6, 'LG01', 'Luyện Hư', 'Linh Giới', 8.25, 11, 320, 110, 0.01),
  (7, 'LG02', 'Hợp Thể', 'Linh Giới', 11, 14.85, 397, 148.5, 0.012),
  (8, 'LG03', 'Đại Thừa', 'Linh Giới', 14.85, 18.15, 463, 181.5, 0.015),
  (9, 'LG04', 'Độ Kiếp / Phi Thăng', 'Linh Giới', 18.15, 19.25, 485, 192.5, 0.06),
  (10, 'TG01', 'Ngụy Tiên', 'Tiên Giới', 19.25, 21.45, 529, 214.5, 0.01),
  (11, 'TG02', 'Chân Tiên', 'Tiên Giới', 21.45, 24.75, 595, 247.5, 0.012),
  (12, 'TG03', 'Kim Tiên', 'Tiên Giới', 24.75, 28.05, 661, 280.5, 0.015),
  (13, 'TG04', 'Thái Ất', 'Tiên Giới', 28.05, 30.8, 716, 308, 0.02),
  (14, 'TG05', 'Đại La sơ nhập / Đài Quy Hương', 'Tiên Giới', 30.8, 33, 760, 330, 0.025)
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
  ('design_version', '"1.6.1"'::jsonb),
  ('tier_seconds', '[[2556,2808,3024,3312,3600,3924.0000000000005,4284,4680,5076],[5105.454545454546,5563.636363636363,6054.545454545455,6610.909090909091,7232.727272727273,7854.545454545454,8574.545454545454,9327.272727272726,10178.181818181818],[7646.280991735536,8360.330578512398,9104.13223140496,9937.190082644629,10829.752066115703,11811.570247933883,12852.892561983472,14013.223140495867,15262.809917355371],[10223.89181066867,11143.501126972202,12144.252441773104,13253.193087903832,14443.27573253193,15714.500375657402,17148.00901577761,18689.706987227648,20366.641622839972],[7671.6071306604745,8360.084693668465,9097.739225462743,9933.747694829588,10818.93313298272,11802.472508708423,12835.188853220408,14015.436104091252,15269.44880814152],[5118.907171685812,5565.973300217323,6080.099348028562,6616.578702266376,7220.117975783918,7846.010555728034,8561.316361378453,9343.682086308598,10170.754424091896],[12781.666290358997,13919.620681869495,15179.498758184693,16540.97990517047,18024.38473696094,19650.03386769022,21417.92729735832,23348.385640099346,25441.4088959133],[17882.691024785756,19489.91635449274,21244.932519115308,23147.739518653463,25235.285061836097,27507.56914866321,30001.539487863705,32680.248370708676,35636.06506902038],[15316.290352677737,16710.207128195558,18221.68314984139,19850.718417615226,21630.901287553646,23579.025937674938,25711.886545997386,28012.688934502705,30531.815637245756],[5099.452903006913,5572.755417956657,6076.59357903219,6610.967386233513,7206.412485686416,7862.928877390898,8565.248738284066,9343.90771449171,10183.637982950931],[10215.522226934494,11131.588078806339,12144.812430119135,13241.315495238461,14434.977059798744,15725.797123799977,17141.53525851101,18682.191463931835,20361.64552569688],[15330.692930496654,16706.03904524903,18207.563702639232,19847.884756931056,21639.62006238828,23582.7696190109,25702.56913532649,28024.254319862604,30547.825172619254],[15325.006372673977,16701.503951057864,18215.651287280143,19844.506755034414,21645.42442008667,23583.991842977313,25706.092276319145,28023.19653326536,30546.77542696916],[12774.092633896242,13921.154013266518,15172.493699852272,16538.539524375054,18029.71931755641,19656.460910117894,21418.764302059495,23347.912985545867,25454.334791298556],[10219.354838709678,11138.907175773535,12134.29888084266,13233.969716919026,14418.959842001317,15717.709019091506,17139.697169190254,18684.924292297565,20362.87030941409]]'::jsonb),
  ('progression_reference', '{"effective_hours_per_day":16.8,"note":"XP reference assumes one collection per 24h; two evenly spaced collections yield 21.6h before other bonuses. Calendar completion must be validated separately."}'::jsonb),
  ('offline', '{"full_hours":8,"mid_efficiency":0.7,"low_efficiency":0.4,"cap_hours":24}'::jsonb),
  ('tang_per_stage', '9'::jsonb),
  ('tho_nguyen', '{"start_years":100,"use_years_per_credited_day":10}'::jsonb),
  ('stat_effects', '{"CanCot":{"speed":0.002,"risk":0.01},"NgoTinh":{"speed":0.004,"risk":0},"VanKhi":{"speed":0,"risk":0.005},"TuongMao":{"speed":0,"risk":0},"PhucDuyen":{"speed":0,"risk":0}}'::jsonb),
  ('speed_cap', '1.25'::jsonb),
  ('risk_floor', '0.5'::jsonb),
  ('intent_ttl_s', '120'::jsonb)
on conflict (key) do update set value = excluded.value;

create or replace function game.tang_seconds(p_stage smallint, p_tang smallint) returns double precision
language sql stable set search_path = '' as $$
  select (game.rule('tier_seconds')->p_stage::int->>(p_tang::int - 1))::double precision
$$;
-- Retained compatibility wrapper for internal callers that request the final tier.
create or replace function game.tang_seconds(p_stage smallint) returns double precision
language sql stable set search_path = '' as $$
  select game.tang_seconds(p_stage, 9::smallint)
$$;
update game.lives l set progress_s = p.fraction * game.tang_seconds(l.stage_idx, l.tang),
  credited_s = p.age_per_cap * game.lifespan_cap(l.stage_idx)
from v161_progress p where p.life_id = l.life_id;
update game.breakthrough_intents set consumed_at = now(), outcome = 'superseded' where consumed_at is null;
revoke all on function game.tang_seconds(smallint, smallint) from public, anon, authenticated;
grant execute on function game.tang_seconds(smallint, smallint) to service_role;

commit;
