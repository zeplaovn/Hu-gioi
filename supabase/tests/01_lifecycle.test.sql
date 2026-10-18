-- Vòng đời kiếp: tu luyện, tọa hóa, đột phá hai bước, death transaction, Phi Thăng, một kiếp sạch = 135 TM.
begin;

create function pg_temp.expect_err(p_sql text, p_code text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'mong lỗi % nhưng chạy thành công: %', p_code, p_sql;
exception when sqlstate 'GM000' then
  if sqlerrm <> p_code then raise exception 'mong lỗi % nhưng nhận %', p_code, sqlerrm; end if;
end $$;

-- ---- dữ liệu tĩnh khớp thiết kế v1.3
do $$ begin
  assert (select count(*) from game.stages) = 15, 'phải có 15 giai đoạn';
  assert (select sum(day_end - day_start) from game.stages) = 60, 'tổng 60 ngày';
  assert (select count(*) from game.tm_catalog where kind = 'stat') = 5;
  assert (select count(*) from game.tm_catalog where kind = 'item') = 12;
  assert (select sum(sum_cost) from (select (select sum(base_cost + step_cost * l) from generate_series(0, level_cap - 1) l) sum_cost
          from game.tm_catalog where kind = 'stat') x) = 2280, 'tổng giá Quán Đỉnh phải 2280';
  assert (select count(*) from game.stages where lifespan_cap_after = 100 + 20 * day_end) = 15, 'thọ nguyên = 100 + 20d';
end $$;

-- ---- công thức
do $$ begin
  assert game.credit_seconds(3600) = 3600;
  assert game.credit_seconds(28800) = 28800;
  assert abs(game.credit_seconds(57600) - 48960) < 1e-6, '16h = 8h + 70% x 8h';
  assert abs(game.credit_seconds(86400) - 60480) < 1e-6, '24h = 16h + 40% x 8h';
  assert abs(game.credit_seconds(10 * 86400) - 60480) < 1e-6, 'quá 24h không tính thêm';
  assert game.credit_seconds(-5) = 0;
  assert game.tang_seconds(0::smallint) = 9600;
  assert game.lifespan_cap(0::smallint) = 100 and game.lifespan_cap(1::smallint) = 120 and game.lifespan_cap(14::smallint) = 1220;
  assert (select avg(game.roll()) from generate_series(1, 100000)) between 0.49 and 0.51, 'roll phải phân phối đều';
  assert (select min(game.roll()) from generate_series(1, 100000)) >= 0 and (select max(game.roll()) from generate_series(1, 100000)) < 1;
end $$;

-- ---- vắng mặt 1 ngày: chỉ được tính 16,8h; tầng 1–8 tự tiến, idempotent, đồng hồ không chạy lùi
do $$ declare u uuid := 'a0000000-0000-0000-0000-00000000000a'; t0 timestamptz := '2026-10-18 00:00:00+00'; v uuid; l game.lives; a game.accounts;
begin
  insert into auth.users (id) values (u);
  v := game.start_life(u, t0);
  assert game.start_life(u, t0) = v, 'start_life phải idempotent';
  perform game.settle_life(v, t0 + interval '1 day');
  select * into l from game.lives where life_id = v;
  assert l.tang = 7, 'tang ' || l.tang;
  assert abs(l.progress_s - 2880) < 1e-6 and abs(l.credited_s - 60480) < 1e-6;
  select * into a from game.accounts where account_id = u;
  assert a.tm_balance = 6 and a.tm_earned = 6, 'mỗi tầng +1 TM';
  perform game.settle_life(v, t0 + interval '1 day');
  perform game.settle_life(v, t0);
  select * into l from game.lives where life_id = v;
  assert l.tang = 7 and abs(l.credited_s - 60480) < 1e-6, 'gọi lại / lùi giờ không đổi gì';
  assert (select tm_balance from game.accounts where account_id = u) = 6;
end $$;

-- ---- online (settle mỗi giờ) đủ 1 ngày: đúng tầng 9, DỪNG chờ xác nhận, không già thêm
do $$ declare u uuid := 'a0000000-0000-0000-0000-00000000000b'; t0 timestamptz := '2026-10-18 00:00:00+00'; v uuid; l game.lives;
begin
  insert into auth.users (id) values (u);
  v := game.start_life(u, t0);
  for i in 1..24 loop perform game.settle_life(v, t0 + i * interval '1 hour'); end loop;
  select * into l from game.lives where life_id = v;
  assert l.tang = 9 and abs(l.progress_s - 9600) < 1e-6, format('tang %s progress %s', l.tang, l.progress_s);
  assert abs(l.credited_s - 86400) < 1e-6;
  assert (select tm_balance from game.accounts where account_id = u) = 8;
  perform game.settle_life(v, t0 + interval '5 day');
  select * into l from game.lives where life_id = v;
  assert l.tang = 9 and abs(l.credited_s - 86400) < 1e-6, 'chờ ở tầng 9 không tiêu thọ nguyên';
  assert (game.get_state(u, t0 + interval '5 day')->'life'->>'ready_for_major')::boolean;
end $$;

-- ---- tọa hóa + death transaction idempotent
do $$ declare u uuid := 'a0000000-0000-0000-0000-00000000000c'; t0 timestamptz := '2026-10-18 00:00:00+00'; v uuid; v2 uuid; v3 uuid; l game.lives; h game.life_history;
begin
  insert into auth.users (id) values (u);
  v := game.start_life(u, t0);
  update game.lives set credited_s = 864000 - 100, ls = 700, lt = 3 where life_id = v;      -- thọ nguyên 100 năm = 10 ngày tính
  insert into game.life_items (life_id, catalog_id) values (v, 'TMITEM-001');
  update game.accounts set tm_balance = 42, tm_earned = 42 where account_id = u;
  perform game.settle_life(v, t0 + interval '1 hour');
  select * into l from game.lives where life_id = v;
  assert l.status = 'dead' and l.death_cause = 'lifespan', 'phải tọa hóa';
  assert l.ls = 0 and l.lt = 0, 'mất toàn bộ tiền của kiếp';
  assert not exists (select 1 from game.life_items where life_id = v), 'mất toàn bộ vật phẩm';
  select life_id into v2 from game.lives where account_id = u and status = 'alive';
  assert v2 is not null and (select life_no from game.lives where life_id = v2) = 2, 'tạo kiếp mới';
  assert (select tm_balance from game.accounts where account_id = u) = 42, 'giữ Thiên Mệnh';
  assert (select life_count from game.accounts where account_id = u) = 1;
  select * into h from game.life_history where life_id = v;
  assert h.cause = 'lifespan' and (h.snapshot->'wallet'->>'ls')::int = 700 and jsonb_array_length(h.snapshot->'items') = 1, 'snapshot lịch sử';
  v3 := game.end_life(v, 'lifespan', t0 + interval '2 hour');
  assert v3 = v2 and (select life_count from game.accounts where account_id = u) = 1, 'end_life idempotent';
  assert (select count(*) from game.life_history where account_id = u) = 1;
  assert (select count(*) from game.lives where account_id = u and status = 'alive') = 1;
end $$;

-- ---- đại đột phá: hai bước, intent dùng một lần, hết hạn, ghi đè
do $$ declare u uuid := 'a0000000-0000-0000-0000-00000000000d'; t0 timestamptz := '2026-10-18 00:00:00+00'; v uuid; p jsonb; p2 jsonb; r jsonb; l game.lives;
begin
  insert into auth.users (id) values (u);
  v := game.start_life(u, t0);
  perform pg_temp.expect_err(format('select game.breakthrough_prepare(%L, %L)', u, t0), 'not_major_stage');
  update game.lives set tang = 9, progress_s = 100 where life_id = v;
  perform pg_temp.expect_err(format('select game.breakthrough_prepare(%L, %L)', u, t0), 'not_ready');
  update game.lives set progress_s = game.tang_seconds(0::smallint), last_settle_at = t0 where life_id = v;

  p := game.breakthrough_prepare(u, t0);
  assert (p->>'death_prob')::numeric = 0 and not (p->>'lethal')::boolean, 'Phàm Nhân không có rủi ro chết';
  perform pg_temp.expect_err(format('select game.breakthrough_confirm(%L, %L, %L)', u, gen_random_uuid(), t0), 'intent_not_found');
  r := game.breakthrough_confirm(u, (p->>'intent_id')::uuid, t0 + interval '30 seconds');
  assert r->>'outcome' = 'success' and not (r->>'ascended')::boolean;
  select * into l from game.lives where life_id = v;
  assert l.stage_idx = 1 and l.tang = 1 and l.progress_s = 0;
  assert (select tm_balance from game.accounts where account_id = u) = 1, 'mốc (giai đoạn 0, tầng 9) +1 TM';
  perform pg_temp.expect_err(format('select game.breakthrough_confirm(%L, %L, %L)', u, (p->>'intent_id')::uuid, t0), 'intent_consumed');

  -- ghi đè: intent cũ bị vô hiệu khi prepare lại
  update game.lives set tang = 9, progress_s = game.tang_seconds(1::smallint) where life_id = v;
  p := game.breakthrough_prepare(u, t0 + interval '1 minute');
  p2 := game.breakthrough_prepare(u, t0 + interval '1 minute');
  perform pg_temp.expect_err(format('select game.breakthrough_confirm(%L, %L, %L)', u, (p->>'intent_id')::uuid, t0 + interval '1 minute'), 'intent_consumed');
  -- hết hạn sau 120 giây
  perform pg_temp.expect_err(format('select game.breakthrough_confirm(%L, %L, %L)', u, (p2->>'intent_id')::uuid, t0 + interval '1 minute 121 seconds'), 'intent_expired');
  assert (select status from game.lives where life_id = v) = 'alive', 'hết hạn không làm chết';
end $$;

-- ---- đột phá tử vong: mất tài sản, giữ TM, không phát TM của mốc thất bại
do $$ declare u uuid := 'a0000000-0000-0000-0000-00000000000e'; t0 timestamptz := '2026-10-18 00:00:00+00'; v uuid; p jsonb; r jsonb; h game.life_history;
begin
  insert into auth.users (id) values (u);
  v := game.start_life(u, t0);
  update game.rules set value = '1000'::jsonb where key = 'hazard_scale';        -- p chết bị kẹp = 1
  update game.lives set stage_idx = 1, tang = 9, progress_s = game.tang_seconds(1::smallint), ls = 500, last_settle_at = t0 where life_id = v;
  insert into game.life_items (life_id, catalog_id) values (v, 'TMITEM-002');
  update game.accounts set tm_balance = 5, tm_earned = 5 where account_id = u;
  p := game.breakthrough_prepare(u, t0);
  assert (p->>'death_prob')::numeric = 1 and (p->>'lethal')::boolean;
  r := game.breakthrough_confirm(u, (p->>'intent_id')::uuid, t0);
  assert r->>'outcome' = 'death' and r->>'cause' = 'breakthrough';
  select * into h from game.life_history where life_id = v;
  assert h.cause = 'breakthrough' and (h.snapshot->'wallet'->>'ls')::int = 500;
  assert (select status from game.lives where life_id = v) = 'dead';
  assert (select tm_balance from game.accounts where account_id = u) = 5, 'chết không mất Thiên Mệnh';
  assert not exists (select 1 from game.life_milestones where life_id = v and stage_idx = 1 and tang = 9), 'không phát TM cho mốc đã chết';
  assert (select count(*) from game.events where account_id = u and kind = 'death') = 1;
  update game.rules set value = '1'::jsonb where key = 'hazard_scale';
end $$;

-- ---- một kiếp sạch qua 15 giai đoạn: Phi Thăng không kết thúc kiếp, đúng 135 TM
do $$ declare u uuid := 'a0000000-0000-0000-0000-00000000000f'; t0 timestamptz := '2026-10-18 00:00:00+00'; v uuid; p jsonb; r jsonb; t timestamptz := t0; a game.accounts; h game.life_history; v2 uuid;
begin
  insert into auth.users (id) values (u);
  update game.rules set value = '0'::jsonb where key = 'hazard_scale';
  update game.rules set value = '1000'::jsonb where key = 'time_scale';          -- 1 giờ thật đủ cho một giai đoạn
  v := game.start_life(u, t0);
  for i in 0..14 loop
    t := t + interval '1 hour';
    perform game.settle_life(v, t);
    assert (select tang from game.lives where life_id = v) = 9, format('giai đoạn %s phải dừng ở tầng 9', i);
    p := game.breakthrough_prepare(u, t);
    r := game.breakthrough_confirm(u, (p->>'intent_id')::uuid, t);
    assert r->>'outcome' = case when i = 14 then 'cleared' else 'success' end, format('giai đoạn %s: %s', i, r);
    assert (i in (5, 9)) = coalesce((r->>'ascended')::boolean, false), format('Phi Thăng chỉ sau giai đoạn 5 và 9 (i=%s)', i);
  end loop;
  select * into a from game.accounts where account_id = u;
  assert a.tm_earned = 135 and a.tm_balance = 135, 'một kiếp sạch = 135 TM, got ' || a.tm_earned;
  assert (select status from game.lives where life_id = v) = 'cleared';
  assert (select count(*) from game.lives where account_id = u) = 1, 'Phi Thăng không tạo kiếp mới';
  assert (select count(*) from game.events where account_id = u and kind = 'ascend') = 2, 'hai lần Phi Thăng';
  assert (select count(*) from game.events where account_id = u and kind = 'death') = 0;
  select * into h from game.life_history where life_id = v;
  assert h.cause = 'cleared' and abs(h.credited_days - 60) < 1e-6, 'đường sạch = 60 ngày tính, got ' || h.credited_days;
  perform pg_temp.expect_err(format('select game.breakthrough_prepare(%L, %L)', u, t), 'no_alive_life');
  v2 := game.start_life(u, t);
  assert v2 <> v and (select life_no from game.lives where life_id = v2) = 2, 'sau khi hoàn tất có thể mở kiếp mới';
  update game.rules set value = '1'::jsonb where key in ('hazard_scale', 'time_scale');
end $$;

-- ---- hồi quy: chờ ở tầng 9 sát trần thọ nguyên rồi vắng mặt dài KHÔNG bị tọa hóa oan
do $$ declare u uuid := 'a0000000-0000-0000-0000-000000000010'; t0 timestamptz := '2026-10-18 00:00:00+00'; v uuid; l game.lives;
begin
  insert into auth.users (id) values (u);
  v := game.start_life(u, t0);
  update game.lives set tang = 9, progress_s = game.tang_seconds(0::smallint), credited_s = 864000 - 10, last_settle_at = t0 where life_id = v;
  perform game.settle_life(v, t0 + interval '10 hours');
  select * into l from game.lives where life_id = v;
  assert l.status = 'alive' and abs(l.credited_s - (864000 - 10)) < 1e-6, 'không được chết khi không tiêu thời gian';
end $$;

rollback;
