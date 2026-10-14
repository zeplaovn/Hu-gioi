-- Admin chat identity + anti-impersonation.
--
-- This migration is intentionally kept as one coherent change:
--   1. Stamp admin messages server-side.
--   2. Sanitize player display names.
--   3. Make the admin chat RPC return the is_admin flag.

alter table public.chat_messages
  add column if not exists is_admin boolean not null default false;

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
    if new.name = '[ADMIN]' then
      new.name := 'Thiên Đạo';
    end if;
  else
    new.name := private.safe_name(new.name);
  end if;

  return new;
end;
$$;

revoke all on function private.chat_stamp() from public, anon, authenticated;

drop trigger if exists chat_messages_stamp on public.chat_messages;
create trigger chat_messages_stamp
before insert on public.chat_messages
for each row execute function private.chat_stamp();

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

revoke all on function private.leaderboard_name() from public, anon, authenticated;

drop trigger if exists leaderboard_safe_name on public.leaderboard;
create trigger leaderboard_safe_name
before insert or update of name on public.leaderboard
for each row execute function private.leaderboard_name();

-- Normalize existing rows once.
update public.leaderboard
set name = private.safe_name(name)
where name is distinct from private.safe_name(name);

update public.chat_messages c
set is_admin = true,
    name = case when c.name = '[ADMIN]' then 'Thiên Đạo' else c.name end
where c.name = '[ADMIN]'
   or exists (
     select 1
     from public.admin_users a
     where a.user_id = c.user_id
       and a.enabled
       and private.admin_rank(a.role) >= 2
   );

update public.chat_messages
set name = private.safe_name(name)
where not is_admin
  and name is distinct from private.safe_name(name);

-- Dashboard chat includes server-stamped admin identity.
drop function if exists public.admin_list_chat(integer);
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
  limit greatest(1, least(coalesce(p_limit, 100), 300));
end;
$$;

revoke all on function public.admin_list_chat(integer) from public, anon, authenticated;
grant execute on function public.admin_list_chat(integer) to authenticated;
