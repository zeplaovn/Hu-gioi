-- Dữ liệu người chơi: mỗi tài khoản (auth.users) có đúng một dòng.
-- Quy tắc: client chỉ ĐỌC trực tiếp bảng (qua RLS); mọi lần GHI đều đi qua hàm save_game() để được kiểm tra.

create table if not exists public.player_saves (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  save       jsonb,                                  -- { count, player }, null nếu chưa tạo nhân vật
  meta       jsonb  not null default '{}'::jsonb,    -- Thiên Mệnh, thành tựu, lịch sử các kiếp
  rev        bigint not null default 0,              -- tăng 1 mỗi lần ghi, dùng để phát hiện xung đột giữa các thiết bị
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_saves_save_object check (save is null or jsonb_typeof(save) = 'object'),
  constraint player_saves_meta_object check (jsonb_typeof(meta) = 'object'),
  constraint player_saves_save_size   check (save is null or octet_length(save::text) <= 262144),
  constraint player_saves_meta_size   check (octet_length(meta::text) <= 262144)
);

alter table public.player_saves enable row level security;
alter table public.player_saves force row level security;

-- Chỉ chủ tài khoản được đọc dòng của mình. Không có policy insert/update/delete: client không ghi trực tiếp được.
drop policy if exists "player_saves_select_own" on public.player_saves;
create policy "player_saves_select_own" on public.player_saves
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.player_saves from anon, authenticated;
grant select on table public.player_saves to authenticated;

-- Ghi dữ liệu: kiểm tra đăng nhập, kích thước, kiểu dữ liệu, tần suất và phiên bản (rev).
--   p_rev = rev client đang giữ (0 nếu chưa từng có dòng). Lệch rev nghĩa là thiết bị khác đã ghi trước -> lỗi 'conflict'.
--   p_force = true: bỏ qua kiểm tra rev (người chơi chủ động chọn "ghi đè bằng bản trên máy này").
-- Trả về { rev, updated_at } mới.
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
  if p_meta is null or jsonb_typeof(p_meta) <> 'object' then
    raise exception 'bad_meta' using errcode = '22023';
  end if;
  if p_save is not null and jsonb_typeof(p_save) <> 'object' then
    raise exception 'bad_save' using errcode = '22023';
  end if;
  if octet_length(coalesce(p_save::text, '')) > 262144 or octet_length(p_meta::text) > 262144 then
    raise exception 'too_large' using errcode = 'P0001';
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
