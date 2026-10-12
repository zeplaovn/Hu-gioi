-- Kiểm thử migration trên Postgres thật bằng bản giả lập tối thiểu của Supabase (auth.users, auth.uid(), role anon/authenticated).
-- Chạy:  psql -v ON_ERROR_STOP=1 -f supabase/tests/player_saves.test.sql   (trên DB trống)
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

create function public.t_expect_error(sql text, want text) returns void language plpgsql security invoker as $$
begin
  begin execute sql; exception when others then
    if sqlerrm like '%' || want || '%' then return; end if;
    raise exception 'lỗi sai: muốn "%", nhận "%"', want, sqlerrm;
  end;
  raise exception 'đáng lẽ phải lỗi "%": %', want, sql;
end $$;
grant execute on function public.t_expect_error(text, text) to anon, authenticated;

-- người dùng A
set role authenticated; select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$ declare r jsonb; begin
  r := public.save_game('{"count":1,"player":{"name":"A"}}', '{"legacy":0}', 0);
  assert (r->>'rev')::int = 1, 'lần ghi đầu phải ra rev 1';
end $$;
select pg_sleep(1.1);
do $$ declare r jsonb; begin
  r := public.save_game('{"count":1,"player":{"name":"A2"}}', '{"legacy":1}', 1);
  assert (r->>'rev')::int = 2, 'rev phải tăng';
end $$;
select public.t_expect_error($q$select public.save_game('{"a":1}', '{}', 1)$q$, 'conflict');           -- rev cũ
select pg_sleep(1.1);
select public.t_expect_error($q$select public.save_game('{"a":1}', '{}', 0)$q$, 'conflict');           -- rev 0 khi đã có dòng
select public.t_expect_error($q$select public.save_game('[1]'::jsonb, '{}', 2)$q$, 'bad_save');
select public.t_expect_error($q$select public.save_game('{}', '[1]'::jsonb, 2)$q$, 'bad_meta');
select public.t_expect_error($q$select public.save_game('{}', null, 2)$q$, 'bad_meta');
select public.t_expect_error($q$select public.save_game(jsonb_build_object('x', repeat('a', 300000)), '{}', 2)$q$, 'too_large');
select public.t_expect_error($q$select public.save_game('{}', '{}', -1)$q$, 'bad_rev');
do $$ declare r jsonb; begin                                                   -- ghi quá nhanh bị chặn, ghi đè chủ động (force) thì được
  perform public.save_game('{"count":1}', '{}', 2);
  perform public.t_expect_error($q$select public.save_game('{"count":1}', '{}', 3)$q$, 'too_fast');
  r := public.save_game('{"count":1,"player":{"name":"A3"}}', '{}', 0, true);
  assert (r->>'rev')::int = 4, 'force phải ghi được và tăng rev';
end $$;
-- RLS: A chỉ thấy dòng của mình, không ghi trực tiếp được
do $$ begin assert (select count(*) from public.player_saves) = 1, 'A phải thấy đúng 1 dòng'; end $$;
select public.t_expect_error($q$update public.player_saves set save = '{"hack":true}'$q$, 'permission denied');
select public.t_expect_error($q$insert into public.player_saves (user_id) values ('22222222-2222-2222-2222-222222222222')$q$, 'permission denied');
select public.t_expect_error($q$delete from public.player_saves$q$, 'permission denied');

-- người dùng B không thấy dữ liệu của A, ghi của B không đụng A
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$ begin assert (select count(*) from public.player_saves) = 0, 'B không được thấy dòng của A'; end $$;
do $$ declare r jsonb; begin
  r := public.save_game('{"count":1,"player":{"name":"B"}}', '{}', 0);
  assert (r->>'rev')::int = 1;
  assert (select save #>> '{player,name}' from public.player_saves) = 'B', 'B phải thấy dữ liệu của B';
end $$;

-- chưa đăng nhập (anon) bị chặn cả đọc lẫn ghi
reset role; set role anon; select set_config('request.jwt.claim.sub', '', false);
select public.t_expect_error($q$select * from public.player_saves$q$, 'permission denied');
select public.t_expect_error($q$select public.save_game('{}', '{}', 0)$q$, 'permission denied');

-- đăng nhập nhưng không có sub (token hỏng) cũng bị chặn
reset role; set role authenticated; select set_config('request.jwt.claim.sub', '', false);
select public.t_expect_error($q$select public.save_game('{}', '{}', 0)$q$, 'not_authenticated');

-- xóa tài khoản thì dữ liệu bị xóa theo
reset role; delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
do $$ begin assert (select count(*) from public.player_saves) = 1, 'xóa user A phải xóa dòng của A'; end $$;
\echo 'TẤT CẢ KIỂM THỬ SQL ĐỀU QUA'
