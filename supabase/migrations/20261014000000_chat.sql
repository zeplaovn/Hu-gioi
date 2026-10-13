-- Chat thế giới: mọi người chơi đã đăng nhập đọc được; GHI chỉ qua send_chat() (kiểm tra độ dài, tần suất).
-- Tên hiển thị lấy từ bảng xếp hạng (do máy chủ tự điền từ save), client không tự đặt tên được nên không mạo danh được.
-- Tin nhắn giữ tối đa 2 ngày (dọn dần mỗi khi có người gửi). Xóa tài khoản thì tin nhắn của tài khoản đó cũng bị xóa.
-- Không có bộ lọc từ ngữ: cần kiểm duyệt thì xóa thủ công trong Supabase (delete from public.chat_messages where id = ...).

create table if not exists public.chat_messages (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 24),
  body       text not null check (char_length(body) between 1 and 200),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_user_time_idx on public.chat_messages (user_id, created_at desc);
create index if not exists chat_messages_time_idx on public.chat_messages (created_at);

alter table public.chat_messages enable row level security;
alter table public.chat_messages force row level security;
drop policy if exists "chat_read_all" on public.chat_messages;
create policy "chat_read_all" on public.chat_messages for select to authenticated using (true);
revoke all on table public.chat_messages from anon, authenticated;
grant select on table public.chat_messages to authenticated;

-- Gửi một tin. Lỗi: not_authenticated, empty, too_long, too_fast.
-- Giới hạn: cách nhau >= 2 giây và tối đa 10 tin / phút / tài khoản. Trả về dòng vừa tạo.
create or replace function public.send_chat(p_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  txt text;
  nm text;
  rec public.chat_messages%rowtype;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  txt := btrim(regexp_replace(regexp_replace(coalesce(p_body, ''), '[[:cntrl:]]', ' ', 'g'), '\s+', ' ', 'g'));
  if txt = '' then
    raise exception 'empty' using errcode = '22023';
  end if;
  if char_length(txt) > 200 then
    raise exception 'too_long' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));   -- hai yêu cầu cùng lúc của một người không lách được giới hạn
  if exists (select 1 from public.chat_messages where user_id = uid and created_at > now() - interval '2 seconds')
     or (select count(*) from public.chat_messages where user_id = uid and created_at > now() - interval '1 minute') >= 10 then
    raise exception 'too_fast' using errcode = 'P0001';
  end if;

  select l.name into nm from public.leaderboard l where l.user_id = uid;
  insert into public.chat_messages (user_id, name, body) values (uid, coalesce(nm, 'Vô danh'), txt)
  returning * into rec;

  if random() < 0.05 then
    delete from public.chat_messages where created_at < now() - interval '2 days';
  end if;
  return jsonb_build_object('id', rec.id, 'user_id', rec.user_id, 'name', rec.name, 'body', rec.body, 'created_at', rec.created_at);
end;
$$;

revoke all on function public.send_chat(text) from public, anon, authenticated;
grant execute on function public.send_chat(text) to authenticated;
