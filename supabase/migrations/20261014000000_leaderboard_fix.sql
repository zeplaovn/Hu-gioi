-- Sửa bảng xếp hạng (phát hiện từ dữ liệu người chơi thật ngày 13/10/2026):
--  1) Cận dưới số tháng tu theo cấp quá chặt (giả định chỉ nhập định) nên người chơi thật bấm tay nhanh bị loại, bảng đứng yên ở cấp cũ.
--     Hiệu chỉnh lại: người phi thăng nhanh nhất mất ~1776 tháng, cận mới cho cấp 81 là ~570 tháng.
--  2) Thành tích tốt nhất của các kiếp trước (meta.best, là cấp 1..81) cũng được tính, kể cả khi bản lưu hiện tại không còn nhân vật
--     (đã phi thăng / tọa hóa), nên người vừa phi thăng không bị mất hạng.
create or replace function public.lb_min_months(lv int)
returns int language sql immutable set search_path = '' as $$
  select (array[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6, 8, 9, 10, 12, 13, 15, 17, 19, 22, 25, 28, 32, 36, 39, 43, 47, 51, 57, 63, 69, 76, 82, 89, 96, 104, 111, 121, 131, 141, 151, 162, 173, 185, 197, 209, 224, 239, 254, 271, 287, 305, 322, 341, 360, 381, 402, 424, 447, 470, 495, 520, 546, 573])[lv]
$$;
revoke all on function public.lb_min_months(int) from public, anon, authenticated;

-- Số tháng tu ước lượng của kiếp tốt nhất: tuổi lớn nhất trong lịch sử các kiếp (tuổi - 20) * 12, không thấp hơn cận của cấp đó.
create or replace function public.lb_best_months(meta jsonb, best int)
returns int language sql stable set search_path = '' as $$
  select greatest(public.lb_min_months(best),
    coalesce((select max(case when (e ->> 'age') ~ '^[0-9]{1,5}$' then (e ->> 'age')::int end)
              from jsonb_array_elements(case when jsonb_typeof(meta -> 'history') = 'array' then meta -> 'history' else '[]'::jsonb end) e), 20) * 12 - 240)
$$;
revoke all on function public.lb_best_months(jsonb, int) from public, anon, authenticated;

create or replace function public.lb_sync()
returns trigger language plpgsql security definer set search_path = '' as $$
declare p jsonb := new.save -> 'player'; lv int; mo int; nm text; best int; bmo int;
begin
  -- (a) nhân vật hiện tại
  if p is not null and jsonb_typeof(p) = 'object' and coalesce(public.player_plausible(p), false)
     and jsonb_typeof(p -> 'name') is not distinct from 'string' then
    lv := (p ->> 'realm')::numeric::int * 9 + (p ->> 'tang')::numeric::int;
    mo := (p ->> 'months')::numeric::int;
    if lv between 1 and 81 and mo >= public.lb_min_months(lv) then
      nm := left(btrim(regexp_replace(p ->> 'name', '[[:cntrl:]]', '', 'g')), 24);
      if nm = '' then nm := 'Vô danh'; end if;
      insert into public.leaderboard (user_id, name, level, months, updated_at) values (new.user_id, nm, lv, mo, now())
      on conflict (user_id) do update
        set name = excluded.name, level = excluded.level, months = excluded.months,
            updated_at = case when excluded.level > public.leaderboard.level or excluded.months < public.leaderboard.months then now() else public.leaderboard.updated_at end
        where excluded.level > public.leaderboard.level
           or (excluded.level = public.leaderboard.level and excluded.months <= public.leaderboard.months);
    end if;
  end if;
  -- (b) thành tích tốt nhất các kiếp trước: chỉ nâng dòng đã có (tên lấy từ dòng đó)
  if jsonb_typeof(new.meta) = 'object' and (new.meta ->> 'best') ~ '^[0-9]{1,3}$' then
    best := least(81, (new.meta ->> 'best')::int);
    if best >= 1 then
      bmo := public.lb_best_months(new.meta, best);
      update public.leaderboard
         set level = best, months = bmo, updated_at = now()
       where user_id = new.user_id and (best > level or (best = level and bmo < months));
    end if;
  end if;
  return new;
end $$;
revoke all on function public.lb_sync() from public, anon, authenticated;

drop trigger if exists player_saves_leaderboard on public.player_saves;
create trigger player_saves_leaderboard after insert or update of save, meta on public.player_saves
  for each row execute function public.lb_sync();

-- Điền lại bảng từ các bản lưu đã có (kích hoạt trigger một lần).
update public.player_saves set save = save where save is not null or meta <> '{}'::jsonb;
