-- Hàm game v2 (pgSQL) — NGUỒN SỰ THẬT của luật game. Chỉ service_role (Edge Function) được gọi.
-- Lỗi nghiệp vụ: raise exception '<code>' using errcode = 'GM000' (Edge Function ánh xạ code -> HTTP).
-- Thứ tự khóa (tránh deadlock): luôn khóa life TRƯỚC, account SAU.

-- ---------------------------------------------------------------- tiện ích
create function game.rule(p_key text) returns jsonb
language sql stable set search_path = '' as $$
  select value from game.rules where key = p_key
$$;

-- Số ngẫu nhiên [0,1) từ 52 bit của UUID v4 (bỏ nibble version/variant), không dùng random() có thể seed.
create function game.roll() returns double precision
language sql volatile set search_path = '' as $$
  select (('x' || substr(replace(gen_random_uuid()::text, '-', ''), 18, 13))::bit(52)::bigint)::double precision / 4503599627370496.0
$$;

create function game.ensure_account(p_account uuid) returns void
language plpgsql set search_path = '' as $$
begin
  insert into game.accounts (account_id) values (p_account) on conflict do nothing;
  insert into game.account_stats (account_id, stat_key)
    select p_account, k from unnest(array['TuongMao', 'PhucDuyen', 'CanCot', 'NgoTinh', 'VanKhi']) k
  on conflict do nothing;
end $$;

create function game.log_event(p_account uuid, p_life uuid, p_kind text, p_payload jsonb default '{}'::jsonb) returns void
language sql set search_path = '' as $$
  insert into game.events (account_id, life_id, kind, payload) values (p_account, p_life, p_kind, p_payload)
$$;

-- true = được phép; false = vượt giới hạn.
create function game.hit_rate_limit(p_account uuid, p_key text, p_max int, p_window_s int) returns boolean
language plpgsql set search_path = '' as $$
declare v_hits int;
begin
  insert into game.rate_limits (account_id, key, window_start, hits) values (p_account, p_key, now(), 1)
  on conflict (account_id, key) do update set
    window_start = case when game.rate_limits.window_start < now() - make_interval(secs => p_window_s) then now() else game.rate_limits.window_start end,
    hits         = case when game.rate_limits.window_start < now() - make_interval(secs => p_window_s) then 1 else game.rate_limits.hits + 1 end
  returning hits into v_hits;
  return v_hits <= p_max;
end $$;

-- ---------------------------------------------------------------- công thức
-- Giây được tính từ khoảng vắng mặt: 8h đầu 100%, 8–16h 70%, 16–24h 40%, quá 24h không tính (balance_config.offline).
create function game.credit_seconds(p_elapsed double precision) returns double precision
language plpgsql stable set search_path = '' as $$
declare
  o jsonb := game.rule('offline');
  v_full double precision := (o->>'full_hours')::double precision * 3600;
  v_cap  double precision := (o->>'cap_hours')::double precision * 3600;
  v_t    double precision := least(greatest(p_elapsed, 0), v_cap);
begin
  return least(v_t, v_full)
       + greatest(least(v_t, 2 * v_full) - v_full, 0) * (o->>'mid_efficiency')::double precision
       + greatest(v_t - 2 * v_full, 0)               * (o->>'low_efficiency')::double precision;
end $$;

-- Số giây tu luyện (tốc độ 1.0) cho MỘT tầng của giai đoạn: (ngày mục tiêu × 86400) / 9.
create function game.tang_seconds(p_stage smallint) returns double precision
language sql stable set search_path = '' as $$
  select ((s.day_end - s.day_start) * 86400.0 / (game.rule('tang_per_stage'))::int)::double precision from game.stages s where s.idx = p_stage
$$;

-- Thọ nguyên tối đa: 100 khi ở giai đoạn đầu; sau đó bằng mức cấp khi hoàn tất giai đoạn liền trước.
create function game.lifespan_cap(p_stage smallint) returns int
language sql stable set search_path = '' as $$
  select case when p_stage = 0 then (game.rule('tho_nguyen')->>'start_years')::int
              else (select lifespan_cap_after from game.stages where idx = p_stage - 1) end
$$;

create function game.multipliers(p_account uuid, out speed double precision, out risk double precision)
language plpgsql stable set search_path = '' as $$
declare v_s double precision; v_r double precision;
begin
  select coalesce(sum(a.level * ((e.value->>'speed')::double precision)), 0),
         coalesce(sum(a.level * ((e.value->>'risk')::double precision)), 0)
    into v_s, v_r
    from game.account_stats a
    join lateral jsonb_each(game.rule('stat_effects')) e on e.key = a.stat_key
   where a.account_id = p_account;
  speed := least((game.rule('speed_cap'))::double precision, 1 + v_s);
  risk  := greatest((game.rule('risk_floor'))::double precision, 1 - v_r);
end $$;

-- ---------------------------------------------------------------- Thiên Mệnh: phát theo mốc, idempotent
create function game.claim_milestone(p_life uuid, p_stage smallint, p_tang smallint) returns boolean
language plpgsql set search_path = '' as $$
declare v_acc uuid; v_n int;
begin
  select account_id into v_acc from game.lives where life_id = p_life;
  insert into game.life_milestones (life_id, stage_idx, tang) values (p_life, p_stage, p_tang) on conflict do nothing;
  get diagnostics v_n = row_count;
  if v_n = 0 then return false; end if;
  insert into game.tm_ledger (account_id, delta, reason, ref)
    values (v_acc, 1, 'milestone', p_life::text || ':' || p_stage || ':' || p_tang) on conflict do nothing;
  update game.accounts set tm_balance = tm_balance + 1, tm_earned = tm_earned + 1 where account_id = v_acc;
  update game.lives set tm_earned_life = tm_earned_life + 1 where life_id = p_life;
  return true;
end $$;

-- ---------------------------------------------------------------- death transaction
-- Khóa life → ghi nguyên nhân → snapshot lịch sử → xóa tài sản của kiếp → KHÔNG đụng TM/stat → tăng life_count → tạo kiếp mới.
-- Idempotent: gọi lại trên kiếp đã chết chỉ trả về kiếp đang sống hiện tại.
create function game.end_life(p_life uuid, p_cause text, p_now timestamptz default now()) returns uuid
language plpgsql set search_path = '' as $$
declare l game.lives%rowtype; v_new uuid; v_items jsonb; v_world text;
begin
  select * into l from game.lives where life_id = p_life for update;
  if not found then raise exception 'life_not_found' using errcode = 'GM000'; end if;
  if l.status <> 'alive' then
    select life_id into v_new from game.lives where account_id = l.account_id and status = 'alive';
    return v_new;
  end if;
  perform 1 from game.accounts where account_id = l.account_id for update;

  select coalesce(jsonb_agg(jsonb_build_object('catalog_id', catalog_id, 'acquired_at', acquired_at, 'used', used_at is not null)), '[]'::jsonb)
    into v_items from game.life_items where life_id = p_life;
  select world into v_world from game.stages where idx = l.stage_idx;

  insert into game.life_history (life_id, account_id, life_no, cause, stage_idx, tang, credited_days, tm_earned, born_at, ended_at, snapshot)
  values (l.life_id, l.account_id, l.life_no, p_cause, l.stage_idx, l.tang, l.credited_s / 86400.0, l.tm_earned_life, l.born_at, p_now,
          jsonb_build_object('world', v_world, 'wallet', jsonb_build_object('ls', l.ls, 'lt', l.lt, 'tn', l.tn), 'items', v_items));

  delete from game.life_items where life_id = p_life;
  update game.lives set status = 'dead', ended_at = p_now, death_cause = p_cause, ls = 0, lt = 0, tn = 0 where life_id = p_life;
  update game.accounts set life_count = life_count + 1 where account_id = l.account_id;

  insert into game.lives (account_id, life_no, last_settle_at, born_at) values (l.account_id, l.life_no + 1, p_now, p_now)
    returning life_id into v_new;
  perform game.log_event(l.account_id, p_life, 'death', jsonb_build_object('cause', p_cause, 'stage_idx', l.stage_idx, 'tang', l.tang, 'world', v_world,
          'lost_wallet_ls', l.ls, 'lost_items', jsonb_array_length(v_items), 'tm_earned_life', l.tm_earned_life));
  return v_new;
end $$;

-- ---------------------------------------------------------------- tu luyện: tính thời gian đã trôi
-- Tầng 1–8 tự tiến (không có tử vong). Tới tầng 9 DỪNG chờ người chơi xác nhận đại đột phá; thời gian dư không tính thọ nguyên.
-- Hết thọ nguyên => tọa hóa (end_life 'lifespan').
create function game.settle_life(p_life uuid, p_now timestamptz default now()) returns void
language plpgsql set search_path = '' as $$
declare
  l game.lives%rowtype;
  v_elapsed double precision; v_credit double precision; v_avail double precision;
  v_speed double precision; v_left double precision; v_prog_avail double precision;
  v_cap_left double precision; v_need double precision; v_room double precision; v_take double precision;
  v_tps smallint := (game.rule('tang_per_stage'))::smallint;
  v_scale double precision := (game.rule('time_scale'))::double precision;
  v_die boolean := false;
begin
  select * into l from game.lives where life_id = p_life for update;
  if not found then raise exception 'life_not_found' using errcode = 'GM000'; end if;
  if l.status <> 'alive' then return; end if;
  v_elapsed := extract(epoch from (p_now - l.last_settle_at));
  if v_elapsed <= 0 then return; end if;          -- đồng hồ không bao giờ chạy lùi

  select m.speed into v_speed from game.multipliers(l.account_id) m;
  v_credit := game.credit_seconds(v_elapsed) * v_scale;
  v_cap_left := game.lifespan_cap(l.stage_idx)::double precision / (game.rule('tho_nguyen')->>'use_years_per_credited_day')::double precision * 86400.0 - l.credited_s;
  v_avail := least(v_credit, greatest(v_cap_left, 0));      -- không tiêu quá thọ nguyên còn lại

  v_prog_avail := v_avail * v_speed;
  v_left := v_prog_avail;
  loop
    exit when v_left <= 0;
    v_need := game.tang_seconds(l.stage_idx);
    v_room := greatest(v_need - l.progress_s, 0);
    if l.tang = v_tps then                          -- chờ đại đột phá
      v_take := least(v_left, v_room);
      l.progress_s := l.progress_s + v_take;
      v_left := v_left - v_take;
      exit;
    end if;
    if v_left >= v_room then
      v_left := v_left - v_room;
      l.progress_s := 0;
      perform game.claim_milestone(l.life_id, l.stage_idx, l.tang);
      l.tang := l.tang + 1;
    else
      l.progress_s := l.progress_s + v_left;
      v_left := 0;
    end if;
  end loop;

  -- v_left > 0 chỉ khi bị chặn ở tầng 9: phần đó không được tính (không già thêm) và KHÔNG gây tọa hóa.
  -- Tọa hóa chỉ khi thời gian vượt thọ nguyên còn lại VÀ toàn bộ phần bị kẹp đã được dùng hết.
  v_die := v_credit >= v_cap_left and v_left <= 1e-9;
  update game.lives set tang = l.tang, progress_s = l.progress_s,
         credited_s = l.credited_s + (v_prog_avail - v_left) / v_speed, last_settle_at = p_now
   where life_id = l.life_id;

  if v_die then perform game.end_life(l.life_id, 'lifespan', p_now); end if;
end $$;

-- ---------------------------------------------------------------- bắt đầu kiếp
create function game.start_life(p_account uuid, p_now timestamptz default now()) returns uuid
language plpgsql set search_path = '' as $$
declare v_life uuid;
begin
  perform game.ensure_account(p_account);
  perform 1 from game.accounts where account_id = p_account for update;
  select life_id into v_life from game.lives where account_id = p_account and status = 'alive';
  if v_life is not null then return v_life; end if;
  insert into game.lives (account_id, life_no, last_settle_at, born_at)
    values (p_account, coalesce((select max(life_no) from game.lives where account_id = p_account), 0) + 1, p_now, p_now)
    returning life_id into v_life;
  perform game.log_event(p_account, v_life, 'life_start');
  return v_life;
end $$;

-- ---------------------------------------------------------------- trạng thái (đọc + tính thời gian trôi)
create function game.get_state(p_account uuid, p_now timestamptz default now()) returns jsonb
language plpgsql set search_path = '' as $$
declare
  l game.lives%rowtype; v_acc game.accounts%rowtype; s game.stages%rowtype;
  v_life jsonb := null; v_intent jsonb := null; v_m record; v_need double precision; v_ready boolean; v_cap int;
begin
  perform game.ensure_account(p_account);
  update game.accounts set last_seen_at = p_now where account_id = p_account;
  select life_id into l.life_id from game.lives where account_id = p_account and status = 'alive';
  if l.life_id is not null then perform game.settle_life(l.life_id, p_now); end if;

  select * into v_acc from game.accounts where account_id = p_account;
  select * into l from game.lives where account_id = p_account and status in ('alive', 'cleared') order by life_no desc limit 1;
  select m.speed, m.risk into v_m from game.multipliers(p_account) m;

  if found and l.life_id is not null then
    select * into s from game.stages where idx = l.stage_idx;
    v_need := game.tang_seconds(l.stage_idx);
    v_ready := l.status = 'alive' and l.tang = 9 and l.progress_s >= v_need - 1e-6;
    v_cap := game.lifespan_cap(l.stage_idx);
    v_life := jsonb_build_object(
      'life_id', l.life_id, 'life_no', l.life_no, 'status', l.status,
      'stage', jsonb_build_object('idx', s.idx, 'stage_id', s.stage_id, 'name', s.name, 'world', s.world),
      'tang', l.tang, 'progress_s', l.progress_s, 'need_s', v_need, 'ready_for_major', v_ready,
      'lifespan', jsonb_build_object('used_years', l.credited_s / 86400.0 * (game.rule('tho_nguyen')->>'use_years_per_credited_day')::double precision, 'cap_years', v_cap),
      'wallet', jsonb_build_object('ls', l.ls, 'lt', l.lt, 'tn', l.tn),
      'tm_earned_life', l.tm_earned_life, 'born_at', l.born_at,
      'speed_mult', v_m.speed, 'risk_mult', v_m.risk,
      'items', coalesce((select jsonb_agg(jsonb_build_object('item_id', i.item_id, 'catalog_id', i.catalog_id, 'name', c.name, 'used', i.used_at is not null) order by i.acquired_at)
                           from game.life_items i join game.tm_catalog c on c.id = i.catalog_id where i.life_id = l.life_id), '[]'::jsonb));
    select jsonb_build_object('intent_id', intent_id, 'death_prob', death_prob, 'expires_at', expires_at) into v_intent
      from game.breakthrough_intents where life_id = l.life_id and consumed_at is null and expires_at > p_now order by created_at desc limit 1;
  end if;

  return jsonb_build_object(
    'now', p_now,
    'account', jsonb_build_object('tm_balance', v_acc.tm_balance, 'tm_earned', v_acc.tm_earned, 'tm_spent', v_acc.tm_spent, 'life_count', v_acc.life_count,
      'stats', (select jsonb_object_agg(a.stat_key, jsonb_build_object('level', a.level, 'cap', c.level_cap,
                  'next_cost', case when a.level < c.level_cap then c.base_cost + c.step_cost * a.level end))
                  from game.account_stats a join game.tm_catalog c on c.kind = 'stat' and c.stat_key = a.stat_key where a.account_id = p_account)),
    'life', v_life,
    'pending_intent', v_intent,
    'history', coalesce((select jsonb_agg(jsonb_build_object('life_no', life_no, 'cause', cause, 'stage_idx', stage_idx, 'tang', tang,
                  'credited_days', round(credited_days::numeric, 2), 'tm_earned', tm_earned, 'ended_at', ended_at) order by life_no desc)
                  from (select * from game.life_history where account_id = p_account order by life_no desc limit 10) h), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------- đại đột phá (tầng 9): hai bước
create function game.breakthrough_prepare(p_account uuid, p_now timestamptz default now()) returns jsonb
language plpgsql set search_path = '' as $$
declare l game.lives%rowtype; v_p numeric; v_risk double precision; v_id uuid; v_exp timestamptz; v_world text;
begin
  perform game.ensure_account(p_account);
  select * into l from game.lives where account_id = p_account and status = 'alive' for update;
  if not found then raise exception 'no_alive_life' using errcode = 'GM000'; end if;
  perform game.settle_life(l.life_id, p_now);
  select * into l from game.lives where life_id = l.life_id;
  if l.status <> 'alive' then raise exception 'life_ended' using errcode = 'GM000'; end if;
  if l.tang <> 9 then raise exception 'not_major_stage' using errcode = 'GM000'; end if;
  if l.progress_s < game.tang_seconds(l.stage_idx) - 1e-6 then raise exception 'not_ready' using errcode = 'GM000'; end if;

  select m.risk into v_risk from game.multipliers(p_account) m;
  select p_death_tang9, world into v_p, v_world from game.stages where idx = l.stage_idx;
  v_p := least(1, v_p * (game.rule('hazard_scale'))::numeric * v_risk::numeric);

  update game.breakthrough_intents set consumed_at = p_now, outcome = 'superseded' where life_id = l.life_id and consumed_at is null;
  v_exp := p_now + make_interval(secs => (game.rule('intent_ttl_s'))::int);
  insert into game.breakthrough_intents (life_id, stage_idx, death_prob, created_at, expires_at)
    values (l.life_id, l.stage_idx, round(v_p, 6), p_now, v_exp) returning intent_id into v_id;
  return jsonb_build_object('intent_id', v_id, 'stage_idx', l.stage_idx, 'death_prob', round(v_p, 6), 'success_prob', round(1 - v_p, 6),
                            'lethal', v_p > 0, 'expires_at', v_exp,
                            'warning', 'Chết thật = mất toàn bộ tài sản của kiếp (giữ Thiên Mệnh).');
end $$;

create function game.breakthrough_confirm(p_account uuid, p_intent uuid, p_now timestamptz default now()) returns jsonb
language plpgsql set search_path = '' as $$
declare l game.lives%rowtype; i game.breakthrough_intents%rowtype; s game.stages%rowtype; v_new uuid; v_next game.stages%rowtype; v_roll double precision;
begin
  select * into l from game.lives where account_id = p_account and status = 'alive' for update;
  if not found then raise exception 'no_alive_life' using errcode = 'GM000'; end if;
  select * into i from game.breakthrough_intents where intent_id = p_intent and life_id = l.life_id for update;
  if not found then raise exception 'intent_not_found' using errcode = 'GM000'; end if;
  if i.consumed_at is not null then raise exception 'intent_consumed' using errcode = 'GM000'; end if;
  if p_now > i.expires_at then
    update game.breakthrough_intents set consumed_at = p_now, outcome = 'expired' where intent_id = i.intent_id;
    raise exception 'intent_expired' using errcode = 'GM000';
  end if;

  perform game.settle_life(l.life_id, p_now);
  select * into l from game.lives where life_id = l.life_id;
  if l.status <> 'alive' then
    -- tọa hóa trong lúc chờ xác nhận: intent mất hiệu lực, không tính là kết quả đột phá
    update game.breakthrough_intents set consumed_at = p_now, outcome = 'superseded' where intent_id = i.intent_id;
    return jsonb_build_object('outcome', 'death', 'cause', 'lifespan', 'new_life_id', (select life_id from game.lives where account_id = p_account and status = 'alive'));
  end if;
  if l.stage_idx <> i.stage_idx or l.tang <> 9 then raise exception 'intent_stale' using errcode = 'GM000'; end if;

  select * into s from game.stages where idx = l.stage_idx;
  v_roll := game.roll();
  if v_roll < i.death_prob then
    update game.breakthrough_intents set consumed_at = p_now, outcome = 'death' where intent_id = i.intent_id;
    v_new := game.end_life(l.life_id, 'breakthrough', p_now);
    return jsonb_build_object('outcome', 'death', 'cause', 'breakthrough', 'new_life_id', v_new);
  end if;

  update game.breakthrough_intents set consumed_at = p_now, outcome = 'success' where intent_id = i.intent_id;
  perform game.claim_milestone(l.life_id, l.stage_idx, 9::smallint);

  if l.stage_idx = 14 then
    update game.lives set status = 'cleared', ended_at = p_now, progress_s = 0 where life_id = l.life_id;
    insert into game.life_history (life_id, account_id, life_no, cause, stage_idx, tang, credited_days, tm_earned, born_at, ended_at, snapshot)
      select l.life_id, l.account_id, l.life_no, 'cleared', l.stage_idx, 9, l.credited_s / 86400.0, tm_earned_life, born_at, p_now,
             jsonb_build_object('world', s.world) from game.lives where life_id = l.life_id;
    update game.accounts set life_count = life_count + 1 where account_id = l.account_id;
    perform game.log_event(l.account_id, l.life_id, 'cleared', jsonb_build_object('credited_days', l.credited_s / 86400.0));
    return jsonb_build_object('outcome', 'cleared');
  end if;

  select * into v_next from game.stages where idx = l.stage_idx + 1;
  update game.lives set stage_idx = v_next.idx, tang = 1, progress_s = 0 where life_id = l.life_id;
  perform game.log_event(l.account_id, l.life_id, 'breakthrough_success', jsonb_build_object('from', s.stage_id, 'to', v_next.stage_id));
  if v_next.world <> s.world then
    -- Phi Thăng: chỉ chuyển map, KHÔNG kết thúc kiếp, không thưởng riêng.
    perform game.log_event(l.account_id, l.life_id, 'ascend', jsonb_build_object('from_world', s.world, 'to_world', v_next.world));
  end if;
  return jsonb_build_object('outcome', 'success', 'stage_idx', v_next.idx, 'stage_id', v_next.stage_id, 'world', v_next.world, 'ascended', v_next.world <> s.world);
end $$;

-- ---------------------------------------------------------------- Thiên Mệnh: Quán Đỉnh + Thiên Mệnh Các
create function game.upgrade_stat(p_account uuid, p_stat text) returns jsonb
language plpgsql set search_path = '' as $$
declare c game.tm_catalog%rowtype; v_level int; v_cost int; v_bal int;
begin
  perform game.ensure_account(p_account);
  select * into c from game.tm_catalog where kind = 'stat' and stat_key = p_stat;
  if not found then raise exception 'stat_not_found' using errcode = 'GM000'; end if;
  select tm_balance into v_bal from game.accounts where account_id = p_account for update;
  select level into v_level from game.account_stats where account_id = p_account and stat_key = p_stat for update;
  if v_level >= c.level_cap then raise exception 'max_level' using errcode = 'GM000'; end if;
  v_cost := c.base_cost + c.step_cost * v_level;
  if v_bal < v_cost then raise exception 'insufficient_tm' using errcode = 'GM000'; end if;
  update game.accounts set tm_balance = tm_balance - v_cost, tm_spent = tm_spent + v_cost where account_id = p_account;
  update game.account_stats set level = v_level + 1 where account_id = p_account and stat_key = p_stat;
  insert into game.tm_ledger (account_id, delta, reason, ref) values (p_account, -v_cost, 'quan_dinh', p_stat || ':' || (v_level + 1));
  perform game.log_event(p_account, null, 'tm_stat_upgrade', jsonb_build_object('stat', p_stat, 'level', v_level + 1, 'cost', v_cost));
  return jsonb_build_object('stat', p_stat, 'level', v_level + 1, 'cost', v_cost, 'tm_balance', v_bal - v_cost);
end $$;

-- Mua vật phẩm độc quyền: trở thành vật phẩm vật lý của kiếp; CHẾT TRƯỚC KHI DÙNG THÌ MẤT, KHÔNG HOÀN TM.
create function game.buy_tm_item(p_account uuid, p_item text) returns jsonb
language plpgsql set search_path = '' as $$
declare l game.lives%rowtype; c game.tm_catalog%rowtype; v_bal int; v_owned int; v_item uuid;
begin
  perform game.ensure_account(p_account);
  select * into l from game.lives where account_id = p_account and status = 'alive' for update;
  if not found then raise exception 'no_alive_life' using errcode = 'GM000'; end if;
  select * into c from game.tm_catalog where id = p_item and kind = 'item';
  if not found then raise exception 'item_not_found' using errcode = 'GM000'; end if;
  select tm_balance into v_bal from game.accounts where account_id = p_account for update;
  select count(*) into v_owned from game.life_items where life_id = l.life_id and catalog_id = c.id;
  if v_owned >= c.per_life_limit then raise exception 'limit_reached' using errcode = 'GM000'; end if;
  if v_bal < c.cost then raise exception 'insufficient_tm' using errcode = 'GM000'; end if;
  insert into game.life_items (life_id, catalog_id) values (l.life_id, c.id) returning item_id into v_item;
  update game.accounts set tm_balance = tm_balance - c.cost, tm_spent = tm_spent + c.cost where account_id = p_account;
  insert into game.tm_ledger (account_id, delta, reason, ref) values (p_account, -c.cost, 'tm_shop', v_item::text);
  perform game.log_event(p_account, l.life_id, 'tm_item_buy', jsonb_build_object('item', c.id, 'cost', c.cost));
  return jsonb_build_object('item_id', v_item, 'catalog_id', c.id, 'name', c.name, 'cost', c.cost, 'tm_balance', v_bal - c.cost, 'warning', 'lost_on_death');
end $$;

create function game.heartbeat(p_account uuid, p_now timestamptz default now()) returns timestamptz
language plpgsql set search_path = '' as $$
begin
  perform game.ensure_account(p_account);
  update game.accounts set last_seen_at = p_now where account_id = p_account;
  return p_now;
end $$;

-- ---------------------------------------------------------------- quyền: chỉ service_role
revoke all on all functions in schema game from public, anon, authenticated;
grant execute on all functions in schema game to service_role;
alter default privileges in schema game revoke execute on functions from public;
