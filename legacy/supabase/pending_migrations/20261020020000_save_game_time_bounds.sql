-- save_game: sửa hai lỗi của sổ cái thời gian (trusted game-time ledger, 20261018020000 / 20261018030000). Migration mới, không sửa file đã apply.
--
--  1) Lỗ hổng: giới hạn "tiến độ không vượt quá thời gian thật" chỉ áp dụng khi lưu tiếp một kiếp đang chơi. Ba đường còn lại KHÔNG bị chặn gì:
--       a) lần ghi đầu tiên của tài khoản (chưa có dòng player_saves),
--       b) kiếp mới sau khi chết / phi thăng (save cũ có player = null),
--       c) tăng count thêm 1 kèm nhân vật mới.
--     Vì vậy một tài khoản vừa tạo gọi thẳng RPC save_game với nhân vật cấp 81 (số tháng chỉ cần >= lb_min_months) là lên hạng nhất bảng xếp hạng.
--     Giờ ba đường này cũng bị chặn bằng chính công thức thời gian thật: lần ghi đầu tính từ lúc tạo tài khoản (auth.users.created_at),
--     kiếp mới tính từ lần ghi cuối của kiếp trước.
--
--  2) Khóa nhầm người chơi thật: client bù thời gian vắng mặt rồi tiếp tục cộng 1 giây / nhịp, và chỉ đẩy lên máy chủ sau PUSH_DELAY = 8 giây.
--     Máy chủ thì chỉ tính 50% cho phần thời gian vượt quá 120 giây kể từ lần ghi cuối, nên ở lần đẩy đầu tiên sau khi quay lại (vắng > 2 phút)
--     tiến độ của client luôn vượt mức cho phép 4–8 giây => 'time_jump', và mọi lần đẩy sau đó cũng bị từ chối cho tới khi tải lại trang.
--     Thêm dung sai cố định 30 giây. Dung sai KHÔNG cộng dồn: sổ cái chỉ lưu phần thời gian thật đã được cấp, không lưu phần dung sai đã dùng,
--     nên gọi save_game liên tục cũng không "đẻ" thêm thời gian (đây chính là lý do trước đây phải bỏ dung sai +3 tháng).
--
-- Giới hạn còn lại (có chủ ý, như SECURITY.md đã nêu): đây vẫn là chặn "không nhanh hơn thời gian thật", không phải xác thực luật chơi.

create or replace function private.trusted_credit_ms(p_elapsed_s numeric)
returns bigint
language sql
immutable
set search_path = ''
as $$
  -- Cùng công thức với client (TT.IDLE): 120 giây đầu tính đủ, sau đó 50%, tối đa 2 giờ.
  select floor(least(7200, case when greatest(0, p_elapsed_s) <= 120 then greatest(0, p_elapsed_s)
                                else 120 + (greatest(0, p_elapsed_s) - 120) * 0.5 end) * 1000)::bigint
$$;
revoke all on function private.trusted_credit_ms(numeric) from public, anon, authenticated;

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
  new_progress_ms bigint := 0; allowed_ms bigint := 0; ledger_ms bigint := 0; credit_ms bigint := 0;
  acct_created timestamptz;
  slack_ms constant bigint := 30000;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if private.maintenance_active() then raise exception 'maintenance_mode' using errcode = 'P0001'; end if;

  if coalesce(p_force, false) then
    select exists (select 1 from public.admin_users a where a.user_id = uid and a.enabled and private.admin_rank(a.role) >= 3) into can_force;
    if not can_force then raise exception 'force_forbidden' using errcode = '42501'; end if;
  end if;

  if p_meta is null or jsonb_typeof(p_meta) <> 'object' then raise exception 'bad_meta' using errcode = '22023'; end if;
  if p_save is not null and jsonb_typeof(p_save) <> 'object' then raise exception 'bad_save' using errcode = '22023'; end if;
  if octet_length(coalesce(p_save::text, '')) > 262144 or octet_length(p_meta::text) > 262144 then raise exception 'too_large' using errcode = 'P0001'; end if;
  if p_save is not null and p_save ? 'player' and p_save->'player' <> 'null'::jsonb and not coalesce(public.player_plausible(p_save->'player'), false) then raise exception 'implausible' using errcode = '22023'; end if;
  if p_rev is null or p_rev < 0 then raise exception 'bad_rev' using errcode = '22023'; end if;

  newp := case when p_save is not null then p_save->'player' else null end;
  if newp is not null and newp <> 'null'::jsonb then
    new_progress_ms := ((newp->>'months')::numeric::bigint * 10 + coalesce((newp->'idle'->>'mt')::numeric::bigint, 0)) * 1000;
  end if;

  select * into cur from public.player_saves where user_id = uid for update;
  if not found then
    if p_rev <> 0 and not coalesce(p_force, false) then raise exception 'conflict' using errcode = 'P0001'; end if;
    if coalesce(p_force, false) then
      ledger_ms := new_progress_ms;
    else
      -- Lần ghi đầu tiên: nhân vật không thể tu luyện lâu hơn tuổi tài khoản.
      select u.created_at into acct_created from auth.users u where u.id = uid;
      credit_ms := private.trusted_credit_ms(extract(epoch from (now_ts - coalesce(acct_created, now_ts))));
      if new_progress_ms > credit_ms + slack_ms then raise exception 'time_jump' using errcode = '22023'; end if;
      ledger_ms := least(new_progress_ms, credit_ms);
    end if;
    insert into public.player_saves(user_id, save, meta, rev, updated_at, trusted_game_ms, trusted_game_at)
    values (uid, p_save, p_meta, 1, now_ts, greatest(0, ledger_ms), now_ts);
    return jsonb_build_object('rev', 1, 'updated_at', now_ts);
  end if;

  if cur.rev <> p_rev and not coalesce(p_force, false) then raise exception 'conflict' using errcode = 'P0001'; end if;
  if now_ts - cur.updated_at < interval '250 milliseconds' and not coalesce(p_force, false) then raise exception 'too_fast' using errcode = 'P0001'; end if;

  if p_save is not distinct from cur.save and p_meta is not distinct from cur.meta and not coalesce(p_force, false) then
    return jsonb_build_object('rev', cur.rev, 'updated_at', cur.updated_at, 'unchanged', true);
  end if;

  old_count := case when cur.save is not null and jsonb_typeof(cur.save)='object' and jsonb_typeof(cur.save->'count')='number' then (cur.save->>'count')::numeric::int else 1 end;
  new_count := case when p_save is not null and jsonb_typeof(p_save->'count')='number' then (p_save->>'count')::numeric::int else old_count end;
  if not coalesce(p_force, false) and (new_count < old_count or new_count > old_count + 1) then raise exception 'bad_life_sequence' using errcode = '22023'; end if;

  oldp := case when cur.save is not null then cur.save->'player' else null end;

  -- Thời gian thật đã trôi qua kể từ lần ghi cuối được chấp nhận (cùng công thức với client).
  credit_ms := private.trusted_credit_ms(extract(epoch from (now_ts - cur.trusted_game_at)));

  if coalesce(p_force, false) then
    ledger_ms := greatest(cur.trusted_game_ms, new_progress_ms);
  elsif new_count = old_count and oldp is not null and oldp <> 'null'::jsonb and newp is not null and newp <> 'null'::jsonb then
    -- Cùng một kiếp: tiến độ mới không được vượt tiến độ đã được cấp + thời gian thật trôi qua (+ dung sai không cộng dồn).
    old_lv := (oldp->>'realm')::numeric::int * 9 + (oldp->>'tang')::numeric::int;
    new_lv := (newp->>'realm')::numeric::int * 9 + (newp->>'tang')::numeric::int;
    if new_lv < old_lv then raise exception 'level_reverse' using errcode = '22023'; end if;
    allowed_ms := cur.trusted_game_ms + credit_ms;
    if new_progress_ms > allowed_ms + slack_ms then raise exception 'time_jump' using errcode = '22023'; end if;
    ledger_ms := allowed_ms;                                   -- không lưu phần dung sai đã dùng => không cộng dồn
  elsif newp is not null and newp <> 'null'::jsonb then
    -- Kiếp mới (save cũ không có nhân vật, hoặc count tăng 1): tiến độ cũ không mang sang, nhưng cũng không được bắt đầu cao hơn thời gian thật.
    if new_progress_ms > credit_ms + slack_ms then raise exception 'time_jump' using errcode = '22023'; end if;
    ledger_ms := least(new_progress_ms, credit_ms);
  else
    ledger_ms := 0;                                            -- trạng thái kết thúc (chết / phi thăng): không còn nhân vật
  end if;

  new_rev := cur.rev + 1;
  update public.player_saves
     set save = p_save, meta = p_meta, rev = new_rev, updated_at = now_ts,
         trusted_game_ms = greatest(0, ledger_ms), trusted_game_at = now_ts
   where user_id = uid;
  return jsonb_build_object('rev', new_rev, 'updated_at', now_ts);
end;
$$;
revoke all on function public.save_game(jsonb, jsonb, bigint, boolean) from public, anon, authenticated;
grant execute on function public.save_game(jsonb, jsonb, bigint, boolean) to authenticated;
