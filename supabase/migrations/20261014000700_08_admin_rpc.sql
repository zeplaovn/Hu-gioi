-- Admin Console RPCs. All authorization is enforced by private.require_admin().

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
