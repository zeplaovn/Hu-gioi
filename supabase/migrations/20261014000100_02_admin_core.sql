-- Admin identity, moderation, audit tables and private RBAC helpers.

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
