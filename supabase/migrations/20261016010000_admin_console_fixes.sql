-- Follow-up fixes for Admin Console foundation.
-- leaderboard.level/months are int and level ranges 1..81.

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
  if p_realm_level is not null and (p_realm_level < 1 or p_realm_level > 81) then
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

revoke all on function public.heartbeat_presence(uuid,text,integer) from public, anon, authenticated;
grant execute on function public.heartbeat_presence(uuid,text,integer) to authenticated;

drop function if exists public.admin_search_players(text,text,integer);
create function public.admin_search_players(
  p_query text default '',
  p_status text default 'all',
  p_limit integer default 50
)
returns table(user_id uuid, name text, level integer, months integer, last_seen_at timestamptz, online boolean)
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
    and (p_status = 'all'
      or (p_status = 'online' and p.last_seen_at > now() - interval '90 seconds')
      or (p_status = 'offline' and (p.last_seen_at is null or p.last_seen_at <= now() - interval '90 seconds')))
  order by p.last_seen_at desc nulls last, l.level desc, l.months asc
  limit greatest(1, least(coalesce(p_limit,50), 100));
end;
$$;

revoke all on function public.admin_search_players(text,text,integer) from public, anon, authenticated;
grant execute on function public.admin_search_players(text,text,integer) to authenticated;
