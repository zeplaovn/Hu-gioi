-- Tên admin nổi bật trong chat + chống mạo danh quản trị viên.
--  1) chat_messages.is_admin: do máy chủ đặt (trigger), client không tự đặt được. Admin / moderator đang bật mới có.
--  2) private.safe_name(): bỏ [ ] < > và ký tự điều khiển / ký tự vô hình, giới hạn 24 ký tự; tên giống "admin", "quản trị", "GM"... -> 'Vô danh'.
--     Áp dụng cho bảng xếp hạng (mọi đường ghi, kể cả lb_sync) và tên hiển thị trong chat của người chơi thường.
--  3) Tin do admin_send_message gửi (tên '[ADMIN]') được đổi thành 'Thiên Đạo' + is_admin = true.
-- Không viết lại lb_sync / send_chat: chỉ gắn trigger BEFORE INSERT, nên không đụng các bản tối ưu đã có.

alter table public.chat_messages add column if not exists is_admin boolean not null default false;

create or replace function private.safe_name(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  with c as (
    select btrim(regexp_replace(regexp_replace(coalesce(p, ''), '[[:cntrl:]<>\[\]​-‏⁠﻿]', '', 'g'), '\s+', ' ', 'g')) as s
  )
  select case
    when s = '' then 'Vô danh'
    when lower(s) ~ '(admin|moderator|quản trị|quan tri|thiên đạo|thien dao|hệ thống|he thong|system|\ygm\y)' then 'Vô danh'
    else left(s, 24)
  end from c
$$;

create or replace function private.chat_stamp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.is_admin := exists (
    select 1 from public.admin_users a
    where a.user_id = new.user_id and a.enabled and private.admin_rank(a.role) >= 2
  );
  if new.is_admin then
    if new.name = '[ADMIN]' then new.name := 'Thiên Đạo'; end if;
  else
    new.name := private.safe_name(new.name);
  end if;
  return new;
end;
$$;
revoke all on function private.chat_stamp() from public, anon, authenticated;

drop trigger if exists chat_messages_stamp on public.chat_messages;
create trigger chat_messages_stamp before insert on public.chat_messages
  for each row execute function private.chat_stamp();

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
revoke all on function private.leaderboard_name() from public, anon, authenticated;

drop trigger if exists leaderboard_safe_name on public.leaderboard;
create trigger leaderboard_safe_name before insert or update of name on public.leaderboard
  for each row execute function private.leaderboard_name();

-- Làm sạch dữ liệu đã có.
update public.leaderboard set name = name where name is distinct from private.safe_name(name);
update public.chat_messages c set is_admin = true, name = case when c.name = '[ADMIN]' then 'Thiên Đạo' else c.name end
 where c.name = '[ADMIN]' or exists (select 1 from public.admin_users a where a.user_id = c.user_id and a.enabled and private.admin_rank(a.role) >= 2);
update public.chat_messages set name = private.safe_name(name) where not is_admin and name is distinct from private.safe_name(name);

