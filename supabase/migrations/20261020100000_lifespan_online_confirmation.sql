-- Đợt 1 / PR nền: chặn tử vong khi offline, tọa hóa cần hai bước online.
-- Phụ thuộc PR #30: ngưỡng XP tầng v1.6.1 đã áp dụng.
-- Giao dịch death giữ nguyên game.end_life (mất tài sản kiếp, giữ TM/stat).
-- Không ghi lại seed/static data hoặc migration trước.

create table if not exists game.lifespan_intents (
  intent_id uuid primary key default gen_random_uuid(),
  life_id uuid not null references game.lives(life_id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  outcome text check (outcome in ('confirmed', 'superseded')),
  check (expires_at > created_at),
  check ((consumed_at is null and outcome is null) or (consumed_at is not null and outcome is not null))
);
create unique index if not exists lifespan_one_pending_per_life
  on game.lifespan_intents(life_id) where consumed_at is null;
alter table game.lifespan_intents enable row level security;
alter table game.lifespan_intents force row level security;
revoke all on game.lifespan_intents from public, anon, authenticated;
grant select, insert, update, delete on game.lifespan_intents to service_role;

-- Giữ ngưỡng XP v1.6.1. Chỉ dừng ở trần thọ nguyên; không tự động gây chết lúc đồng bộ.
create or replace function game.settle_life(p_life uuid, p_now timestamptz default now()) returns void
language plpgsql set search_path = '' as $$
declare
  l game.lives%rowtype;
  v_elapsed double precision; v_credit double precision; v_avail double precision;
  v_speed double precision; v_left double precision; v_prog_avail double precision;
  v_cap_left double precision; v_need double precision; v_room double precision; v_take double precision;
  v_tps smallint := (game.rule('tang_per_stage'))::smallint;
  v_scale double precision := (game.rule('time_scale'))::double precision;
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
  update game.lives set tang = l.tang, progress_s = l.progress_s,
         credited_s = l.credited_s + (v_prog_avail - v_left) / v_speed, last_settle_at = p_now
   where life_id = l.life_id;

  -- Không tọa hóa tự động. Người chơi cần xác nhận hai bước khi online.
end $$;


-- Giữ nguyên game.get_state v1.6.1 để tránh copy lại luật dữ liệu tĩnh.
-- Wrapper chỉ bổ sung cờ thọ nguyên và intent đang chờ.
do $$
begin
  if to_regprocedure('game.get_state_v161(uuid,timestamp with time zone)') is null then
    alter function game.get_state(uuid, timestamptz) rename to get_state_v161;
  end if;
end $$;

create or replace function game.get_state(p_account uuid, p_now timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_state jsonb;
  v_life uuid;
  v_credited double precision;
  v_cap_s double precision;
  v_pending jsonb := null;
begin
  v_state := game.get_state_v161(p_account, p_now);
  if v_state->'life' is null or v_state->'life' = 'null'::jsonb then
    return v_state || jsonb_build_object('pending_lifespan_intent', null);
  end if;
  v_life := (v_state->'life'->>'life_id')::uuid;
  select l.credited_s,
    game.lifespan_cap(l.stage_idx)::double precision /
      (game.rule('tho_nguyen')->>'use_years_per_credited_day')::double precision * 86400.0
    into v_credited, v_cap_s
    from game.lives l where l.life_id = v_life and l.account_id = p_account;
  v_state := jsonb_set(v_state, '{life,lifespan,exhausted}',
    to_jsonb(v_credited >= v_cap_s - 1e-6), true);
  select jsonb_build_object('intent_id', i.intent_id, 'expires_at', i.expires_at)
    into v_pending from game.lifespan_intents i
    where i.life_id = v_life and i.consumed_at is null and i.expires_at > p_now
    order by i.created_at desc limit 1;
  return v_state || jsonb_build_object('pending_lifespan_intent', v_pending);
end $$;

create or replace function game.lifespan_prepare(p_account uuid, p_now timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  l game.lives%rowtype;
  v_cap_s double precision;
  v_id uuid;
  v_exp timestamptz;
begin
  select * into l from game.lives
    where account_id = p_account and status = 'alive' for update;
  if not found then raise exception 'no_alive_life' using errcode = 'GM000'; end if;
  perform game.settle_life(l.life_id, p_now);
  select * into l from game.lives where life_id = l.life_id;
  v_cap_s := game.lifespan_cap(l.stage_idx)::double precision /
    (game.rule('tho_nguyen')->>'use_years_per_credited_day')::double precision * 86400.0;
  if l.credited_s < v_cap_s - 1e-6 then
    raise exception 'lifespan_not_exhausted' using errcode = 'GM000';
  end if;
  update game.lifespan_intents
    set consumed_at = p_now, outcome = 'superseded'
    where life_id = l.life_id and consumed_at is null;
  v_exp := p_now + make_interval(secs => (game.rule('intent_ttl_s'))::int);
  insert into game.lifespan_intents(life_id, created_at, expires_at)
    values (l.life_id, p_now, v_exp) returning intent_id into v_id;
  return jsonb_build_object('intent_id', v_id, 'expires_at', v_exp,
    'warning', 'Tọa hóa kết thúc kiếp; mất ví, túi đồ, công pháp và nghề phụ của kiếp. Thiên Mệnh và chỉ số vĩnh viễn được giữ.');
end $$;

create or replace function game.lifespan_confirm(p_account uuid, p_intent uuid, p_now timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  l game.lives%rowtype;
  i game.lifespan_intents%rowtype;
  v_cap_s double precision;
  v_new uuid;
begin
  -- Thứ tự khóa: life trước -> intent -> account trong end_life.
  select * into l from game.lives
    where account_id = p_account and status = 'alive' for update;
  if not found then raise exception 'no_alive_life' using errcode = 'GM000'; end if;
  select * into i from game.lifespan_intents
    where intent_id = p_intent and life_id = l.life_id for update;
  if not found then raise exception 'lifespan_intent_not_found' using errcode = 'GM000'; end if;
  if i.consumed_at is not null then
    raise exception 'lifespan_intent_consumed' using errcode = 'GM000';
  end if;
  if p_now > i.expires_at then
    raise exception 'lifespan_intent_expired' using errcode = 'GM000';
  end if;
  perform game.settle_life(l.life_id, p_now);
  select * into l from game.lives where life_id = l.life_id;
  v_cap_s := game.lifespan_cap(l.stage_idx)::double precision /
    (game.rule('tho_nguyen')->>'use_years_per_credited_day')::double precision * 86400.0;
  if l.credited_s < v_cap_s - 1e-6 then
    raise exception 'lifespan_not_exhausted' using errcode = 'GM000';
  end if;
  update game.lifespan_intents
    set consumed_at = p_now, outcome = 'confirmed' where intent_id = i.intent_id;
  v_new := game.end_life(l.life_id, 'lifespan', p_now);
  return jsonb_build_object('outcome', 'death', 'cause', 'lifespan', 'new_life_id', v_new);
end $$;

revoke all on function game.get_state(uuid, timestamptz) from public, anon, authenticated;
revoke all on function game.lifespan_prepare(uuid, timestamptz) from public, anon, authenticated;
revoke all on function game.lifespan_confirm(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function game.get_state(uuid, timestamptz) to service_role;
grant execute on function game.lifespan_prepare(uuid, timestamptz) to service_role;
grant execute on function game.lifespan_confirm(uuid, uuid, timestamptz) to service_role;
