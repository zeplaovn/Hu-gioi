-- Bảng xếp hạng: chặn đường nâng hạng bằng meta.best do client tự khai.
--
-- Lỗ hổng: lb_sync() nâng dòng bảng xếp hạng lên meta.best (cấp tốt nhất của các kiếp trước) mà không đối chiếu với thời gian thật.
-- save_game() chỉ kiểm tra kích thước và kiểu của p_meta, nên một tài khoản đang ở cấp 1 chỉ cần gửi p_meta = {"best": 81}
-- là lên cấp 81 (cận dưới ~573 tháng) và đứng đầu bảng, kể cả khi đã áp 20261020020000_save_game_time_bounds.sql.
--
-- Sửa: chỉ nhận meta.best khi cận dưới số tháng của cấp đó (lb_min_months) không vượt quá thời gian đã được sổ cái xác nhận
-- (trusted_game_ms / 10000 tháng) cộng dung sai 12 tháng cho khoảng giữa hai lần lưu trước khi nhân vật chết / phi thăng.
-- Người chơi thật không bị ảnh hưởng: cấp của kiếp vừa kết thúc đã được đồng bộ từ chính nhân vật đó mỗi lần lưu.
-- Giới hạn còn lại (có chủ ý, như SECURITY.md đã nêu): vẫn là chặn "không nhanh hơn thời gian thật", không xác thực luật chơi.
-- Migration mới, không sửa file đã apply. Áp sau 20261020000000_review_fixes.sql và 20261020020000_save_game_time_bounds.sql.

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
  credit_ms bigint := 0;
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
            level = case when excluded.level > public.leaderboard.level
                           or (excluded.level = public.leaderboard.level and excluded.months <= public.leaderboard.months)
                         then excluded.level else public.leaderboard.level end,
            months = case when excluded.level > public.leaderboard.level
                            or (excluded.level = public.leaderboard.level and excluded.months <= public.leaderboard.months)
                          then excluded.months else public.leaderboard.months end,
            updated_at = case when excluded.level > public.leaderboard.level
                                or (excluded.level = public.leaderboard.level and excluded.months < public.leaderboard.months)
                              then clock_timestamp() else public.leaderboard.updated_at end
        where excluded.level > public.leaderboard.level
           or (excluded.level = public.leaderboard.level and excluded.months <= public.leaderboard.months)
           or excluded.name is distinct from public.leaderboard.name;
    end if;
  end if;

  if jsonb_typeof(new.meta) = 'object' and (new.meta ->> 'best') ~ '^[0-9]{1,3}$' then
    best := least(81, (new.meta ->> 'best')::int);
    -- Số tháng tu luyện mà sổ cái thời gian của máy chủ đã xác nhận (1 tháng = 10 giây = 10000 ms). Lấy giá trị lớn hơn giữa trước và sau lần ghi
    -- này vì lần ghi kết thúc kiếp (chết / phi thăng) đặt sổ cái về 0, còn bản ghi cũ vẫn giữ tiến độ của nhân vật vừa mất.
    credit_ms := new.trusted_game_ms;
    if tg_op = 'UPDATE' then credit_ms := greatest(credit_ms, old.trusted_game_ms); end if;
    if best >= 1 and public.lb_min_months(best) <= credit_ms / 10000 + 12 then
      bmo := public.lb_best_months(new.meta, best);
      update public.leaderboard
      set level = best, months = bmo, updated_at = clock_timestamp()
      where user_id = new.user_id and (best > level or (best = level and bmo < months));
    end if;
  end if;

  return new;
end;
$$;
