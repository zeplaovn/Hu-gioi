-- Bảng xếp hạng: mỗi tài khoản một dòng, giữ thành tích TỐT NHẤT (cấp cao nhất, bằng cấp thì ít tháng tu hơn).
-- Dữ liệu lấy tự động từ save của người chơi mỗi khi save_game() ghi (trigger bên dưới); client không ghi trực tiếp được.
-- Giới hạn thật: máy chủ không kiểm tra được luật chơi, chỉ loại các giá trị vô lý (cận dưới số tháng tu theo cấp, sinh từ
-- tools/gen_leaderboard_bounds.mjs). Người cố tình gian lận vẫn có thể giả một nhân vật "hợp lý", nên đây là bảng vui, không có thưởng.

create table if not exists public.leaderboard (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  name       text   not null check (char_length(name) between 1 and 24),
  level      int    not null check (level between 1 and 81),   -- cảnh giới * 9 + tầng
  months     int    not null check (months >= 0),
  updated_at timestamptz not null default now()
);
create index if not exists leaderboard_rank_idx on public.leaderboard (level desc, months asc, updated_at asc);

alter table public.leaderboard enable row level security;
alter table public.leaderboard force row level security;
drop policy if exists "leaderboard_read_all" on public.leaderboard;
create policy "leaderboard_read_all" on public.leaderboard for select to authenticated using (true);
revoke all on table public.leaderboard from anon, authenticated;
grant select on table public.leaderboard to authenticated;

-- Số tháng tu luyện tối thiểu để đạt cấp L (L = 1..81). Tạo bởi tools/gen_leaderboard_bounds.mjs.
create or replace function public.lb_min_months(lv int)
returns int language sql immutable set search_path = '' as $$
  select (array[0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 4, 5, 6, 8, 10, 12, 14, 17, 22, 26, 31, 37, 44, 51, 60, 70, 81, 99, 117, 136, 155, 175, 196, 218, 243, 272, 317, 364, 413, 463, 514, 567, 622, 679, 737, 821, 907, 997, 1089, 1184, 1282, 1384, 1488, 1597, 1732, 1872, 2017, 2167, 2321, 2481, 2646, 2816, 2993, 3202, 3418, 3641, 3872, 4111, 4358, 4613, 4877, 5149, 5444, 5748, 6062, 6387, 6724, 7071, 7431, 7802, 8187])[lv]
$$;
revoke all on function public.lb_min_months(int) from public, anon, authenticated;

create or replace function public.lb_sync()
returns trigger language plpgsql security definer set search_path = '' as $$
declare p jsonb := new.save -> 'player'; lv int; mo int; nm text;
begin
  if p is null or jsonb_typeof(p) <> 'object' or not coalesce(public.player_plausible(p), false) then return new; end if;
  if jsonb_typeof(p -> 'name') is distinct from 'string' then return new; end if;
  lv := (p ->> 'realm')::numeric::int * 9 + (p ->> 'tang')::numeric::int;
  mo := (p ->> 'months')::numeric::int;
  if lv < 1 or lv > 81 or mo < public.lb_min_months(lv) then return new; end if;
  nm := left(btrim(regexp_replace(p ->> 'name', '[[:cntrl:]]', '', 'g')), 24);
  if nm = '' then nm := 'Vô danh'; end if;
  insert into public.leaderboard (user_id, name, level, months, updated_at) values (new.user_id, nm, lv, mo, now())
  on conflict (user_id) do update
    set name = excluded.name, level = excluded.level, months = excluded.months,
        updated_at = case when excluded.level > public.leaderboard.level or excluded.months < public.leaderboard.months then now() else public.leaderboard.updated_at end
    where excluded.level > public.leaderboard.level
       or (excluded.level = public.leaderboard.level and excluded.months <= public.leaderboard.months);   -- bằng thành tích: chỉ cập nhật tên
  return new;
end $$;
revoke all on function public.lb_sync() from public, anon, authenticated;

drop trigger if exists player_saves_leaderboard on public.player_saves;
create trigger player_saves_leaderboard after insert or update of save on public.player_saves
  for each row execute function public.lb_sync();

-- Điền bảng từ các save đã có (kích hoạt trigger một lần).
update public.player_saves set save = save where save is not null;
