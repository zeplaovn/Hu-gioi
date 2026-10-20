-- Use exact XP-derived seconds for each of 135 tiers. No changes to lethal-death policy.
create or replace function game.settle_life(p_life uuid, p_now timestamptz default now()) returns void
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
    v_need := game.tang_seconds(l.stage_idx, l.tang);
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

create or replace function game.get_state(p_account uuid, p_now timestamptz default now()) returns jsonb
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
    v_need := game.tang_seconds(l.stage_idx, l.tang);
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

create or replace function game.breakthrough_prepare(p_account uuid, p_now timestamptz default now()) returns jsonb
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
  if l.progress_s < game.tang_seconds(l.stage_idx, l.tang) - 1e-6 then raise exception 'not_ready' using errcode = 'GM000'; end if;

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
