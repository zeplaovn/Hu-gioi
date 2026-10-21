-- Nghề phụ pha 1: Linh điền 4x4, Vẽ phù, Vạn Bảo Các. Mọi quyết định do server; thời gian truyền vào để test.
create function pg_temp.craft_err(p_sql text, p_code text) returns void language plpgsql as $$
begin
  execute p_sql; raise exception 'mong % nhưng thành công', p_code;
exception when sqlstate 'GM000' then assert sqlerrm = p_code, format('mong %s nhưng được %s', p_code, sqlerrm);
end $$;

do $$
declare u uuid := 'd0000000-0000-0000-0000-000000000001'; t0 timestamptz := '2026-10-21 00:00:00+00'; v uuid; s jsonb; i int;
begin
  insert into auth.users (id) values (u);
  perform pg_temp.craft_err(format('select game.crafts_state(%L, %L)', u, t0), 'no_alive_life');
  v := game.start_life(u, t0);
  s := game.crafts_state(u, t0);
  assert jsonb_array_length(s->'plots') = 16, '4x4 = 16 ô';
  assert (select count(*) from jsonb_array_elements(s->'plots') p where (p->>'unlocked')::boolean) = 2, 'khóa 14 ô, mở 2 ô';
  assert (s->'crafts'->'luyen_dan'->>'locked')::boolean and (s->'crafts'->'luyen_khi'->>'locked')::boolean, 'luyện đan/khí chưa mở';
  assert (s->'crafts'->'ve_phu'->>'limit')::int = 5, 'vẽ phù 5 lần/ngày ở Phàm Nhân';

  -- gieo / tưới / bón phân / bắt sâu / thu hoạch (cần hạt = Giấy... không: gieo không tốn hạt; tốn Linh thạch phân bón)
  perform pg_temp.craft_err(format('select game.crafts_action(%L, ''plant'', 5, ''HERB-001'', 0, 1, %L)', u, t0), 'plot_locked');
  perform pg_temp.craft_err(format('select game.crafts_action(%L, ''plant'', 0, ''HERB-999'', 0, 1, %L)', u, t0), 'invalid_seed');
  perform pg_temp.craft_err(format('select game.crafts_action(%L, ''plant'', 0, ''HERB-004'', 0, 1, %L)', u, t0), 'craft_level_too_low');
  s := game.crafts_action(u, 'plant', 0, 'HERB-001', 0, 1, t0);
  assert (s->'plots'->0->>'state') = 'growing';
  perform pg_temp.craft_err(format('select game.crafts_action(%L, ''plant'', 0, ''HERB-001'', 0, 1, %L)', u, t0), 'plot_busy');
  perform pg_temp.craft_err(format('select game.crafts_action(%L, ''harvest'', 0, '''', 0, 1, %L)', u, t0 + interval '10 minutes'), 'not_ready');
  s := game.crafts_action(u, 'water', 0, '', 0, 1, t0 + interval '1 minute');
  assert (s->'plots'->0->>'waters')::int = 1;
  perform pg_temp.craft_err(format('select game.crafts_action(%L, ''water'', 0, '''', 0, 1, %L)', u, t0 + interval '2 minutes'), 'water_cooldown');
  perform pg_temp.craft_err(format('select game.crafts_action(%L, ''fertilize'', 0, '''', 0, 1, %L)', u, t0 + interval '2 minutes'), 'insufficient_ls');
  update game.lives set ls = 1000, tn = 0 where life_id = v;
  s := game.crafts_action(u, 'fertilize', 0, '', 0, 1, t0 + interval '2 minutes');
  assert (s->'plots'->0->>'fertilized')::boolean and (s->'wallet'->>'ls')::int = 995;
  perform pg_temp.craft_err(format('select game.crafts_action(%L, ''fertilize'', 0, '''', 0, 1, %L)', u, t0 + interval '3 minutes'), 'already_fertilized');
  -- ép có sâu rồi kiểm tra bắt sâu
  update game.farm_plots set pest_at = t0 + interval '5 minutes', pest_cleared = false where life_id = v and idx = 0;
  assert ((game.crafts_state(u, t0 + interval '6 minutes')->'plots'->0->>'pest'))::boolean, 'sâu xuất hiện';
  s := game.crafts_action(u, 'pest', 0, '', 0, 1, t0 + interval '6 minutes');
  assert not (s->'plots'->0->>'pest')::boolean;
  perform pg_temp.craft_err(format('select game.crafts_action(%L, ''pest'', 0, '''', 0, 1, %L)', u, t0 + interval '7 minutes'), 'no_pest');
  s := game.crafts_action(u, 'harvest', 0, '', 0, 1, t0 + interval '3 hours');
  assert (select coalesce(sum((g->>'qty')::int), 0) from jsonb_array_elements(s->'goods') g where g->>'item_id' = 'HERB-001') = 3, 'thu 2 + 1 (bón phân)';
  assert (s->'plots'->0->>'state') = 'empty';
  assert (s->'crafts'->'linh_dien'->>'exp')::int = 2 + 2 + 3 + 5 + 10, 'exp: gieo 2, tưới 2, bón 3, sâu 5, thu hoạch 10';

  -- mở khóa ô: đúng thứ tự, đủ cảnh giới, đủ tiền (LS rồi TN)
  perform pg_temp.craft_err(format('select game.crafts_action(%L, ''unlock'', 4, '''', 0, 1, %L)', u, t0), 'plot_order');
  s := game.crafts_action(u, 'unlock', 2, '', 0, 1, t0);                       -- cần Luyện Khí
  assert false, 'phải lỗi realm_too_low';
exception when sqlstate 'GM000' then
  assert sqlerrm = 'realm_too_low', format('mong realm_too_low, được %s', sqlerrm);
end $$;

do $$
declare u uuid := 'd0000000-0000-0000-0000-000000000002'; t0 timestamptz := '2026-10-21 00:00:00+00'; v uuid; s jsonb; i int; fails int := 0;
begin
  insert into auth.users (id) values (u);
  v := game.start_life(u, t0);
  update game.lives set stage_idx = 1, ls = 500, tn = 0 where life_id = v;
  s := game.crafts_action(u, 'unlock', 2, '', 0, 1, t0);
  assert (select (p->>'unlocked')::boolean from jsonb_array_elements(s->'plots') p where (p->>'idx')::int = 2) and (s->'wallet'->>'ls')::int = 440;
  perform pg_temp.craft_err(format('select game.crafts_action(%L, ''unlock'', 2, '''', 0, 1, %L)', u, t0), 'plot_unlocked');
  update game.lives set ls = 0 where life_id = v;
  perform pg_temp.craft_err(format('select game.crafts_action(%L, ''unlock'', 3, '''', 0, 1, %L)', u, t0), 'insufficient_ls');
  -- ô cần Tiên Ngọc
  update game.lives set stage_idx = 9, ls = 1000000 where life_id = v;
  for i in 3 .. 11 loop update game.farm_plots set unlocked = true where life_id = v and idx = i; end loop;
  perform pg_temp.craft_err(format('select game.crafts_action(%L, ''unlock'', 12, '''', 0, 1, %L)', u, t0), 'insufficient_tn');
  update game.lives set tn = 1 where life_id = v;
  s := game.crafts_action(u, 'unlock', 12, '', 0, 1, t0);
  assert (s->'wallet'->>'tn')::int = 0, 'trừ Tiên Ngọc';

  -- vẽ phù: cần giấy, giới hạn ngày tăng theo cảnh giới, tỉ lệ hỏng tăng theo cấp
  update game.lives set stage_idx = 0, ls = 1000 where life_id = v;
  perform pg_temp.craft_err(format('select game.crafts_action(%L, ''phu'', null, '''', 0, 1, %L)', u, t0), 'no_paper');
  s := game.crafts_action(u, 'buy', null, 'MAT-003', 0, 20, t0);
  assert (s->>'paper')::int = 20 and (s->'wallet'->>'ls')::int = 920, 'mua 20 giấy phù';
  for i in 1 .. 5 loop s := game.crafts_action(u, 'phu', null, '', 0, 1, t0 + i * interval '1 minute'); end loop;
  assert (s->'crafts'->'ve_phu'->>'used_today')::int = 5 and (s->>'paper')::int = 15, 'đã vẽ 5 lần';
  assert (s->'crafts'->'ve_phu'->>'exp')::int >= 5 * 4, 'mỗi lần vẽ đều tích exp';
  perform pg_temp.craft_err(format('select game.crafts_action(%L, ''phu'', null, '''', 0, 1, %L)', u, t0 + interval '10 minutes'), 'daily_limit');
  s := game.crafts_action(u, 'phu', null, '', 0, 1, t0 + interval '1 day');     -- sang ngày mới (UTC)
  assert (s->'crafts'->'ve_phu'->>'used_today')::int = 1, 'reset hằng ngày';
  update game.lives set stage_idx = 3 where life_id = v;
  assert (game.crafts_state(u, t0 + interval '1 day')->'crafts'->'ve_phu'->>'limit')::int = 8, 'giới hạn ngày tăng theo cảnh giới';
  insert into game.life_crafts (life_id, craft, exp) values (v, 've_phu', 0) on conflict (life_id, craft) do update set exp = 0;
  declare f1 numeric; f2 numeric; begin
    f1 := (game.crafts_state(u, t0 + interval '1 day')->'crafts'->'ve_phu'->>'fail_pct')::numeric;
    update game.life_crafts set exp = 2700 where life_id = v and craft = 've_phu';
    f2 := (game.crafts_state(u, t0 + interval '1 day')->'crafts'->'ve_phu'->>'fail_pct')::numeric;
    assert f2 > f1, 'lên cấp vẽ phù thì tỉ lệ hỏng cao hơn';
  end;

  -- bán: cộng Linh thạch đúng giá theo phẩm chất; không bán quá số có
  perform game.goods_add(v, 'HERB-001', 1, 2);
  perform pg_temp.craft_err(format('select game.crafts_action(%L, ''sell'', null, ''HERB-001'', 1, 3, %L)', u, t0), 'insufficient_goods');
  update game.lives set ls = 0 where life_id = v;
  s := game.crafts_action(u, 'sell', null, 'HERB-001', 1, 2, t0);
  assert (s->'wallet'->>'ls')::int = 2 * 15, '2 Thanh Linh Thảo thượng phẩm = 2 × 15';
  perform pg_temp.craft_err(format('select game.crafts_action(%L, ''sell'', null, ''MAT-003'', 0, 1, %L)', u, t0), 'not_sellable');
  perform pg_temp.craft_err(format('select game.crafts_action(%L, ''buy'', null, ''HERB-001'', 0, 1, %L)', u, t0), 'not_for_sale');

  -- chết thì mất ruộng + kho; kiếp sau khởi đầu sạch
  perform game.end_life(v, 'test', t0 + interval '2 days');
  assert not exists (select 1 from game.life_goods where life_id = v) and not exists (select 1 from game.farm_plots where life_id = v), 'mất tài sản nghề phụ khi chết';
  v := game.start_life(u, t0 + interval '2 days');
  s := game.crafts_state(u, t0 + interval '2 days');
  assert (select count(*) from jsonb_array_elements(s->'plots') p where (p->>'unlocked')::boolean) = 2 and jsonb_array_length(s->'goods') = 0, 'kiếp mới sạch';
  assert not has_function_privilege('authenticated', 'game.crafts_action(uuid,text,int,text,int,int,timestamptz)', 'EXECUTE'), 'client không gọi trực tiếp';
  assert not has_table_privilege('authenticated', 'game.farm_plots', 'SELECT');
end $$;
