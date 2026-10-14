-- Gameplay save RPCs and account deletion.

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
