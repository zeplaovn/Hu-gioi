-- Thiên Mệnh: Quán Đỉnh (2.280 TM), Thiên Mệnh Các, hiệu ứng stat, mất vật phẩm khi chết.
begin;

create function pg_temp.expect_err(p_sql text, p_code text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'mong lỗi % nhưng chạy thành công: %', p_code, p_sql;
exception when sqlstate 'GM000' then
  if sqlerrm <> p_code then raise exception 'mong lỗi % nhưng nhận %', p_code, sqlerrm; end if;
end $$;

do $$ declare u uuid := 'b0000000-0000-0000-0000-000000000001'; r jsonb; m record; s text; costs int[] := '{}';
begin
  insert into auth.users (id) values (u);
  perform game.ensure_account(u);
  perform pg_temp.expect_err(format('select game.upgrade_stat(%L, %L)', u, 'CanCot'), 'insufficient_tm');
  perform pg_temp.expect_err(format('select game.upgrade_stat(%L, %L)', u, 'Khong'), 'stat_not_found');

  update game.accounts set tm_balance = 100 where account_id = u;
  for i in 1..3 loop costs := costs || (game.upgrade_stat(u, 'CanCot')->>'cost')::int; end loop;
  assert costs = array[8, 10, 12], 'Căn Cốt: 8 + 2 x cấp, got ' || costs::text;
  assert (select tm_balance from game.accounts where account_id = u) = 70 and (select tm_spent from game.accounts where account_id = u) = 30;

  update game.accounts set tm_balance = 100000 where account_id = u;
  foreach s in array array['TuongMao', 'PhucDuyen', 'CanCot', 'NgoTinh', 'VanKhi'] loop
    while (select level from game.account_stats where account_id = u and stat_key = s) < 20 loop perform game.upgrade_stat(u, s); end loop;
    perform pg_temp.expect_err(format('select game.upgrade_stat(%L, %L)', u, s), 'max_level');
  end loop;
  assert (select tm_spent from game.accounts where account_id = u) = 2280, 'tổng Quán Đỉnh = 2280';
  assert (select sum(delta) from game.tm_ledger where account_id = u and reason = 'quan_dinh') = -2280;

  select speed, risk into m from game.multipliers(u);
  assert abs(m.speed - 1.12) < 1e-9, 'tốc độ = 1 + 20x0,002 + 20x0,004 = 1,12, got ' || m.speed;
  assert abs(m.risk - 0.70) < 1e-9, 'rủi ro = 1 - 20x0,010 - 20x0,005 = 0,70, got ' || m.risk;
  assert m.speed <= 1.25 and m.risk >= 0.5, 'guardrail';
end $$;

do $$ declare u uuid := 'b0000000-0000-0000-0000-000000000002'; t0 timestamptz := '2026-10-18 00:00:00+00'; v uuid; v2 uuid; r jsonb; st jsonb;
begin
  insert into auth.users (id) values (u);
  perform game.ensure_account(u);
  update game.accounts set tm_balance = 300 where account_id = u;
  perform pg_temp.expect_err(format('select game.buy_tm_item(%L, %L)', u, 'TMITEM-004'), 'no_alive_life');
  v := game.start_life(u, t0);
  perform pg_temp.expect_err(format('select game.buy_tm_item(%L, %L)', u, 'TMSTAT-001'), 'item_not_found');
  r := game.buy_tm_item(u, 'TMITEM-004');
  assert (r->>'cost')::int = 35 and r->>'warning' = 'lost_on_death' and (r->>'tm_balance')::int = 265;
  perform pg_temp.expect_err(format('select game.buy_tm_item(%L, %L)', u, 'TMITEM-004'), 'limit_reached');      -- 1/kiếp
  perform game.buy_tm_item(u, 'TMITEM-002'); perform game.buy_tm_item(u, 'TMITEM-002');                         -- 2/kiếp
  perform pg_temp.expect_err(format('select game.buy_tm_item(%L, %L)', u, 'TMITEM-002'), 'limit_reached');
  assert (select tm_balance from game.accounts where account_id = u) = 300 - 35 - 25 - 25;
  st := game.get_state(u, t0);
  assert jsonb_array_length(st->'life'->'items') = 3;

  update game.accounts set tm_balance = 10 where account_id = u;
  perform pg_temp.expect_err(format('select game.buy_tm_item(%L, %L)', u, 'TMITEM-012'), 'insufficient_tm');

  v2 := game.end_life(v, 'pvp', t0 + interval '1 hour');
  assert not exists (select 1 from game.life_items where life_id = v), 'vật phẩm Thiên Mệnh Các mất khi chết';
  assert (select tm_balance from game.accounts where account_id = u) = 10, 'không hoàn TM';
  assert (game.get_state(u, t0 + interval '1 hour')->'history'->0->>'cause') = 'pvp';
  update game.accounts set tm_balance = 100 where account_id = u;
  perform game.buy_tm_item(u, 'TMITEM-004');                                                                    -- kiếp mới: hạn mức làm lại
  assert (select count(*) from game.life_items where life_id = v2) = 1;
end $$;

-- giới hạn tốc độ
do $$ declare u uuid := 'b0000000-0000-0000-0000-000000000003';
begin
  assert game.hit_rate_limit(u, 'k', 3, 60) and game.hit_rate_limit(u, 'k', 3, 60) and game.hit_rate_limit(u, 'k', 3, 60);
  assert not game.hit_rate_limit(u, 'k', 3, 60), 'lần thứ 4 phải bị chặn';
  assert game.hit_rate_limit(u, 'other', 3, 60), 'khóa khác độc lập';
end $$;

rollback;
