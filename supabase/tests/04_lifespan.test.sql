-- Tọa hóa chỉ xảy ra sau xác nhận online; offline không bao giờ gọi end_life.
begin;
create function pg_temp.expect_err_lifespan(p_sql text, p_code text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'mong lỗi % nhưng thành công', p_code;
exception when sqlstate 'GM000' then
  if sqlerrm <> p_code then raise exception 'mong % nhưng được %', p_code, sqlerrm; end if;
end $$;

do $$
declare
  u uuid := 'b0000000-0000-0000-0000-000000000011';
  other_u uuid := 'b0000000-0000-0000-0000-000000000012';
  t0 timestamptz := '2026-10-20 00:00:00+00';
  v uuid; other_life uuid; p jsonb; p2 jsonb; r jsonb;
  l game.lives%rowtype;
  before_tm int;
begin
  insert into auth.users(id) values (u), (other_u);
  v := game.start_life(u, t0);
  other_life := game.start_life(other_u, t0);
  perform pg_temp.expect_err_lifespan(format('select game.lifespan_prepare(%L, %L)', u, t0), 'lifespan_not_exhausted');
  update game.lives set credited_s = 864000 - 10, ls = 777, lt = 2, tn = 1 where life_id = v;
  insert into game.life_items(life_id, catalog_id) values(v, 'TMITEM-001');
  update game.accounts set tm_balance = 39, tm_earned = 39 where account_id = u;
  before_tm := (select tm_balance from game.accounts where account_id = u);

  -- Hai ngày vắng mặt: chạm trần nhưng không chết, không tự trừ ví hay Thiên Mệnh.
  perform game.settle_life(v, t0 + interval '2 days');
  select * into l from game.lives where life_id = v;
  assert l.status = 'alive' and abs(l.credited_s - 864000) < 0.001, 'offline chỉ dừng ở trần';
  assert l.ls = 777 and l.lt = 2 and l.tn = 1;
  assert (game.get_state(u, t0 + interval '2 days')->'life'->'lifespan'->>'exhausted')::boolean;
  assert (select count(*) from game.life_history where account_id = u) = 0;

  p := game.lifespan_prepare(u, t0 + interval '2 days');
  assert (p->>'intent_id')::uuid is not null;
  assert (game.get_state(u, t0 + interval '2 days')->'pending_lifespan_intent'->>'intent_id')::uuid = (p->>'intent_id')::uuid;

  -- Một kiếp khác không thể xác nhận intent và làm chết nhân vật này.
  perform pg_temp.expect_err_lifespan(format('select game.lifespan_confirm(%L, %L, %L)', other_u, (p->>'intent_id')::uuid, t0 + interval '2 days'), 'lifespan_intent_not_found');
  assert (select status from game.lives where life_id = v) = 'alive';

  -- Tạo prepare mới vô hiệu token trước; ràng buộc unique ngăn hai intent pending cùng kiếp.
  p2 := game.lifespan_prepare(u, t0 + interval '2 days 10 seconds');
  assert (select count(*) from game.lifespan_intents where life_id = v and consumed_at is null) = 1;
  perform pg_temp.expect_err_lifespan(format('select game.lifespan_confirm(%L, %L, %L)', u, (p->>'intent_id')::uuid, t0 + interval '2 days 11 seconds'), 'lifespan_intent_consumed');
  perform pg_temp.expect_err_lifespan(format('select game.lifespan_confirm(%L, %L, %L)', u, (p2->>'intent_id')::uuid, t0 + interval '2 days 131 seconds'), 'lifespan_intent_expired');
  assert (select status from game.lives where life_id = v) = 'alive', 'expired token không được gây chết';

  p := game.lifespan_prepare(u, t0 + interval '2 days 132 seconds');
  r := game.lifespan_confirm(u, (p->>'intent_id')::uuid, t0 + interval '2 days 133 seconds');
  assert r->>'outcome' = 'death' and r->>'cause' = 'lifespan';
  assert (select status from game.lives where life_id = v) = 'dead';
  assert (select ls + lt + tn from game.lives where life_id = v) = 0;
  assert not exists(select 1 from game.life_items where life_id = v);
  assert (select tm_balance from game.accounts where account_id = u) = before_tm;
  assert (select count(*) from game.life_history where account_id = u and cause = 'lifespan') = 1;
  assert (select count(*) from game.lives where account_id = u and status = 'alive') = 0, 'không tự mở kiếp mới';

  -- Replay không mở kiếp thứ ba / không trừ thêm tài sản.
  perform pg_temp.expect_err_lifespan(format('select game.lifespan_confirm(%L, %L, %L)', u, (p->>'intent_id')::uuid, t0 + interval '2 days 134 seconds'), 'no_alive_life');
  perform game.start_life(u, t0 + interval '2 days 135 seconds');
  perform pg_temp.expect_err_lifespan(format('select game.lifespan_confirm(%L, %L, %L)', u, (p->>'intent_id')::uuid, t0 + interval '2 days 136 seconds'), 'lifespan_intent_not_found');
  assert (select life_count from game.accounts where account_id = u) = 1;
  assert (select count(*) from game.life_history where account_id = u) = 1;
end $$;
rollback;
