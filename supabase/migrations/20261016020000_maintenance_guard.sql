-- Maintenance guard: when maintenance_mode is enabled, player write RPCs are blocked.
-- Admin dashboard RPCs remain available so maintenance can be disabled again.

create or replace function private.maintenance_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select c.maintenance_mode from public.server_control c where c.singleton = true), false)
$$;

revoke all on function private.maintenance_active() from public, anon, authenticated;

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
  now_ts timestamptz := now();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if private.maintenance_active() then
    raise exception 'maintenance_mode' using errcode = 'P0001';
  end if;
  if p_meta is null or jsonb_typeof(p_meta) <> 'object' then
    raise exception 'bad_meta' using errcode = '22023';
  end if;
  if p_save is not null and jsonb_typeof(p_save) <> 'object' then
    raise exception 'bad_save' using errcode = '22023';
  end if;
  if octet_length(coalesce(p_save::text, '')) > 262144 or octet_length(p_meta::text) > 262144 then
    raise exception 'too_large' using errcode = 'P0001';
  end if;
  if p_save is not null and p_save ? 'player' and p_save->'player' <> 'null'::jsonb and not coalesce(public.player_plausible(p_save->'player'), false) then
    raise exception 'implausible' using errcode = '22023';
  end if;
  if p_rev is null or p_rev < 0 then
    raise exception 'bad_rev' using errcode = '22023';
  end if;

  select * into cur from public.player_saves where user_id = uid for update;

  if not found then
    if p_rev <> 0 and not coalesce(p_force, false) then
      raise exception 'conflict' using errcode = 'P0001';
    end if;
    insert into public.player_saves (user_id, save, meta, rev, updated_at)
    values (uid, p_save, p_meta, 1, now_ts);
    return jsonb_build_object('rev', 1, 'updated_at', now_ts);
  end if;

  if cur.rev <> p_rev and not coalesce(p_force, false) then
    raise exception 'conflict' using errcode = 'P0001';
  end if;
  if now_ts - cur.updated_at < interval '1 second' and not coalesce(p_force, false) then
    raise exception 'too_fast' using errcode = 'P0001';
  end if;

  new_rev := cur.rev + 1;
  update public.player_saves
     set save = p_save, meta = p_meta, rev = new_rev, updated_at = now_ts
   where user_id = uid;
  return jsonb_build_object('rev', new_rev, 'updated_at', now_ts);
end;
$$;

revoke all on function public.save_game(jsonb, jsonb, bigint, boolean) from public, anon, authenticated;
grant execute on function public.save_game(jsonb, jsonb, bigint, boolean) to authenticated;

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
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if private.maintenance_active() then
    raise exception 'maintenance_mode' using errcode = 'P0001';
  end if;
  txt := btrim(regexp_replace(regexp_replace(coalesce(p_body, ''), '[[:cntrl:]]', ' ', 'g'), '\s+', ' ', 'g'));
  if txt = '' then
    raise exception 'empty' using errcode = '22023';
  end if;
  if char_length(txt) > 200 then
    raise exception 'too_long' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  if exists (select 1 from public.chat_messages where user_id = uid and created_at > now() - interval '2 seconds')
     or (select count(*) from public.chat_messages where user_id = uid and created_at > now() - interval '1 minute') >= 10 then
    raise exception 'too_fast' using errcode = 'P0001';
  end if;

  select l.name into nm from public.leaderboard l where l.user_id = uid;
  insert into public.chat_messages (user_id, name, body) values (uid, coalesce(nm, 'Vô danh'), txt)
  returning * into rec;

  if random() < 0.05 then
    delete from public.chat_messages where created_at < now() - interval '2 days';
  end if;
  return jsonb_build_object('id', rec.id, 'user_id', rec.user_id, 'name', rec.name, 'body', rec.body, 'created_at', rec.created_at);
end;
$$;

revoke all on function public.send_chat(text) from public, anon, authenticated;
grant execute on function public.send_chat(text) to authenticated;
