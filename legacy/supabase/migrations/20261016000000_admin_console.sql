-- Thiên Vân Đại Lục - Admin Console foundation
-- RBAC + presence + banner/maintenance + audited admin RPCs.
-- Browser clients use the public anon key only. NEVER expose service_role.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('viewer','moderator','admin','owner')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_time_idx on public.admin_audit_log(created_at desc);
create index if not exists admin_audit_admin_idx on public.admin_audit_log(admin_user_id, created_at desc);

create table if not exists public.server_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session_id uuid not null,
  last_seen_at timestamptz not null default now(),
  client_version text,
  realm_level integer,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists server_presence_seen_idx on public.server_presence(last_seen_at desc);

create table if not exists public.server_banners (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 500),
  level text not null default 'info' check (level in ('info','warning','critical')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists server_banners_active_idx on public.server_banners(active, starts_at desc, ends_at);

create table if not exists public.server_control (
  singleton boolean primary key default true check (singleton),
  maintenance_mode boolean not null default false,
  maintenance_reason text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.server_control(singleton) values(true) on conflict do nothing;

create table if not exists public.player_moderation (
  user_id uuid primary key references auth.users(id) on delete cascade,
  chat_muted_until timestamptz,
  account_locked boolean not null default false,
  lock_reason text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.economy_ledger (
  id bigint generated always as identity primary key,
  tx_type text not null check (tx_type in ('trade','auction','auction_fee','system_grant','system_sink')),
  from_user_id uuid references auth.users(id) on delete set null,
  to_user_id uuid references auth.users(id) on delete set null,
  asset_type text not null,
  asset_id text,
  quantity numeric not null default 1 check (quantity > 0),
  currency_amount bigint not null default 0 check (currency_amount >= 0),
  reference_type text,
  reference_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists economy_ledger_from_idx on public.economy_ledger(from_user_id, created_at desc);
create index if not exists economy_ledger_to_idx on public.economy_ledger(to_user_id, created_at desc);
create index if not exists economy_ledger_time_idx on public.economy_ledger(created_at desc);

alter table public.admin_users enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.server_presence enable row level security;
alter table public.server_banners enable row level security;
alter table public.server_control enable row level security;
alter table public.player_moderation enable row level security;
alter table public.economy_ledger enable row level security;

alter table public.admin_users force row level security;
alter table public.admin_audit_log force row level security;
alter table public.server_presence force row level security;
alter table public.server_banners force row level security;
alter table public.server_control force row level security;
alter table public.player_moderation force row level security;
alter table public.economy_ledger force row level security;

revoke all on table public.admin_users, public.admin_audit_log, public.server_presence,
  public.server_banners, public.server_control, public.player_moderation, public.economy_ledger
  from anon, authenticated;

create or replace function private.admin_rank(p_role text)
returns integer
language sql
immutable
as $$
  select case p_role when 'viewer' then 1 when 'moderator' then 2 when 'admin' then 3 when 'owner' then 4 else 0 end
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
volatile
security definer
set search_path = ''
as $$
  insert into public.admin_audit_log(admin_user_id, action, target_type, target_id, reason, metadata)
  values ((select auth.uid()), p_action, p_target_type, p_target_id, p_reason, coalesce(p_metadata, '{}'::jsonb))
$$;

-- Safe endpoint for the game/login screen. No admin data is returned.
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
      select jsonb_build_object('id', b.id, 'title', b.title, 'body', b.body, 'level', b.level, 'starts_at', b.starts_at, 'ends_at', b.ends_at)
      from public.server_banners b
      where b.active and b.starts_at <= now() and (b.ends_at is null or b.ends_at > now())
      order by b.starts_at desc, b.id desc
      limit 1
    )
  )
  from public.server_control c
  where c.singleton = true
$$;

-- Authenticated game client heartbeat. The caller can update only its own presence row.
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
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_session_id is null then raise exception 'invalid_session' using errcode = '22023'; end if;
  if p_realm_level is not null and (p_realm_level < 0 or p_realm_level > 50) then
    raise exception 'invalid_realm' using errcode = '22023';
  end if;
  insert into public.server_presence(user_id, session_id, last_seen_at, client_version, realm_level)
  values(uid, p_session_id, now(), left(coalesce(p_client_version,''), 40), p_realm_level)
  on conflict(user_id) do update set
    session_id = excluded.session_id,
    last_seen_at = excluded.last_seen_at,
    client_version = excluded.client_version,
    realm_level = excluded.realm_level;
end;
$$;

create or replace function public.admin_me()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare r text;
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
returns table(user_id uuid, name text, level integer, months bigint, last_seen_at timestamptz, online boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin('viewer');
  return query
  select l.user_id, l.name, l.level, l.months, p.last_seen_at,
         coalesce(p.last_seen_at > now() - interval '90 seconds', false) as online
  from public.leaderboard l
  left join public.server_presence p on p.user_id = l.user_id
  where (coalesce(p_query,'') = '' or l.name ilike '%' || p_query || '%' or l.user_id::text ilike '%' || p_query || '%')
    and (p_status = 'all' or (p_status = 'online' and p.last_seen_at > now() - interval '90 seconds') or (p_status = 'offline' and (p.last_seen_at is null or p.last_seen_at <= now() - interval '90 seconds')))
  order by p.last_seen_at desc nulls last, l.level desc, l.months asc
  limit greatest(1, least(coalesce(p_limit,50), 100));
end;
$$;

create or replace function public.admin_list_chat(p_limit integer default 100)
returns table(id bigint, user_id uuid, name text, body text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin('viewer');
  return query
  select c.id, c.user_id, c.name, c.body, c.created_at
  from public.chat_messages c
  order by c.id desc
  limit greatest(1, least(coalesce(p_limit,100), 300));
end;
$$;

create or replace function public.admin_send_message(p_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare txt text; rec public.chat_messages%rowtype;
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

create or replace function public.admin_delete_chat(p_message_id bigint, p_reason text default null)
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
declare bid bigint; ttl text := btrim(coalesce(p_title,'')); txt text := btrim(coalesce(p_body,''));
begin
  perform private.require_admin('admin');
  if char_length(ttl) < 1 or char_length(ttl) > 80 or char_length(txt) < 1 or char_length(txt) > 500 then
    raise exception 'invalid_banner' using errcode = '22023';
  end if;
  if p_level not in ('info','warning','critical') then raise exception 'invalid_level' using errcode = '22023'; end if;
  if p_ends_at is not null and p_ends_at <= coalesce(p_starts_at,now()) then raise exception 'invalid_expiry' using errcode = '22023'; end if;
  insert into public.server_banners(title,body,level,starts_at,ends_at,active,created_by)
  values(ttl,txt,p_level,coalesce(p_starts_at,now()),p_ends_at,true,auth.uid()) returning id into bid;
  perform private.admin_audit('BANNER_PUBLISH','server_banner',bid::text,null,jsonb_build_object('level',p_level));
  return bid;
end;
$$;

create or replace function public.admin_set_maintenance(p_enabled boolean, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin('admin');
  update public.server_control set
    maintenance_mode = coalesce(p_enabled,false),
    maintenance_reason = left(coalesce(p_reason,''),500),
    updated_by = auth.uid(),
    updated_at = now()
  where singleton;
  perform private.admin_audit('MAINTENANCE_SET','server','maintenance',left(coalesce(p_reason,''),200),jsonb_build_object('enabled',coalesce(p_enabled,false)));
  return public.server_status();
end;
$$;

create or replace function public.admin_list_audit(p_limit integer default 100)
returns table(id bigint, admin_user_id uuid, action text, target_type text, target_id text, reason text, metadata jsonb, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin('viewer');
  return query
  select a.id,a.admin_user_id,a.action,a.target_type,a.target_id,a.reason,a.metadata,a.created_at
  from public.admin_audit_log a
  order by a.id desc
  limit greatest(1, least(coalesce(p_limit,100), 500));
end;
$$;

revoke all on function public.server_status() from public;
grant execute on function public.server_status() to anon, authenticated;

revoke all on function public.heartbeat_presence(uuid,text,integer) from public, anon, authenticated;
grant execute on function public.heartbeat_presence(uuid,text,integer) to authenticated;

revoke all on function public.admin_me() from public, anon, authenticated;
revoke all on function public.admin_overview() from public, anon, authenticated;
revoke all on function public.admin_search_players(text,text,integer) from public, anon, authenticated;
revoke all on function public.admin_list_chat(integer) from public, anon, authenticated;
revoke all on function public.admin_send_message(text) from public, anon, authenticated;
revoke all on function public.admin_delete_chat(bigint,text) from public, anon, authenticated;
revoke all on function public.admin_publish_banner(text,text,text,timestamptz,timestamptz) from public, anon, authenticated;
revoke all on function public.admin_set_maintenance(boolean,text) from public, anon, authenticated;
revoke all on function public.admin_list_audit(integer) from public, anon, authenticated;

grant execute on function public.admin_me() to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_search_players(text,text,integer) to authenticated;
grant execute on function public.admin_list_chat(integer) to authenticated;
grant execute on function public.admin_send_message(text) to authenticated;
grant execute on function public.admin_delete_chat(bigint,text) to authenticated;
grant execute on function public.admin_publish_banner(text,text,text,timestamptz,timestamptz) to authenticated;
grant execute on function public.admin_set_maintenance(boolean,text) to authenticated;
grant execute on function public.admin_list_audit(integer) to authenticated;

-- Bootstrap the first owner manually in Supabase SQL Editor after this migration:
-- insert into public.admin_users(user_id, role) values ('<AUTH_USER_UUID>', 'owner');
