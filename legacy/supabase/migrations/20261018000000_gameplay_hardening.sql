-- Hạ Giới gameplay hardening.
-- 1) Server clock for idle/offline timers (client wall clock is no longer trusted).
-- 2) Tighten obviously impossible player snapshots without breaking legacy saves.
-- 3) Reject same-life time/level rewinds and impossible month jumps.
-- 4) p_force is reserved for enabled admin/owner accounts.

create or replace function public.game_clock()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select floor(extract(epoch from clock_timestamp()) * 1000)::bigint
$$;
revoke all on function public.game_clock() from public, anon, authenticated;
grant execute on function public.game_clock() to authenticated;

create or replace function public.player_plausible(p jsonb)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  realm int; tang int; months numeric; age numeric; life numeric; lv int;
  stone numeric; xp numeric; k text; v numeric;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return false; end if;
  if jsonb_typeof(p->'realm') is distinct from 'number'
     or jsonb_typeof(p->'tang') is distinct from 'number'
     or jsonb_typeof(p->'months') is distinct from 'number'
     or jsonb_typeof(p->'age') is distinct from 'number'
     or jsonb_typeof(p->'lifespan') is distinct from 'number' then return false; end if;

  realm := (p->>'realm')::numeric; tang := (p->>'tang')::numeric; months := (p->>'months')::numeric;
  age := (p->>'age')::numeric; life := (p->>'lifespan')::numeric;
  if realm not between 0 and 8 or tang not between 1 and 9 or months not between 0 and 1000000
     or age not between 1 and 20000 or life not between 1 and 20000 then return false; end if;
  lv := realm * 9 + tang;
  if months < greatest(realm * 9 + tang - 1, public.lb_min_months(lv)) then return false; end if;

  -- Legacy fixtures/saves may omit optional fields, but when present they must be sane.
  if p ? 'stats' then
    if jsonb_typeof(p->'stats') <> 'object' then return false; end if;
    foreach k in array array['Tướng Mạo','Phúc Duyên','Căn Cốt','Ngộ Tính','Vận Khí'] loop
      if jsonb_typeof(p->'stats'->k) is distinct from 'number' then return false; end if;
      v := (p->'stats'->>k)::numeric;
      if v < 1 or v > 40 or trunc(v) <> v then return false; end if;
    end loop;
  end if;

  if p ? 'stone' then
    if jsonb_typeof(p->'stone') <> 'number' then return false; end if;
    stone := (p->>'stone')::numeric;
    if stone < 0 or stone > 500 + months * 500 then return false; end if;
  end if;
  if p ? 'exp' then
    if jsonb_typeof(p->'exp') <> 'number' then return false; end if;
    xp := (p->>'exp')::numeric;
    if xp < 0 or xp > 1000000000000000 then return false; end if;
  end if;
  if p ? 'race' and (p->>'race') not in ('Nhân','Ma','Yêu','Linh','Tiên Duệ','Thú') then return false; end if;

  if p ? 'skills' then
    if jsonb_typeof(p->'skills') <> 'array' then return false; end if;
    if exists (
      select 1 from jsonb_array_elements_text(p->'skills') s(name)
      where s.name not in (
        'Dưỡng Khí Quyết','Thanh Phong Kiếm Pháp','Kim Cang Thể','Huyền Thiên Chân Kinh','Cửu Thiên Lôi Pháp',
        'Nguyên Thần Quyết','Hóa Thần Thiên Chương','Hư Không Đạo Điển','Đại Thừa Chân Kinh','Cửu Kiếp Bất Diệt Kinh'
      )
    ) then return false; end if;
  end if;
  return true;
exception when others then
  return false;
end;
$$;
revoke all on function public.player_plausible(jsonb) from public, anon, authenticated;

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
  old_months int; new_months int; old_lv int; new_lv int;
  elapsed numeric; effective numeric; allowed_months int;
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
    insert into public.player_saves (user_id, save, meta, rev, updated_at)
    values (uid, p_save, p_meta, 1, now_ts);
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
  if not coalesce(p_force, false) and new_count = old_count
     and oldp is not null and oldp <> 'null'::jsonb and newp is not null and newp <> 'null'::jsonb then
    old_months := (oldp->>'months')::numeric::int; new_months := (newp->>'months')::numeric::int;
    old_lv := (oldp->>'realm')::numeric::int * 9 + (oldp->>'tang')::numeric::int;
    new_lv := (newp->>'realm')::numeric::int * 9 + (newp->>'tang')::numeric::int;
    if new_months < old_months then raise exception 'time_reverse' using errcode = '22023'; end if;
    if new_lv < old_lv then raise exception 'level_reverse' using errcode = '22023'; end if;

    elapsed := greatest(0, extract(epoch from (now_ts - cur.updated_at)));
    effective := least(7200, case when elapsed <= 120 then elapsed else 120 + (elapsed - 120) * 0.5 end);
    allowed_months := floor(effective / 10)::int + 3;
    if new_months - old_months > allowed_months then
      raise exception 'time_jump' using errcode = '22023';
    end if;
  end if;

  new_rev := cur.rev + 1;
  update public.player_saves set save=p_save, meta=p_meta, rev=new_rev, updated_at=now_ts where user_id=uid;
  return jsonb_build_object('rev', new_rev, 'updated_at', now_ts);
end;
$$;
revoke all on function public.save_game(jsonb, jsonb, bigint, boolean) from public, anon, authenticated;
grant execute on function public.save_game(jsonb, jsonb, bigint, boolean) to authenticated;
