-- Kiểm thử baseline trên Postgres thật bằng bản giả lập tối thiểu của Supabase.
-- Chạy: psql -v ON_ERROR_STOP=1 -f supabase/tests/player_saves.test.sql (trên DB trống)
\set ON_ERROR_STOP on
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
grant usage on schema auth, public to anon, authenticated;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated;
insert into auth.users values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

\i supabase/migrations/20261014000000_01_core.sql
\i supabase/migrations/20261014000100_02_admin_core.sql
\i supabase/migrations/20261014000200_03_server.sql
\i supabase/migrations/20261014000300_04_leaderboard.sql
\i supabase/migrations/20261014000400_05_gameplay.sql
\i supabase/migrations/20261014000500_06_chat.sql
\i supabase/migrations/20261014000600_07_economy.sql
\i supabase/migrations/20261014000700_08_admin_rpc.sql
\i supabase/migrations/20261014000800_09_security.sql
\i supabase/migrations/20261014000900_10_performance.sql

insert into public.admin_users(user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'admin');

create function public.t_expect_error(sql text, want text) returns void language plpgsql security invoker as $$
begin
  begin execute sql; exception when others then
    if sqlerrm like '%' || want || '%' then return; end if;
    raise exception 'lỗi sai: muốn "%", nhận "%"', want, sqlerrm;
  end;
  raise exception 'đáng lẽ phải lỗi "%": %', want, sql;
end $$;
grant execute on function public.t_expect_error(text, text) to anon, authenticated;

set role authenticated; select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$ declare r jsonb; begin
  r := public.save_game('{"count":1,"player":{"name":"A","realm":0,"tang":1,"months":0,"age":16,"lifespan":80}}', '{"legacy":0}', 0);
  assert (r->>'rev')::int = 1, 'lần ghi đầu phải ra rev 1';
end $$;
select pg_sleep(1.1);
do $$ declare r jsonb; begin
  r := public.save_game('{"count":1,"player":{"name":"A2","realm":0,"tang":1,"months":0,"age":16,"lifespan":80}}', '{"legacy":1}', 1);
  assert (r->>'rev')::int = 2, 'rev phải tăng';
end $$;
select public.t_expect_error($q$select public.save_game('{"a":1}', '{}', 1)$q$, 'conflict');
select pg_sleep(1.1);
select public.t_expect_error($q$select public.save_game('{"a":1}', '{}', 0)$q$, 'conflict');
select public.t_expect_error($q$select public.save_game('[1]'::jsonb, '{}', 2)$q$, 'bad_save');
select public.t_expect_error($q$select public.save_game('{}', '[1]'::jsonb, 2)$q$, 'bad_meta');
select public.t_expect_error($q$select public.save_game('{}', null, 2)$q$, 'bad_meta');
select public.t_expect_error($q$select public.save_game(jsonb_build_object('x', repeat('a', 300000)), '{}', 2)$q$, 'too_large');
select public.t_expect_error($q$select public.save_game('{}', '{}', -1)$q$, 'bad_rev');
do $$ declare r jsonb; begin
  perform public.save_game('{"count":1}', '{}', 2);
  perform public.t_expect_error($q$select public.save_game('{"count":1,"meta":1}', '{}', 3)$q$, 'too_fast');
  r := public.save_game('{"count":1,"player":{"name":"A3","realm":0,"tang":1,"months":0,"age":16,"lifespan":80}}', '{}', 0, true);
  assert (r->>'rev')::int = 4, 'force phải ghi được và tăng rev';
end $$;

select public.t_expect_error($q$select public.save_game('{"player":{"name":"X","realm":9,"tang":1,"months":0,"age":16,"lifespan":80}}', '{}', 0, true)$q$, 'implausible');
select public.t_expect_error($q$select public.save_game('{"player":{"name":"X","realm":4,"tang":1,"months":3,"age":16,"lifespan":80}}', '{}', 0, true)$q$, 'implausible');
select public.t_expect_error($q$select public.save_game('{"player":{"name":"X"}}', '{}', 0, true)$q$, 'implausible');

do $$ begin assert (select count(*) from public.player_saves) = 1, 'A phải thấy đúng 1 dòng'; end $$;
select public.t_expect_error($q$update public.player_saves set save = '{"hack":true}'$q$, 'permission denied');
select public.t_expect_error($q$insert into public.player_saves (user_id) values ('22222222-2222-2222-2222-222222222222')$q$, 'permission denied');
select public.t_expect_error($q$delete from public.player_saves$q$, 'permission denied');

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$ begin assert (select count(*) from public.player_saves) = 0, 'B không được thấy dòng của A'; end $$;
do $$ declare r jsonb; begin
  r := public.save_game('{"count":1,"player":{"name":"B","realm":0,"tang":1,"months":0,"age":16,"lifespan":80}}', '{}', 0);
  assert (r->>'rev')::int = 1;
  assert (select save #>> '{player,name}' from public.player_saves) = 'B', 'B phải thấy dữ liệu của B';
end $$;

do $$ begin
  assert (select count(*) from public.leaderboard) = 2, 'bảng xếp hạng phải có A và B';
  assert (select name from public.leaderboard where user_id = '11111111-1111-1111-1111-111111111111') = 'A3', 'A xếp hạng với nhân vật vừa lưu';
end $$;
select public.t_expect_error($q$update public.leaderboard set level = 81$q$, 'permission denied');
select public.t_expect_error($q$insert into public.leaderboard (user_id, name, level, months) values ('22222222-2222-2222-2222-222222222222', 'x', 81, 9)$q$, 'permission denied');
select public.t_expect_error($q$delete from public.leaderboard$q$, 'permission denied');
do $$ begin
  perform public.save_game('{"player":{"name":"B  cao thu\u0007","realm":2,"tang":1,"months":50,"age":20,"lifespan":200}}', '{}', 1, true);
  assert (select level from public.leaderboard where user_id = '22222222-2222-2222-2222-222222222222') = 19, 'cấp 19 hợp lý';
  assert (select name from public.leaderboard where user_id = '22222222-2222-2222-2222-222222222222') = 'B cao thu', 'tên phải được sanitize';
  perform public.save_game('{"player":{"name":"B kém","realm":0,"tang":3,"months":9,"age":16,"lifespan":80}}', '{}', 2, true);
  assert (select level from public.leaderboard where user_id = '22222222-2222-2222-2222-222222222222') = 19, 'thành tích tốt nhất không bị hạ';
  perform public.save_game('{"player":{"name":"B gian","realm":8,"tang":9,"months":100,"age":40,"lifespan":2000}}', '{}', 3, true);
  assert (select level from public.leaderboard where user_id = '22222222-2222-2222-2222-222222222222') = 19, 'số tháng quá thấp so với cấp thì không được lên bảng';
  perform public.save_game('{"player":{"name":"B cao","realm":4,"tang":1,"months":400,"age":40,"lifespan":500}}', '{}', 4, true);
  assert (select level from public.leaderboard where user_id = '22222222-2222-2222-2222-222222222222') = 37, 'đủ tháng thì lên bảng';
  perform public.save_game('{"count":2,"player":null}', '{"best":60,"history":[{"age":150,"end":"win"},{"age":90,"end":"death"}]}', 5, true);
  assert (select level from public.leaderboard where user_id = '22222222-2222-2222-2222-222222222222') = 60, 'meta.best nâng hạng khi hết nhân vật';
  assert (select months from public.leaderboard where user_id = '22222222-2222-2222-2222-222222222222') = (150 - 20) * 12, 'số tháng ước lượng từ lịch sử';
  perform public.save_game('{"count":2,"player":null}', '{"best":30,"history":[]}', 6, true);
  assert (select level from public.leaderboard where user_id = '22222222-2222-2222-2222-222222222222') = 60, 'best thấp hơn không hạ hạng';
  perform public.save_game('{"count":2,"player":null}', '{"best":999,"history":"xau"}', 7, true);
  assert (select level from public.leaderboard where user_id = '22222222-2222-2222-2222-222222222222') = 81, 'best vượt trần bị chặn ở 81';
end $$;

reset role; set role anon; select set_config('request.jwt.claim.sub', '', false);
select public.t_expect_error($q$select * from public.player_saves$q$, 'permission denied');
select public.t_expect_error($q$select public.save_game('{}', '{}', 0)$q$, 'permission denied');
reset role; set role authenticated; select set_config('request.jwt.claim.sub', '', false);
select public.t_expect_error($q$select public.save_game('{}', '{}', 0)$q$, 'not_authenticated');
reset role; set role anon; select set_config('request.jwt.claim.sub', '', false);
select public.t_expect_error($q$select public.delete_account()$q$, 'permission denied');
reset role; set role authenticated; select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
select public.delete_account();
reset role;
do $$ begin
  assert not exists (select 1 from auth.users where id = '22222222-2222-2222-2222-222222222222'), 'B phải bị xóa';
  assert (select count(*) from public.player_saves) = 1, 'dòng của B phải bị xóa theo';
  assert (select count(*) from public.leaderboard) = 1, 'B bị xóa khỏi bảng xếp hạng';
end $$;
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
do $$ begin assert (select count(*) from public.player_saves) = 0 and (select count(*) from public.leaderboard) = 0, 'xóa user A phải xóa dữ liệu A'; end $$;
\echo 'TẤT CẢ KIỂM THỬ SQL PLAYER SAVE ĐỀU QUA'
