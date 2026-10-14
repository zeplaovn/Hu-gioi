-- Thiên Vân Đại Lục — clean baseline for a brand-new Supabase project.
-- This file intentionally replaces the old incremental migration history.
-- Apply only to a fresh database. Auth schema/roles are provided by Supabase.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

create table public.player_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  save jsonb,
  meta jsonb not null default '{}'::jsonb,
  rev bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  trusted_game_ms bigint not null default 0,
  trusted_game_at timestamptz not null default now(),
  constraint player_saves_save_object check (save is null or jsonb_typeof(save) = 'object'),
  constraint player_saves_meta_object check (jsonb_typeof(meta) = 'object'),
  constraint player_saves_save_size check (save is null or octet_length(save::text) <= 262144),
  constraint player_saves_meta_size check (octet_length(meta::text) <= 262144)
);

create table public.leaderboard (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 24),
  level integer not null check (level between 1 and 81),
  months integer not null check (months >= 0),
  updated_at timestamptz not null default now()
);

create table public.chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 24),
  body text not null check (char_length(body) between 1 and 200),
  created_at timestamptz not null default now(),
  is_admin boolean not null default false
);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('viewer','moderator','admin','owner')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.player_moderation (
  user_id uuid primary key references auth.users(id) on delete cascade,
  chat_muted_until timestamptz,
  account_locked boolean not null default false,
  lock_reason text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_user_id uuid references auth.users(id),
  action text not null,
  target_type text,
  target_id text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.server_control (
  singleton boolean primary key default true check (singleton),
  maintenance_mode boolean not null default false,
  maintenance_reason text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.server_banners (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 500),
  level text not null default 'info' check (level in ('info','warning','critical')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.server_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session_id uuid not null,
  last_seen_at timestamptz not null default now(),
  client_version text,
  realm_level integer,
  metadata jsonb not null default '{}'::jsonb
);

create table public.economy_ledger (
  id bigint generated always as identity primary key,
  tx_type text not null check (tx_type in ('trade','auction','auction_fee','system_grant','system_sink')),
  from_user_id uuid references auth.users(id),
  to_user_id uuid references auth.users(id),
  asset_type text not null,
  asset_id text,
  quantity numeric not null default 1 check (quantity > 0),
  currency_amount bigint not null default 0 check (currency_amount >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.system_housekeeping (
  job text primary key,
  last_run_at timestamptz not null default to_timestamp(0)
);

insert into public.server_control(singleton) values (true);
insert into public.system_housekeeping(job, last_run_at) values ('chat_prune', to_timestamp(0));

-- ---------------------------------------------------------------------------
-- Indexes / hot-table storage settings
-- ---------------------------------------------------------------------------

create index leaderboard_rank_cover_idx
  on public.leaderboard(level desc, months asc, updated_at asc)
  include (user_id, name);
create index chat_messages_time_idx on public.chat_messages(created_at);
create index chat_messages_user_time_idx on public.chat_messages(user_id, created_at desc);
create index server_presence_seen_idx on public.server_presence(last_seen_at desc);
create index server_banners_active_idx on public.server_banners(active, starts_at desc, ends_at);
create index admin_audit_time_idx on public.admin_audit_log(created_at desc);
create index admin_audit_admin_idx on public.admin_audit_log(admin_user_id, created_at desc);
create index economy_ledger_from_idx on public.economy_ledger(from_user_id, created_at desc);
create index economy_ledger_to_idx on public.economy_ledger(to_user_id, created_at desc);
create index economy_ledger_users_idx on public.economy_ledger(from_user_id, to_user_id, created_at desc);
create index economy_ledger_time_idx on public.economy_ledger(created_at desc);

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

-- ---------------------------------------------------------------------------
-- Row Level Security: deny by default, expose only explicit read models.
-- ---------------------------------------------------------------------------

alter table public.player_saves enable row level security;
alter table public.player_saves force row level security;
alter table public.leaderboard enable row level security;
alter table public.leaderboard force row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_messages force row level security;
alter table public.admin_users enable row level security;
alter table public.admin_users force row level security;
alter table public.player_moderation enable row level security;
alter table public.player_moderation force row level security;
alter table public.admin_audit_log enable row level security;
alter table public.admin_audit_log force row level security;
alter table public.server_control enable row level security;
alter table public.server_control force row level security;
alter table public.server_banners enable row level security;
alter table public.server_banners force row level security;
alter table public.server_presence enable row level security;
alter table public.server_presence force row level security;
alter table public.economy_ledger enable row level security;
alter table public.economy_ledger force row level security;
alter table public.system_housekeeping enable row level security;

create policy player_saves_select_own on public.player_saves
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy leaderboard_read_all on public.leaderboard
  for select to authenticated using (true);
create policy chat_read_all on public.chat_messages
  for select to authenticated using (true);

revoke all on table public.player_saves from public, anon, authenticated;
revoke all on table public.leaderboard from public, anon, authenticated;
revoke all on table public.chat_messages from public, anon, authenticated;
revoke all on table public.admin_users from public, anon, authenticated;
revoke all on table public.player_moderation from public, anon, authenticated;
revoke all on table public.admin_audit_log from public, anon, authenticated;
revoke all on table public.server_control from public, anon, authenticated;
revoke all on table public.server_banners from public, anon, authenticated;
revoke all on table public.server_presence from public, anon, authenticated;
revoke all on table public.economy_ledger from public, anon, authenticated;
revoke all on table public.system_housekeeping from public, anon, authenticated;

grant select on table public.player_saves to authenticated;
grant select on table public.leaderboard to authenticated;
grant select on table public.chat_messages to authenticated;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.lb_min_months(lv integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select (array[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,2,2,3,3,4,4,5,6,8,9,10,12,13,15,17,19,22,25,28,32,36,39,43,47,51,57,63,69,76,82,89,96,104,111,121,131,141,151,162,173,185,197,209,224,239,254,271,287,305,322,341,360,381,402,424,447,470,495,520,546,573])[lv]
$$;

create or replace function public.lb_best_months(meta jsonb, best integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select greatest(
    public.lb_min_months(best),
    coalesce((
      select max(case when (e ->> 'age') ~ '^[0-9]{1,5}$' then (e ->> 'age')::int end)
      from jsonb_array_elements(
        case when jsonb_typeof(meta -> 'history') = 'array' then meta -> 'history' else '[]'::jsonb end
      ) e
    ), 20) * 12 - 240
  )
$$;

create or replace function private.admin_rank(p_role text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'viewer' then 1
    when 'moderator' then 2
    when 'admin' then 3
    when 'owner' then 4
    else 0
  end
$$;

create or replace function private.safe_name(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  with cleaned as (
    select btrim(
      regexp_replace(
        regexp_replace(coalesce(p, ''), '[[:cntrl:]<>\[\]​-‏⁠﻿]', '', 'g'),
        '\s+', ' ', 'g'
      )
    ) as s
  )
  select case
    when s = '' then 'Vô danh'
    when lower(s) ~ '(admin|moderator|quản trị|quan tri|thiên đạo|thien dao|hệ thống|he thong|system|\ygm\y)'
      then 'Vô danh'
    else left(s, 24)
  end
  from cleaned
$$;

create or replace function private.current_admin_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select a.role
  from public.admin_users a
  where a.user_id = (select auth.uid()) and a.enabled
$$;

create or replace function private.require_admin(p_min_role text default 'viewer')
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r text;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  r := private.current_admin_role();
  if r is null or private.admin_rank(r) < private.admin_rank(p_min_role) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return r;
end;
$$;

create or replace function private.admin_audit(
  p_action text,
  p_target_type text default null,
  p_target_id text default null,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_audit_log(admin_user_id, action, target_type, target_id, reason, metadata)
  values ((select auth.uid()), p_action, p_target_type, p_target_id, p_reason, coalesce(p_metadata, '{}'::jsonb))
$$;

create or replace function private.maintenance_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select c.maintenance_mode from public.server_control c where c.singleton = true), false)
     and not exists (
       select 1
       from public.admin_users a
       where a.user_id = (select auth.uid())
         and a.enabled
         and private.admin_rank(a.role) >= 3
     )
$$;

create or replace function public.player_plausible(p jsonb)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  realm int; tang int; months numeric; age numeric; life numeric; lv int;
  stone numeric; xp numeric; k text; v numeric;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return false; end if;
  if jsonb_typeof(p->'realm') is distinct from 'number'
     or jsonb_typeof(p->'tang') is distinct from 'number'
     or jsonb_typeof(p->'months') is distinct from 'number'
     or jsonb_typeof(p->'age') is distinct from 'number'
     or jsonb_typeof(p->'lifespan') is distinct from 'number' then return false; end if;

  realm := (p->>'realm')::numeric;
  tang := (p->>'tang')::numeric;
  months := (p->>'months')::numeric;
  age := (p->>'age')::numeric;
  life := (p->>'lifespan')::numeric;
  if realm not between 0 and 8
     or tang not between 1 and 9
     or months not between 0 and 1000000
     or age not between 1 and 20000
     or life not between 1 and 20000 then return false; end if;

  lv := realm * 9 + tang;
  if months < greatest(realm * 9 + tang - 1, public.lb_min_months(lv)) then return false; end if;

  if p ? 'stats' then
    if jsonb_typeof(p->'stats') <> 'object' then return false; end if;
    foreach k in array array['Tướng Mạo','Phúc Duyên','Căn Cốt','Ngộ Tính','Vận Khí'] loop
      if jsonb_typeof(p->'stats'->k) is distinct from 'number' then return false; end if;
      v := (p->'stats'->>k)::numeric;
      if v < 1 or v > 40 or trunc(v) <> v then return false; end if;
    end loop;
  end if;

  if p ? 'stone' then
    if jsonb_typeof(p->'stone') <> 'number' then return false; end if;
    stone := (p->>'stone')::numeric;
    if stone < 0 or stone > 500 + months * 500 then return false; end if;
  end if;

  if p ? 'exp' then
    if jsonb_typeof(p->'exp') <> 'number' then return false; end if;
    xp := (p->>'exp')::numeric;
    if xp < 0 or xp > 1000000000000000 then return false; end if;
  end if;

  if p ? 'race' and (p->>'race') not in ('Nhân','Ma','Yêu','Linh','Tiên Duệ','Thú') then return false; end if;

  if p ? 'skills' then
    if jsonb_typeof(p->'skills') <> 'array' then return false; end if;
    if exists (
      select 1
      from jsonb_array_elements_text(p->'skills') s(name)
      where s.name not in (
        'Dưỡng Khí Quyết','Thanh Phong Kiếm Pháp','Kim Cang Thể','Huyền Thiên Chân Kinh','Cửu Thiên Lôi Pháp',
        'Nguyên Thần Quyết','Hóa Thần Thiên Chương','Hư Không Đạo Điển','Đại Thừa Chân Kinh','Cửu Kiếp Bất Diệt Kinh'
      )
    ) then return false; end if;
  end if;

  return true;
exception when others then
  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- Trigger helpers
-- ---------------------------------------------------------------------------

create or replace function private.leaderboard_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.name := private.safe_name(new.name);
  return new;
end;
$$;

create or replace function private.chat_stamp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.is_admin := exists (
    select 1
    from public.admin_users a
    where a.user_id = new.user_id
      and a.enabled
      and private.admin_rank(a.role) >= 2
  );

  if new.is_admin then
    if new.name = '[ADMIN]' then new.name := 'Thiên Đạo'; end if;
  else
    new.name := private.safe_name(new.name);
  end if;

  return new;
end;
$$;

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
      nm := private.safe_name(p ->> 'name');
    else
      lv := 0; mo := 0; nm := '';
    end if;

    if oldp is not null and jsonb_typeof(oldp) = 'object' then
      old_lv := coalesce((oldp ->> 'realm')::numeric::int, 0) * 9 + coalesce((oldp ->> 'tang')::numeric::int, 0);
      old_mo := coalesce((oldp ->> 'months')::numeric::int, 0);
      old_nm := private.safe_name(oldp ->> 'name');
    else
      old_lv := 0; old_mo := 0; old_nm := '';
    end if;

    old_best := coalesce(old.meta ->> 'best','');
    if lv = old_lv
       and mo = old_mo
       and nm = old_nm
       and coalesce(new.meta ->> 'best','') = old_best
       and coalesce(new.meta -> 'history','[]'::jsonb) is not distinct from coalesce(old.meta -> 'history','[]'::jsonb) then
      return new;
    end if;
  end if;

  if p is not null
     and jsonb_typeof(p) = 'object'
     and coalesce(public.player_plausible(p), false)
     and jsonb_typeof(p -> 'name') is not distinct from 'string' then
    lv := (p ->> 'realm')::numeric::int * 9 + (p ->> 'tang')::numeric::int;
    mo := (p ->> 'months')::numeric::int;
    if lv between 1 and 81 and mo >= public.lb_min_months(lv) then
      nm := private.safe_name(p ->> 'name');
      insert into public.leaderboard(user_id, name, level, months, updated_at)
      values (new.user_id, nm, lv, mo, clock_timestamp())
      on conflict (user_id) do update
        set name = excluded.name,
            level = excluded.level,
            months = excluded.months,
            updated_at = case
              when excluded.level > public.leaderboard.level or excluded.months < public.leaderboard.months
              then clock_timestamp()
              else public.leaderboard.updated_at
            end
        where excluded.level > public.leaderboard.level
           or (excluded.level = public.leaderboard.level and excluded.months <= public.leaderboard.months)
           or excluded.name is distinct from public.leaderboard.name;
    end if;
  end if;

  if jsonb_typeof(new.meta) = 'object' and (new.meta ->> 'best') ~ '^[0-9]{1,3}$' then
    best := least(81, (new.meta ->> 'best')::int);
    if best >= 1 then
      bmo := public.lb_best_months(new.meta, best);
      update public.leaderboard
      set level = best, months = bmo, updated_at = clock_timestamp()
      where user_id = new.user_id
        and (best > level or (best = level and bmo < months));
    end if;
  end if;

  return new;
end;
$$;

create trigger leaderboard_safe_name
before insert or update of name on public.leaderboard
for each row execute function private.leaderboard_name();

create trigger chat_messages_stamp
before insert on public.chat_messages
for each row execute function private.chat_stamp();

create trigger player_saves_leaderboard
after insert or update of save, meta on public.player_saves
for each row execute function public.lb_sync();

-- ---------------------------------------------------------------------------
-- Player/server RPCs
-- ---------------------------------------------------------------------------

create or replace function public.save_game(
  p_save jsonb,
  p_meta jsonb,
  p_rev bigint,
  p_force boolean default false
)
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
    select exists (
      select 1 from public.admin_users a
      where a.user_id = uid and a.enabled and private.admin_rank(a.role) >= 3
    ) into can_force;
    if not can_force then raise exception 'force_forbidden' using errcode = '42501'; end if;
  end if;

  if p_meta is null or jsonb_typeof(p_meta) <> 'object' then raise exception 'bad_meta' using errcode = '22023'; end if;
  if p_save is not null and jsonb_typeof(p_save) <> 'object' then raise exception 'bad_save' using errcode = '22023'; end if;
  if octet_length(coalesce(p_save::text, '')) > 262144 or octet_length(p_meta::text) > 262144 then raise exception 'too_large' using errcode = 'P0001'; end if;
  if p_save is not null and p_save ? 'player' and p_save->'player' <> 'null'::jsonb
     and not coalesce(public.player_plausible(p_save->'player'), false) then raise exception 'implausible' using errcode = '22023'; end if;
  if p_rev is null or p_rev < 0 then raise exception 'bad_rev' using errcode = '22023'; end if;

  select * into cur from public.player_saves where user_id = uid for update;

  if not found then
    if p_rev <> 0 and not coalesce(p_force, false) then raise exception 'conflict' using errcode = 'P0001'; end if;
    newp := case when p_save is not null then p_save->'player' else null end;
    if newp is not null and newp <> 'null'::jsonb then
      new_progress_ms := ((newp->>'months')::numeric::bigint * 10 + coalesce((newp->'idle'->>'mt')::numeric::bigint, 0)) * 1000;
    end if;
    insert into public.player_saves(user_id, save, meta, rev, updated_at, trusted_game_ms, trusted_game_at)
    values(uid, p_save, p_meta, 1, now_ts, greatest(0,new_progress_ms), now_ts);
    return jsonb_build_object('rev',1,'updated_at',now_ts);
  end if;

  if cur.rev <> p_rev and not coalesce(p_force, false) then raise exception 'conflict' using errcode = 'P0001'; end if;
  if now_ts - cur.updated_at < interval '250 milliseconds' and not coalesce(p_force, false) then raise exception 'too_fast' using errcode = 'P0001'; end if;

  if p_save is not distinct from cur.save and p_meta is not distinct from cur.meta and not coalesce(p_force, false) then
    return jsonb_build_object('rev',cur.rev,'updated_at',cur.updated_at,'unchanged',true);
  end if;

  old_count := case when cur.save is not null and jsonb_typeof(cur.save)='object' and jsonb_typeof(cur.save->'count')='number'
                    then (cur.save->>'count')::numeric::int else 1 end;
  new_count := case when p_save is not null and jsonb_typeof(p_save->'count')='number'
                    then (p_save->>'count')::numeric::int else old_count end;
  if not coalesce(p_force, false) and (new_count < old_count or new_count > old_count + 1) then
    raise exception 'bad_life_sequence' using errcode = '22023';
  end if;

  oldp := case when cur.save is not null then cur.save->'player' else null end;
  newp := case when p_save is not null then p_save->'player' else null end;
  if newp is not null and newp <> 'null'::jsonb then
    new_progress_ms := ((newp->>'months')::numeric::bigint * 10 + coalesce((newp->'idle'->>'mt')::numeric::bigint, 0)) * 1000;
  end if;

  if not coalesce(p_force, false)
     and new_count = old_count
     and oldp is not null and oldp <> 'null'::jsonb
     and newp is not null and newp <> 'null'::jsonb then
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
  set save = p_save,
      meta = p_meta,
      rev = new_rev,
      updated_at = now_ts,
      trusted_game_ms = case
        when coalesce(p_force,false) then greatest(cur.trusted_game_ms,new_progress_ms)
        else greatest(allowed_ms,new_progress_ms)
      end,
      trusted_game_at = now_ts
  where user_id = uid;

  return jsonb_build_object('rev',new_rev,'updated_at',now_ts);
end;
$$;

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
  if exists (
       select 1 from public.chat_messages
       where user_id = uid and created_at > clock_timestamp() - interval '2 seconds'
     )
     or (
       select count(*) from public.chat_messages
       where user_id = uid and created_at > clock_timestamp() - interval '1 minute'
     ) >= 10 then
    raise exception 'too_fast' using errcode = 'P0001';
  end if;

  select l.name into nm from public.leaderboard l where l.user_id = uid;
  insert into public.chat_messages(user_id, name, body)
  values(uid, coalesce(nm, 'Vô danh'), txt)
  returning * into rec;

  update public.system_housekeeping
  set last_run_at = clock_timestamp()
  where job = 'chat_prune'
    and last_run_at < clock_timestamp() - interval '1 hour'
  returning true into do_prune;

  if coalesce(do_prune, false) then
    delete from public.chat_messages
    where created_at < clock_timestamp() - interval '2 days';
  end if;

  return jsonb_build_object(
    'id', rec.id,
    'user_id', rec.user_id,
    'name', rec.name,
    'body', rec.body,
    'created_at', rec.created_at
  );
end;
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
  if p_realm_level is not null and (p_realm_level < 1 or p_realm_level > 81) then
    raise exception 'invalid_realm' using errcode = '22023';
  end if;

  insert into public.server_presence(user_id, session_id, last_seen_at, client_version, realm_level)
  values(uid, p_session_id, now_ts, left(coalesce(p_client_version,''),40), p_realm_level)
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

create or replace function public.game_clock()
returns bigint
language sql
volatile
security definer
set search_path = ''
as $$
  select floor(extract(epoch from clock_timestamp()) * 1000)::bigint
$$;

create or replace function public.server_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'maintenance', c.maintenance_mode,
    'maintenance_reason', coalesce(c.maintenance_reason, ''),
    'banner', (
      select jsonb_build_object(
        'id', b.id,
        'title', b.title,
        'body', b.body,
        'level', b.level,
        'starts_at', b.starts_at,
        'ends_at', b.ends_at
      )
      from public.server_banners b
      where b.active
        and b.starts_at <= now()
        and (b.ends_at is null or b.ends_at > now())
      order by b.starts_at desc, b.id desc
      limit 1
    )
  )
  from public.server_control c
  where c.singleton = true
$$;

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  delete from auth.users where id = uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------

create or replace function public.admin_me()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r text;
begin
  r := private.require_admin('viewer');
  return jsonb_build_object(
    'user_id', auth.uid(),
    'email', coalesce(auth.jwt()->>'email',''),
    'role', r
  );
end;
$$;

create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  perform private.require_admin('viewer');
  select jsonb_build_object(
    'online_now', (select count(*) from public.server_presence where last_seen_at > now() - interval '90 seconds'),
    'active_24h', (select count(*) from public.server_presence where last_seen_at > now() - interval '24 hours'),
    'registered', (select count(*) from auth.users),
    'chat_1h', (select count(*) from public.chat_messages where created_at > now() - interval '1 hour'),
    'maintenance', (select maintenance_mode from public.server_control where singleton),
    'active_banner', (select count(*) from public.server_banners where active and starts_at <= now() and (ends_at is null or ends_at > now()))
  ) into result;
  return result;
end;
$$;

create or replace function public.admin_search_players(
  p_query text default '',
  p_status text default 'all',
  p_limit integer default 50
)
returns table(
  user_id uuid,
  name text,
  level integer,
  months integer,
  last_seen_at timestamptz,
  online boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin('viewer');
  return query
  select l.user_id,
         l.name,
         l.level,
         l.months,
         p.last_seen_at,
         coalesce(p.last_seen_at > now() - interval '90 seconds', false) as online
  from public.leaderboard l
  left join public.server_presence p on p.user_id = l.user_id
  where (coalesce(p_query,'') = '' or l.name ilike '%' || p_query || '%' or l.user_id::text ilike '%' || p_query || '%')
    and (
      p_status = 'all'
      or (p_status = 'online' and p.last_seen_at > now() - interval '90 seconds')
      or (p_status = 'offline' and (p.last_seen_at is null or p.last_seen_at <= now() - interval '90 seconds'))
    )
  order by p.last_seen_at desc nulls last, l.level desc, l.months asc
  limit greatest(1, least(coalesce(p_limit,50),100));
end;
$$;

create or replace function public.admin_list_chat(p_limit integer default 100)
returns table(
  id bigint,
  user_id uuid,
  name text,
  body text,
  created_at timestamptz,
  is_admin boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin('viewer');
  return query
  select c.id, c.user_id, c.name, c.body, c.created_at, c.is_admin
  from public.chat_messages c
  order by c.id desc
  limit greatest(1, least(coalesce(p_limit,100),300));
end;
$$;

create or replace function public.admin_list_audit(p_limit integer default 100)
returns table(
  id bigint,
  admin_user_id uuid,
  action text,
  target_type text,
  target_id text,
  reason text,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin('viewer');
  return query
  select a.id, a.admin_user_id, a.action, a.target_type, a.target_id, a.reason, a.metadata, a.created_at
  from public.admin_audit_log a
  order by a.id desc
  limit greatest(1, least(coalesce(p_limit,100),500));
end;
$$;

create or replace function public.admin_send_message(p_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  txt text;
  rec public.chat_messages%rowtype;
begin
  perform private.require_admin('moderator');
  txt := btrim(regexp_replace(regexp_replace(coalesce(p_body,''), '[[:cntrl:]]', ' ', 'g'), '\s+', ' ', 'g'));
  if txt = '' or char_length(txt) > 200 then raise exception 'invalid_body' using errcode = '22023'; end if;

  insert into public.chat_messages(user_id, name, body)
  values(auth.uid(), '[ADMIN]', txt)
  returning * into rec;

  perform private.admin_audit('CHAT_ADMIN_SEND','chat',rec.id::text,null,jsonb_build_object('body',txt));
  return jsonb_build_object('id',rec.id,'name',rec.name,'body',rec.body,'created_at',rec.created_at);
end;
$$;

create or replace function public.admin_delete_chat(
  p_message_id bigint,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin('moderator');
  if p_message_id is null then raise exception 'invalid_message_id' using errcode = '22023'; end if;
  delete from public.chat_messages where id = p_message_id;
  perform private.admin_audit('CHAT_DELETE','chat',p_message_id::text,left(coalesce(p_reason,''),200),'{}'::jsonb);
end;
$$;

create or replace function public.admin_publish_banner(
  p_title text,
  p_body text,
  p_level text default 'info',
  p_starts_at timestamptz default now(),
  p_ends_at timestamptz default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  bid bigint;
  ttl text := btrim(coalesce(p_title,''));
  txt text := btrim(coalesce(p_body,''));
begin
  perform private.require_admin('admin');
  if char_length(ttl) < 1 or char_length(ttl) > 80 or char_length(txt) < 1 or char_length(txt) > 500 then
    raise exception 'invalid_banner' using errcode = '22023';
  end if;
  if p_level not in ('info','warning','critical') then raise exception 'invalid_level' using errcode = '22023'; end if;
  if p_ends_at is not null and p_ends_at <= coalesce(p_starts_at,now()) then raise exception 'invalid_expiry' using errcode = '22023'; end if;

  insert into public.server_banners(title,body,level,starts_at,ends_at,active,created_by)
  values(ttl,txt,p_level,coalesce(p_starts_at,now()),p_ends_at,true,auth.uid())
  returning id into bid;

  perform private.admin_audit('BANNER_PUBLISH','server_banner',bid::text,null,jsonb_build_object('level',p_level));
  return bid;
end;
$$;

create or replace function public.admin_set_maintenance(
  p_enabled boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin('admin');
  update public.server_control
  set maintenance_mode = coalesce(p_enabled,false),
      maintenance_reason = left(coalesce(p_reason,''),500),
      updated_by = auth.uid(),
      updated_at = now()
  where singleton;

  perform private.admin_audit(
    'MAINTENANCE_SET',
    'server',
    'maintenance',
    left(coalesce(p_reason,''),200),
    jsonb_build_object('enabled',coalesce(p_enabled,false))
  );
  return public.server_status();
end;
$$;

-- ---------------------------------------------------------------------------
-- Function permissions
-- ---------------------------------------------------------------------------

revoke all on function public.lb_min_months(integer) from public, anon, authenticated;
revoke all on function public.lb_best_months(jsonb,integer) from public, anon, authenticated;
revoke all on function public.player_plausible(jsonb) from public, anon, authenticated;
revoke all on function public.lb_sync() from public, anon, authenticated;
revoke all on function private.admin_rank(text) from public, anon, authenticated;
revoke all on function private.safe_name(text) from public, anon, authenticated;
revoke all on function private.current_admin_role() from public, anon, authenticated;
revoke all on function private.require_admin(text) from public, anon, authenticated;
revoke all on function private.admin_audit(text,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function private.maintenance_active() from public, anon, authenticated;
revoke all on function private.leaderboard_name() from public, anon, authenticated;
revoke all on function private.chat_stamp() from public, anon, authenticated;

revoke all on function public.save_game(jsonb,jsonb,bigint,boolean) from public, anon, authenticated;
revoke all on function public.send_chat(text) from public, anon, authenticated;
revoke all on function public.heartbeat_presence(uuid,text,integer) from public, anon, authenticated;
revoke all on function public.game_clock() from public, anon, authenticated;
revoke all on function public.server_status() from public, anon, authenticated;
revoke all on function public.delete_account() from public, anon, authenticated;
revoke all on function public.admin_me() from public, anon, authenticated;
revoke all on function public.admin_overview() from public, anon, authenticated;
revoke all on function public.admin_search_players(text,text,integer) from public, anon, authenticated;
revoke all on function public.admin_list_chat(integer) from public, anon, authenticated;
revoke all on function public.admin_list_audit(integer) from public, anon, authenticated;
revoke all on function public.admin_send_message(text) from public, anon, authenticated;
revoke all on function public.admin_delete_chat(bigint,text) from public, anon, authenticated;
revoke all on function public.admin_publish_banner(text,text,text,timestamptz,timestamptz) from public, anon, authenticated;
revoke all on function public.admin_set_maintenance(boolean,text) from public, anon, authenticated;

grant execute on function public.save_game(jsonb,jsonb,bigint,boolean) to authenticated;
grant execute on function public.send_chat(text) to authenticated;
grant execute on function public.heartbeat_presence(uuid,text,integer) to authenticated;
grant execute on function public.game_clock() to authenticated;
grant execute on function public.server_status() to anon, authenticated;
grant execute on function public.delete_account() to authenticated;
grant execute on function public.admin_me() to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_search_players(text,text,integer) to authenticated;
grant execute on function public.admin_list_chat(integer) to authenticated;
grant execute on function public.admin_list_audit(integer) to authenticated;
grant execute on function public.admin_send_message(text) to authenticated;
grant execute on function public.admin_delete_chat(bigint,text) to authenticated;
grant execute on function public.admin_publish_banner(text,text,text,timestamptz,timestamptz) to authenticated;
grant execute on function public.admin_set_maintenance(boolean,text) to authenticated;
