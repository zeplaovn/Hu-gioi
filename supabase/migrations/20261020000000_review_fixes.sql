-- Sửa các lỗi phát hiện khi rà soát bản dựng lại migration (14/10/2026). Migration mới, không sửa file đã apply.
--  1) Các khóa ngoại tới auth.users mất `on delete set null` khi gộp baseline: admin / người từng bật bảo trì, đăng banner, ghi audit
--     không xóa được tài khoản (delete_account và xóa user trong Supabase Auth đều lỗi khóa ngoại). Khôi phục như bản trước.
--  2) lb_sync: đổi tên nhân vật làm điều kiện upsert đúng nên một nhân vật thấp hơn (kiếp mới, tên mới) ghi đè cấp / số tháng tốt nhất trên bảng
--     xếp hạng. Giờ tên luôn được cập nhật nhưng cấp / số tháng chỉ thay khi tốt hơn.
--  3) heartbeat_presence: giới hạn ghi 60 giây trong khi client gửi mỗi 45 giây nên last_seen_at cách nhau tới 90 giây, đúng bằng ngưỡng
--     "online" (90 giây) của dashboard => người chơi nhấp nháy offline. Giảm giới hạn ghi xuống 30 giây.

alter table public.admin_audit_log drop constraint if exists admin_audit_log_admin_user_id_fkey;
alter table public.admin_audit_log add constraint admin_audit_log_admin_user_id_fkey foreign key (admin_user_id) references auth.users(id) on delete set null;
alter table public.player_moderation drop constraint if exists player_moderation_updated_by_fkey;
alter table public.player_moderation add constraint player_moderation_updated_by_fkey foreign key (updated_by) references auth.users(id) on delete set null;
alter table public.server_control drop constraint if exists server_control_updated_by_fkey;
alter table public.server_control add constraint server_control_updated_by_fkey foreign key (updated_by) references auth.users(id) on delete set null;
alter table public.server_banners drop constraint if exists server_banners_created_by_fkey;
alter table public.server_banners add constraint server_banners_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null;
alter table public.economy_ledger drop constraint if exists economy_ledger_from_user_id_fkey;
alter table public.economy_ledger add constraint economy_ledger_from_user_id_fkey foreign key (from_user_id) references auth.users(id) on delete set null;
alter table public.economy_ledger drop constraint if exists economy_ledger_to_user_id_fkey;
alter table public.economy_ledger add constraint economy_ledger_to_user_id_fkey foreign key (to_user_id) references auth.users(id) on delete set null;

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
  now_ts timestamptz := clock_timestamp();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_session_id is null then raise exception 'invalid_session' using errcode = '22023'; end if;
  if p_realm_level is not null and (p_realm_level < 1 or p_realm_level > 81) then
    raise exception 'invalid_realm' using errcode = '22023';
  end if;

  insert into public.server_presence(user_id, session_id, last_seen_at, client_version, realm_level)
  values(uid, p_session_id, now_ts, left(coalesce(p_client_version,''),40), p_realm_level)
  on conflict(user_id) do update set
    session_id = excluded.session_id,
    last_seen_at = excluded.last_seen_at,
    client_version = excluded.client_version,
    realm_level = excluded.realm_level
  where public.server_presence.session_id is distinct from excluded.session_id
     or public.server_presence.client_version is distinct from excluded.client_version
     or public.server_presence.realm_level is distinct from excluded.realm_level
     or public.server_presence.last_seen_at < now_ts - interval '30 seconds';
end;
$$;
