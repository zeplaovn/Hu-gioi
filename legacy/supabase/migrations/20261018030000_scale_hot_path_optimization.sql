-- Scale hot-path optimization for Thiên Vân Đại Lục.
-- Reduces write amplification on save/presence/chat and keeps leaderboard reads index-friendly.

alter table public.player_saves set (
  fillfactor = 80,
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.01,
  autovacuum_vacuum_threshold = 50,
  autovacuum_analyze_threshold = 50
);
alter table public.server_presence set (
  fillfactor = 80,
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_threshold = 50,
  autovacuum_analyze_threshold = 50
);
alter table public.leaderboard set (
  fillfactor = 85,
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_threshold = 50,
  autovacuum_analyze_threshold = 50
);
alter table public.chat_messages set (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_threshold = 100,
  autovacuum_analyze_threshold = 100
);

create index if not exists leaderboard_rank_cover_idx
  on public.leaderboard (level desc, months asc, updated_at asc)
  include (user_id, name);

create table if not exists public.system_housekeeping (
  job text primary key,
  last_run_at timestamptz not null default to_timestamp(0)
);
alter table public.system_housekeeping enable row level security;
revoke all on public.system_housekeeping from public, anon, authenticated;
insert into public.system_housekeeping(job, last_run_at)
values ('chat_prune', to_timestamp(0))
on conflict (job) do nothing;

create or replace function public.lb_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p jsonb := new.save -> 'player';
  oldp jsonb;
  lv int; mo int; nm text; best int; bmo int;
  old_lv int; old_mo int; old_nm text; old_best text;
begin
  if tg_op = 'UPDATE' then
    oldp := old.save -> 'player';
    if p is not distinct from oldp and new.meta is not distinct from old.meta then return new; end if;

    if p is not null and jsonb_typeof(p) = 'object' then
      lv := coalesce((p ->> 'realm')::numeric::int, 0) * 9 + coalesce((p ->> 'tang')::numeric::int, 0);
      mo := coalesce((p ->> 'months')::numeric::int, 0);
      nm := left(btrim(regexp_replace(coalesce(p ->> 'name',''), '[[:cntrl:]]', '', 'g')), 24);
    else
      lv := 0; mo := 0; nm := '';
    end if;
    if oldp is not null and jsonb_typeof(oldp) = 'object' then
      old_lv := coalesce((oldp ->> 'realm')::numeric::int, 0) * 9 + coalesce((oldp ->> 'tang')::numeric::int, 0);
      old_mo := coalesce((oldp ->> 'months')::numeric::int, 0);
      old_nm := left(btrim(regexp_replace(coalesce(oldp ->> 'name',''), '[[:cntrl:]]', '', 'g')), 24);
    else
      old_lv := 0; old_mo := 0; old_nm := '';
    end if;
    old_best := coalesce(old.meta ->> 'best','');
    if lv = old_lv and mo = old_mo and nm = old_nm
       and coalesce(new.meta ->> 'best','') = old_best
       and coalesce(new.meta -> 'history','[]'::jsonb) is not distinct from coalesce(old.meta -> 'history','[]'::jsonb) then
      return new;
    end if;
  end if;

  if p is not null and jsonb_typeof(p) = 'object' and coalesce(public.player_plausible(p), false)
     and jsonb_typeof(p -> 'name') is not distinct from 'string' then
    lv := (p ->> 'realm')::numeric::int * 9 + (p ->> 'tang')::numeric::int;
    mo := (p ->> 'months')::numeric::int;
    if lv between 1 and 81 and mo >= public.lb_min_months(lv) then
      nm := left(btrim(regexp_replace(p ->> 'name', '[[:cntrl:]]', '', 'g')), 24);
      if nm = '' then nm := 'Vô danh'; end if;
      insert into public.leaderboard (user_id, name, level, months, updated_at)
      values (new.user_id, nm, lv, mo, clock_timestamp())
      on conflict (user_id) do update
        set name = excluded.name,
            level = excluded.level,
            months = excluded.months,
            updated_at = case when excluded.level > public.leaderboard.level or excluded.months < public.leaderboard.months then clock_timestamp() else public.leaderboard.updated_at end
        where excluded.level > public.leaderboard.level
           or (excluded.level = public.leaderboard.level and excluded.months <= public.leaderboard.months)
           or excluded.name is distinct from public.leaderboard.name;
    end if;
  end if;

  if jsonb_typeof(new.meta) = 'object' and (new.meta ->> 'best') ~ '^[0-9]{1,3}$' then
    best := least(81, (new.meta ->> 'best')::int);
    if best >= 1 then
      bmo := public.lb_best_months(new.meta, best);
      update public.leaderboard set level = best, months = bmo, updated_at = clock_timestamp()
       where user_id = new.user_id and (best > level or (best = level and bmo < months));
    end if;
  end if;
  return new;
end
$$;

create or replace function public.heartbeat_presence(
  p_session_id uuid,
  p_client_version text default null,
  p_realm_level integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  now_ts timestamptz := clock_timestamp();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_session_id is null then raise exception 'invalid_session' using errcode = '22023'; end if;
  if p_realm_level is not null and (p_realm_level < 1 or p_realm_level > 81) then raise exception 'invalid_realm' using errcode = '22023'; end if;

  insert into public.server_presence(user_id, session_id, last_seen_at, client_version, realm_level)
  values(uid, p_session_id, now_ts, left(coalesce(p_client_version,''), 40), p_realm_level)
  on conflict(user_id) do update set
    session_id = excluded.session_id,
    last_seen_at = excluded.last_seen_at,
    client_version = excluded.client_version,
    realm_level = excluded.realm_level
  where public.server_presence.session_id is distinct from excluded.session_id
     or public.server_presence.client_version is distinct from excluded.client_version
     or public.server_presence.realm_level is distinct from excluded.realm_level
     or public.server_presence.last_seen_at < now_ts - interval '60 seconds';
end;
$$;
revoke all on function public.heartbeat_presence(uuid,text,integer) from public, anon, authenticated;
grant execute on function public.heartbeat_presence(uuid,text,integer) to authenticated;

create or replace function public.send_chat(p_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  txt text;
  nm text;
  rec public.chat_messages%rowtype;
  do_prune boolean := false;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if private.maintenance_active() then raise exception 'maintenance_mode' using errcode = 'P0001'; end if;

  txt := btrim(regexp_replace(regexp_replace(coalesce(p_body, ''), '[[:cntrl:]]', ' ', 'g'), '\s+', ' ', 'g'));
  if txt = '' then raise exception 'empty' using errcode = '22023'; end if;
  if char_length(txt) > 200 then raise exception 'too_long' using errcode = '22023'; end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  if exists (select 1 from public.chat_messages where user_id = uid and created_at > clock_timestamp() - interval '2 seconds')
     or (select count(*) from public.chat_messages where user_id = uid and created_at > clock_timestamp() - interval '1 minute') >= 10 then
    raise exception 'too_fast' using errcode = 'P0001';
  end if;

  select l.name into nm from public.leaderboard l where l.user_id = uid;
  insert into public.chat_messages (user_id, name, body)
  values (uid, coalesce(nm, 'Vô danh'), txt)
  returning * into rec;

  update public.system_housekeeping set last_run_at = clock_timestamp()
   where job = 'chat_prune' and last_run_at < clock_timestamp() - interval '1 hour'
   returning true into do_prune;
  if coalesce(do_prune, false) then
    delete from public.chat_messages where created_at < clock_timestamp() - interval '2 days';
  end if;

  return jsonb_build_object('id', rec.id, 'user_id', rec.user_id, 'name', rec.name, 'body', rec.body, 'created_at', rec.created_at);
end;
$$;
revoke all on function public.send_chat(text) from public, anon, authenticated;
grant execute on function public.send_chat(text) to authenticated;

create or replace function public.save_game(p_save jsonb, p_meta jsonb, p_rev bigint, p_force boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  cur public.player_saves%rowtype;
  new_rev bigint;
  now_ts timestamptz := clock_timestamp();
  can_force boolean := false;
  oldp jsonb; newp jsonb;
  old_count int; new_count int;
  old_lv int; new_lv int;
  new_progress_ms bigint := 0; allowed_ms bigint := 0;
  elapsed numeric := 0; effective numeric := 0;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if private.maintenance_active() then raise exception 'maintenance_mode' using errcode = 'P0001'; end if;

  if coalesce(p_force, false) then
    select exists (select 1 from public.admin_users a where a.user_id = uid and a.enabled and private.admin_rank(a.role) >= 3) into can_force;
    if not can_force then raise exception 'force_forbidden' using errcode = '42501'; end if;
  end if;

  if p_meta is null or jsonb_typeof(p_meta) <> 'object' then raise exception 'bad_meta' using errcode = '22023'; end if;
  if p_save is not null and jsonb_typeof(p_save) <> 'object' then raise exception 'bad_save' using errcode = '22023'; end if;
  if octet_length(coalesce(p_save::text, '')) > 262144 or octet_length(p_meta::text) > 262144 then raise exception 'too_large' using errcode = 'P0001'; end if;
  if p_save is not null and p_save ? 'player' and p_save->'player' <> 'null'::jsonb and not coalesce(public.player_plausible(p_save->'player'), false) then raise exception 'implausible' using errcode = '22023'; end if;
  if p_rev is null or p_rev < 0 then raise exception 'bad_rev' using errcode = '22023'; end if;

  select * into cur from public.player_saves where user_id = uid for update;
  if not found then
    if p_rev <> 0 and not coalesce(p_force, false) then raise exception 'conflict' using errcode = 'P0001'; end if;
    newp := case when p_save is not null then p_save->'player' else null end;
    if newp is not null and newp <> 'null'::jsonb then
      new_progress_ms := ((newp->>'months')::numeric::bigint * 10 + coalesce((newp->'idle'->>'mt')::numeric::bigint, 0)) * 1000;
    end if;
    insert into public.player_saves(user_id,save,meta,rev,updated_at,trusted_game_ms,trusted_game_at)
    values(uid,p_save,p_meta,1,now_ts,greatest(0,new_progress_ms),now_ts);
    return jsonb_build_object('rev',1,'updated_at',now_ts);
  end if;

  if cur.rev <> p_rev and not coalesce(p_force, false) then raise exception 'conflict' using errcode = 'P0001'; end if;
  if now_ts - cur.updated_at < interval '250 milliseconds' and not coalesce(p_force, false) then raise exception 'too_fast' using errcode = 'P0001'; end if;

  if p_save is not distinct from cur.save and p_meta is not distinct from cur.meta and not coalesce(p_force, false) then
    return jsonb_build_object('rev',cur.rev,'updated_at',cur.updated_at,'unchanged',true);
  end if;

  old_count := case when cur.save is not null and jsonb_typeof(cur.save)='object' and jsonb_typeof(cur.save->'count')='number' then (cur.save->>'count')::numeric::int else 1 end;
  new_count := case when p_save is not null and jsonb_typeof(p_save->'count')='number' then (p_save->>'count')::numeric::int else old_count end;
  if not coalesce(p_force, false) and (new_count < old_count or new_count > old_count + 1) then raise exception 'bad_life_sequence' using errcode = '22023'; end if;

  oldp := case when cur.save is not null then cur.save->'player' else null end;
  newp := case when p_save is not null then p_save->'player' else null end;
  if newp is not null and newp <> 'null'::jsonb then
    new_progress_ms := ((newp->>'months')::numeric::bigint * 10 + coalesce((newp->'idle'->>'mt')::numeric::bigint, 0)) * 1000;
  end if;

  if not coalesce(p_force, false) and new_count = old_count and oldp is not null and oldp <> 'null'::jsonb and newp is not null and newp <> 'null'::jsonb then
    old_lv := (oldp->>'realm')::numeric::int * 9 + (oldp->>'tang')::numeric::int;
    new_lv := (newp->>'realm')::numeric::int * 9 + (newp->>'tang')::numeric::int;
    if new_lv < old_lv then raise exception 'level_reverse' using errcode = '22023'; end if;

    elapsed := greatest(0, extract(epoch from (now_ts - cur.trusted_game_at)));
    effective := least(7200, case when elapsed <= 120 then elapsed else 120 + (elapsed - 120) * 0.5 end);
    allowed_ms := cur.trusted_game_ms + floor(effective * 1000)::bigint;
    if new_progress_ms > allowed_ms then raise exception 'time_jump' using errcode = '22023'; end if;
  else
    allowed_ms := greatest(0,new_progress_ms);
  end if;

  new_rev := cur.rev + 1;
  update public.player_saves
     set save=p_save, meta=p_meta, rev=new_rev, updated_at=now_ts,
         trusted_game_ms = case when coalesce(p_force,false) then greatest(cur.trusted_game_ms,new_progress_ms) else greatest(allowed_ms,new_progress_ms) end,
         trusted_game_at = now_ts
   where user_id=uid;
  return jsonb_build_object('rev',new_rev,'updated_at',now_ts);
end;
$$;
revoke all on function public.save_game(jsonb,jsonb,bigint,boolean) from public, anon, authenticated;
grant execute on function public.save_game(jsonb,jsonb,bigint,boolean) to authenticated;

alter function private.admin_rank(text) set search_path = '';
