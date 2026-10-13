-- Kiểm thử chat trên Postgres thật (bản giả lập tối thiểu của Supabase, giống player_saves.test.sql).
-- Chạy:  psql -v ON_ERROR_STOP=1 -f supabase/tests/chat.test.sql   (trên DB trống)
\set ON_ERROR_STOP on
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
grant usage on schema auth, public to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
insert into auth.users values ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');

\i supabase/migrations/20261011000000_player_saves.sql
\i supabase/migrations/20261012000000_delete_account_and_checks.sql
\i supabase/migrations/20261013000000_leaderboard.sql
\i supabase/migrations/20261014000000_chat.sql

create function public.t_expect_error(sql text, want text) returns void language plpgsql security invoker as $$
begin
  begin execute sql; exception when others then
    if sqlerrm like '%' || want || '%' then return; end if;
    raise exception 'lỗi sai: muốn "%", nhận "%"', want, sqlerrm;
  end;
  raise exception 'đáng lẽ phải lỗi "%": %', want, sql;
end $$;
grant execute on function public.t_expect_error(text, text) to anon, authenticated;

-- người dùng A: có nhân vật (nên có tên trên bảng xếp hạng)
set role authenticated; select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select public.save_game('{"count":1,"player":{"name":"Tiểu A","realm":0,"tang":2,"months":5,"age":16,"lifespan":80}}', '{}', 0);
do $$ declare r jsonb; begin
  r := public.send_chat('  Xin   chào' || chr(10) || 'mọi người  ');
  assert r->>'body' = 'Xin chào mọi người', 'phải gộp khoảng trắng và bỏ ký tự điều khiển';
  assert r->>'name' = 'Tiểu A', 'tên lấy từ bảng xếp hạng';
end $$;
select public.t_expect_error($q$select public.send_chat('lại ngay')$q$, 'too_fast');           -- < 2 giây
select pg_sleep(2.1);
select public.t_expect_error($q$select public.send_chat('   ')$q$, 'empty');
select public.t_expect_error($q$select public.send_chat(null)$q$, 'empty');
select public.t_expect_error($q$select public.send_chat(repeat('a', 201))$q$, 'too_long');
do $$ begin perform public.send_chat(repeat('a', 200)); end $$;                               -- đúng 200 ký tự thì được

-- người dùng B: chưa có nhân vật -> "Vô danh"; thấy tin của A; không ghi trực tiếp được
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$ declare r jsonb; begin
  assert (select count(*) from public.chat_messages) = 2, 'B phải thấy tin của A';
  r := public.send_chat('chào A');
  assert r->>'name' = 'Vô danh', 'chưa có trên bảng xếp hạng thì là Vô danh';
end $$;
select public.t_expect_error($q$insert into public.chat_messages (user_id, name, body) values ('22222222-2222-2222-2222-222222222222', 'X', 'hack')$q$, 'permission denied');
select public.t_expect_error($q$update public.chat_messages set body = 'sửa'$q$, 'permission denied');
select public.t_expect_error($q$delete from public.chat_messages$q$, 'permission denied');

-- giới hạn 10 tin / phút
reset role; delete from public.chat_messages where user_id = '22222222-2222-2222-2222-222222222222';
insert into public.chat_messages (user_id, name, body, created_at)
  select '22222222-2222-2222-2222-222222222222', 'Vô danh', 'x' || g, now() - interval '30 seconds' from generate_series(1, 10) g;
set role authenticated; select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
select public.t_expect_error($q$select public.send_chat('thứ 11')$q$, 'too_fast');

-- chưa đăng nhập / anon
select set_config('request.jwt.claim.sub', '', false);
select public.t_expect_error($q$select public.send_chat('ẩn danh')$q$, 'not_authenticated');
reset role; set role anon;
select public.t_expect_error($q$select public.send_chat('anon')$q$, 'permission denied');
select public.t_expect_error($q$select * from public.chat_messages$q$, 'permission denied');

-- xóa tài khoản kéo theo tin nhắn
reset role;
delete from auth.users where id = '22222222-2222-2222-2222-222222222222';
do $$ begin assert (select count(*) from public.chat_messages where user_id = '22222222-2222-2222-2222-222222222222') = 0, 'tin nhắn phải bị xóa theo tài khoản'; end $$;
\echo OK chat
