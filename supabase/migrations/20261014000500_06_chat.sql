-- World chat, admin badge stamping, throttling and lightweight housekeeping.

create table public.chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 24),
  body text not null check (char_length(body) between 1 and 200),
  created_at timestamptz not null default now(),
  is_admin boolean not null default false
);

create table public.system_housekeeping (
  job text primary key,
  last_run_at timestamptz not null default to_timestamp(0)
);

insert into public.system_housekeeping(job, last_run_at) values ('chat_prune', to_timestamp(0));

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

create trigger chat_messages_stamp
before insert on public.chat_messages
for each row execute function private.chat_stamp();

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
    delete from public.chat_messages where created_at < clock_timestamp() - interval '2 days';
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
