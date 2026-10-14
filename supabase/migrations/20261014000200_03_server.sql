-- Server control, announcements, presence and public server RPCs.

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

insert into public.server_control(singleton) values (true);

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
      where b.active and b.starts_at <= now() and (b.ends_at is null or b.ends_at > now())
      order by b.starts_at desc, b.id desc
      limit 1
    )
  )
  from public.server_control c
  where c.singleton = true
$$;
