-- Trusted game-time ledger.
-- Each account earns game-time credit from server elapsed time. Frequent save_game calls cannot
-- manufacture extra months because unused/used credit is tracked independently of updated_at.

alter table public.player_saves
  add column if not exists trusted_game_ticks bigint not null default 0,
  add column if not exists trusted_game_at timestamptz not null default now();

-- Initialize existing lives at their current legitimate progress point.
update public.player_saves
set trusted_game_ticks = greatest(0,
      coalesce((save->'player'->>'months')::numeric::bigint, 0) * 10
      + coalesce((save->'player'->'idle'->>'mt')::numeric::bigint, 0)),
    trusted_game_at = now()
where save is not null and jsonb_typeof(save) = 'object'
  and save->'player' is not null and save->'player' <> 'null'::jsonb;

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
  now_ts timestamptz := clock_timestamp();
  can_force boolean := false;
  oldp jsonb; newp jsonb;
  old_count int; new_count int;
  old_lv int; new_lv int;
  new_ticks bigint := 0; allowed_ticks bigint := 0;
  elapsed numeric := 0; effective numeric := 0;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if private.maintenance_active() then raise exception 'maintenance_mode' using errcode = 'P0001'; end if;

  select exists (
    select 1 from public.admin_users a
    where a.user_id = uid and a.enabled and private.admin_rank(a.role) >= 3
  ) into can_force;
  if coalesce(p_force, false) and not can_force then
    raise exception 'force_forbidden' using errcode = '42501';
  end if;

  if p_meta is null or jsonb_typeof(p_meta) <> 'object' then raise exception 'bad_meta' using errcode = '22023'; end if;
  if p_save is not null and jsonb_typeof(p_save) <> 'object' then raise exception 'bad_save' using errcode = '22023'; end if;
  if octet_length(coalesce(p_save::text, '')) > 262144 or octet_length(p_meta::text) > 262144 then
    raise exception 'too_large' using errcode = 'P0001';
  end if;
  if p_save is not null and p_save ? 'player' and p_save->'player' <> 'null'::jsonb
     and not coalesce(public.player_plausible(p_save->'player'), false) then
    raise exception 'implausible' using errcode = '22023';
  end if;
  if p_rev is null or p_rev < 0 then raise exception 'bad_rev' using errcode = '22023'; end if;

  select * into cur from public.player_saves where user_id = uid for update;
  if not found then
    if p_rev <> 0 and not coalesce(p_force, false) then raise exception 'conflict' using errcode = 'P0001'; end if;
    newp := case when p_save is not null then p_save->'player' else null end;
    if newp is not null and newp <> 'null'::jsonb then
      new_ticks := (newp->>'months')::numeric::bigint * 10
                   + coalesce((newp->'idle'->>'mt')::numeric::bigint, 0);
    end if;
    insert into public.player_saves (user_id, save, meta, rev, updated_at, trusted_game_ticks, trusted_game_at)
    values (uid, p_save, p_meta, 1, now_ts, greatest(0, new_ticks), now_ts);
    return jsonb_build_object('rev', 1, 'updated_at', now_ts);
  end if;

  if cur.rev <> p_rev and not coalesce(p_force, false) then raise exception 'conflict' using errcode = 'P0001'; end if;
  if now_ts - cur.updated_at < interval '250 milliseconds' and not coalesce(p_force, false) then
    raise exception 'too_fast' using errcode = 'P0001';
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
    new_ticks := (newp->>'months')::numeric::bigint * 10
                 + coalesce((newp->'idle'->>'mt')::numeric::bigint, 0);
  else
    new_ticks := 0;
  end if;

  if not coalesce(p_force, false) and new_count = old_count
     and oldp is not null and oldp <> 'null'::jsonb and newp is not null and newp <> 'null'::jsonb then
    old_lv := (oldp->>'realm')::numeric::int * 9 + (oldp->>'tang')::numeric::int;
    new_lv := (newp->>'realm')::numeric::int * 9 + (newp->>'tang')::numeric::int;
    if new_lv < old_lv then raise exception 'level_reverse' using errcode = '22023'; end if;

    elapsed := greatest(0, extract(epoch from (now_ts - cur.trusted_game_at)));
    effective := least(7200, case when elapsed <= 120 then elapsed else 120 + (elapsed - 120) * 0.5 end);
    allowed_ticks := cur.trusted_game_ticks + floor(effective)::bigint;
    if new_ticks > allowed_ticks then raise exception 'time_jump' using errcode = '22023'; end if;
  else
    -- New life / terminal state: old-life time credit never carries into the next incarnation.
    allowed_ticks := greatest(0, new_ticks);
  end if;

  new_rev := cur.rev + 1;
  update public.player_saves
     set save = p_save, meta = p_meta, rev = new_rev, updated_at = now_ts,
         trusted_game_ticks = case when coalesce(p_force, false) then greatest(cur.trusted_game_ticks, new_ticks)
                                   else greatest(allowed_ticks, new_ticks) end,
         trusted_game_at = now_ts
   where user_id = uid;
  return jsonb_build_object('rev', new_rev, 'updated_at', now_ts);
end;
$$;
revoke all on function public.save_game(jsonb, jsonb, bigint, boolean) from public, anon, authenticated;
grant execute on function public.save_game(jsonb, jsonb, bigint, boolean) to authenticated;
