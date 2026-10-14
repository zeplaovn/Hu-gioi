-- Leaderboard projection and player plausibility helpers.

create table public.leaderboard (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 24),
  level integer not null check (level between 1 and 81),
  months integer not null check (months >= 0),
  updated_at timestamptz not null default now()
);

create or replace function public.lb_min_months(lv integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select (array[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,2,2,3,3,4,4,5,6,8,9,10,12,13,15,17,19,22,25,28,32,36,39,43,47,51,57,63,69,76,82,89,96,104,111,121,131,141,151,162,173,185,197,209,224,239,254,271,287,305,322,341,360,381,402,424,447,470,495,520,546,573])[lv]
$$;

create or replace function public.lb_best_months(meta jsonb, best integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select greatest(
    public.lb_min_months(best),
    coalesce((
      select max(case when (e ->> 'age') ~ '^[0-9]{1,5}$' then (e ->> 'age')::int end)
      from jsonb_array_elements(
        case when jsonb_typeof(meta -> 'history') = 'array' then meta -> 'history' else '[]'::jsonb end
      ) e
    ), 20) * 12 - 240
  )
$$;

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

  realm := (p->>'realm')::numeric;
  tang := (p->>'tang')::numeric;
  months := (p->>'months')::numeric;
  age := (p->>'age')::numeric;
  life := (p->>'lifespan')::numeric;
  if realm not between 0 and 8 or tang not between 1 and 9 or months not between 0 and 1000000
     or age not between 1 and 20000 or life not between 1 and 20000 then return false; end if;

  lv := realm * 9 + tang;
  if months < greatest(realm * 9 + tang - 1, public.lb_min_months(lv)) then return false; end if;

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

create or replace function public.lb_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p jsonb := new.save -> 'player';
  oldp jsonb;
  lv int; mo int; nm text; best int; bmo int;
  old_lv int; old_mo int; old_nm text; old_best text;
begin
  if tg_op = 'UPDATE' then
    oldp := old.save -> 'player';
    if p is not distinct from oldp and new.meta is not distinct from old.meta then return new; end if;

    if p is not null and jsonb_typeof(p) = 'object' then
      lv := coalesce((p ->> 'realm')::numeric::int, 0) * 9 + coalesce((p ->> 'tang')::numeric::int, 0);
      mo := coalesce((p ->> 'months')::numeric::int, 0);
      nm := private.safe_name(p ->> 'name');
    else
      lv := 0; mo := 0; nm := '';
    end if;

    if oldp is not null and jsonb_typeof(oldp) = 'object' then
      old_lv := coalesce((oldp ->> 'realm')::numeric::int, 0) * 9 + coalesce((oldp ->> 'tang')::numeric::int, 0);
      old_mo := coalesce((oldp ->> 'months')::numeric::int, 0);
      old_nm := private.safe_name(oldp ->> 'name');
    else
      old_lv := 0; old_mo := 0; old_nm := '';
    end if;

    old_best := coalesce(old.meta ->> 'best','');
    if lv = old_lv and mo = old_mo and nm = old_nm
       and coalesce(new.meta ->> 'best','') = old_best
       and coalesce(new.meta -> 'history','[]'::jsonb) is not distinct from coalesce(old.meta -> 'history','[]'::jsonb) then
      return new;
    end if;
  end if;

  if p is not null and jsonb_typeof(p) = 'object' and coalesce(public.player_plausible(p), false)
     and jsonb_typeof(p -> 'name') is not distinct from 'string' then
    lv := (p ->> 'realm')::numeric::int * 9 + (p ->> 'tang')::numeric::int;
    mo := (p ->> 'months')::numeric::int;
    if lv between 1 and 81 and mo >= public.lb_min_months(lv) then
      nm := private.safe_name(p ->> 'name');
      insert into public.leaderboard(user_id, name, level, months, updated_at)
      values (new.user_id, nm, lv, mo, clock_timestamp())
      on conflict (user_id) do update
        set name = excluded.name,
            level = excluded.level,
            months = excluded.months,
            updated_at = case
              when excluded.level > public.leaderboard.level or excluded.months < public.leaderboard.months then clock_timestamp()
              else public.leaderboard.updated_at
            end
        where excluded.level > public.leaderboard.level
           or (excluded.level = public.leaderboard.level and excluded.months <= public.leaderboard.months)
           or excluded.name is distinct from public.leaderboard.name;
    end if;
  end if;

  if jsonb_typeof(new.meta) = 'object' and (new.meta ->> 'best') ~ '^[0-9]{1,3}$' then
    best := least(81, (new.meta ->> 'best')::int);
    if best >= 1 then
      bmo := public.lb_best_months(new.meta, best);
      update public.leaderboard
      set level = best, months = bmo, updated_at = clock_timestamp()
      where user_id = new.user_id and (best > level or (best = level and bmo < months));
    end if;
  end if;

  return new;
end;
$$;

create trigger leaderboard_safe_name
before insert or update of name on public.leaderboard
for each row execute function private.leaderboard_name();

create trigger player_saves_leaderboard
after insert or update of save, meta on public.player_saves
for each row execute function public.lb_sync();
